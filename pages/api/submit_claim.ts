import type { NextApiRequest, NextApiResponse } from 'next';
import { APIResponse, PayerResponse, ClaimSchema } from '@/types';
import { validateClaim } from '@/server/validation/validate_claim';
import { generateCMS1500PDF } from '@/server/pdf/generate_cms1500';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<PayerResponse>>
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
    
    // Run validation to check claim quality
    const validationResult = validateClaim(schemaValidation.data);
    
    // Mock payer decision logic
    const claimId = generateClaimId();
    let decision: 'approved' | 'denied' | 'pending' = 'approved';
    let reason = 'Claim meets all requirements';
    const reasonCodes: string[] = [];
    
    // Check for errors that would cause denial
    const errors = validationResult.issues.filter(issue => issue.severity === 'error');
    
    if (errors.length > 0) {
      decision = 'denied';
      reason = 'Claim has validation errors';
      reasonCodes.push(...errors.map(e => e.code));
    }
    
    // Calculate approved amount
    let amountApproved = 0;
    if (decision === 'approved') {
      amountApproved = schemaValidation.data.procedures.reduce(
        (sum, proc) => sum + proc.charge,
        0
      );
    }
    
    // Generate CMS 1500 PDF
    let pdfUrl: string | undefined;
    try {
      pdfUrl = await generateCMS1500PDF(schemaValidation.data, claimId);
      console.log(`✅ Generated CMS 1500 PDF: ${pdfUrl}`);
    } catch (pdfError) {
      console.error('Failed to generate PDF:', pdfError);
      // Continue without PDF if generation fails
    }
    
    const payerResponse: PayerResponse = {
      decision,
      claim_id: claimId,
      timestamp: new Date().toISOString(),
      reason,
      reason_codes: reasonCodes.length > 0 ? reasonCodes : undefined,
      amount_approved: decision === 'approved' ? amountApproved : undefined,
      pdf_url: pdfUrl,
    };
    
    return res.status(200).json({
      success: true,
      data: payerResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in submit_claim:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SUBMISSION_FAILED',
        message: error.message || 'Failed to submit claim',
        details: error,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Generate a unique claim ID
 */
function generateClaimId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `CLM-${timestamp}-${random}`.toUpperCase();
}

