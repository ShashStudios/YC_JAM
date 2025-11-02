import type { NextApiRequest, NextApiResponse } from 'next';
import { APIResponse, ExtractedEntities } from '@/types';
import { extractEntitiesFromNote } from '@/server/ai/coordinator';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<ExtractedEntities>>
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
    console.log('📥 extract_entities API called');
    console.log('Request body keys:', Object.keys(req.body || {}));
    
    const { clinician_note } = req.body;
    
    if (!clinician_note || typeof clinician_note !== 'string') {
      console.error('❌ Invalid input - clinician_note missing or not a string');
      console.error('Received:', typeof clinician_note, clinician_note?.substring?.(0, 50));
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Missing or invalid clinician_note in request body',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    console.log(`📝 Extracting entities from note (${clinician_note.length} chars)...`);
    
    // Extract entities using AI
    const entities = await extractEntitiesFromNote(clinician_note);
    
    console.log('✅ Entities extracted successfully');
    
    return res.status(200).json({
      success: true,
      data: entities,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error in extract_entities:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: error.message || 'Failed to extract entities',
        details: error.toString(),
      },
      timestamp: new Date().toISOString(),
    });
  }
}

