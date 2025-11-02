import type { NextApiRequest, NextApiResponse } from 'next';
import { APIResponse, Note } from '@/types';
import { getNotesStore } from './upload';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<Note[]>>
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
    const notes = getNotesStore();
    
    // Sort by uploaded_at descending (newest first)
    const sortedNotes = [...notes].sort((a, b) => 
      new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
    );

    return res.status(200).json({
      success: true,
      data: sortedNotes,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in notes/list:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'LIST_FAILED',
        message: error.message || 'Failed to list notes',
        details: error,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

