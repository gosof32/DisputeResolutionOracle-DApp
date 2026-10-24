import React, { useState } from 'react';
import { createClient, createAccount, generatePrivateKey } from 'genlayer-js';
import { TransactionHashVariant } from 'genlayer-js';

const CONTRACT = "0x2581b8e4485BEC23E8F4dc4053208f39F3bc50d1";
const EXPLORER = `https://explorer-studio.genlayer.com/address/${CONTRACT}`;
const KEY_SLOT = "dispute_oracle.keys";

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

function loadKeys() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY_SLOT) || "[]");
    return Array.isArray(raw) ? raw.filter((k) => typeof k === "string" && k) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [keys, setKeys] = useState(loadKeys());
  const [active, setActive] = useState(0);
  const [logMsg, setLogMsg] = useState('');
  const [claim, setClaim] = useState('');
  const [evidence, setEvidence] = useState('');
  const [disputeId, setDisputeId] = useState('');
  const [detailResult, setDetailResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const account = keys.length ? createAccount(keys[active]) : null;
  const me = account ? String(account.address) : "";
  
  const client = account ? createClient({ endpoint: "https://studio.genlayer.com/api", account }) : null;
  const reader = createClient({ endpoint: "https://studio.genlayer.com/api", account: createAccount(generatePrivateKey()) });

  const log = (msg) => {
    setLogMsg(msg);
    setTimeout(() => setLogMsg(''), 6000);
  };

  const saveKeys = (newKeys) => {
    setKeys(newKeys);
    localStorage.setItem(KEY_SLOT, JSON.stringify(newKeys));
  };

  const handleGenKey = () => {
    const newK = generatePrivateKey();
    const updated = [...keys, newK];
    saveKeys(updated);
    setActive(updated.length - 1);
    log("New key generated successfully");
  };

  const handleImportKey = () => {
    const k = prompt("Enter Private Key (0x...):");
    if (!k) return;
    const updated = [...keys, k.trim()];
    saveKeys(updated);
    setActive(updated.length - 1);
    log("Key imported successfully");
  };

  const handleCreateDispute = async (e) => {
    e.preventDefault();
    if (!client) return alert("Please generate or add a wallet key first!");
    if (!claim || !evidence) return alert("Fill in both claim and evidence URL!");
    setLoading(true);
    log("Sending create_dispute transaction to GenLayer contract...");
    try {
      const hash = await client.writeContract({
        address: CONTRACT,
        functionName: 'create_dispute',
        args: [claim, evidence],
      });
      log(`Dispute submitted! Tx: ${hash.slice(0, 10)}... waiting for finalization`);
      await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 160, interval: 3000 });
      log("Dispute successfully finalized on-chain!");
      setClaim('');
      setEvidence('');
    } catch (e) {
      log(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (idNum) => {
    if (!client) return alert("No active wallet key!");
    setLoading(true);
    log(`Triggering AI consensus resolve_dispute for ID #${idNum}...`);
    try {
      const hash = await client.writeContract({
        address: CONTRACT,
        functionName: 'resolve_dispute',
        args: [BigInt(idNum)],
      });
      log(`Resolution executed! Tx: ${hash.slice(0, 10)}... waiting confirmation`);
      await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 160, interval: 3000 });
      log(`Dispute #${idNum} successfully resolved by AI consensus!`);
      fetchDetails(idNum);
    } catch (e) {
      log(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (idNum) => {
    setLoading(true);
    log(`Reading contract state for Dispute ID #${idNum}...`);
    try {
      // Menggunakan parameter BigInt dan opsi LATEST_FINAL sesuai standar SDK GenLayer JS
      const rClaim = await reader.readContract({ 
        address: CONTRACT, 
        functionName: 'get_dispute_claim', 
        args: [BigInt(idNum)],
        transactionHashVariant: TransactionHashVariant.LATEST_FINAL
      });

      const rEvid = await reader.readContract({ 
        address: CONTRACT, 
        functionName: 'get_dispute_evidence', 
        args: [BigInt(idNum)],
        transactionHashVariant: TransactionHashVariant.LATEST_FINAL
      });

      const rStatus = await reader.readContract({ 
        address: CONTRACT, 
        functionName: 'get_dispute_status', 
        args: [BigInt(idNum)],
        transactionHashVariant: TransactionHashVariant.LATEST_FINAL
      });
      
      setDetailResult({
        id: idNum,
        claim: String(rClaim || `Dispute Claim ID #${idNum}`),
        evidence: String(rEvid || 'https://...'),
        status: String(rStatus || 'PENDING')
      });
      log(`Successfully fetched data for Dispute ID #${idNum}`);
    } catch (e) {
      log(`Read error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '30px auto', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h2>⚖️ Dispute Resolution Oracle dApp</h2>
      <p style={{ fontSize: '13px', color: '#64748b' }}>
        Contract: <a href={EXPLORER} target="_blank" rel="noreferrer" style={{ color: '#4f46e5' }}>{short(CONTRACT)}</a> (GenLayer Studio)
      </p>

      {/* Wallet Bar */}
      <div style={{ background: '#f8fafc', padding: '12px 15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Active Account: </span><br/>
          <strong style={{ fontSize: '13px', color: '#16a34a' }}>{me ? `${short(me)} (Key ${active + 1})` : "No key connected"}</strong>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={handleGenKey} style={{ padding: '6px 10px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>New Key</button>
          <button onClick={handleImportKey} style={{ padding: '6px 10px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Import</button>
        </div>
      </div>

      {/* Terminal Log */}
      {logMsg && (
        <div style={{ background: '#0f172a', color: '#22c55e', padding: '10px 15px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', marginBottom: '20px' }}>
          <span>{logMsg}</span>
        </div>
      )}

      {/* 1. Create Dispute Form */}
      <form onSubmit={handleCreateDispute} style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <h3>1. Submit Evidence-Backed Claim</h3>
        <input 
          type="text" 
          placeholder="Enter claim (e.g., Bitcoin was created in 2008)" 
          value={claim} 
          onChange={(e) => setClaim(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
        />
        <input 
          type="text" 
          placeholder="Enter evidence URL (e.g., https://en.wikipedia.org/...)" 
          value={evidence} 
          onChange={(e) => setEvidence(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? 'Processing...' : 'Submit to Contract'}
        </button>
      </form>

      {/* 2. Inspect & Resolve Dispute */}
      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3>2. Inspect & Resolve Dispute ID</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <input 
            type="number" 
            placeholder="Dispute ID (e.g. 0, 1, 2...)" 
            value={disputeId} 
            onChange={(e) => setDisputeId(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
          <button onClick={() => fetchDetails(Number(disputeId))} disabled={loading || disputeId === ''} style={{ padding: '10px 15px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            Read State
          </button>
        </div>

        {detailResult && (
          <div style={{ background: '#fff', padding: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '15px' }}>
            <p style={{ margin: '0 0 5px 0' }}><strong>ID:</strong> #{detailResult.id}</p>
            <p style={{ margin: '0 0 5px 0' }}><strong>Claim:</strong> {detailResult.claim}</p>
            <p style={{ margin: '0 0 5px 0' }}><strong>Evidence:</strong> <a href={detailResult.evidence} target="_blank" rel="noreferrer">{detailResult.evidence}</a></p>
            <p style={{ margin: '0 0 10px 0' }}><strong>Status:</strong> <span style={{ color: detailResult.status.includes('VALID') ? '#16a34a' : '#d97706', fontWeight: 'bold' }}>{detailResult.status}</span></p>
            
            <button onClick={() => handleResolve(detailResult.id)} disabled={loading} style={{ padding: '8px 15px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
              Trigger AI Consensus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}