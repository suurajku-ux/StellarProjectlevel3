#![cfg(test)]
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    token, Address, Env, String,
};

use crate::{CampaignContract, CampaignContractClient, CampaignStatus, Error};

fn create_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set(LedgerInfo {
        timestamp: 1000,
        protocol_version: 20,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });
    env
}

fn advance_past_deadline(env: &Env) {
    env.ledger().set(LedgerInfo {
        timestamp: 3000,
        protocol_version: 20,
        sequence_number: 200,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });
}

#[test]
fn test_successful_pledge() {
    let env = create_env();
    let contract_id = env.register_contract(None, CampaignContract);
    let client = CampaignContractClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

    let creator = Address::generate(&env);
    let contributor = Address::generate(&env);
    token_admin_client.mint(&contributor, &5000i128);

    client.initialize(
        &creator, &token_address, &1000i128, &2000u64,
        &String::from_str(&env, "Test Campaign"),
        &String::from_str(&env, "A test crowdfunding campaign"),
    );

    client.pledge(&contributor, &500i128);

    assert_eq!(client.get_total_pledged(), 500i128);
    assert_eq!(client.get_contributor_amount(&contributor), 500i128);

    // Second pledge should accumulate
    client.pledge(&contributor, &300i128);
    assert_eq!(client.get_total_pledged(), 800i128);
    assert_eq!(client.get_contributor_amount(&contributor), 800i128);
}

#[test]
fn test_withdraw_fails_if_goal_not_met() {
    let env = create_env();
    let contract_id = env.register_contract(None, CampaignContract);
    let client = CampaignContractClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

    let creator = Address::generate(&env);
    let contributor = Address::generate(&env);
    token_admin_client.mint(&contributor, &5000i128);

    client.initialize(
        &creator, &token_address, &1000i128, &2000u64,
        &String::from_str(&env, "Test Campaign"),
        &String::from_str(&env, "A test crowdfunding campaign"),
    );

    // Pledge less than goal
    client.pledge(&contributor, &500i128);

    // Advance past deadline
    advance_past_deadline(&env);

    let result = client.try_withdraw(&creator);
    assert_eq!(result, Err(Ok(Error::GoalNotMet)));
}

#[test]
fn test_withdraw_fails_if_deadline_not_passed() {
    let env = create_env();
    let contract_id = env.register_contract(None, CampaignContract);
    let client = CampaignContractClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

    let creator = Address::generate(&env);
    let contributor = Address::generate(&env);
    token_admin_client.mint(&contributor, &5000i128);

    client.initialize(
        &creator, &token_address, &1000i128, &2000u64,
        &String::from_str(&env, "Test Campaign"),
        &String::from_str(&env, "A test crowdfunding campaign"),
    );

    // Pledge enough to meet goal
    client.pledge(&contributor, &1000i128);

    // Don't advance time — deadline is 2000, current is 1000
    let result = client.try_withdraw(&creator);
    assert_eq!(result, Err(Ok(Error::DeadlineNotPassed)));
}

#[test]
fn test_withdraw_succeeds_after_goal_met_and_deadline_passed() {
    let env = create_env();
    let contract_id = env.register_contract(None, CampaignContract);
    let client = CampaignContractClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

    let creator = Address::generate(&env);
    let contributor = Address::generate(&env);
    token_admin_client.mint(&contributor, &5000i128);

    client.initialize(
        &creator, &token_address, &1000i128, &2000u64,
        &String::from_str(&env, "Test Campaign"),
        &String::from_str(&env, "A test crowdfunding campaign"),
    );

    // Pledge to meet goal
    client.pledge(&contributor, &1000i128);

    // Advance past deadline
    advance_past_deadline(&env);

    // Check status before withdrawal
    assert_eq!(client.get_status(), CampaignStatus::GoalMet);

    // Withdraw should succeed
    client.withdraw(&creator);

    // Verify status changed
    assert_eq!(client.get_status(), CampaignStatus::Withdrawn);

    // Verify creator received funds
    let token_client = token::Client::new(&env, &token_address);
    assert_eq!(token_client.balance(&creator), 1000i128);
}

#[test]
fn test_refund_succeeds_when_goal_failed() {
    let env = create_env();
    let contract_id = env.register_contract(None, CampaignContract);
    let client = CampaignContractClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

    let creator = Address::generate(&env);
    let contributor = Address::generate(&env);
    token_admin_client.mint(&contributor, &5000i128);

    client.initialize(
        &creator, &token_address, &1000i128, &2000u64,
        &String::from_str(&env, "Test Campaign"),
        &String::from_str(&env, "A test crowdfunding campaign"),
    );

    // Pledge less than goal
    client.pledge(&contributor, &500i128);

    let token_client = token::Client::new(&env, &token_address);
    assert_eq!(token_client.balance(&contributor), 4500i128); // 5000 - 500

    // Advance past deadline
    advance_past_deadline(&env);

    // Status should be Failed
    assert_eq!(client.get_status(), CampaignStatus::Failed);

    // Refund should succeed
    client.claim_refund(&contributor);

    // Verify contributor got tokens back
    assert_eq!(token_client.balance(&contributor), 5000i128);
}

#[test]
fn test_refund_fails_when_goal_was_met() {
    let env = create_env();
    let contract_id = env.register_contract(None, CampaignContract);
    let client = CampaignContractClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

    let creator = Address::generate(&env);
    let contributor = Address::generate(&env);
    token_admin_client.mint(&contributor, &5000i128);

    client.initialize(
        &creator, &token_address, &1000i128, &2000u64,
        &String::from_str(&env, "Test Campaign"),
        &String::from_str(&env, "A test crowdfunding campaign"),
    );

    // Pledge enough to meet goal
    client.pledge(&contributor, &1000i128);

    // Advance past deadline
    advance_past_deadline(&env);

    let result = client.try_claim_refund(&contributor);
    assert_eq!(result, Err(Ok(Error::GoalMet)));
}

#[test]
fn test_unauthorized_withdraw_fails() {
    let env = create_env();
    let contract_id = env.register_contract(None, CampaignContract);
    let client = CampaignContractClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

    let creator = Address::generate(&env);
    let contributor = Address::generate(&env);
    token_admin_client.mint(&contributor, &5000i128);

    client.initialize(
        &creator, &token_address, &1000i128, &2000u64,
        &String::from_str(&env, "Test Campaign"),
        &String::from_str(&env, "A test crowdfunding campaign"),
    );

    // Pledge to meet goal
    client.pledge(&contributor, &1000i128);

    // Advance past deadline
    advance_past_deadline(&env);

    // Try to withdraw as the contributor (not the creator)
    let result = client.try_withdraw(&contributor);
    assert_eq!(result, Err(Ok(Error::NotCreator)));
}
