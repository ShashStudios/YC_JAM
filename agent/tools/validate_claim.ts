/**
 * MCP Tool: Validate Claim
 * Wraps the /api/validate_claim endpoint
 */

export interface ValidateClaimInput {
  claim: any;
}

export async function validateClaimTool(input: ValidateClaimInput): Promise<any> {
  try {
    const response = await fetch('http://localhost:3000/api/validate_claim', {
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
      throw new Error(result.error?.message || 'Claim validation failed');
    }
    
    return result.data;
  } catch (error: any) {
    console.error('Error in validate_claim tool:', error);
    throw new Error(`Failed to validate claim: ${error.message}`);
  }
}

