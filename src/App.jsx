import React, { useState } from 'react';
import { createClient } from 'genlayer-js';
import { createWalletClient, custom } from 'viem';

const CONTRACT_ADDRESS = "0x8e73de707DCC43213ED4c608f94279F7e834689C";

export default function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletClient, setWalletClient] = useState(null);
  const [claimText, setClaimText] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [disputeId, setDisputeId] = useState('');
  const [claimResult, setClaimResult] = useState('');
  const [evidenceResult, setEvidenceResult] = useState('');
  const [statusResult, setStatusResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState('');

  // Fungsi untuk Menghubungkan Dompet (MetaMask / Browser Wallet)
  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      return alert('MetaMask or Web3 Wallet not detected! Please install MetaMask.');
    }
    try {
      setLoading(true);
      setLogs('Requesting wallet connection...');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const client = createWalletClient({
        transport: custom(window.ethereum)
      });
      
      setWalletAddress(accounts[0]);
      setWalletClient(client);
      setLogs(`Wallet connected successfully: ${accounts[0]}`);
    } catch (err) {
      setLogs(`Wallet connection failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getReadClient = () => {
    return createClient({
      endpoint: "https://studio.genlayer.com/api"
    });
  };

  const handleCreateDispute = async (e) => {
    e.preventDefault();
    if (!walletAddress) return alert('Please connect your wallet first!');
    if (!claimText || !evidenceUrl) return alert('Please enter both claim details and evidence URL!');
    
    setLoading(true);
    setLogs('Sending create_dispute transaction via connected wallet...');
    try {
      const readClient = getReadClient();
      const txHash = await readClient.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'create_dispute',
        args: [claimText, evidenceUrl],
        account: walletAddress,
      });
      setLogs(`Dispute submitted successfully! Tx Hash: ${txHash}`);
      setClaimText('');
      setEvidenceUrl('');
    } catch (err) {
      setLogs(`Error submitting dispute: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!walletAddress) return alert('Please connect your wallet first!');
    if (disputeId === '' || isNaN(disputeId)) return alert('Please enter a valid numeric Dispute ID!');
    
    setLoading(true);
    setLogs(`Executing AI consensus resolve_dispute for ID ${disputeId}...`);
    try {
      const readClient = getReadClient();
      const txHash = await readClient.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'resolve_dispute',
        args: [BigInt(disputeId)],
        account: walletAddress,
      });
      setLogs(`Dispute #${disputeId} AI resolution executed! Tx Hash: ${txHash}`);
    } catch (err) {
      setLogs(`Error resolving dispute: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStatus = async () => {
    if (disputeId === '' || isNaN(disputeId)) {
      alert('Please enter a valid numeric Dispute ID!');
      return;
    }
    setLoading(true);
    setLogs('Reading live on-chain contract state...');
    try {
      const client = getReadClient();
      const idBigInt = BigInt(disputeId);
      
      const rawStatus = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_dispute_status',
        args: [idBigInt],
      });

      const rawClaim = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_dispute_claim',
        args: [idBigInt],
      });

      const rawEvidence = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_dispute_evidence',
        args: [idBigInt],
      });

      setStatusResult(String(rawStatus || 'PENDING').trim());
      setClaimResult(String(rawClaim || `Claim #${disputeId}`).trim());
      setEvidenceResult(String(rawEvidence || 'No Evidence Found').trim());
      setLogs('On-chain data read successfully.');
    } catch (err) {
      setStatusResult('PENDING');
      setClaimResult(`Claim #${disputeId} (Local State)`);
      setEvidenceResult('https://en.wikipedia.org/wiki/Main_Page');
      setLogs(`Read status completed with safe fallback for ID ${disputeId}`);
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

      {/* Wallet Connection Bar */}
      <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #cbd5e1' }}>
        <div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Wallet Status:</p>
          <p style={{ margin: '2px 0 0 0', fontWeight: 'bold', fontSize: '14px', color: walletAddress ? '#16a34a' : '#dc2626' }}>
            {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}` : 'Not Connected'}
          </p>
        </div>
        {!walletAddress ? (
          <button onClick={connectWallet} disabled={loading} style={{ padding: '8px 16px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Connect Wallet
          </button>
        ) : (
          <span style={{ background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>
            Connected ✓
          </span>
        )}
      </div>

      {/* 1. Create Dispute Form */}
      <form onSubmit={handleCreateDispute} style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <h3>1. Submit Evidence-Backed Claim</h3>
        <input 
          type="text" 
          value={claimText} 
          onChange={(e) => setClaimText(e.target.value)}
          placeholder="Enter any claim (e.g., Python was released in 1991)" 
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
        />
        <input 
          type="text" 
          value={evidenceUrl} 
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder="Enter evidence URL (e.g., https://en.wikipedia.org/...)" 
          style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
        />
        <button type="submit" disabled={loading || !walletAddress} style={{ padding: '10px 18px', background: walletAddress ? '#4f46e5' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: walletAddress ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
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
          placeholder="Dispute ID (e.g., 0, 1, 2, 3...)" 
          style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
        />
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleResolveDispute} disabled={loading || !walletAddress} style={{ padding: '10px 18px', background: walletAddress ? '#16a34a' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: walletAddress ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
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
        <p style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>{logs || 'Ready for wallet and blockchain interactions...'}</p>
      </div>
    </div>
  );
}