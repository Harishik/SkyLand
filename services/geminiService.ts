/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import { AIGoal, BuildingType, CityStats, Grid, NewsItem, DAOProposal, AuditResult } from "../types";
import { BUILDINGS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelId = 'gemini-2.5-flash';

// Helper to safely parse JSON from Gemini response
const parseJSON = (text: string | undefined) => {
    if (!text) return null;
    try {
        // Remove markdown code blocks if present
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.warn("Failed to parse JSON from model output:", text.substring(0, 50) + "...");
        return null;
    }
}

// Helper for error handling
const handleApiError = (error: any, context: string) => {
    const msg = error?.message || '';
    if (msg.includes('429') || msg.includes('Quota') || error.status === 'RESOURCE_EXHAUSTED') {
        console.warn(`[Gemini API] Rate limit reached during ${context}. Usage will be throttled.`);
    } else {
        console.error(`[Gemini API] Error during ${context}:`, error);
    }
    return null;
}

// --- Goal Generation ---

const goalSchema = {
  type: Type.OBJECT,
  properties: {
    description: {
      type: Type.STRING,
      description: "A short, creative description of the goal from the perspective of city council or citizens.",
    },
    targetType: {
      type: Type.STRING,
      enum: ['population', 'money', 'building_count'],
      description: "The metric to track.",
    },
    targetValue: {
      type: Type.INTEGER,
      description: "The target numeric value to reach.",
    },
    buildingType: {
      type: Type.STRING,
      enum: [
        BuildingType.Residential, 
        BuildingType.Commercial, 
        BuildingType.Industrial, 
        BuildingType.Park, 
        BuildingType.Road,
        BuildingType.School,
        BuildingType.Hospital,
        BuildingType.Entertainment
      ],
      description: "Required if targetType is building_count.",
    },
    reward: {
      type: Type.INTEGER,
      description: "Monetary reward for completion.",
    },
  },
  required: ['description', 'targetType', 'targetValue', 'reward'],
};

export const generateCityGoal = async (stats: CityStats, grid: Grid): Promise<AIGoal | null> => {
  // Count buildings
  const counts: Record<string, number> = {};
  grid.flat().forEach(tile => {
    counts[tile.buildingType] = (counts[tile.buildingType] || 0) + 1;
  });

  const context = `
    Current City Stats:
    Day: ${stats.day}
    Money: $${stats.money}
    Population: ${stats.population}
    Buildings: ${JSON.stringify(counts)}
    Building Costs/Stats: ${JSON.stringify(
      Object.values(BUILDINGS).filter(b => b.type !== BuildingType.None).map(b => ({type: b.type, cost: b.cost, pop: b.popGen, income: b.incomeGen}))
    )}
  `;

  const systemInstruction = `You are the AI City Advisor for a simulation game. Your goal is to keep the player engaged with challenging but achievable short-term goals to help the city grow.`;
  const prompt = `Based on the current city stats, generate a goal. Return JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `${context}\n${prompt}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: goalSchema,
        temperature: 0.7,
      },
    });

    const goalData = parseJSON(response.text);
    if (goalData) {
        return { ...goalData, completed: false };
    }
  } catch (error) {
    return handleApiError(error, 'goal generation');
  }
  return null;
};

// --- News Feed Generation ---

const newsSchema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING, description: "A one-sentence news headline representing life in the city." },
    type: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] },
  },
  required: ['text', 'type'],
};

export const generateNewsEvent = async (stats: CityStats, recentAction: string | null): Promise<NewsItem | null> => {
  const context = `City Stats - Pop: ${stats.population}, Money: ${stats.money}, Day: ${stats.day}. ${recentAction ? `Recent Action: ${recentAction}` : ''}`;
  const systemInstruction = "You are a news generator for a city simulation game. Generate very short, isometric-sim-city style news headlines. Can be funny, cynical, or celebratory.";
  const prompt = "Generate a headline.";

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `${context}\n${prompt}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: newsSchema,
        temperature: 1.1, // High temp for variety
      },
    });

    const data = parseJSON(response.text);
    if (data) {
      return {
        id: Date.now().toString() + Math.random(),
        text: data.text,
        type: data.type,
      };
    }
  } catch (error) {
    return handleApiError(error, 'news generation');
  }
  return null;
};

// --- DAO Governance Generation (Level 3 Feature) ---

const daoSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A catchy name for a city policy proposal." },
    description: { type: Type.STRING, description: "A 2-sentence description of the issue." },
    options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: "Short voting option text (e.g. 'Raise Taxes')." },
          effectDescription: { type: Type.STRING, description: "What happens if this passes (flavor text)." },
          effectType: { type: Type.STRING, enum: ['tax_break', 'population_boom', 'austerity', 'festival'] }
        },
        required: ['label', 'effectDescription', 'effectType']
      }
    },
    soliditySnippet: { type: Type.STRING, description: "A short, mock Solidity function signature that represents this policy change (e.g. 'function setTaxRate(uint256 newRate) external onlyOwner')." }
  },
  required: ['title', 'description', 'options', 'soliditySnippet'],
};

export const generateGovernanceProposal = async (stats: CityStats): Promise<DAOProposal | null> => {
  const context = `City Stats - Pop: ${stats.population}, Money: ${stats.money}, Day: ${stats.day}.`;
  const systemInstruction = "You are the Decentralized Governance Oracle. Generate a binary policy proposal for the SkyLand DAO based on city needs. The options should have trade-offs. Also provide a Solidity code snippet representing the contract update.";
  const prompt = "Generate a DAO proposal.";

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `${context}\n${prompt}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: daoSchema,
        temperature: 0.8,
      },
    });

    const data = parseJSON(response.text);
    if (data && data.options && data.options.length >= 2) {
      return {
        id: `prop-${Date.now()}`,
        title: data.title,
        description: data.description,
        options: data.options.slice(0, 2), // Ensure binary choice
        expiresAt: stats.day + 5, // 5 day voting period
        votes: [0, 0],
        status: 'active',
        soliditySnippet: data.soliditySnippet
      };
    }
  } catch (error) {
    return handleApiError(error, 'DAO generation');
  }
  return null;
};

// --- Smart Contract Audit (Level 3 Feature) ---

const auditSchema = {
    type: Type.OBJECT,
    properties: {
        score: { type: Type.INTEGER, description: "Security/Stability score from 1-100." },
        risk: { type: Type.STRING, enum: ['Low', 'Medium', 'Critical'] },
        analysis: { type: Type.STRING, description: "A one sentence analysis of the economic or security impact." }
    },
    required: ['score', 'risk', 'analysis']
};

export const auditSmartContract = async (proposal: DAOProposal): Promise<AuditResult | null> => {
    const context = `Proposal: ${proposal.title}. Description: ${proposal.description}. Contract Snippet: ${proposal.soliditySnippet}`;
    const systemInstruction = "You are an expert Smart Contract Auditor and Economist. Analyze the proposed city governance change for risks.";
    
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `${context}`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: auditSchema,
                temperature: 0.5
            }
        });

        const data = parseJSON(response.text);
        if (data) return data as AuditResult;
    } catch (error) {
        return handleApiError(error, 'Audit generation');
    }
    return null;
};
