import type { NextApiRequest, NextApiResponse } from 'next';
import { APIResponse, AuditLogEntry } from '@/types';
import { promises as fs } from 'fs';
import { join } from 'path';

const LOGS_FILE = join(process.cwd(), 'server', 'logs.json');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<AuditLogEntry>>
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
    const { action, claim_id, details, actor } = req.body;
    
    if (!action) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Missing action in request body',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Create log entry
    const logEntry: AuditLogEntry = {
      id: generateLogId(),
      timestamp: new Date().toISOString(),
      action,
      claim_id: claim_id || undefined,
      details: details || {},
      actor: actor || 'system',
    };
    
    // Append to logs file
    await appendToLogs(logEntry);
    
    return res.status(200).json({
      success: true,
      data: logEntry,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in log_action:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'LOG_FAILED',
        message: error.message || 'Failed to log action',
        details: error,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Generate a unique log ID
 */
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Append log entry to the logs file
 */
async function appendToLogs(logEntry: AuditLogEntry): Promise<void> {
  try {
    // Ensure the server directory exists
    const serverDir = join(process.cwd(), 'server');
    await fs.mkdir(serverDir, { recursive: true });
    
    let logs: AuditLogEntry[] = [];
    
    // Try to read existing logs
    try {
      const fileContent = await fs.readFile(LOGS_FILE, 'utf-8');
      logs = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist or is empty, start with empty array
      logs = [];
    }
    
    // Append new log entry
    logs.push(logEntry);
    
    // Keep only last 1000 entries to prevent file from growing too large
    if (logs.length > 1000) {
      logs = logs.slice(-1000);
    }
    
    // Write back to file
    await fs.writeFile(LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error writing to logs file:', error);
    throw error;
  }
}

/**
 * GET endpoint to retrieve logs
 */
export async function getLogs(limit: number = 100): Promise<AuditLogEntry[]> {
  try {
    const fileContent = await fs.readFile(LOGS_FILE, 'utf-8');
    const logs: AuditLogEntry[] = JSON.parse(fileContent);
    return logs.slice(-limit).reverse(); // Return most recent logs first
  } catch (error) {
    return [];
  }
}

