/**
 * MCP Tool: Log Action
 * Wraps the /api/log_action endpoint for audit trail
 */

export interface LogActionInput {
  action: string;
  claim_id?: string;
  details?: any;
  actor?: 'system' | 'ai' | 'user';
}

export async function logActionTool(input: LogActionInput): Promise<any> {
  try {
    const response = await fetch('http://localhost:3000/api/log_action', {
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
      throw new Error(result.error?.message || 'Logging action failed');
    }
    
    return result.data;
  } catch (error: any) {
    console.error('Error in log_action tool:', error);
    // Don't throw - logging failures shouldn't break the workflow
    return {
      success: false,
      error: error.message,
    };
  }
}

