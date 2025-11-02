/**
 * Metorial-integrated AI Agent
 * Uses official Metorial SDK for automatic session tracking
 */

import { Metorial } from 'metorial';
import { metorialOpenAI } from '@metorial/openai';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Metorial client
let metorial: Metorial | null = null;

function getMetorialClient(): Metorial | null {
  const apiKey = process.env.METORIAL_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️  Metorial API key not configured');
    return null;
  }
  
  if (!metorial) {
    metorial = new Metorial({ apiKey });
    console.log('✅ Metorial client initialized');
  }
  
  return metorial;
}

/**
 * Run agentic workflow with Metorial observability
 */
export async function runAgenticWorkflowWithMetorial(
  goal: string,
  initialData: any,
  serverDeploymentId?: string
): Promise<any> {
  const metorialClient = getMetorialClient();
  
  // If Metorial is not configured, fall back to regular execution
  if (!metorialClient) {
    console.log('📝 Running without Metorial observability');
    // Import and use the regular agent
    const { runAgenticWorkflow } = await import('../ai/agent');
    return runAgenticWorkflow(goal, initialData);
  }

  console.log('\n🎯 Running with Metorial observability...');
  console.log(`📊 Session will appear in dashboard\n`);

  // Use Metorial's .run() method for automatic session tracking
  const result = await metorialClient.run({
    message: `${goal}\n\nInitial data:\n${JSON.stringify(initialData, null, 2)}`,
    serverDeployments: serverDeploymentId ? [serverDeploymentId] : [],
    model: 'gpt-4-turbo-preview',
    client: openai,
    maxSteps: 20,
    temperature: 0.1,
  });

  console.log(`\n✅ Metorial session completed in ${result.steps} steps`);
  console.log(`🔗 View in dashboard: https://app.metorial.com/i/agent-jam/claimgenius/development-0207/sessions`);

  return {
    success: true,
    goal,
    final_result: { message: result.text },
    reasoning_chain: [{
      step: result.steps,
      reasoning: result.text,
      timestamp: new Date().toISOString(),
    }],
    total_steps: result.steps,
    duration_ms: 0, // Metorial tracks this internally
  };
}

/**
 * Check if Metorial is configured
 */
export function isMetorialConfigured(): boolean {
  return !!process.env.METORIAL_API_KEY;
}

