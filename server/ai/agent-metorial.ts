/**
 * Agentic AI Coordinator using Metorial SDK
 * Uses the deployed MCP server for full observability
 */

import { Metorial } from 'metorial';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const metorial = new Metorial({
  apiKey: process.env.METORIAL_API_KEY || '',
});

// Your deployed MCP server ID
const CLAIMSENSE_DEPLOYMENT_ID = 'svd_0mhhdgyb8VLhXuGVNebqLi';

interface AgentResult {
  success: boolean;
  goal: string;
  final_result: any;
  reasoning_chain: any[];
  total_steps: number;
  duration_ms: number;
}

/**
 * Run agentic workflow with Metorial observability
 */
export async function runAgenticWorkflowWithMetorial(
  goal: string,
  initialData: any
): Promise<AgentResult> {
  const startTime = Date.now();
  
  console.log('\n🤖 ========================================');
  console.log('🤖 AGENTIC WORKFLOW WITH METORIAL');
  console.log('🤖 Deployment ID:', CLAIMSENSE_DEPLOYMENT_ID);
  console.log('🤖 Goal:', goal);
  console.log('🤖 ========================================\n');

  try {
    // Use Metorial's .run() method for automatic session tracking
    const result = await metorial.run({
      message: `${goal}\n\nClinician Note:\n${initialData.clinician_note}`,
      serverDeployments: [CLAIMSENSE_DEPLOYMENT_ID],
      model: 'gpt-4-turbo-preview',
      client: openai,
      maxSteps: 20,
      temperature: 0.1,
    });

    const duration = Date.now() - startTime;

    console.log('\n🤖 ========================================');
    console.log('🤖 WORKFLOW COMPLETED');
    console.log(`🤖 Steps: ${result.steps}`);
    console.log(`🤖 Duration: ${duration}ms`);
    console.log('🤖 ========================================\n');
    console.log('📊 View session in Metorial dashboard:');
    console.log('🔗 https://app.metorial.com/i/agent-jam/claimgenius/development-0207/sessions\n');

    // Parse the final result to extract claim data
    let finalResult: any = { message: result.text };
    
    // Try to extract structured data from the result
    try {
      // The result.text might contain JSON or structured information
      // For now, we'll return the text response
      finalResult = {
        message: result.text,
        raw_response: result.text,
      };
    } catch (e) {
      // If parsing fails, just return the text
      finalResult = { message: result.text };
    }

    return {
      success: true,
      goal,
      final_result: finalResult,
      reasoning_chain: [{
        step: result.steps,
        reasoning: result.text,
        timestamp: new Date().toISOString(),
      }],
      total_steps: result.steps,
      duration_ms: duration,
    };
  } catch (error: any) {
    console.error('❌ Metorial workflow failed:', error);
    
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      goal,
      final_result: {
        error: error.message,
        details: error.toString(),
      },
      reasoning_chain: [{
        step: 0,
        reasoning: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
      }],
      total_steps: 0,
      duration_ms: duration,
    };
  }
}

/**
 * Check if Metorial is configured
 */
export function isMetorialConfigured(): boolean {
  return !!(process.env.METORIAL_API_KEY && process.env.OPENAI_API_KEY);
}

