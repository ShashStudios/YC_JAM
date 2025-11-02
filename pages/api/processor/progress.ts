import type { NextApiRequest, NextApiResponse } from 'next';

// Store for SSE connections - maps noteId to response objects
const progressStreams = new Map<string, NextApiResponse>();

/**
 * Send progress update to client
 */
export function sendProgressUpdate(noteId: string, step: number, totalSteps: number, message: string, status: 'processing' | 'completed' | 'error') {
  const res = progressStreams.get(noteId);
  if (res) {
    const data = {
      step,
      totalSteps,
      message,
      status,
      timestamp: new Date().toISOString(),
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

/**
 * SSE endpoint for real-time progress updates
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { noteId } = req.query;

  if (!noteId || typeof noteId !== 'string') {
    return res.status(400).json({ error: 'Missing noteId' });
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write('data: {"status":"connected"}\n\n');

  // Store this connection
  progressStreams.set(noteId, res);

  console.log(`📡 SSE connection established for note ${noteId}`);

  // Clean up on close
  req.on('close', () => {
    console.log(`📡 SSE connection closed for note ${noteId}`);
    progressStreams.delete(noteId);
    res.end();
  });
}

