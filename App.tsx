/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Grid, TileData, BuildingType, CityStats, AIGoal, NewsItem, Web3State, DAOProposal, Transaction } from './types';
import { GRID_SIZE, BUILDINGS, TICK_RATE_MS, INITIAL_MONEY } from './constants';
import IsoMap from './components/IsoMap';
import UIOverlay from './components/UIOverlay';
import Web3Panel from './components/Web3Panel';
import StartScreen from './components/StartScreen';
import { generateCityGoal, generateNewsEvent, generateGovernanceProposal, auditSmartContract } from './services/geminiService';

// Initialize empty grid with island shape generation for 3D visual interest
const createInitialGrid = (): Grid => {
  const grid: Grid = [];
  const center = GRID_SIZE / 2;
  // const radius = GRID_SIZE / 2 - 1;

  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      // Simple circle crop for island look
      const dist = Math.sqrt((x-center)*(x-center) + (y-center)*(y-center));
      
      row.push({ x, y, buildingType: BuildingType.None, level: 1 });
    }
    grid.push(row);
  }
  return grid;
};

// Helper for fake hash
const generateHash = () => '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');

function App() {
  // --- Game State ---
  const [gameStarted, setGameStarted] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  const [grid, setGrid] = useState<Grid>(createInitialGrid);
  const [stats, setStats] = useState<CityStats>({ money: INITIAL_MONEY, population: 0, day: 1 });
  const [selectedTool, setSelectedTool] = useState<BuildingType>(BuildingType.Road);
  const [selectedTilePos, setSelectedTilePos] = useState<{x: number, y: number} | null>(null);
  
  // --- AI State ---
  const [currentGoal, setCurrentGoal] = useState<AIGoal | null>(null);
  const [isGeneratingGoal, setIsGeneratingGoal] = useState(false);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);
  
  // --- Level 3: Advanced Protocol State ---
  const [web3State, setWeb3State] = useState<Web3State>({
    isConnected: false,
    address: null,
    skyBalance: 0,
    stakedSky: 0,
    skyPrice: 50, // 1 SKY = $50 City Cash initially
    blockNumber: 1024500
  });
  const [activeProposal, setActiveProposal] = useState<DAOProposal | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);

  const [gameModifiers, setGameModifiers] = useState({
    taxRate: 1.0,
    growthRate: 1.0,
  });

  // Refs for accessing state inside intervals without dependencies
  const gridRef = useRef(grid);
  const statsRef = useRef(stats);
  const goalRef = useRef(currentGoal);
  const aiEnabledRef = useRef(aiEnabled);
  const web3Ref = useRef(web3State);
  const modifiersRef = useRef(gameModifiers);
  const lastNewsTime = useRef(0);
  const lastProposalTime = useRef(0);
  const activeProposalRef = useRef(activeProposal);

  // Sync refs
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { goalRef.current = currentGoal; }, [currentGoal]);
  useEffect(() => { aiEnabledRef.current = aiEnabled; }, [aiEnabled]);
  useEffect(() => { web3Ref.current = web3State; }, [web3State]);
  useEffect(() => { modifiersRef.current = gameModifiers; }, [gameModifiers]);
  useEffect(() => { activeProposalRef.current = activeProposal; }, [activeProposal]);

  // --- Helpers ---
  const addTransaction = (type: Transaction['type'], details: string) => {
      const newTx: Transaction = {
          hash: generateHash(),
          type,
          details,
          block: web3Ref.current.blockNumber,
          timestamp: Date.now()
      };
      setTransactions(prev => [...prev.slice(-19), newTx]); // Keep last 20
  };

  const addNewsItem = useCallback((item: NewsItem) => {
    setNewsFeed(prev => [...prev.slice(-12), item]); // Keep last few
  }, []);

  const fetchNewGoal = useCallback(async () => {
    if (isGeneratingGoal || !aiEnabledRef.current) return;
    setIsGeneratingGoal(true);
    // Short delay for visual effect
    await new Promise(r => setTimeout(r, 500));
    
    const newGoal = await generateCityGoal(statsRef.current, gridRef.current);
    if (newGoal) {
      setCurrentGoal(newGoal);
    } else {
      // Retry logic:
      // If failed (likely rate limit or error), wait longer (60s) before trying again
      if(aiEnabledRef.current) {
          console.log("Goal generation failed or rate limited, retrying in 60s...");
          setTimeout(fetchNewGoal, 60000);
      }
    }
    setIsGeneratingGoal(false);
  }, [isGeneratingGoal]); 

  const fetchNews = useCallback(async () => {
    // Only attempt news fetch if enough time has passed (e.g., 60 seconds) to respect rate limits
    const now = Date.now();
    if (now - lastNewsTime.current < 60000) return;

    // Reduced probability to ~1% per tick (tick is 2s) to further space out calls
    if (!aiEnabledRef.current || Math.random() > 0.01) return; 
    
    lastNewsTime.current = now;
    const news = await generateNewsEvent(statsRef.current, null);
    if (news) {
        addNewsItem(news);
    }
  }, [addNewsItem]);

  const fetchProposal = useCallback(async () => {
      const now = Date.now();
      // Ensure we don't spam. Minimum 30 seconds between checks, effectively controlled by probability
      if (now - lastProposalTime.current < 30000) return;
      
      // If not connected or already have a proposal, skip
      if (!web3Ref.current.isConnected || activeProposalRef.current) return;

      // 10% chance per tick to generate if slot is open
      if (Math.random() > 0.1) return;

      lastProposalTime.current = now;
      const proposal = await generateGovernanceProposal(statsRef.current);
      if (proposal) setActiveProposal(proposal);
  }, []);

  // --- Initial Setup ---
  useEffect(() => {
    if (!gameStarted) return;

    addNewsItem({ id: Date.now().toString(), text: "Welcome to SkyLand. Terrain generation complete.", type: 'positive' });
    
    if (aiEnabled) {
      fetchNewGoal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted]);


  // --- Game Loop ---
  useEffect(() => {
    if (!gameStarted) return;

    const intervalId = setInterval(() => {
      // 1. Calculate income/pop gen
      let dailyIncome = 0;
      let dailyPopGrowth = 0;
      let buildingCounts: Record<string, number> = {};

      gridRef.current.flat().forEach(tile => {
        if (tile.buildingType !== BuildingType.None) {
          const config = BUILDINGS[tile.buildingType];
          const level = tile.level || 1;
          
          dailyIncome += config.incomeGen * level;
          dailyPopGrowth += config.popGen * level;
          
          buildingCounts[tile.buildingType] = (buildingCounts[tile.buildingType] || 0) + 1;
        }
      });

      // Apply DAO Modifiers
      dailyIncome *= modifiersRef.current.taxRate;
      dailyPopGrowth *= modifiersRef.current.growthRate;

      // Staking Reward (Level 3)
      if (web3Ref.current.stakedSky > 0) {
          // Staking boosts population growth by 10% per 100 SKY
          const stakeBonus = 1 + (web3Ref.current.stakedSky / 1000);
          dailyPopGrowth *= stakeBonus;
      }

      // Cap population growth by residential count just for some logic
      // Assume each level adds capacity (base * level)
      let housingCap = 0;
      gridRef.current.flat().forEach(tile => {
        if (tile.buildingType === BuildingType.Residential) {
            housingCap += 50 * (tile.level || 1);
        }
      });

      // 2. Update Stats
      setStats(prev => {
        let newPop = prev.population + dailyPopGrowth;
        if (newPop > housingCap) newPop = housingCap; // limit
        if (housingCap === 0 && prev.population > 0) newPop = Math.max(0, prev.population - 5); // people leave if no homes

        const newStats = {
          money: prev.money + dailyIncome,
          population: newPop,
          day: prev.day + 1,
        };
        
        // 3. Check Goal Completion
        const goal = goalRef.current;
        if (aiEnabledRef.current && goal && !goal.completed) {
          let isMet = false;
          if (goal.targetType === 'money' && newStats.money >= goal.targetValue) isMet = true;
          if (goal.targetType === 'population' && newStats.population >= goal.targetValue) isMet = true;
          if (goal.targetType === 'building_count' && goal.buildingType) {
            if ((buildingCounts[goal.buildingType] || 0) >= goal.targetValue) isMet = true;
          }

          if (isMet) {
            setCurrentGoal({ ...goal, completed: true });
          }
        }

        return newStats;
      });

      // 4. Update Web3 State (Mining)
      if (web3Ref.current.isConnected) {
        setWeb3State(prev => ({
            ...prev,
            // Proof-of-Population Mining: More people = More SKY mined
            skyBalance: prev.skyBalance + (statsRef.current.population / 100) * 0.1,
            // Simple price fluctuation
            skyPrice: Math.max(10, prev.skyPrice + (Math.random() - 0.5) * 2),
            blockNumber: prev.blockNumber + 1
        }));
      }

      // 5. Trigger news & DAO
      fetchNews();
      fetchProposal();

    }, TICK_RATE_MS);

    return () => clearInterval(intervalId);
  }, [fetchNews, fetchProposal, gameStarted]);


  // --- Interaction Logic ---

  const handleTileClick = useCallback((x: number, y: number) => {
    if (!gameStarted) return; // Prevent clicking through start screen

    const currentGrid = gridRef.current;
    const currentStats = statsRef.current;
    const tool = selectedTool; // Capture current tool
    
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    const currentTile = currentGrid[y][x];
    const buildingConfig = BUILDINGS[tool];

    // Check if we are selecting an existing building (and NOT bulldozing)
    if (tool !== BuildingType.None && currentTile.buildingType !== BuildingType.None) {
        // If clicking on an existing building, select it for inspection/upgrade
        // (Unless we are trying to replace it? For now, prevent replacement without bulldoze)
        if (currentTile.buildingType !== BuildingType.Road) { // Don't select roads
             setSelectedTilePos({ x, y });
             return;
        }
    }

    // Bulldoze logic
    if (tool === BuildingType.None) {
      if (currentTile.buildingType !== BuildingType.None) {
        const demolishCost = 5;
        if (currentStats.money >= demolishCost) {
            // Deselect if we are destroying the selected tile
            if (selectedTilePos?.x === x && selectedTilePos?.y === y) {
                setSelectedTilePos(null);
            }

            const newGrid = currentGrid.map(row => [...row]);
            newGrid[y][x] = { ...currentTile, buildingType: BuildingType.None, level: 1 };
            setGrid(newGrid);
            setStats(prev => ({ ...prev, money: prev.money - demolishCost }));
            // Sound effect here
        } else {
            addNewsItem({id: Date.now().toString(), text: "Cannot afford demolition costs.", type: 'negative'});
        }
      }
      return;
    }

    // Placement Logic
    if (currentTile.buildingType === BuildingType.None) {
      if (currentStats.money >= buildingConfig.cost) {
        // Clear selection if placing a new building
        if (selectedTilePos) setSelectedTilePos(null);

        // Deduct cost
        setStats(prev => ({ ...prev, money: prev.money - buildingConfig.cost }));
        
        // Place building
        const newGrid = currentGrid.map(row => [...row]);
        newGrid[y][x] = { ...currentTile, buildingType: tool, level: 1 };
        setGrid(newGrid);
        // Sound effect here
      } else {
        // Not enough money feedback
        addNewsItem({id: Date.now().toString() + Math.random(), text: `Treasury insufficient for ${buildingConfig.name}.`, type: 'negative'});
      }
    }
  }, [selectedTool, addNewsItem, gameStarted, selectedTilePos]);

  const handleUpgrade = () => {
    if (!selectedTilePos) return;
    const {x, y} = selectedTilePos;
    const tile = grid[y][x];
    const config = BUILDINGS[tile.buildingType];
    const currentLevel = tile.level || 1;
    
    // Cost scales with level: Base * 1.5^(level)
    const upgradeCost = Math.floor(config.cost * Math.pow(1.5, currentLevel));
    
    if (stats.money >= upgradeCost) {
        setStats(prev => ({...prev, money: prev.money - upgradeCost}));
        
        const newGrid = grid.map(row => [...row]);
        newGrid[y][x] = { ...tile, level: currentLevel + 1 };
        setGrid(newGrid);
        
        addNewsItem({id: Date.now().toString(), text: `Upgraded ${config.name} to Level ${currentLevel + 1}!`, type: 'positive'});
    } else {
        addNewsItem({id: Date.now().toString(), text: "Insufficient funds for upgrade.", type: 'negative'});
    }
  };

  const handleClaimReward = () => {
    if (currentGoal && currentGoal.completed) {
      setStats(prev => ({ ...prev, money: prev.money + currentGoal.reward }));
      addNewsItem({id: Date.now().toString(), text: `Goal achieved! ${currentGoal.reward} deposited to treasury.`, type: 'positive'});
      setCurrentGoal(null);
      fetchNewGoal();
    }
  };

  const handleStart = (enabled: boolean) => {
    setAiEnabled(enabled);
    setGameStarted(true);
  };

  const handleSelectTool = (tool: BuildingType) => {
      setSelectedTool(tool);
      setSelectedTilePos(null); // Deselect building when changing tool
  };

  // --- Web3 Handlers ---
  const handleConnectWallet = async () => {
      setWeb3State(prev => ({
          ...prev,
          isConnected: true,
          address: '0x71C...9A23',
          skyBalance: 100 // Airdrop
      }));
      addNewsItem({id: Date.now().toString(), text: "Wallet connected. Accessing SkyLand Protocol...", type: 'positive'});
      
      // Force fetch a proposal for immediate engagement
      if(!activeProposal) {
          const proposal = await generateGovernanceProposal(statsRef.current);
          if (proposal) setActiveProposal(proposal);
      }
  };

  const handleSwap = (direction: 'buy' | 'sell', amount: number) => {
      const price = web3State.skyPrice;
      const cost = amount * price;

      if (direction === 'buy') {
          if (stats.money >= cost) {
              setStats(prev => ({...prev, money: prev.money - cost}));
              setWeb3State(prev => ({...prev, skyBalance: prev.skyBalance + amount}));
              addTransaction('SWAP', `Buy ${amount} SKY`);
              addNewsItem({id: Date.now().toString(), text: `Swapped $${Math.floor(cost)} for ${amount} SKY`, type: 'neutral'});
          }
      } else {
          if (web3State.skyBalance >= amount) {
              setStats(prev => ({...prev, money: prev.money + cost}));
              setWeb3State(prev => ({...prev, skyBalance: prev.skyBalance - amount}));
              addTransaction('SWAP', `Sell ${amount} SKY`);
              addNewsItem({id: Date.now().toString(), text: `Sold ${amount} SKY for $${Math.floor(cost)}`, type: 'neutral'});
          }
      }
  };

  const handleStake = (amount: number) => {
      if (web3State.skyBalance >= amount) {
          setWeb3State(prev => ({
              ...prev,
              skyBalance: prev.skyBalance - amount,
              stakedSky: prev.stakedSky + amount
          }));
          addTransaction('STAKE', `Staked ${amount} SKY`);
      }
  };

  const handleUnstake = (amount: number) => {
      if (web3State.stakedSky >= amount) {
          setWeb3State(prev => ({
              ...prev,
              skyBalance: prev.skyBalance + amount,
              stakedSky: prev.stakedSky - amount
          }));
          addTransaction('UNSTAKE', `Unstaked ${amount} SKY`);
      }
  };

  const handleAudit = async () => {
      if (!activeProposal || isAuditing) return;
      setIsAuditing(true);
      const result = await auditSmartContract(activeProposal);
      if (result) {
          setActiveProposal(prev => prev ? ({...prev, audit: result}) : null);
          addNewsItem({id: Date.now().toString(), text: `Contract Audit Completed. Risk: ${result.risk}`, type: 'neutral'});
      }
      setIsAuditing(false);
  };

  const handleVote = (optionIndex: number) => {
    if (!activeProposal) return;
    
    // Simple vote logic: Player choice passes immediately for simulation
    const choice = activeProposal.options[optionIndex];
    
    addNewsItem({id: Date.now().toString(), text: `DAO Proposal Passed: ${choice.label}`, type: 'positive'});
    addTransaction('VOTE', `Voted: ${choice.label}`);
    addTransaction('DEPLOY', `Contract Deployed: ${activeProposal.title}`);

    // Apply Effects
    if (choice.effectType === 'tax_break') setGameModifiers(prev => ({...prev, taxRate: 1.2})); // Simulation: Lower tax attracts more? simplified to just income mod
    if (choice.effectType === 'population_boom') setGameModifiers(prev => ({...prev, growthRate: 1.5}));
    if (choice.effectType === 'austerity') setGameModifiers(prev => ({...prev, taxRate: 0.8, growthRate: 0.8}));
    if (choice.effectType === 'festival') {
        setStats(prev => ({...prev, money: prev.money - 500})); // cost
        setGameModifiers(prev => ({...prev, growthRate: 2.0}));
    }

    setActiveProposal(null);
  };

  const selectedTileData = selectedTilePos ? grid[selectedTilePos.y][selectedTilePos.x] : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden selection:bg-transparent selection:text-transparent">
      {/* 3D Rendering Layer - Always visible now, providing background for start screen */}
      <IsoMap 
        grid={grid} 
        onTileClick={handleTileClick} 
        hoveredTool={selectedTool}
        population={stats.population}
      />
      
      {/* Start Screen Overlay */}
      {!gameStarted && (
        <StartScreen onStart={handleStart} />
      )}

      {/* UI Layer */}
      {gameStarted && (
        <>
            <UIOverlay
                stats={stats}
                selectedTool={selectedTool}
                onSelectTool={handleSelectTool}
                currentGoal={currentGoal}
                newsFeed={newsFeed}
                onClaimReward={handleClaimReward}
                isGeneratingGoal={isGeneratingGoal}
                aiEnabled={aiEnabled}
                selectedTile={selectedTileData}
                onUpgrade={handleUpgrade}
                onCloseSelection={() => setSelectedTilePos(null)}
            />
            {/* Level 3: Web3 Overlay */}
            <Web3Panel 
                web3State={web3State}
                onConnect={handleConnectWallet}
                onSwap={handleSwap}
                onStake={handleStake}
                onUnstake={handleUnstake}
                activeProposal={activeProposal}
                onVote={handleVote}
                onAudit={handleAudit}
                isAuditing={isAuditing}
                transactions={transactions}
                stats={stats}
            />
        </>
      )}
    </div>
  );
}

export default App;