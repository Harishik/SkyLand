/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { Web3State, DAOProposal, CityStats, Transaction } from '../types';

interface Web3PanelProps {
  web3State: Web3State;
  onConnect: () => void;
  onSwap: (direction: 'buy' | 'sell', amount: number) => void;
  onStake: (amount: number) => void;
  onUnstake: (amount: number) => void;
  activeProposal: DAOProposal | null;
  onVote: (optionIndex: number) => void;
  onAudit: () => void;
  isAuditing: boolean;
  transactions: Transaction[];
  stats: CityStats;
}

const Web3Panel: React.FC<Web3PanelProps> = ({
  web3State,
  onConnect,
  onSwap,
  onStake,
  onUnstake,
  activeProposal,
  onVote,
  onAudit,
  isAuditing,
  transactions,
  stats
}) => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'defi' | 'dao' | 'explore'>('wallet');
  const [swapAmount, setSwapAmount] = useState<string>('100');
  const [stakeInput, setStakeInput] = useState<string>('0');
  const [isMinimized, setIsMinimized] = useState(false);

  if (!web3State.isConnected) {
    return (
      <div className="absolute top-20 left-4 z-30 pointer-events-auto">
        <button
          onClick={onConnect}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 px-6 rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.5)] border border-purple-400/30 transition-all transform hover:scale-105 backdrop-blur-md flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          Connect SkyWallet
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-20 left-4 z-30 pointer-events-auto flex flex-col gap-2 font-mono">
      {/* Main Container */}
      <div className={`w-80 bg-slate-900/95 text-white rounded-2xl border border-indigo-500/30 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col transition-all duration-300 ${isMinimized ? 'h-auto' : ''}`}>
        
        {/* Header Bar for Minimize */}
        <div 
            className="flex justify-between items-center px-4 py-3 bg-slate-950/80 border-b border-indigo-500/20 cursor-pointer hover:bg-slate-900/80 transition-colors"
            onClick={() => setIsMinimized(!isMinimized)}
        >
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                <span className="text-xs font-bold text-indigo-100 tracking-wide">SkyWallet Protocol</span>
            </div>
            <button className="text-slate-400 hover:text-white transition-colors">
                {isMinimized ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                )}
            </button>
        </div>

        {!isMinimized && (
        <>
            {/* Tabs */}
            <div className="flex border-b border-indigo-500/20 bg-slate-900/50">
            <button 
                onClick={() => setActiveTab('wallet')}
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'wallet' ? 'text-cyan-400 bg-indigo-900/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Wallet
            </button>
            <button 
                onClick={() => setActiveTab('defi')}
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'defi' ? 'text-purple-400 bg-indigo-900/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
                DeFi
            </button>
            <button 
                onClick={() => setActiveTab('dao')}
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'dao' ? 'text-pink-400 bg-indigo-900/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
                DAO
            </button>
            <button 
                onClick={() => setActiveTab('explore')}
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'explore' ? 'text-green-400 bg-indigo-900/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Scan
            </button>
            </div>

            {/* Content */}
            <div className="p-4 min-h-[220px]">
            
            {/* Wallet Tab */}
            {activeTab === 'wallet' && (
                <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5">
                    <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase">Address</span>
                    <span className="text-xs text-indigo-300 font-bold truncate w-32">{web3State.address}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 uppercase">Block</span>
                        <span className="text-xs text-green-400 font-bold">#{web3State.blockNumber}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 p-3 rounded-xl border border-indigo-500/20">
                        <span className="text-[10px] text-indigo-200 block mb-1">SKY Balance</span>
                        <span className="text-xl font-bold text-white block">{web3State.skyBalance.toFixed(1)}</span>
                        <span className="text-[9px] text-indigo-400">$SKY</span>
                    </div>
                    <div className="bg-gradient-to-br from-purple-900/50 to-slate-900 p-3 rounded-xl border border-purple-500/20">
                        <span className="text-[10px] text-purple-200 block mb-1">Staked</span>
                        <span className="text-xl font-bold text-white block">{web3State.stakedSky.toFixed(1)}</span>
                        <span className="text-[9px] text-purple-400">APY: 125%</span>
                    </div>
                </div>

                <div className="p-3 bg-slate-800/50 rounded-lg text-[10px] text-slate-400 border border-slate-700">
                    <p className="mb-1"><span className="text-green-400">Mining Active:</span> You are mining {((stats.population / 100) * 0.1).toFixed(2)} SKY/tick based on population count.</p>
                </div>
                </div>
            )}

            {/* DeFi Tab (AMM + Staking) */}
            {activeTab === 'defi' && (
                <div className="space-y-4 animate-fade-in">
                {/* Swap */}
                <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                    <h3 className="text-xs text-slate-300 font-bold mb-2 uppercase flex justify-between">
                    <span>SkySwap AMM</span>
                    <span className="text-cyan-400">1 SKY ≈ ${web3State.skyPrice.toFixed(2)}</span>
                    </h3>
                    <div className="flex gap-2 mb-2">
                    <input 
                        type="number" 
                        value={swapAmount}
                        onChange={(e) => setSwapAmount(e.target.value)}
                        className="w-full bg-black/30 border border-slate-600 rounded px-2 py-1 text-right text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                    </div>
                    <div className="flex gap-2">
                    <button 
                        onClick={() => onSwap('buy', Number(swapAmount))}
                        disabled={stats.money < Number(swapAmount) * web3State.skyPrice}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-1.5 rounded transition-colors"
                    >
                        BUY SKY
                    </button>
                    <button 
                        onClick={() => onSwap('sell', Number(swapAmount))}
                        disabled={web3State.skyBalance < Number(swapAmount)}
                        className="flex-1 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-1.5 rounded transition-colors"
                    >
                        SELL SKY
                    </button>
                    </div>
                </div>

                {/* Staking */}
                <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                    <h3 className="text-xs text-slate-300 font-bold mb-2 uppercase">Liquidity Staking</h3>
                    <div className="flex gap-2 mb-2">
                    <input 
                        type="number" 
                        value={stakeInput}
                        onChange={(e) => setStakeInput(e.target.value)}
                        className="w-full bg-black/30 border border-slate-600 rounded px-2 py-1 text-right text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                    </div>
                    <div className="flex gap-2">
                    <button 
                        onClick={() => onStake(Number(stakeInput))}
                        disabled={web3State.skyBalance < Number(stakeInput)}
                        className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-1.5 rounded transition-colors"
                    >
                        STAKE
                    </button>
                    <button 
                        onClick={() => onUnstake(Number(stakeInput))}
                        disabled={web3State.stakedSky < Number(stakeInput)}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-1.5 rounded transition-colors"
                    >
                        UNSTAKE
                    </button>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-2 text-center">Staking increases city growth rate.</p>
                </div>
                </div>
            )}

            {/* DAO Tab */}
            {activeTab === 'dao' && (
                <div className="space-y-3 animate-fade-in">
                {!activeProposal ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center opacity-50">
                        <svg className="w-8 h-8 mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <p className="text-xs text-slate-300">No active proposals.</p>
                        <p className="text-[9px] text-slate-500">The Oracle generates proposals periodically.</p>
                    </div>
                ) : (
                    <div className="bg-slate-800/60 rounded-xl border border-pink-500/30 p-3 relative overflow-hidden flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <h3 className="text-xs font-bold text-white mb-1 pr-10">{activeProposal.title}</h3>
                            <div className="bg-pink-600 text-[9px] font-bold px-2 py-0.5 rounded text-white">ACTIVE</div>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-tight">{activeProposal.description}</p>
                        
                        {/* Smart Contract Snippet */}
                        <div className="bg-black/50 p-2 rounded text-[8px] font-mono text-green-300 border border-green-900/30 overflow-x-auto whitespace-pre">
                            <div className="opacity-50 mb-1">// Proposed Update</div>
                            {activeProposal.soliditySnippet || "function update() external;"}
                        </div>

                        {/* Audit Section */}
                        {activeProposal.audit ? (
                            <div className={`p-2 rounded border text-[9px] ${activeProposal.audit.risk === 'Critical' ? 'bg-red-900/20 border-red-500/50 text-red-200' : 'bg-green-900/20 border-green-500/50 text-green-200'}`}>
                                <div className="flex justify-between font-bold mb-1">
                                    <span>Risk: {activeProposal.audit.risk}</span>
                                    <span>Score: {activeProposal.audit.score}/100</span>
                                </div>
                                <p className="opacity-80">{activeProposal.audit.analysis}</p>
                            </div>
                        ) : (
                            <button 
                                onClick={onAudit}
                                disabled={isAuditing}
                                className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-[9px] text-slate-300 rounded border border-slate-600 transition-colors flex items-center justify-center gap-2"
                            >
                                {isAuditing ? (
                                    <>
                                    <span className="w-2 h-2 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></span>
                                    Auditing Contract...
                                    </>
                                ) : (
                                    "Run Smart Contract Audit"
                                )}
                            </button>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-1">
                            {activeProposal.options.map((opt, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => onVote(idx)}
                                    disabled={activeProposal.status !== 'active'}
                                    className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-pink-500 hover:text-pink-400 p-2 rounded text-center transition-all group"
                                >
                                    <span className="text-[10px] font-bold block">{opt.label}</span>
                                    <span className="text-[8px] text-slate-500 group-hover:text-pink-500/70">{opt.effectType}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                </div>
            )}

            {/* Block Explorer Tab */}
            {activeTab === 'explore' && (
                <div className="space-y-2 animate-fade-in h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {transactions.length === 0 ? (
                        <div className="text-center text-[10px] text-slate-500 mt-10">No transactions found.</div>
                    ) : (
                        transactions.slice().reverse().map((tx) => (
                            <div key={tx.hash} className="bg-slate-800/40 p-2 rounded border border-slate-700/50 flex flex-col gap-1">
                                <div className="flex justify-between items-center">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                        tx.type === 'DEPLOY' ? 'bg-blue-900 text-blue-300' :
                                        tx.type === 'VOTE' ? 'bg-pink-900 text-pink-300' :
                                        'bg-green-900 text-green-300'
                                    }`}>{tx.type}</span>
                                    <span className="text-[8px] text-slate-500 font-mono">Blk #{tx.block}</span>
                                </div>
                                <div className="text-[9px] text-slate-300 truncate">{tx.details}</div>
                                <div className="text-[8px] text-slate-600 font-mono truncate">Tx: {tx.hash}</div>
                            </div>
                        ))
                    )}
                </div>
            )}

            </div>
        </>
        )}
      </div>
    </div>
  );
};

export default Web3Panel;