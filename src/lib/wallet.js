import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { assertFinalizedSuccess } from "./tx.js";
import { NETWORK } from "../config.js";

// Read-only client: no account, no key.
export function createReadClient() {
  return createClient({ chain: studionet });
}

export function getInjectedProvider() {
  return typeof window !== "undefined" ? window.ethereum ?? null : null;
}

// User-controlled signing: the wallet (e.g. MetaMask) holds the key and
// approves each transaction. The app never sees or stores a private key.
export async function connectWallet(provider = getInjectedProvider()) {
  if (!provider) throw new Error("No browser wallet found. Install MetaMask (or another EIP-1193 wallet) to sign transactions.");
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || accounts.length === 0) throw new Error("Wallet did not authorize any account.");
  const address = accounts[0];
  const client = createClient({ chain: studionet, account: address, provider });
  await client.connect(NETWORK);
  return { address, client };
}

// Sends a write and resolves only once the transaction is FINALIZED with a
// successful execution. Any other end state throws.
export async function writeAndFinalize({ walletClient, readClient, address, functionName, args, onUpdate }) {
  if (!walletClient) throw new Error("Connect your wallet first.");
  onUpdate?.({ phase: "signing" });
  const hash = await walletClient.writeContract({ address, functionName, args, value: 0n });
  onUpdate?.({ phase: "submitted", hash });
  const receipt = await readClient.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 200, interval: 3000 });
  const result = assertFinalizedSuccess(receipt);
  onUpdate?.({ phase: "finalized", hash, result });
  return { hash, result };
}
