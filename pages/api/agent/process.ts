import type { NextApiRequest, NextApiResponse } from 'next';
import { APIResponse } from '@/types';
import { runAgenticWorkflow } from '@/server/ai/agent';
import { runAgenticWorkflowWithMetorial, isMetorialConfigured } from '@/server/ai/agent-metorial-v2';

/**
 * Agentic AI Endpoint
 * The AI agent autonomously processes the clinician note using MCP tools
 * Now with Metorial observability!
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST requests are allowed',
      },
      timestamp: new Date().toISOString(),
    });
  }
  
  try {
    const { clinician_note, initial_claim } = req.body;
    
    if (!clinician_note || typeof clinician_note !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Missing or invalid clinician_note in request body',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Define the goal for the agent
    const goal = 'Process this clinician note into an approved healthcare claim. Extract entities, map to codes, validate, fix any issues, and submit to the payer.';
    
    // Initial data for the agent
    const initialData = {
      clinician_note,
      initial_claim: initial_claim || {},
    };
    
    console.log('\n🚀 Starting agentic workflow...');
    
    // Check if Metorial is configured and use it for full observability
    let result;
    if (isMetorialConfigured()) {
      console.log('📊 Using Metorial observability (Deployment: svd_0mhhdgyb8VLhXuGVNebqLi)');
      result = await runAgenticWorkflowWithMetorial(goal, initialData);
    } else {
      console.log('⚠️  Metorial not configured, using local agent');
      result = await runAgenticWorkflow(goal, initialData);
    }
    
    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in agentic workflow:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_FAILED',
        message: error.message || 'Agentic workflow failed',
        details: error,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

