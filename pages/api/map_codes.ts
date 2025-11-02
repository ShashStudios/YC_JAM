import type { NextApiRequest, NextApiResponse } from 'next';
import { APIResponse, CodeMappingResult, ExtractedEntitiesSchema } from '@/types';
import { mapEntitiesToCodes } from '@/server/mapper/map_codes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<CodeMappingResult>>
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
    const { entities } = req.body;
    
    if (!entities) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Missing entities in request body',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Validate entities schema
    const validationResult = ExtractedEntitiesSchema.safeParse(entities);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ENTITIES',
          message: 'Invalid entities format',
          details: validationResult.error,
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Map entities to codes
    const mappingResult = mapEntitiesToCodes(validationResult.data);
    
    return res.status(200).json({
      success: true,
      data: mappingResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in map_codes:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'MAPPING_FAILED',
        message: error.message || 'Failed to map codes',
        details: error,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

