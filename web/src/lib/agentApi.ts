// ---------------------------------------------------------------------------
// Types matching the agent's REST API responses
// ---------------------------------------------------------------------------

export interface AgentDecision {
  decisionId: number;
  pair: string;
  action: "BUY" | "SELL" | "HOLD";
  confidenceBps: number;
  reasoning: string;
  reasoningHash: string;
  committedTx: string | null;
  revealedTx: string | null;
  executed: boolean;
  outcomePnlBps: number | null;
  error: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_AGENT_API ?? "http://localhost:3001";

async function get<T>(path: string): Promise<T> {
  const resp = await fetch(`${BASE_URL}${path}`);
  if (!resp.ok) throw new Error(`Agent API ${resp.status}: ${resp.statusText}`);
  return resp.json();
}

export async function fetchDecisions(): Promise<AgentDecision[]> {
  const data = await get<{ decisions: AgentDecision[] }>("/decisions");
  return data.decisions ?? [];
}

export async function fetchDecisionById(
  id: number,
): Promise<AgentDecision | null> {
  try {
    return await get<AgentDecision>(`/decisions/${id}`);
  } catch {
    return null;
  }
}

export async function triggerRunOnce(): Promise<{
  success: boolean;
  decisions: AgentDecision[];
}> {
  const resp = await fetch(`${BASE_URL}/agent/run-once`, { method: "POST" });
  return resp.json();
}

export async function fetchHealth(): Promise<{
  status: string;
  demoMode: boolean;
  tradeExecutionEnabled: boolean;
}> {
  return get("/health");
}
