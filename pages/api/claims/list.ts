import type { NextApiRequest, NextApiResponse } from 'next';
import { APIResponse, ClaimRecord } from '@/types';
import { getClaimsStore } from '@/server/processor/claim-processor';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<ClaimRecord[]>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only GET requests are allowed',
      },
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const claims = getClaimsStore();
    
    // Sort by created_at descending (newest first)
    const sortedClaims = [...claims].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return res.status(200).json({
      success: true,
      data: sortedClaims,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in claims/list:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'LIST_FAILED',
        message: error.message || 'Failed to list claims',
        details: error,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

