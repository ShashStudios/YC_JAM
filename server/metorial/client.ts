/**
 * Metorial AI Integration Client
 * Sends agent sessions, reasoning chains, and tool calls to Metorial dashboard
 */

const METORIAL_API_URL = 'https://app.metorial.com/api/v1';

// Lazy getter for API key to ensure it's read after env vars are loaded
function getMetorialAPIKey(): string {
  return process.env.METORIAL_API_KEY || '';
}

interface MetorialSession {
  session_id: string;
  agent_name: string;
  goal: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  total_steps: number;
  duration_ms?: number;
}

interface MetorialStep {
  session_id: string;
  step_number: number;
  reasoning: string;
  tool_name?: string;
  tool_input?: any;
  tool_output?: any;
  status: 'success' | 'error';
  error_message?: string;
  timestamp: string;
}

/**
 * Create a new agent session in Metorial
 */
export async function createMetorialSession(
  sessionId: string,
  goal: string,
  agentName: string = 'ClaimSense AI Agent'
): Promise<void> {
  const apiKey = getMetorialAPIKey();
  
  if (!apiKey) {
    console.log('⚠️  Metorial API key not configured, skipping session creation');
    return;
  }

  try {
    const session: MetorialSession = {
      session_id: sessionId,
      agent_name: agentName,
      goal,
      status: 'running',
      started_at: new Date().toISOString(),
      total_steps: 0,
    };

    console.log(`\n📡 Sending session to Metorial:`);
    console.log(`   URL: ${METORIAL_API_URL}/sessions`);
    console.log(`   API Key: ${apiKey.substring(0, 20)}...`);
    console.log(`   Session ID: ${sessionId}`);

    const response = await fetch(`${METORIAL_API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Agent-Name': agentName,
      },
      body: JSON.stringify(session),
    });

    console.log(`   Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const responseData = await response.text();
      console.log(`   Response body:`, responseData);
      console.log(`✅ Metorial session created: ${sessionId}`);
    } else {
      const errorBody = await response.text();
      console.warn(`⚠️  Failed to create Metorial session: ${response.status} ${response.statusText}`);
      console.warn(`   Error body:`, errorBody);
    }
  } catch (error) {
    console.error('❌ Metorial session creation failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
    }
  }
}

/**
 * Log an agent step to Metorial
 */
export async function logMetorialStep(
  sessionId: string,
  stepNumber: number,
  reasoning: string,
  toolName?: string,
  toolInput?: any,
  toolOutput?: any,
  status: 'success' | 'error' = 'success',
  errorMessage?: string
): Promise<void> {
  const apiKey = getMetorialAPIKey();
  
  if (!apiKey) {
    return;
  }

  try {
    const step: MetorialStep = {
      session_id: sessionId,
      step_number: stepNumber,
      reasoning,
      tool_name: toolName,
      tool_input: toolInput,
      tool_output: toolOutput,
      status,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(`${METORIAL_API_URL}/sessions/${sessionId}/steps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(step),
    });

    if (response.ok) {
      console.log(`📊 Metorial step logged: ${stepNumber} - ${toolName || 'reasoning'}`);
    }
  } catch (error) {
    // Fail silently - don't break the workflow if Metorial is unavailable
    console.debug('Metorial step logging failed:', error);
  }
}

/**
 * Complete an agent session in Metorial
 */
export async function completeMetorialSession(
  sessionId: string,
  totalSteps: number,
  durationMs: number,
  status: 'completed' | 'failed',
  finalResult?: any
): Promise<void> {
  const apiKey = getMetorialAPIKey();
  
  if (!apiKey) {
    return;
  }

  try {
    const update = {
      status,
      completed_at: new Date().toISOString(),
      total_steps: totalSteps,
      duration_ms: durationMs,
      final_result: finalResult,
    };

    const response = await fetch(`${METORIAL_API_URL}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(update),
    });

    if (response.ok) {
      console.log(`✅ Metorial session completed: ${sessionId}`);
      console.log(`🔗 View in dashboard: https://app.metorial.com/i/agent-jam/claimgenius/development-0207/sessions/${sessionId}`);
    }
  } catch (error) {
    console.warn('⚠️  Metorial session completion failed:', error);
  }
}

/**
 * Log an error to Metorial
 */
export async function logMetorialError(
  sessionId: string,
  error: Error,
  context?: any
): Promise<void> {
  const apiKey = getMetorialAPIKey();
  
  if (!apiKey) {
    return;
  }

  try {
    const errorLog = {
      session_id: sessionId,
      error_message: error.message,
      error_stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    };

    await fetch(`${METORIAL_API_URL}/errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(errorLog),
    });

    console.log(`❌ Error logged to Metorial dashboard`);
  } catch (err) {
    console.debug('Metorial error logging failed:', err);
  }
}

/**
 * Send telemetry metrics to Metorial
 */
export async function sendMetorialMetrics(
  sessionId: string,
  metrics: {
    tool_calls: number;
    total_tokens?: number;
    cost_usd?: number;
    success_rate?: number;
  }
): Promise<void> {
  const apiKey = getMetorialAPIKey();
  
  if (!apiKey) {
    return;
  }

  try {
    await fetch(`${METORIAL_API_URL}/sessions/${sessionId}/metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(metrics),
    });
  } catch (error) {
    console.debug('Metorial metrics failed:', error);
  }
}

/**
 * Check if Metorial is configured
 */
export function isMetorialConfigured(): boolean {
  const apiKey = getMetorialAPIKey();
  return !!apiKey && apiKey.length > 0;
}

