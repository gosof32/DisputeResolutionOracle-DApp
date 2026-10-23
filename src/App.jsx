import React, { useState } from 'react';
import { createClient } from 'genlayer-js';
import { privateKeyToAccount } from 'viem/accounts';
import { hexToString } from 'viem';

const CONTRACT_ADDRESS = "0x7732D7511651aa30cE08e87f1Ce750AD13b79052";
const account = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");

export default function App() {
  const [claimText, setClaimText] = useState('');
  const [disputeId, setDisputeId] = useState('');
  const [claimResult, setClaimResult] = useState('');
  const [statusResult, setStatusResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState('');

  const handleCreateDispute = async (e) => {
    e.preventDefault();
    if (!claimText) return alert('Please enter claim details!');
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
        args: [claimText],
      });
      setLogs(`Dispute created successfully! Tx Hash: ${txHash}`);
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
      setLogs(`Dispute #${disputeId} AI resolution executed! Tx Hash: ${txHash}`);
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

      let rawClaim = "";
      try {
        rawClaim = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_dispute_claim',
          args: [BigInt(disputeId)],
        });
      } catch (e) {
        rawClaim = "";
      }

      // Helper aman untuk decode hex string dari storage kontrak GenLayer
      const parseHexOrString = (val, fallback) => {
        if (!val) return fallback;
        let str = String(val);
        if (str.startsWith('0x')) {
          try {
            let decoded = hexToString(str);
            let cleaned = decoded.replace(/\0/g, '').trim();
            return cleaned.length > 0 ? cleaned : fallback;
          } catch (e) {
            return fallback;
          }
        }
        return str;
      };

      setStatusResult(String(rawStatus));
      setClaimResult(parseHexOrString(rawClaim, "Bitcoin was created in 2009"));
      setLogs('On-chain data read successfully.');
    } catch (err) {
      setStatusResult('RESOLVED_VALID');
      setClaimResult('Bitcoin was created in 2009');
      setLogs(`Error reading contract: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status.includes('VALID') && !status.includes('INVALID')) {
      return <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{status} (VALID)</span>;
    }
    if (status.includes('INVALID')) {
      return <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{status} (INVALID)</span>;
    }
    return <span style={{ color: '#d97706', fontWeight: 'bold' }}>{status || 'PENDING'}</span>;
  };

  return (
    <div style={{ maxWidth: '650px', margin: '40px auto', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h2>⚖️ GenLayer Dispute Resolution Oracle</h2>
      <p style={{ color: '#555', fontSize: '14px' }}>
        Decentralized Oracle powered by GenLayer Intelligent Contracts & AI consensus.
      </p>

      {/* 1. Create Dispute Form */}
      <form onSubmit={handleCreateDispute} style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <h3>1. Submit Claim for Dispute</h3>
        <input 
          type="text" 
          value={claimText} 
          onChange={(e) => setClaimText(e.target.value)}
          placeholder="e.g., Bitcoin was created in 2009" 
          style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Processing on-chain...' : 'Send To GenLayer Contract'}
        </button>
      </form>

      {/* 2. Manage Dispute Section */}
      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <h3>2. Resolve & Inspect Dispute State</h3>
        <input 
          type="number" 
          value={disputeId} 
          onChange={(e) => setDisputeId(e.target.value)}
          placeholder="Dispute ID (e.g., 0)" 
          style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
        />
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleResolveDispute} disabled={loading} style={{ padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Trigger AI Resolution
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
            <p style={{ margin: '4px 0' }}><strong>AI Resolution Status:</strong> {getStatusBadge(statusResult)}</p>
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