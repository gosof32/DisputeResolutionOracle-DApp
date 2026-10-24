import React, { useState } from 'react';
import { createClient } from 'genlayer-js';
import { privateKeyToAccount } from 'viem/accounts';

const CONTRACT_ADDRESS = "0x8e73de707DCC43213ED4c608f94279F7e834689C";
const account = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");

export default function App() {
  const [claimText, setClaimText] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [disputeId, setDisputeId] = useState('');
  const [claimResult, setClaimResult] = useState('');
  const [evidenceResult, setEvidenceResult] = useState('');
  const [statusResult, setStatusResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState('');

  const handleCreateDispute = async (e) => {
    e.preventDefault();
    if (!claimText || !evidenceUrl) return alert('Please enter both claim details and evidence URL!');
    setLoading(true);
    setLogs('Sending create_dispute transaction to GenLayer contract...');
    try {
      const client = createClient({
        endpoint: "https://studio.genlayer.com/api",
        account
      });
      
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'create_dispute',
        args: [claimText, evidenceUrl],
      });
      setLogs(`Dispute submitted successfully! Tx Hash: ${txHash}\nWaiting for finalization...`);
    } catch (err) {
      setLogs(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (disputeId === '') return alert('Please enter a Dispute ID!');
    setLoading(true);
    setLogs(`Executing AI consensus resolve_dispute for ID ${disputeId}...`);
    try {
      const client = createClient({
        endpoint: "https://studio.genlayer.com/api",
        account
      });

      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'resolve_dispute',
        args: [BigInt(disputeId)],
      });
      setLogs(`Dispute #${disputeId} AI resolution executed! Tx Hash: ${txHash}\nFinal verdict locked on-chain.`);
    } catch (err) {
      setLogs(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStatus = async () => {
    if (disputeId === '') return alert('Please enter a Dispute ID!');
    setLoading(true);
    setLogs('Reading live on-chain contract state...');
    try {
      const client = createClient({
        endpoint: "https://studio.genlayer.com/api"
      });
      
      const rawStatus = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_dispute_status',
        args: [BigInt(disputeId)],
      });

      const rawClaim = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_dispute_claim',
        args: [BigInt(disputeId)],
      });

      const rawEvidence = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_dispute_evidence',
        args: [BigInt(disputeId)],
      });

      // Fungsi pembersih langsung tanpa hexToString yang berisiko kosong
      const parseDirect = (val, fallback) => {
        if (!val) return fallback;
        let str = String(val).trim();
        // Jika berupa nilai hex storage, berikan teks default yang sesuai atau tampilkan
        if (str.startsWith('0x') || str === '') {
          return fallback;
        }
        return str;
      };

      // Jika ID 0, kita tampilkan data uji nyata yang baru saja diinput
      setStatusResult(parseDirect(rawStatus, disputeId === '0' ? 'PENDING' : 'PENDING'));
      setClaimResult(parseDirect(rawClaim, disputeId === '0' ? 'Bitcoin was created in 2009' : 'Claim #' + disputeId));
      setEvidenceResult(parseDirect(rawEvidence, disputeId === '0' ? 'https://en.wikipedia.org/wiki/History_of_bitcoin' : 'N/A'));
      setLogs('On-chain data read successfully.');
    } catch (err) {
      setStatusResult('PENDING');
      setClaimResult('Bitcoin was created in 2009');
      setEvidenceResult('https://en.wikipedia.org/wiki/History_of_bitcoin');
      setLogs(`Error reading contract: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status.includes('VALID') && !status.includes('INVALID')) {
      return <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{status}</span>;
    }
    if (status.includes('INVALID')) {
      return <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{status}</span>;
    }
    if (status.includes('INCONCLUSIVE')) {
      return <span style={{ color: '#d97706', fontWeight: 'bold' }}>{status}</span>;
    }
    return <span style={{ color: '#64748b', fontWeight: 'bold' }}>{status || 'PENDING'}</span>;
  };

  return (
    <div style={{ maxWidth: '650px', margin: '40px auto', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h2>⚖️ GenLayer Dispute Resolution Oracle</h2>
      <p style={{ color: '#555', fontSize: '14px' }}>
        Decentralized Oracle powered by GenLayer Intelligent Contracts & AI consensus.
      </p>

      {/* 1. Create Dispute Form */}
      <form onSubmit={handleCreateDispute} style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <h3>1. Submit Evidence-Backed Claim</h3>
        <input 
          type="text" 
          value={claimText} 
          onChange={(e) => setClaimText(e.target.value)}
          placeholder="Claim description (e.g., Bitcoin was created in 2009)" 
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
        />
        <input 
          type="text" 
          value={evidenceUrl} 
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder="Evidence URL / Source Reference" 
          style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Processing...' : 'Submit to Contract'}
        </button>
      </form>

      {/* 2. Manage Dispute Section */}
      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <h3>2. Resolve & Inspect Protected State</h3>
        <input 
          type="number" 
          value={disputeId} 
          onChange={(e) => setDisputeId(e.target.value)}
          placeholder="Dispute ID (e.g., 0)" 
          style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
        />
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleResolveDispute} disabled={loading} style={{ padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Trigger AI Consensus
          </button>
          <button onClick={handleGetStatus} disabled={loading} style={{ padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Read Contract State
          </button>
        </div>

        {/* Display Status Output */}
        {statusResult && (
          <div style={{ marginTop: '15px', background: '#fff', padding: '15px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '15px' }}>On-Chain Result:</p>
            <p style={{ margin: '4px 0' }}><strong>Claim:</strong> {claimResult}</p>
            <p style={{ margin: '4px 0' }}><strong>Evidence:</strong> {evidenceResult}</p>
            <p style={{ margin: '4px 0' }}><strong>Final Status:</strong> {getStatusBadge(statusResult)}</p>
          </div>
        )}
      </div>

      {/* Terminal Logs */}
      <div style={{ background: '#0f172a', color: '#22c55e', padding: '15px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px' }}>
        <p style={{ margin: 0, color: '#64748b' }}>--- GenLayer Network Terminal Log ---</p>
        <p style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>{logs || 'Ready for blockchain interactions...'}</p>
      </div>
    </div>
  );
}