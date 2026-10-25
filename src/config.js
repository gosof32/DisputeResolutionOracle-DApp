// Contract address comes from the environment (.env / hosting config).
// There is deliberately no fallback: without a configured address the app
// shows an explicit configuration error instead of talking to a random contract.
export const CONTRACT_ADDRESS = (import.meta.env?.VITE_CONTRACT_ADDRESS ?? "").trim();
export const NETWORK = "studionet";
export const EXPLORER_BASE = "https://explorer-studio.genlayer.com";
