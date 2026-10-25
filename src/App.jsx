import React, { useMemo, useState } from "react";
import { CONTRACT_ADDRESS, EXPLORER_BASE } from "./config.js";
import { connectWallet as defaultConnect, createReadClient, writeAndFinalize as defaultWrite } from "./lib/wallet.js";
import { fetchDispute as defaultFetch, parseDisputeId } from "./lib/oracle.js";

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

const box = { background: "#f8fafc", padding: 20, borderRadius: 8, marginBottom: 20, border: "1px solid #e2e8f0" };
const input = { width: "100%", padding: 10, marginBottom: 10, borderRadius: 4, border: "1px solid #cbd5e1", boxSizing: "border-box" };
const btn = (bg) => ({ padding: "9px 15px", background: bg, color: "#fff", border: "none", borderRadius: 4, fontWeight: "bold", cursor: "pointer", marginRight: 8 });
const OUTCOME_COLOR = { SUPPORTED: "#16a34a", REFUTED: "#dc2626", INCONCLUSIVE: "#d97706" };

function TxStatus({ tx }) {
  if (!tx) return null;
  const link = tx.hash ? <a href={`${EXPLORER_BASE}/tx/${tx.hash}`} target="_blank" rel="noreferrer">{short(tx.hash)}</a> : null;
  let text;
  if (tx.phase === "signing") text = "Waiting for your wallet signature…";
  else if (tx.phase === "submitted") text = <>Submitted {link}. Waiting for FINALIZED consensus…</>;
  else if (tx.phase === "finalized") text = <>Finalized successfully {link}.</>;
  else if (tx.phase === "error") text = <>Failed{link ? <> ({link})</> : null}: {tx.message}</>;
  return (
    <div role="status" data-phase={tx.phase} style={{ background: tx.phase === "error" ? "#fef2f2" : "#0f172a", color: tx.phase === "error" ? "#b91c1c" : "#22c55e", padding: "10px 15px", borderRadius: 6, fontFamily: "monospace", fontSize: 12, marginBottom: 20 }}>
      {tx.label}: {text}
    </div>
  );
}

