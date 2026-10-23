import React, { useState } from 'react';
import { createClient } from 'genlayer-js';

// Masukkan alamat smart contract Anda di sini
const CONTRACT_ADDRESS = "0x2F88D061EB05a36514e0F9eBB801da73E7746334";

export default function App() {
  const [claimText, setClaimText] = useState('');
  const [disputeId, setDisputeId] = useState('');
  const [statusResult, setStatusResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState('');

  const handleCreateDispute = async (e) => {
    e.preventDefault();
    if (!claimText) return alert('Please enter claim details!');
    setLoading(true);
    setLogs('Sending create_dispute transaction...');
    try {
      const client = createClient();
      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'create_dispute',
        args: [claimText],
      });
      await tx.wait();
      setLogs('New dispute created successfully!');
    } catch (err) {
      setLogs(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (disputeId === '') return alert('Please enter a Dispute ID!');
    setLoading(true);
    setLogs(`Processing resolve_dispute for ID ${disputeId}...`);
    try {
      const client = createClient();
      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'resolve_dispute',
        args: [parseInt(disputeId)],
      });
      await tx.wait();
      setLogs(`Dispute #${disputeId} successfully resolved by AI!`);
    } catch (err) {
      setLogs(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStatus = async () => {
    if (disputeId === '') return alert('Please enter a Dispute ID!');
    setLoading(true);
    setLogs('Reading data on-chain...');
    try {
      const client = createClient();
      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_dispute_status',
        args: [parseInt(disputeId)],
      });
      setStatusResult(JSON.stringify(result));
      setLogs('Data read successfully.');
    } catch (err) {
      setStatusResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h2>⚖️ GenLayer Dispute Oracle dApp</h2>

      <form onSubmit={handleCreateDispute} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>1. Create New Dispute</h3>
        <input 
          type="text" 
          value={claimText} 
          onChange={(e) => setClaimText(e.target.value)}
          placeholder="Example: Bitcoin was created in 2009" 
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px' }}>
          {loading ? 'Processing...' : 'Send To Blockchain'}
        </button>
      </form>

      <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>2. Manage Dispute</h3>
        <input 
          type="number" 
          value={disputeId} 
          onChange={(e) => setDisputeId(e.target.value)}
          placeholder="Dispute ID (e.g., 0)" 
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleResolveDispute} disabled={loading} style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px' }}>
            Resolve AI
          </button>
          <button onClick={handleGetStatus} disabled={loading} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px' }}>
            Check Status
          </button>
        </div>
      </div>

      <div style={{ background: '#111', color: '#22c55e', padding: '15px', borderRadius: '8px', fontFamily: 'monospace' }}>
        <p style={{ margin: 0, color: '#888' }}>--- Terminal Log ---</p>
        <p style={{ margin: '5px 0' }}>{logs || 'Waiting for action...'}</p>
        {statusResult && <div style={{ color: '#facc15' }}>Result: {statusResult}</div>}
      </div>
    </div>
  );
}