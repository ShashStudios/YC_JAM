/**
 * MCP Tool: Lookup Policy
 * Queries Unsiloed AI for payer policy information and CMS rule citations
 */

import { queryUnsiloedAI } from '@/server/unsiloed/client';

export interface LookupPolicyInput {
  query: string;
  context?: string;
}

export async function lookupPolicyTool(input: LookupPolicyInput): Promise<any> {
  try {
    const result = await queryUnsiloedAI({
      query: input.query,
      context: input.context,
      max_results: 5,
    });
    
    return {
      citations: result.citations,
      query: result.query,
      timestamp: result.timestamp,
    };
  } catch (error: any) {
    console.error('Error in lookup_policy tool:', error);
    throw new Error(`Failed to lookup policy: ${error.message}`);
  }
}

