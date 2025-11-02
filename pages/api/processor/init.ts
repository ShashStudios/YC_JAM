import type { NextApiRequest, NextApiResponse } from 'next';
import { APIResponse } from '@/types';
import { initializeProcessors, areProcessorsInitialized } from '@/server/processor/init';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<{ initialized: boolean }>>
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
    if (areProcessorsInitialized()) {
      return res.status(200).json({
        success: true,
        data: { initialized: true },
        timestamp: new Date().toISOString(),
      });
    }

    await initializeProcessors();

    return res.status(200).json({
      success: true,
      data: { initialized: true },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error initializing processors:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INIT_FAILED',
        message: error.message || 'Failed to initialize processors',
        details: error,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

