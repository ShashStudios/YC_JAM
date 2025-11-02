import type { NextApiRequest, NextApiResponse } from 'next';
import { APIResponse } from '@/types';
import { getQueueStatus } from '@/server/processor/claim-processor';
import { isFileWatcherRunning } from '@/server/processor/file-watcher';
import { areProcessorsInitialized } from '@/server/processor/init';

interface ProcessorStatus {
  initialized: boolean;
  fileWatcherRunning: boolean;
  queue: {
    queued: number;
    processing: number;
    active: string[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<ProcessorStatus>>
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
    const status: ProcessorStatus = {
      initialized: areProcessorsInitialized(),
      fileWatcherRunning: isFileWatcherRunning(),
      queue: getQueueStatus(),
    };

    return res.status(200).json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error getting processor status:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_FAILED',
        message: error.message || 'Failed to get processor status',
        details: error,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

