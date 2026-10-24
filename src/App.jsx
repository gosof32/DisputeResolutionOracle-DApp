import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { createClient, createAccount, generatePrivateKey } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT = "0x2581b8e4485BEC23E8F4dc4053208f39F3bc50d1";
const EXPLORER = `https://explorer-studio.genlayer.com/address/${CONTRACT}`;
const KEY_SLOT = "dispute_oracle.keys";

// --- Utility Functions ---
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
const when = (ts) => {
  const n = Number(ts || 0);
  if (!n) return "—";
  return new Date(n * 1000).toLocaleString();
};

function loadKeys() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY_SLOT) || "[]");
    return Array.isArray(raw) ? raw.filter((k) => typeof k === "string" && k) : [];
  } catch {
    return [];
  }
}

// --- Main Layout & Navigation Component ---
function Layout({ children, me, activeKeyIdx, onSelectKey, onGenKey, onImportKey, logMessage }) {
  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      {/* Header / Navbar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>⚖️ Dispute Oracle dApp</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Contract: <a href={EXPLORER} target="_blank" rel="noreferrer" style={{ color: '#4f46e5' }}>{short(CONTRACT)}</a>
          </p>
        </div>
        <nav style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', fontWeight: 'bold', color: '#2563eb' }}>Home</Link>
          <Link to="/new" style={{ textDecoration: 'none', fontWeight: 'bold', color: '#16a34a' }}>+ New Dispute</Link>
        </nav>
      </header>

      {/* Account & Key Bar */}
      <div style={{ background: '#f8fafc', padding: '12px 15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Active Account: </span>
          <strong style={{ fontSize: '13px', color: '#16a34a' }}>{me || "No key connected"}</strong>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select 
            value={activeKeyIdx} 
            onChange={(e) => onSelectKey(Number(e.target.value))}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          >
            <option value="">Select Key...</option>
          </select>
          <button onClick={onGenKey} style={{ padding: '6px 10px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>New Key</button>
          <button onClick={onImportKey} style={{ padding: '6px 10px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Import</button>
        </div>
      </div>

      {/* Terminal Log Box */}
      {logMessage && (
        <div style={{ background: '#0f172a', color: '#22c55e', padding: '10px 15px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', marginBottom: '20px' }}>
          <span>{logMessage}</span>
        </div>
      )}

      {/* Page Content */}
      <main>{children}</main>
    </div>
  );
}

// --- Home Page (List Disputes) ---
function Home({ rows, loading }) {
  return (
    <div>
      <h3>Active Disputes & Oracles</h3>
      {loading ? (
        <p>Loading on-chain state...</p>
      ) : rows.length === 0 ? (
        <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <p>No disputes registered yet.</p>
          <Link to="/new" style={{ color: '#4f46e5', fontWeight: 'bold' }}>Create your first dispute claim</Link>
        </div>
      ) : (
        rows.map((row, idx) => (
          <div key={idx} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '15px', borderRadius: '8px', marginBottom: '12px' }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 'bold' }}>{row.claim}</p>
            <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#555' }}>Evidence: <a href={row.evidence} target="_blank" rel="noreferrer">{row.evidence}</a></p>
            <Link to={`/p/${idx}`} style={{ fontSize: '13px', color: '#2563eb', fontWeight: 'bold' }}>View Details & AI Consensus →</Link>
          </div>
        ))
      )}
    </div>
  );
}

// --- New Dispute Page ---
function NewPolicy({ onSubmit }) {
  const [claim, setClaim] = useState('');
  const [evidence, setEvidence] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!claim || !evidence) return alert('Fill in all fields!');
    await onSubmit(claim, evidence);
    navigate('/');
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3>Submit New Claim & Evidence</h3>
      <input 
        type="text" 
        placeholder="Enter claim (e.g., Bitcoin was created in 2008)" 
        value={claim} 
        onChange={(e) => setClaim(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
      />
      <input 
        type="text" 
        placeholder="Enter evidence URL" 
        value={evidence} 
        onChange={(e) => setEvidence(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
      />
      <button type="submit" style={{ padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
        Submit On-Chain
      </button>
    </form>
  );
}

// --- Detail Dispute Page ---
function PolicyPage({ client, reader }) {
  const { id } = useParams();
  const [claim, setClaim] = useState('');
  const [evidence, setEvidence] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const idNum = Number(id);
        const rClaim = await reader.readContract({ address: CONTRACT, functionName: 'get_dispute_claim', args: [idNum] });
        const rEvid = await reader.readContract({ address: CONTRACT, functionName: 'get_dispute_evidence', args: [idNum] });
        const rStatus = await reader.readContract({ address: CONTRACT, functionName: 'get_dispute_status', args: [idNum] });
        
        if (rClaim) setClaim(String(rClaim));
        if (rEvid) setEvidence(String(rEvid));
        if (rStatus) setStatus(String(rStatus));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id, reader]);

  const handleResolve = async () => {
    if (!client) return alert('No active wallet key!');
    try {
      const tx = await client.writeContract({
        address: CONTRACT,
        functionName: 'resolve_dispute',
        args: [BigInt(id)],
      });
      alert(`AI Consensus triggered! Tx: ${tx}`);
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  };

  if (loading) return <p>Loading dispute #{id}...</p>;

  return (
    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3>Dispute Details #{id}</h3>
      <p><strong>Claim:</strong> {claim || `Dispute Claim ID #${id}`}</p>
      <p><strong>Evidence URL:</strong> <a href={evidence} target="_blank" rel="noreferrer">{evidence}</a></p>
      <p><strong>Status:</strong> <span style={{ color: status.includes('VALID') ? '#16a34a' : '#d97706', fontWeight: 'bold' }}>{status}</span></p>
      
      <button onClick={handleResolve} style={{ marginTop: '10px', padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
        Trigger AI Consensus
      </button>
    </div>
  );
}

// --- Main Root App Component with Router ---
export default function App() {
  const [keys, setKeys] = useState(loadKeys());
  const [active, setActive] = useState(0);
  const [logMsg, setLogMsg] = useState('');
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const account = keys.length ? createAccount(keys[active]) : null;
  const me = account ? String(account.address) : "";
  const client = account ? createClient({ chain: studionet, account }) : null;
  const reader = createClient({ chain: studionet, account: createAccount(generatePrivateKey()) });

  const log = (msg) => {
    setLogMsg(msg);
    setTimeout(() => setLogMsg(''), 6000);
  };

  const handleGenKey = () => {
    const newK = generatePrivateKey();
    const updated = [...keys, newK];
    setKeys(updated);
    localStorage.setItem(KEY_SLOT, JSON.stringify(updated));
    setActive(updated.length - 1);
    log("New key generated successfully");
  };

  const handleImportKey = () => {
    const k = prompt("Enter Private Key (0x...):");
    if (!k) return;
    const updated = [...keys, k.trim()];
    setKeys(updated);
    localStorage.setItem(KEY_SLOT, JSON.stringify(updated));
    setActive(updated.length - 1);
    log("Key imported successfully");
  };

  const handleCreateDispute = async (claim, evidence) => {
    if (!client) return alert("Please add or generate a key first!");
    log("Sending create_dispute transaction...");
    try {
      const hash = await client.writeContract({
        address: CONTRACT,
        functionName: 'create_dispute',
        args: [claim, evidence],
      });
      log(`Dispute submitted! Tx: ${hash.slice(0, 10)}... waiting confirmation`);
      await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 160, interval: 3000 });
      log("Dispute successfully finalized on-chain!");
    } catch (e) {
      log(`Error: ${e.message}`);
    }
  };

  return (
    <BrowserRouter>
      <Layout 
        me={me} 
        activeKeyIdx={active} 
        onSelectKey={setActive} 
        onGenKey={handleGenKey} 
        onImportKey={handleImportKey}
        logMessage={logMsg}
      >
        <Routes>
          <Route path="/" element={<Home rows={rows} loading={loadingRows} />} />
          <Route path="/new" element={<NewPolicy onSubmit={handleCreateDispute} />} />
          <Route path="/p/:id" element={<PolicyPage client={client} reader={reader} />} />
          <Route path="*" element={<h3>Page Not Found</h3>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}