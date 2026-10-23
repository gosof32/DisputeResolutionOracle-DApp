import React, { useState } from 'react';
import { createClient } from 'genlayer-js';

// Masukkan alamat kontrak Anda setelah di-deploy di GenLayer Studio
const CONTRACT_ADDRESS = "0xYourContractAddressHere";

export default function App() {
  const [claimText, setClaimText] = useState('');
  const [disputeId, setDisputeId] = useState('');
  const [statusResult, setStatusResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState('');

  const getContract = () => {
    const client = createClient();
    return client.getContract(CONTRACT_ADDRESS);
  };

  const handleCreateDispute = async (e) => {
    e.preventDefault();
    if (!claimText) return alert('Masukkan detail klaim!');
    setLoading(true);
    setLogs('Mengirim transaksi create_dispute...');
    try {
      const contract = getContract();
      const tx = await contract.write.create_dispute([claimText]);
      await tx.wait();
      setLogs('Sengketa baru berhasil dibuat!');
    } catch (err) {
      setLogs(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (disputeId === '') return alert('Masukkan ID Sengketa!');
    setLoading(true);
    setLogs(`Memproses resolve_dispute ID ${disputeId}...`);
    try {
      const contract = getContract();
      const tx = await contract.write.resolve_dispute([parseInt(disputeId)]);
      await tx.wait();
      setLogs(`Sengketa #${disputeId} berhasil diproses AI!`);
    } catch (err) {
      setLogs(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStatus = async () => {
    if (disputeId === '') return alert('Masukkan ID Sengketa!');
    setLoading(true);
    setLogs('Membaca data on-chain...');
    try {
      const contract = getContract();
      const result = await contract.view.get_dispute_status([parseInt(disputeId)]);
      setStatusResult(result);
      setLogs('Data berhasil dibaca.');
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
        <h3>1. Buat Sengketa Baru</h3>
        <input 
          type="text" 
          value={claimText} 
          onChange={(e) => setClaimText(e.target.value)}
          placeholder="Contoh: Bitcoin was created in 2009" 
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px' }}>
          {loading ? 'Memproses...' : 'Kirim Ke Blockchain'}
        </button>
      </form>

      <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>2. Kelola Sengketa</h3>
        <input 
          type="number" 
          value={disputeId} 
          onChange={(e) => setDisputeId(e.target.value)}
          placeholder="ID Sengketa (Misal: 0)" 
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleResolveDispute} disabled={loading} style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px' }}>
            Resolve AI
          </button>
          <button onClick={handleGetStatus} disabled={loading} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px' }}>
            Cek Status
          </button>
        </div>
      </div>

      <div style={{ background: '#111', color: '#22c55e', padding: '15px', borderRadius: '8px', fontFamily: 'monospace' }}>
        <p style={{ margin: 0, color: '#888' }}>--- Terminal Log ---</p>
        <p style={{ margin: '5px 0' }}>{logs || 'Menunggu aksi...'}</p>
        {statusResult && <div style={{ color: '#facc15' }}>Hasil: {statusResult}</div>}
      </div>
    </div>
  );
}