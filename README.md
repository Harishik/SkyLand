[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
# Skyland

Skyland is an **isometric city‑builder game** designed to demonstrate how blockchain concepts can be applied to interactive software systems in a clear, non‑financial, and educational way. Instead of focusing on wallets or real money, Skyland uses a ledger‑based simulation model to make ideas such as transactions, blocks, immutability, and verification visible inside gameplay.

This repository contains the source code and assets for the Skyland web application.

---

## Overview

In Skyland, the player builds and grows a city by placing buildings, upgrading infrastructure, managing population growth, and participating in governance decisions. Behind the scenes, important game actions are recorded as transactions and grouped into blocks, forming an immutable history of how the city evolved over time.

The project is intended as:

* an educational demonstration of blockchain as a **system of record**,
* a practical example of blockchain‑backed application architecture,
* and a fully playable web‑based city‑builder game.

---

## Key Features

### City‑Builder Gameplay

* Isometric grid‑based city layout
* Multiple building types (Residential, Commercial, Industrial, Civic, Parks)
* Tick‑based simulation with daily updates
* Building upgrades with level‑based cost scaling
* Population and treasury management

### Ledger and Blockchain Simulation

* Game actions recorded as structured transactions
* Transactions grouped into blocks with hashes and timestamps
* Immutable, ordered history of city state changes
* Player‑visible block numbers and transaction logs

### Governance and Web3 Concepts (Non‑Financial)

* Simulated token system (no real value)
* Buy, sell, stake, and unstake actions for learning purposes
* Governance proposals with voting
* Simulated smart‑contract deployment events
* AI‑assisted proposal summaries and audit explanations (optional)

### Educational Focus

* No external wallets or real cryptocurrency
* Clear visualization of blockchain mechanics
* Emphasis on system design, verification, and transparency

---

## Technology Stack

* **Frontend**: React + TypeScript (Vite)
* **Rendering**: Three.js via React Three Fiber
* **AI Services**: Google GenAI SDK (Gemini) for optional AI‑driven features
* **Blockchain Services**: Google Cloud Blockchain APIs (managed infrastructure)
* **Deployment**: Web‑based cloud deployment (Google Cloud)

---

## Architecture Summary

Skyland is structured into three logical layers:

1. **Game Logic Layer**
   Handles city simulation, building rules, upgrades, resource updates, and events.

2. **Blockchain Interaction Layer**
   Converts validated game actions into transactions, submits them to blockchain services, and tracks confirmation status.

3. **Verification and Visualization Layer**
   Retrieves ledger data and displays blocks, hashes, and transaction history inside the UI.

This separation makes the system easier to maintain, extend, and reason about.

---

## Wallet Design Decision

Skyland does **not** use external wallets such as MetaMask. This is intentional.

* The project does not involve real money or asset transfer.
* Wallet flows would add unnecessary complexity without improving learning outcomes.
* Player identity is handled through an abstract, non‑financial identifier.

The goal is to teach blockchain fundamentals, not cryptocurrency trading.

---

## Running the Project Locally

1. Install dependencies:

```
npm install
```

2. Start the development server:

```
npm run dev
```

3. Open the application in your browser:

```
http://localhost:5173
```

Environment variables may be required for AI features or blockchain APIs, depending on your configuration.

---

## Deployment

Skyland is designed to run as a deployed web application on cloud infrastructure.

* Frontend assets are served as a static web app
* Blockchain interactions use managed cloud APIs
* AI features can be enabled or disabled at runtime

The deployed version demonstrates that Skyland is a real, operational application rather than a local prototype.
---

## Project Purpose

Skyland was built to show that blockchain technology can be useful **without** financial speculation. By embedding ledger verification into gameplay, the project demonstrates how immutable records, transparency, and ordered state transitions can enhance interactive systems.

---

## License

This project is intended for educational use. Licensing details can be added here if the project is distributed publicly.
