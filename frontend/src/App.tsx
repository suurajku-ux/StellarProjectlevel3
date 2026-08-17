import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  LogOut, 
  PlusCircle, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle
} from 'lucide-react';
import { 
  isConnected, 
  getPublicKey, 
  getCampaignsRegistry, 
  getCampaignDetails, 
  type CampaignDetails,
  createCampaign,
  pledgeToCampaign,
  withdrawFunds,
  claimRefund
} from './utils/stellar';

function App() {
  const [pubKey, setPubKey] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create Campaign Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newDeadlineDays, setNewDeadlineDays] = useState('30');
  const [submitting, setSubmitting] = useState(false);

  // Pledge Modal State
  const [showPledgeModal, setShowPledgeModal] = useState<string | null>(null);
  const [pledgeAmount, setPledgeAmount] = useState('');

  useEffect(() => {
    checkConnection();
    fetchCampaigns();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchCampaigns, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    if (await isConnected()) {
      try {
        const key = await getPublicKey();
        setPubKey(key);
      } catch (e) {
        // Not approved yet
      }
    }
  };

  const connectWallet = async () => {
    try {
      const key = await getPublicKey();
      setPubKey(key);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to connect wallet');
    }
  };

  const disconnectWallet = () => {
    setPubKey(null);
  };

  const fetchCampaigns = async () => {
    try {
      const registry = await getCampaignsRegistry();
      const details = await Promise.all(
        registry.map(addr => getCampaignDetails(addr))
      );
      setCampaigns(details.filter((c): c is CampaignDetails => c !== null));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubKey) return setError('Connect wallet first');
    setSubmitting(true);
    setError('');
    
    try {
      const goalStroops = BigInt(parseFloat(newGoal) * 10000000);
      const deadlineUnix = Math.floor(Date.now() / 1000) + (parseInt(newDeadlineDays) * 86400);
      
      await createCampaign(pubKey, goalStroops, deadlineUnix, newTitle, newDesc);
      
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewGoal('');
      fetchCampaigns();
    } catch (e: any) {
      setError(e.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubKey || !showPledgeModal) return;
    setSubmitting(true);
    setError('');
    
    try {
      const amountStroops = BigInt(parseFloat(pledgeAmount) * 10000000);
      await pledgeToCampaign(pubKey, showPledgeModal, amountStroops);
      
      setShowPledgeModal(null);
      setPledgeAmount('');
      fetchCampaigns();
    } catch (e: any) {
      setError(e.message || 'Failed to pledge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (action: 'withdraw' | 'refund', address: string) => {
    if (!pubKey) return;
    setSubmitting(true);
    setError('');
    
    try {
      if (action === 'withdraw') {
        await withdrawFunds(pubKey, address);
      } else {
        await claimRefund(pubKey, address);
      }
      fetchCampaigns();
    } catch (e: any) {
      setError(e.message || `Failed to ${action}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: number, deadline: number, total: bigint, goal: bigint) => {
    const isExpired = Date.now() / 1000 > deadline;
    
    if (status === 3) return <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium flex items-center gap-1"><CheckCircle2 size={14}/> Withdrawn</span>;
    if (status === 1 || total >= goal) return <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium flex items-center gap-1"><CheckCircle2 size={14}/> Goal Met</span>;
    if (status === 2 || isExpired) return <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium flex items-center gap-1"><XCircle size={14}/> Failed</span>;
    
    return <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium flex items-center gap-1"><Clock size={14}/> Active</span>;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black text-slate-100 font-sans">
      
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-emerald-400" size={28} />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              PledgeVault
            </h1>
          </div>
          
          <div>
            {pubKey ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400 hidden sm:block">
                  {pubKey.substring(0, 6)}...{pubKey.substring(pubKey.length - 4)}
                </span>
                <button 
                  onClick={disconnectWallet}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm font-medium transition-colors"
                >
                  <LogOut size={16} /> Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 rounded-lg text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                <Wallet size={16} /> Connect Freighter
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {error && (
          <div className="mb-6 p-4 glass-panel border-red-500/30 bg-red-500/10 flex items-start gap-3 text-red-200">
            <AlertCircle className="shrink-0 mt-0.5 text-red-400" size={20} />
            <div>
              <h3 className="font-medium text-red-300">Transaction Error</h3>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <button onClick={() => setError('')} className="ml-auto opacity-70 hover:opacity-100">
              <XCircle size={20} />
            </button>
          </div>
        )}

        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold">Discover Campaigns</h2>
            <p className="text-slate-400 mt-2">Fund the future of the Stellar ecosystem.</p>
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-900 rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/20"
          >
            <PlusCircle size={18} /> Create Campaign
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 glass-panel">
            <TrendingUp size={48} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-medium text-slate-300">No campaigns yet</h3>
            <p className="text-slate-500 mt-2">Be the first to launch a project on PledgeVault.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((c) => {
              const goalNum = Number(c.goal) / 10000000;
              const pledgedNum = Number(c.totalPledged) / 10000000;
              const progress = Math.min(100, Math.round((pledgedNum / goalNum) * 100));
              const isCreator = pubKey === c.creator;
              const isExpired = Date.now() / 1000 > c.deadline;
              const isGoalMet = c.totalPledged >= c.goal;
              
              return (
                <div key={c.address} className="glass-panel overflow-hidden flex flex-col transition-transform hover:-translate-y-1 duration-300">
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      {getStatusBadge(c.status, c.deadline, c.totalPledged, c.goal)}
                      <span className="text-xs text-slate-500 font-mono" title={c.address}>
                        {c.address.substring(0,6)}...{c.address.substring(c.address.length-4)}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-2 line-clamp-1">{c.title}</h3>
                    <p className="text-slate-400 text-sm mb-6 line-clamp-3 min-h-[60px]">
                      {c.description}
                    </p>
                    
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-emerald-400 font-medium">{pledgedNum} XLM pledged</span>
                      <span className="text-slate-500">of {goalNum} XLM</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2.5 mb-4 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-2.5 rounded-full" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      {isExpired 
                        ? 'Ended' 
                        : `Ends in ${Math.ceil((c.deadline - (Date.now()/1000)) / 86400)} days`}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-800/80 border-t border-slate-700/50 mt-auto">
                    {!isExpired && !isGoalMet && (
                      <button 
                        onClick={() => setShowPledgeModal(c.address)}
                        disabled={!pubKey || submitting}
                        className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Back this project
                      </button>
                    )}
                    
                    {isCreator && isExpired && isGoalMet && c.status !== 3 && (
                      <button 
                        onClick={() => handleAction('withdraw', c.address)}
                        disabled={submitting}
                        className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-900 rounded-lg font-bold transition-colors disabled:opacity-50"
                      >
                        {submitting ? 'Processing...' : 'Withdraw Funds'}
                      </button>
                    )}
                    
                    {!isCreator && isExpired && !isGoalMet && (
                      <button 
                        onClick={() => handleAction('refund', c.address)}
                        disabled={submitting}
                        className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {submitting ? 'Processing...' : 'Claim Refund'}
                      </button>
                    )}
                    
                    {isGoalMet && !isExpired && (
                      <div className="text-center py-2 text-sm text-emerald-400 font-medium">
                        Goal reached! 🎉
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Start a Campaign</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                <input 
                  required
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  placeholder="E.g., Open Source Wallet"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea 
                  required
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors resize-none"
                  placeholder="Tell us about your project..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Goal (XLM)</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    step="0.0000001"
                    value={newGoal}
                    onChange={e => setNewGoal(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-cyan-500"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Duration (Days)</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    max="365"
                    value={newDeadlineDays}
                    onChange={e => setNewDeadlineDays(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={submitting || !pubKey}
                className="w-full mt-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-900 rounded-lg font-bold shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
              >
                {submitting ? 'Deploying to Testnet...' : 'Launch Campaign'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pledge Modal */}
      {showPledgeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Back this Project</h3>
              <button onClick={() => setShowPledgeModal(null)} className="text-slate-400 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handlePledge}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount to pledge (XLM)</label>
                <div className="relative">
                  <input 
                    required
                    type="number" 
                    min="1"
                    step="0.0000001"
                    value={pledgeAmount}
                    onChange={e => setPledgeAmount(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 pl-12 focus:outline-none focus:border-emerald-500 text-lg font-medium"
                    placeholder="100"
                    autoFocus
                  />
                  <span className="absolute left-4 top-3.5 font-bold text-slate-500">XLM</span>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg font-bold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
              >
                {submitting ? 'Confirming in Wallet...' : 'Confirm Pledge'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
