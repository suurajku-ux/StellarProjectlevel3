# PledgeVault Deployment Script
# Deploys factory + campaign contracts to Stellar Testnet using a NEW account

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PledgeVault - Testnet Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Generate new testnet identity (if not exists)
Write-Host "`n[1/7] Generating new testnet identity..." -ForegroundColor Yellow
try {
    stellar keys generate pledgevault-deployer --network testnet --fund 2>$null
} catch {
    Write-Host "  Key pledgevault-deployer already exists." -ForegroundColor Gray
}
$DEPLOYER_ADDRESS = stellar keys address pledgevault-deployer
Write-Host "  Deployer Address: $DEPLOYER_ADDRESS" -ForegroundColor Green

# 2. Build contracts
Write-Host "`n[2/7] Building contracts to WASM..." -ForegroundColor Yellow
cargo build --target wasm32-unknown-unknown --release
Write-Host "  Build complete!" -ForegroundColor Green

# 3. Deploy campaign WASM and get hash
Write-Host "`n[3/7] Installing campaign WASM on-chain..." -ForegroundColor Yellow
$CAMPAIGN_WASM = "target/wasm32v1-none/release/pledgevault_campaign.wasm"
$CAMPAIGN_HASH = stellar contract upload `
    --wasm $CAMPAIGN_WASM `
    --source-account pledgevault-deployer `
    --network testnet
Write-Host "  Campaign WASM Hash: $CAMPAIGN_HASH" -ForegroundColor Green

# 4. Deploy factory contract
Write-Host "`n[4/7] Deploying factory contract..." -ForegroundColor Yellow
$FACTORY_ID = stellar contract deploy `
    --wasm "target/wasm32v1-none/release/pledgevault_factory.wasm" `
    --source-account pledgevault-deployer `
    --network testnet
Write-Host "  Factory Contract ID: $FACTORY_ID" -ForegroundColor Green

# 5. Get native XLM token address
Write-Host "`n[5/7] Resolving native XLM token address..." -ForegroundColor Yellow
$NATIVE_TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
Write-Host "  Native XLM Token: $NATIVE_TOKEN" -ForegroundColor Green

# 6. Initialize factory
Write-Host "`n[6/7] Initializing factory contract..." -ForegroundColor Yellow
stellar contract invoke `
    --id $FACTORY_ID `
    --source-account pledgevault-deployer `
    --network testnet `
    -- init `
    --campaign_wasm_hash $CAMPAIGN_HASH `
    --token_address $NATIVE_TOKEN
Write-Host "  Factory initialized!" -ForegroundColor Green

# 7. Create test campaign (1000 XLM goal, ~30 days deadline)
Write-Host "`n[7/7] Creating test campaign (goal: 1000 XLM)..." -ForegroundColor Yellow
$DEADLINE = [int][double]::Parse(((Get-Date).AddDays(30).ToUniversalTime() - [datetime]'1970-01-01').TotalSeconds.ToString())
$CAMPAIGN_ADDRESS = stellar contract invoke `
    --id $FACTORY_ID `
    --source-account pledgevault-deployer `
    --network testnet `
    -- create_campaign `
    --creator $DEPLOYER_ADDRESS `
    --goal 10000000000 `
    --deadline $DEADLINE `
    --title "Community Innovation Fund" `
    --description "A decentralized fund to support open-source Stellar ecosystem projects"
Write-Host "  Campaign Address: $CAMPAIGN_ADDRESS" -ForegroundColor Green

# 8. Make a real pledge (10 XLM = 100000000 stroops)
Write-Host "`n[BONUS] Making real 10 XLM pledge..." -ForegroundColor Yellow
$PLEDGE_RESULT = stellar contract invoke `
    --id $CAMPAIGN_ADDRESS `
    --source-account pledgevault-deployer `
    --network testnet `
    -- pledge `
    --contributor $DEPLOYER_ADDRESS `
    --amount 100000000
Write-Host "  Pledge complete!" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Deployment Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployer:  $DEPLOYER_ADDRESS" -ForegroundColor White
Write-Host "  Factory:   $FACTORY_ID" -ForegroundColor White
Write-Host "  Campaign:  $CAMPAIGN_ADDRESS" -ForegroundColor White
Write-Host "  WASM Hash: $CAMPAIGN_HASH" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

# Save addresses to JSON for frontend
$jsonContent = @"
{
  "factoryId": "$FACTORY_ID",
  "campaignWasmHash": "$CAMPAIGN_HASH",
  "testCampaignAddress": "$CAMPAIGN_ADDRESS",
  "deployerAddress": "$DEPLOYER_ADDRESS",
  "networkPassphrase": "Test SDF Network ; September 2015",
  "rpcUrl": "https://soroban-testnet.stellar.org"
}
"@
$jsonContent | Out-File -FilePath "frontend/src/deployed_addresses.json" -Encoding UTF8
Write-Host "`nAddresses saved to frontend/src/deployed_addresses.json" -ForegroundColor Green
