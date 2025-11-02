/**
 * MCP Tool: Fix Claim
 * Wraps the /api/fix_claim endpoint and orchestrates AI reasoning with GPT-4
 */

export interface FixClaimInput {
  claim: any;
  validation_issues: any[];
}

export async function fixClaimTool(input: FixClaimInput): Promise<any> {
  try {
    const response = await fetch('http://localhost:3000/api/fix_claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Claim fix failed');
    }
    
    return result.data;
  } catch (error: any) {
    console.error('Error in fix_claim tool:', error);
    throw new Error(`Failed to fix claim: ${error.message}`);
  }
}

