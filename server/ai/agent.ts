/**
 * Agentic AI Coordinator using Metorial MCP
 * The AI agent autonomously decides which tools to use and when
 */

import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  createMetorialSession,
  logMetorialStep,
  completeMetorialSession,
  logMetorialError,
  isMetorialConfigured,
} from '../metorial/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load system prompt
const SYSTEM_PROMPT = readFileSync(join(process.cwd(), 'prompts', 'system.md'), 'utf-8');

/**
 * MCP Tools available to the agent
 */
const MCP_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'extract_entities',
      description: 'Extract structured medical entities from clinician notes. Returns entities in natural language (not billing codes).',
      parameters: {
        type: 'object',
        properties: {
          clinician_note: {
            type: 'string',
            description: 'The clinician\'s note text to extract entities from',
          },
        },
        required: ['clinician_note'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'map_codes',
      description: 'Map extracted entities to valid CPT and ICD-10 codes using deterministic lookup tables.',
      parameters: {
        type: 'object',
        properties: {
          entities: {
            type: 'object',
            description: 'Extracted entities from clinician note',
          },
        },
        required: ['entities'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'build_claim',
      description: 'Build a structured CMS-1500 claim from mapped codes and patient information.',
      parameters: {
        type: 'object',
        properties: {
          mapping_result: {
            type: 'object',
            description: 'Result from map_codes containing CPT and ICD codes',
          },
          patient_info: {
            type: 'object',
            description: 'Patient demographics',
          },
          provider_info: {
            type: 'object',
            description: 'Provider information',
          },
        },
        required: ['mapping_result'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validate_claim',
      description: 'Validate a claim against CMS rules, NCCI edits, and payer policies. Returns list of validation issues.',
      parameters: {
        type: 'object',
        properties: {
          claim: {
            type: 'object',
            description: 'The claim to validate in CMS-1500 format',
          },
        },
        required: ['claim'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_policy',
      description: 'Query Unsiloed AI for payer policy information and CMS rule citations.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The policy question or rule to look up',
          },
          context: {
            type: 'string',
            description: 'Optional context for the query',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fix_claim',
      description: 'Generate AI-powered fixes for validation issues using GPT-4 and policy citations.',
      parameters: {
        type: 'object',
        properties: {
          claim: {
            type: 'object',
            description: 'The claim with validation issues',
          },
          validation_issues: {
            type: 'array',
            items: {
              type: 'object',
              description: 'A validation issue with error details',
            },
            description: 'List of validation issues to fix',
          },
        },
        required: ['claim', 'validation_issues'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'submit_claim',
      description: 'Submit claim to mock payer for approval/denial decision.',
      parameters: {
        type: 'object',
        properties: {
          claim: {
            type: 'object',
            description: 'The claim to submit',
          },
        },
        required: ['claim'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_action',
      description: 'Log an action to the audit trail for compliance and debugging.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Description of the action being logged',
          },
          details: {
            type: 'object',
            description: 'Additional details about the action',
          },
        },
        required: ['action'],
      },
    },
  },
];

/**
 * Execute a tool call via MCP (calls our API endpoints)
 */
async function executeMCPTool(toolName: string, args: any): Promise<any> {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  
  console.log(`\n🔧 Agent executing tool: ${toolName}`);
  console.log(`📝 Full Args:`, JSON.stringify(args, null, 2));
  
  const response = await fetch(`${baseURL}/api/${toolName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Tool ${toolName} failed with ${response.status}: ${errorText}`);
    throw new Error(`Tool ${toolName} failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    console.error(`❌ Tool ${toolName} returned error:`, result.error);
    throw new Error(`Tool ${toolName} error: ${result.error?.message}`);
  }
  
  console.log(`✅ Tool ${toolName} completed successfully\n`);
  return result.data;
}

/**
 * Agentic reasoning step
 */
interface AgentStep {
  step: number;
  reasoning: string;
  tool?: string;
  tool_input?: any;
  tool_output?: any;
  timestamp: string;
}

/**
 * Agent result with full reasoning chain
 */
interface AgentResult {
  success: boolean;
  goal: string;
  final_result: any;
  reasoning_chain: AgentStep[];
  total_steps: number;
  duration_ms: number;
}

/**
 * Run the agentic workflow
 */
export async function runAgenticWorkflow(goal: string, initialData: any): Promise<AgentResult> {
  const startTime = Date.now();
  const reasoningChain: AgentStep[] = [];
  let stepNumber = 0;
  
  // Generate unique session ID
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  console.log('\n🤖 ========================================');
  console.log('🤖 AGENTIC WORKFLOW STARTED');
  console.log('🤖 Session ID:', sessionId);
  console.log('🤖 Goal:', goal);
  console.log('🤖 ========================================\n');
  
  // Create Metorial session
  if (isMetorialConfigured()) {
    await createMetorialSession(sessionId, goal);
  }
  
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\nYou are an autonomous AI agent for healthcare billing. Your goal is: "${goal}"\n\nYou have access to MCP tools. Use them strategically to achieve the goal. Think step-by-step and explain your reasoning before each action.\n\nIMPORTANT WORKFLOW:\n1. First, call extract_entities with the clinician_note\n2. Then, call map_codes with the entities you received\n3. Then, call build_claim with the mapping_result\n4. Then, call validate_claim with the complete claim object\n5. If validation shows errors, call fix_claim with the claim AND validation_issues\n6. Finally, call submit_claim with the fixed or original claim\n\nCRITICAL: Always pass the actual data objects as parameters to each tool. Never call tools with empty objects {}. Use the output from previous tools as input to subsequent tools.\n\nExample:\n- extract_entities needs: {clinician_note: "the actual note text"}\n- map_codes needs: {entities: <the entities object from extract_entities>}\n- build_claim needs: {mapping_result: <the result from map_codes>}\n- validate_claim needs: {claim: <the claim object from build_claim>}\n- fix_claim needs: {claim: <the claim object>, validation_issues: <the issues array>}\n- submit_claim needs: {claim: <the fixed claim object>}`,
    },
    {
      role: 'user',
      content: `Please achieve this goal: ${goal}\n\nHere is the initial data to work with:\n${JSON.stringify(initialData, null, 2)}\n\nStart by extracting entities from the clinician_note field above.`,
    },
  ];
  
  let finalResult: any = null;
  let continueLoop = true;
  const maxIterations = 20; // Safety limit
  
  while (continueLoop && stepNumber < maxIterations) {
    stepNumber++;
    
    console.log(`\n🤔 Agent thinking (step ${stepNumber})...`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      tools: MCP_TOOLS,
      tool_choice: 'auto',
      temperature: 0.1,
    });
    
    const assistantMessage = response.choices[0].message;
    messages.push(assistantMessage);
    
    // Record reasoning
    if (assistantMessage.content) {
      console.log(`💭 Reasoning: ${assistantMessage.content}`);
      
      const step = {
        step: stepNumber,
        reasoning: assistantMessage.content,
        timestamp: new Date().toISOString(),
      };
      reasoningChain.push(step);
      
      // Log to Metorial
      if (isMetorialConfigured()) {
        await logMetorialStep(sessionId, stepNumber, assistantMessage.content);
      }
    }
    
    // Check if agent wants to use tools
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResponses: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`\n🎯 Agent decided to call: ${toolName}`);
        console.log(`📋 With arguments:`, JSON.stringify(toolArgs, null, 2));
        
        try {
          // Execute the tool via MCP
          const toolResult = await executeMCPTool(toolName, toolArgs);
          
          // Record step
          const toolStep = {
            step: stepNumber,
            reasoning: assistantMessage.content || 'Executing tool',
            tool: toolName,
            tool_input: toolArgs,
            tool_output: toolResult,
            timestamp: new Date().toISOString(),
          };
          reasoningChain.push(toolStep);
          
          // Log to Metorial
          if (isMetorialConfigured()) {
            await logMetorialStep(
              sessionId,
              stepNumber,
              assistantMessage.content || 'Executing tool',
              toolName,
              toolArgs,
              toolResult,
              'success'
            );
          }
          
          // Add tool response to conversation
          toolResponses.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
          
          // Store final result if this was submit_claim
          if (toolName === 'submit_claim') {
            finalResult = toolResult;
          }
        } catch (error: any) {
          console.error(`❌ Tool error: ${error.message}`);
          
          // Log error to Metorial
          if (isMetorialConfigured()) {
            await logMetorialError(sessionId, error, {
              tool: toolName,
              args: toolArgs,
              step: stepNumber,
            });
          }
          
          toolResponses.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: error.message }),
          });
        }
      }
      
      messages.push(...toolResponses);
    } else {
      // Agent finished - no more tool calls
      console.log('\n✅ Agent has completed the workflow');
      continueLoop = false;
      
      if (!finalResult && assistantMessage.content) {
        finalResult = { message: assistantMessage.content };
      }
    }
  }
  
  const duration = Date.now() - startTime;
  
  console.log('\n🤖 ========================================');
  console.log('🤖 AGENTIC WORKFLOW COMPLETED');
  console.log(`🤖 Steps: ${stepNumber}`);
  console.log(`🤖 Duration: ${duration}ms`);
  console.log('🤖 ========================================\n');
  
  // Complete Metorial session
  if (isMetorialConfigured()) {
    await completeMetorialSession(sessionId, stepNumber, duration, 'completed', finalResult);
  }
  
  return {
    success: true,
    goal,
    final_result: finalResult,
    reasoning_chain: reasoningChain,
    total_steps: stepNumber,
    duration_ms: duration,
  };
}

