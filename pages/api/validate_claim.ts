import type { NextApiRequest, NextApiResponse } from 'next';
import { APIResponse, ValidationResult, ClaimSchema } from '@/types';
import { validateClaim } from '@/server/validation/validate_claim';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<ValidationResult>>
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
    const { claim } = req.body;
    
    if (!claim) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Missing claim in request body',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Validate claim schema
    const schemaValidation = ClaimSchema.safeParse(claim);
    if (!schemaValidation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CLAIM',
          message: 'Invalid claim format',
          details: schemaValidation.error,
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Run validation
    const validationResult = validateClaim(schemaValidation.data);
    
    return res.status(200).json({
      success: true,
      data: validationResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in validate_claim:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: error.message || 'Failed to validate claim',
        details: error,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

