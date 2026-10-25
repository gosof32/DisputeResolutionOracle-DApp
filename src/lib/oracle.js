// Strict decoding of contract responses. Anything that does not match the
// contract's schema raises an error; nothing is guessed or substituted.

export const STATUSES = ["PENDING", "RESOLVED", "REASSESSMENT_PENDING"];
export const OUTCOMES = ["SUPPORTED", "REFUTED", "INCONCLUSIVE"];

export class ContractDataError extends Error {}

function toPlain(value) {
  if (value instanceof Map) {
    const o = {};
    for (const [k, v] of value.entries()) o[String(k)] = toPlain(v);
    return o;
  }
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "bigint") return Number(value);
  return value;
}

function req(obj, key, type) {
  const v = obj?.[key];
  if (type === "int") {
    if (typeof v !== "number" || !Number.isInteger(v)) throw new ContractDataError(`Malformed contract response: "${key}" is not an integer`);
    return v;
  }
  if (typeof v !== type) throw new ContractDataError(`Malformed contract response: "${key}" is not a ${type}`);
  return v;
}

export function decodeVerdict(raw) {
  if (raw === null || raw === undefined) return null;
  const v = toPlain(raw);
  if (typeof v !== "object" || Array.isArray(v)) throw new ContractDataError("Malformed verdict");
  const outcome = req(v, "outcome", "string");
  if (!OUTCOMES.includes(outcome)) throw new ContractDataError(`Unknown verdict outcome "${outcome}"`);
  return {
    round: req(v, "round", "int"),
    outcome,
    decisiveSource: req(v, "decisive_source", "string"),
    decisiveUrl: req(v, "decisive_url", "string"),
    quote: req(v, "quote", "string"),
    reasoning: req(v, "reasoning", "string"),
    resolvedBy: req(v, "resolved_by", "string"),
    resolvedAt: req(v, "resolved_at", "string"),
  };
}

export function decodeDispute(raw) {
  const d = toPlain(raw);
  if (d === null || typeof d !== "object" || Array.isArray(d)) {
    throw new ContractDataError("Malformed contract response: expected a dispute object");
  }
  const status = req(d, "status", "string");
  if (!STATUSES.includes(status)) throw new ContractDataError(`Unknown dispute status "${status}"`);
  return {
    id: req(d, "id", "int"),
    claimant: req(d, "claimant", "string"),
    respondent: req(d, "respondent", "string"),
    claim: req(d, "claim", "string"),
    acceptanceCriteria: req(d, "acceptance_criteria", "string"),
    claimantEvidenceUrl: req(d, "claimant_evidence_url", "string"),
    respondentPosition: req(d, "respondent_position", "string"),
    respondentEvidenceUrl: req(d, "respondent_evidence_url", "string"),
    status,
    currentRound: req(d, "current_round", "int"),
    reassessmentsUsed: req(d, "reassessments_used", "int"),
    maxReassessments: req(d, "max_reassessments", "int"),
    createdAt: req(d, "created_at", "string"),
    latestVerdict: decodeVerdict(d.latest_verdict),
  };
}

export function decodeHistory(raw) {
  const h = toPlain(raw);
  if (!Array.isArray(h)) throw new ContractDataError("Malformed contract response: expected verdict history list");
  return h.map((e) => ({
    round: req(e, "round", "int"),
    verdict: decodeVerdict(e.verdict),
    reassessment: e.reassessment == null ? null : {
      requestedBy: req(e.reassessment, "requested_by", "string"),
      reason: req(e.reassessment, "reason", "string"),
      newEvidenceUrl: req(e.reassessment, "new_evidence_url", "string"),
      requestedAt: req(e.reassessment, "requested_at", "string"),
    },
  }));
}

export function parseDisputeId(input) {
  const s = String(input ?? "").trim();
  if (!/^\d+$/.test(s)) throw new Error("Dispute ID must be a non-negative whole number");
  return Number(s);
}

// Reads never fall back to sample data: errors propagate to the UI.
export async function fetchDispute(readClient, address, id) {
  const [rawDispute, rawHistory] = await Promise.all([
    readClient.readContract({ address, functionName: "get_dispute", args: [id] }),
    readClient.readContract({ address, functionName: "get_verdict_history", args: [id] }),
  ]);
  return { dispute: decodeDispute(rawDispute), history: decodeHistory(rawHistory) };
}
