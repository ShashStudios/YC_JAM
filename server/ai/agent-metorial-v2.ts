/**
 * Agentic AI Coordinator using Metorial MCP Sessions
 * Explicitly uses the deployed MCP server tools
 */

import { Metorial } from 'metorial';
import { metorialOpenAI } from '@metorial/openai';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const metorial = new Metorial({
  apiKey: process.env.METORIAL_API_KEY || '',
});

// Your deployed MCP server ID (v6 with fixed schemas)
const CLAIMSENSE_DEPLOYMENT_ID = 'svd_0mhhgmyjc4bNAM6yDLd9gD';

// Load system prompt
const SYSTEM_PROMPT = readFileSync(join(process.cwd(), 'prompts', 'system.md'), 'utf-8');

interface AgentResult {
  success: boolean;
  goal: string;
  final_result: any;
  reasoning_chain: any[];
  total_steps: number;
  duration_ms: number;
}

/**
 * Run agentic workflow with explicit MCP tool calling
 */
export async function runAgenticWorkflowWithMetorial(
  goal: string,
  initialData: any
): Promise<AgentResult> {
  const startTime = Date.now();
  const reasoningChain: any[] = [];
  let stepNumber = 0;
  
  console.log('\n🤖 ========================================');
  console.log('🤖 AGENTIC WORKFLOW WITH METORIAL MCP');
  console.log('🤖 Deployment ID:', CLAIMSENSE_DEPLOYMENT_ID);
  console.log('🤖 Goal:', goal);
  console.log('🤖 ========================================\n');

  try {
    let finalResult: any = null;

    // Use Metorial's withProviderSession for explicit tool control
    await metorial.withProviderSession(
      metorialOpenAI.chatCompletions,
      { 
        serverDeployments: [CLAIMSENSE_DEPLOYMENT_ID],
      },
      async (session) => {
        const messages: any[] = [
          {
            role: 'system',
            content: `${SYSTEM_PROMPT}\n\nYou are an autonomous AI agent for healthcare billing. Your goal is: "${goal}"\n\nYou have access to these MCP tools:\n- extract_entities: Extract billing entities from clinician notes\n- map_codes: Map entities to CPT/ICD codes\n- build_claim: Build structured claim\n- validate_claim: Validate against rules\n- fix_claim: Fix validation issues\n- submit_claim: Submit to payer\n- log_action: Log audit trail\n\nUse these tools step-by-step to achieve the goal.`,
          },
          {
            role: 'user',
            content: `Please process this clinician note into an approved claim:\n\n${initialData.clinician_note}\n\nStart by calling extract_entities with this note.`,
          },
        ];

        let continueLoop = true;
        const maxIterations = 15;

        while (continueLoop && stepNumber < maxIterations) {
          stepNumber++;
          console.log(`\n📍 Step ${stepNumber}...`);

          // Call OpenAI with tools from the MCP session
          const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages,
            tools: session.tools, // Tools from your deployed MCP server!
            temperature: 0.1,
          });

          const assistantMessage = response.choices[0].message;
          messages.push(assistantMessage);

          // Log reasoning
          if (assistantMessage.content) {
            console.log(`💭 Reasoning: ${assistantMessage.content}`);
            reasoningChain.push({
              step: stepNumber,
              reasoning: assistantMessage.content,
              timestamp: new Date().toISOString(),
            });
          }

          // Handle tool calls
          if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
            console.log(`🔧 Agent wants to call ${assistantMessage.tool_calls.length} tool(s)`);

            // Execute tools through the MCP session
            const toolResponses = await session.callTools(assistantMessage.tool_calls);
            
            // Log each tool call
            for (let i = 0; i < assistantMessage.tool_calls.length; i++) {
              const toolCall = assistantMessage.tool_calls[i];
              const toolResponse = toolResponses[i];
              
              console.log(`  ✅ ${toolCall.function.name} executed`);
              
              reasoningChain.push({
                step: stepNumber,
                reasoning: assistantMessage.content || 'Executing tool',
                tool: toolCall.function.name,
                tool_input: JSON.parse(toolCall.function.arguments),
                tool_output: toolResponse,
                timestamp: new Date().toISOString(),
              });

              // Check if this was submit_claim
              if (toolCall.function.name === 'submit_claim') {
                try {
                  // Tool response format: { content: [{ type: 'text', text: '...' }] }
                  let responseText = typeof toolResponse.content === 'string' 
                    ? toolResponse.content 
                    : (Array.isArray(toolResponse.content) && toolResponse.content[0] && typeof toolResponse.content[0] === 'object' && 'text' in toolResponse.content[0])
                      ? (toolResponse.content[0] as any).text 
                      : JSON.stringify(toolResponse.content);
                  
                  console.log('📄 submit_claim raw response:', JSON.stringify(toolResponse).substring(0, 500));
                  
                  // Parse the outer JSON
                  let parsed = JSON.parse(responseText);
                  
                  // If it's still wrapped in { content: [...] }, extract the text
                  if (parsed.content && Array.isArray(parsed.content)) {
                    responseText = parsed.content[0]?.text || responseText;
                    parsed = JSON.parse(responseText);
                  }
                  
                  // Extract the actual data from the API response
                  finalResult = parsed.data || parsed;
                  
                  console.log('📄 Final result extracted:', JSON.stringify(finalResult, null, 2));
                  continueLoop = false;
                } catch (e) {
                  console.error('Error parsing submit_claim response:', e);
                  finalResult = { message: 'Claim submitted', raw: toolResponse.content };
                  continueLoop = false;
                }
              }
            }

            // Add tool responses to conversation
            messages.push(...toolResponses);
          } else {
            // No more tool calls - agent is done
            console.log('\n✅ Agent completed workflow');
            continueLoop = false;
            
            if (!finalResult) {
              finalResult = { message: assistantMessage.content };
            }
          }
        }
      }
    );

    const duration = Date.now() - startTime;

    console.log('\n🤖 ========================================');
    console.log('🤖 WORKFLOW COMPLETED');
    console.log(`🤖 Steps: ${stepNumber}`);
    console.log(`🤖 Duration: ${duration}ms`);
    console.log('🤖 ========================================\n');
    console.log('📊 View session in Metorial dashboard:');
    console.log('🔗 https://app.metorial.com/i/agent-jam/claimgenius/development-0207/sessions\n');

    return {
      success: true,
      goal,
      final_result: finalResult || { message: 'Workflow completed' },
      reasoning_chain: reasoningChain,
      total_steps: stepNumber,
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
      reasoning_chain: reasoningChain,
      total_steps: stepNumber,
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

