# ⚖️ DisputeResolutionOracle — Decentralized Arbitration Platform

A complete dApp and Intelligent Contract primitive built on **GenLayer** that provides autonomous, AI-driven dispute resolution through multi-validator consensus.

---

## 🌟 Architecture & Core Workflow
1. **Intelligent Contract (`DisputeResolutionOracle.py`):** Manages dispute states, stores claims on-chain, and executes non-deterministic AI evaluations using `gl.exec_prompt`.
2. **Frontend Dashboard (`index.html`):** Provides a clean web interface for users to submit claims and trigger decentralized resolution.
3. **GenLayer Consensus:** Eliminates centralized single-point-of-failure oracles by letting validator ensembles evaluate claims collaboratively.

---

## 🚀 How to Test & Run
1. Open [GenLayer Studio](https://studio.genlayer.com).
2. Create `DisputeResolutionOracle.py` and paste the contract code.
3. Deploy the contract instance to the network.
4. Call `create_dispute` to register a claim.
5. Call `resolve_dispute` to trigger validator consensus (`gl.exec_prompt`).
6. Open `index.html` locally to view the frontend interface.
