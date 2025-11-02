/**
 * MCP Tool: Extract Entities
 * Wraps the /api/extract_entities endpoint
 */

export interface ExtractEntitiesInput {
  clinician_note: string;
}

export async function extractEntitiesTool(input: ExtractEntitiesInput): Promise<any> {
  try {
    console.log('🔧 extract_entities tool called with input keys:', Object.keys(input));
    console.log('📤 Calling API at http://localhost:3000/api/extract_entities');
    
    const response = await fetch('http://localhost:3000/api/extract_entities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    
    console.log('📥 API response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API error response:', errorText);
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    console.log('📊 API result:', { success: result.success, hasData: !!result.data });
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Entity extraction failed');
    }
    
    console.log('✅ extract_entities tool completed successfully');
    return result.data;
  } catch (error: any) {
    console.error('❌ Error in extract_entities tool:', error);
    throw new Error(`Failed to extract entities: ${error.message}`);
  }
}

