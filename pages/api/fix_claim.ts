import type { NextApiRequest, NextApiResponse } from 'next';
import { APIResponse, ClaimFixResult, ClaimSchema } from '@/types';
import { generateClaimFixes, applyPatchesToClaim } from '@/server/ai/coordinator';
import { getCitationsForClaim } from '@/server/unsiloed/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<ClaimFixResult>>
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
    const { claim, validation_issues } = req.body;
    
    if (!claim || !validation_issues) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Missing claim or validation_issues in request body',
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
    
    // Get policy citations for the issues
    const issueCodes = validation_issues.map((issue: any) => issue.code);
    const citationMap = await getCitationsForClaim(issueCodes);
    
    // Format citations as strings for AI
    const citationTexts: string[] = [];
    citationMap.forEach((citations, code) => {
      citations.forEach(citation => {
        citationTexts.push(`[${code}] ${citation.text} (Source: ${citation.source})`);
      });
    });
    
    // Generate fixes using AI
    const fixes = await generateClaimFixes(
      schemaValidation.data,
      validation_issues,
      citationTexts
    );
    
    // Apply fixes to claim
    const fixedClaim = applyPatchesToClaim(schemaValidation.data, fixes);
    
    const result: ClaimFixResult = {
      original_claim: schemaValidation.data,
      fixed_claim: fixedClaim,
      fixes_applied: fixes,
      timestamp: new Date().toISOString(),
    };
    
    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in fix_claim:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FIX_FAILED',
        message: error.message || 'Failed to fix claim',
        details: error,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

