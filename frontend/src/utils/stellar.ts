import {
  isConnected as freighterIsConnected,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api';
import {
  rpc,
  TransactionBuilder,
  Contract,
  scValToNative,
  Address,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import deployed from '../deployed_addresses.json';

const server = new rpc.Server(deployed.rpcUrl);
const networkPassphrase = deployed.networkPassphrase;

export async function isConnected(): Promise<boolean> {
  const res: any = await freighterIsConnected();
  return !!res && (res === true || res.isConnected === true || typeof res === 'object');
}

export async function getPublicKey(): Promise<string> {
  const access: any = await requestAccess();
  if (access.error) {
    throw new Error(access.error);
  }
  return access.address || access.publicKey || access;
}

async function simulateAndSign(
  txBuilder: TransactionBuilder
) {
  const tx = txBuilder.build();
  
  // Simulate the transaction
  const simulation = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(simulation)) {
    console.error('Simulation failed:', simulation);
    throw new Error('Transaction simulation failed');
  }

  // Assemble the transaction with simulation data
  const assembledTx = rpc.assembleTransaction(tx, simulation as any).build();
  
  // Sign with Freighter
  const signedResult: any = await signTransaction(assembledTx.toXDR(), { networkPassphrase });
  if (signedResult.error) {
    throw new Error(signedResult.error);
  }

  // Submit to network
  const response = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedResult.signedTxXdr || signedResult, networkPassphrase)
  );

  if (response.status === 'ERROR') {
    throw new Error('Transaction submission failed');
  }

  // Wait for completion
  let statusResponse = await server.getTransaction(response.hash);
  while (statusResponse.status === 'NOT_FOUND') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    statusResponse = await server.getTransaction(response.hash);
  }

  if (statusResponse.status === 'FAILED') {
    throw new Error('Transaction failed on-chain');
  }

  return statusResponse;
}

export async function getCampaignsRegistry(): Promise<string[]> {
  const contract = new Contract(deployed.factoryId);
  const txBuilder = new TransactionBuilder(
    await server.getAccount(deployed.deployerAddress),
    { fee: '100', networkPassphrase }
  );
  
  txBuilder.addOperation(
    contract.call('list_campaigns')
  );
  txBuilder.setTimeout(30);
  
  const tx = txBuilder.build();
  const simulation = await server.simulateTransaction(tx);
  
  if (rpc.Api.isSimulationSuccess(simulation)) {
    // In newer SDKs, simulation.result is inside simulation.transactionData or directly on simulation.
    // We just cast and check for retval
    const simAny = simulation as any;
    const retval = simAny.result?.retval || simAny.retval;
    if (retval) {
      return scValToNative(retval) || [];
    }
  }
  return [];
}

export interface CampaignDetails {
  address: string;
  title: string;
  description: string;
  goal: bigint;
  deadline: number;
  totalPledged: bigint;
  status: number;
  creator: string;
}

export async function getCampaignDetails(address: string): Promise<CampaignDetails | null> {
  const contract = new Contract(address);
  const account = await server.getAccount(deployed.deployerAddress);

  const fetchField = async (method: string) => {
    const txBuilder = new TransactionBuilder(account, { fee: '100', networkPassphrase });
    txBuilder.addOperation(contract.call(method));
    txBuilder.setTimeout(30);
    const simulation = await server.simulateTransaction(txBuilder.build());
    if (rpc.Api.isSimulationSuccess(simulation)) {
      const simAny = simulation as any;
      const retval = simAny.result?.retval || simAny.retval;
      if (retval) {
        return scValToNative(retval);
      }
    }
    return null;
  };

  try {
    const [title, description, goal, deadline, totalPledged, status, creator] = await Promise.all([
      fetchField('get_title'),
      fetchField('get_description'),
      fetchField('get_goal'),
      fetchField('get_deadline'),
      fetchField('get_total_pledged'),
      fetchField('get_status'),
      fetchField('get_creator'),
    ]);

    return {
      address,
      title: (title || '').toString(),
      description: (description || '').toString(),
      goal: BigInt(goal || 0),
      deadline: Number(deadline || 0),
      totalPledged: BigInt(totalPledged || 0),
      status: Number(status || 0),
      creator: creator ? creator.toString() : '',
    };
  } catch (e) {
    console.error(`Failed to fetch details for ${address}`, e);
    return null;
  }
}

export async function createCampaign(
  publicKey: string,
  goal: bigint,
  deadline: number,
  title: string,
  description: string
) {
  const contract = new Contract(deployed.factoryId);
  const source = await server.getAccount(publicKey);
  
  const txBuilder = new TransactionBuilder(source, { fee: '1000', networkPassphrase });
  
  txBuilder.addOperation(
    contract.call(
      'create_campaign',
      new Address(publicKey).toScVal(),
      nativeToScVal(goal, { type: 'i128' }),
      nativeToScVal(deadline, { type: 'u64' }),
      nativeToScVal(title, { type: 'string' }),
      nativeToScVal(description, { type: 'string' })
    )
  );
  txBuilder.setTimeout(60);

  return await simulateAndSign(txBuilder);
}

export async function pledgeToCampaign(
  publicKey: string,
  campaignAddress: string,
  amount: bigint
) {
  const contract = new Contract(campaignAddress);
  const source = await server.getAccount(publicKey);
  
  const txBuilder = new TransactionBuilder(source, { fee: '1000', networkPassphrase });
  
  txBuilder.addOperation(
    contract.call(
      'pledge',
      new Address(publicKey).toScVal(),
      nativeToScVal(amount, { type: 'i128' })
    )
  );
  txBuilder.setTimeout(60);

  return await simulateAndSign(txBuilder);
}

export async function withdrawFunds(publicKey: string, campaignAddress: string) {
  const contract = new Contract(campaignAddress);
  const source = await server.getAccount(publicKey);
  
  const txBuilder = new TransactionBuilder(source, { fee: '1000', networkPassphrase });
  
  txBuilder.addOperation(
    contract.call(
      'withdraw',
      new Address(publicKey).toScVal()
    )
  );
  txBuilder.setTimeout(60);

  return await simulateAndSign(txBuilder);
}

export async function claimRefund(publicKey: string, campaignAddress: string) {
  const contract = new Contract(campaignAddress);
  const source = await server.getAccount(publicKey);
  
  const txBuilder = new TransactionBuilder(source, { fee: '1000', networkPassphrase });
  
  txBuilder.addOperation(
    contract.call(
      'claim_refund',
      new Address(publicKey).toScVal()
    )
  );
  txBuilder.setTimeout(60);

  return await simulateAndSign(txBuilder);
}