export default function App({
  contractAddress = CONTRACT_ADDRESS,
  connect = defaultConnect,
  writeTx = defaultWrite,
  fetchDispute = defaultFetch,
  readClient: injectedReadClient,
}) {
  const readClient = useMemo(() => injectedReadClient ?? createReadClient(), [injectedReadClient]);
  const [wallet, setWallet] = useState(null);
  const [walletError, setWalletError] = useState("");
  const [tx, setTx] = useState(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({ claim: "", criteria: "", evidence: "", respondent: "" });
  const [idInput, setIdInput] = useState("");
  const [detail, setDetail] = useState(null);
  const [readError, setReadError] = useState("");
  const [counter, setCounter] = useState({ position: "", evidence: "" });
  const [reassess, setReassess] = useState({ reason: "", evidence: "" });

  if (!contractAddress) {
    return (
      <div style={{ maxWidth: 680, margin: "30px auto", fontFamily: "Arial, sans-serif" }}>
        <h2>Dispute Resolution Oracle</h2>
        <p role="alert" style={{ color: "#b91c1c" }}>Configuration error: VITE_CONTRACT_ADDRESS is not set.</p>
      </div>
    );
  }

  const handleConnect = async () => {
    setWalletError("");
    try {
      setWallet(await connect());
    } catch (e) {
      setWallet(null);
      setWalletError(e.message);
    }
  };

  const run = async (label, functionName, args, after) => {
    if (!wallet) {
      setTx({ label, phase: "error", message: "Connect your wallet to sign this transaction." });
      return false;
    }
    setBusy(true);
    let hash;
    try {
      await writeTx({
        walletClient: wallet.client,
        readClient,
        address: contractAddress,
        functionName,
        args,
        onUpdate: (u) => {
          if (u.hash) hash = u.hash;
          setTx({ label, ...u });
        },
      });
      if (after) await after();
      return true;
    } catch (e) {
      setTx({ label, phase: "error", hash, message: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const loadDispute = async (id) => {
    setReadError("");
    try {
      setDetail(await fetchDispute(readClient, contractAddress, id));
    } catch (e) {
      setDetail(null);
      setReadError(`Could not read dispute #${id}: ${e.message}`);
    }
  };

  const handleRead = () => {
    let id;
    try {
      id = parseDisputeId(idInput);
    } catch (e) {
      setDetail(null);
      setReadError(e.message);
      return;
    }
    loadDispute(id);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.claim.trim() || !form.criteria.trim() || !form.evidence.trim()) {
      setTx({ label: "Create dispute", phase: "error", message: "Claim, acceptance criteria and evidence URL are required." });
      return;
    }
    const ok = await run("Create dispute", "create_dispute", [form.claim, form.criteria, form.evidence, form.respondent.trim()]);
    if (ok) setForm({ claim: "", criteria: "", evidence: "", respondent: "" });
  };

  const d = detail?.dispute;
  const me = wallet?.address;
  const canRespond = d && d.status !== "RESOLVED" && !d.respondentEvidenceUrl && me && !same(me, d.claimant) && (!d.respondent || same(me, d.respondent));
  const isParty = d && me && (same(me, d.claimant) || same(me, d.respondent));
  const canReassess = d && d.status === "RESOLVED" && isParty && d.reassessmentsUsed < d.maxReassessments;

  return (
    <div style={{ maxWidth: 680, margin: "30px auto", fontFamily: "Arial, sans-serif", padding: 20 }}>
      <h2>⚖️ Dispute Resolution Oracle</h2>
      <p style={{ fontSize: 13, color: "#64748b" }}>
        Contract <a href={`${EXPLORER_BASE}/address/${contractAddress}`} target="_blank" rel="noreferrer">{short(contractAddress)}</a> on GenLayer Studionet
      </p>

      <div style={{ ...box, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: 12, color: "#64748b" }}>Wallet</span><br />
          <strong data-testid="wallet-address" style={{ fontSize: 13 }}>{me ? short(me) : "Not connected"}</strong>
          {walletError && <div role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>{walletError}</div>}
        </div>
        <button onClick={handleConnect} style={btn("#4f46e5")}>{me ? "Reconnect" : "Connect wallet"}</button>
      </div>

      <TxStatus tx={tx} />

      <form onSubmit={handleCreate} style={box}>
        <h3>1. Open an evidence-backed dispute</h3>
        <input aria-label="Claim" style={input} placeholder="Claim, e.g. Bitcoin began to be used as a currency in 2009." value={form.claim} onChange={(e) => setForm({ ...form, claim: e.target.value })} />
        <textarea aria-label="Acceptance criteria" style={{ ...input, minHeight: 60 }} placeholder="Acceptance criteria: what a source must state for SUPPORTED / REFUTED" value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} />
        <input aria-label="Evidence URL" style={input} placeholder="Evidence URL (https://…)" value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} />
        <input aria-label="Respondent address" style={input} placeholder="Respondent address (optional, blank = anyone may respond)" value={form.respondent} onChange={(e) => setForm({ ...form, respondent: e.target.value })} />
        <button type="submit" disabled={busy} style={btn("#4f46e5")}>Sign & submit</button>
      </form>

      <div style={box}>
        <h3>2. Inspect a dispute</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <input aria-label="Dispute ID" style={{ ...input, marginBottom: 0 }} placeholder="Dispute ID (0, 1, 2…)" value={idInput} onChange={(e) => setIdInput(e.target.value)} />
          <button onClick={handleRead} disabled={busy || idInput === ""} style={btn("#2563eb")}>Read</button>
        </div>
        {readError && <p role="alert" style={{ color: "#b91c1c" }}>{readError}</p>}

        {d && (
          <div data-testid="dispute-detail" style={{ background: "#fff", padding: 15, borderRadius: 6, border: "1px solid #cbd5e1", marginTop: 15 }}>
            <p><strong>#{d.id}</strong> · status <strong data-testid="dispute-status">{d.status}</strong> · round {d.currentRound}</p>
            <p><strong>Claim:</strong> {d.claim}</p>
            <p><strong>Acceptance criteria:</strong> {d.acceptanceCriteria}</p>
            <p><strong>Claimant</strong> {short(d.claimant)} · <a href={d.claimantEvidenceUrl} target="_blank" rel="noreferrer">evidence</a></p>
            <p><strong>Respondent</strong> {d.respondent ? short(d.respondent) : "open"}
              {d.respondentEvidenceUrl && <> · “{d.respondentPosition}” · <a href={d.respondentEvidenceUrl} target="_blank" rel="noreferrer">evidence</a></>}</p>

            {d.latestVerdict ? (
              <div data-testid="verdict" style={{ borderLeft: `4px solid ${OUTCOME_COLOR[d.latestVerdict.outcome]}`, paddingLeft: 10 }}>
                <p><strong>Verdict (round {d.latestVerdict.round}):</strong> <span style={{ color: OUTCOME_COLOR[d.latestVerdict.outcome], fontWeight: "bold" }}>{d.latestVerdict.outcome}</span></p>
                {d.latestVerdict.quote && <p><em>“{d.latestVerdict.quote}”</em> — <a href={d.latestVerdict.decisiveUrl} target="_blank" rel="noreferrer">{d.latestVerdict.decisiveSource} source</a></p>}
                <p style={{ fontSize: 13 }}>{d.latestVerdict.reasoning}</p>
              </div>
            ) : <p data-testid="no-verdict">No verdict yet.</p>}

            {d.status !== "RESOLVED" && (
              <button disabled={busy} style={btn("#16a34a")} onClick={() => run(`Resolve #${d.id}`, "resolve_dispute", [d.id], () => loadDispute(d.id))}>
                Resolve via GenLayer consensus
              </button>
            )}

            {canRespond && (
              <div style={{ marginTop: 15 }}>
                <h4>Submit counter-evidence</h4>
                <input aria-label="Counter position" style={input} placeholder="Your position" value={counter.position} onChange={(e) => setCounter({ ...counter, position: e.target.value })} />
                <input aria-label="Counter evidence URL" style={input} placeholder="Evidence URL (https://…)" value={counter.evidence} onChange={(e) => setCounter({ ...counter, evidence: e.target.value })} />
                <button disabled={busy} style={btn("#64748b")} onClick={() => run(`Counter-evidence #${d.id}`, "submit_counter_evidence", [d.id, counter.position, counter.evidence], () => loadDispute(d.id))}>Sign & submit</button>
              </div>
            )}

            {canReassess && (
              <div style={{ marginTop: 15 }}>
                <h4>Request reassessment ({d.maxReassessments - d.reassessmentsUsed} left)</h4>
                <input aria-label="Reassessment reason" style={input} placeholder="Reason (recorded on-chain)" value={reassess.reason} onChange={(e) => setReassess({ ...reassess, reason: e.target.value })} />
                <input aria-label="New evidence URL" style={input} placeholder="Replacement evidence URL (optional)" value={reassess.evidence} onChange={(e) => setReassess({ ...reassess, evidence: e.target.value })} />
                <button disabled={busy} style={btn("#d97706")} onClick={() => run(`Reassess #${d.id}`, "request_reassessment", [d.id, reassess.reason, reassess.evidence], () => loadDispute(d.id))}>Sign & request</button>
              </div>
            )}

            {detail.history.some((h) => h.verdict || h.reassessment) && (
              <div style={{ marginTop: 15 }}>
                <h4>Audit trail</h4>
                <ul data-testid="history" style={{ fontSize: 13 }}>
                  {detail.history.map((h) => (
                    <li key={h.round}>
                      Round {h.round}: {h.verdict ? h.verdict.outcome : "pending"}
                      {h.reassessment && <> → reassessment by {short(h.reassessment.requestedBy)}: “{h.reassessment.reason}”</>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
