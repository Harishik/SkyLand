/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export enum BuildingType {
  None = 'None',
  Road = 'Road',
  Residential = 'Residential',
  Commercial = 'Commercial',
  Industrial = 'Industrial',
  Park = 'Park',
  School = 'School',
  Hospital = 'Hospital',
  Entertainment = 'Entertainment',
}

export interface BuildingConfig {
  type: BuildingType;
  cost: number;
  name: string;
  description: string;
  color: string; // Main color for 3D material
  popGen: number; // Population generation per tick
  incomeGen: number; // Money generation per tick
}

export interface TileData {
  x: number;
  y: number;
  buildingType: BuildingType;
  // Suggested by AI for visual variety later
  variant?: number;
  level?: number;
}

export type Grid = TileData[][];

export interface CityStats {
  money: number;
  population: number;
  day: number;
}

export interface AIGoal {
  description: string;
  targetType: 'population' | 'money' | 'building_count';
  targetValue: number;
  buildingType?: BuildingType; // If target is building_count
  reward: number;
  completed: boolean;
}

export interface NewsItem {
  id: string;
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}

// --- Level 3: Advanced Protocol Types ---

export interface Transaction {
  hash: string;
  type: 'SWAP' | 'STAKE' | 'UNSTAKE' | 'VOTE' | 'REWARD' | 'DEPLOY';
  details: string;
  block: number;
  timestamp: number;
}

export interface AuditResult {
  score: number; // 1-100
  risk: 'Low' | 'Medium' | 'Critical';
  analysis: string;
}

export interface DAOProposal {
  id: string;
  title: string;
  description: string;
  options: {
    label: string;
    effectDescription: string;
    effectType: 'tax_break' | 'population_boom' | 'austerity' | 'festival';
  }[];
  expiresAt: number; // Game day
  votes: [number, number]; // Option A vs Option B
  status: 'active' | 'passed' | 'rejected';
  soliditySnippet?: string; // AI generated code representation
  audit?: AuditResult; // Result from AI audit
}

export interface Web3State {
  isConnected: boolean;
  address: string | null;
  skyBalance: number;
  stakedSky: number;
  skyPrice: number; // In City Cash
  blockNumber: number;
}
