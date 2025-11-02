/**
 * Background claim processor with parallel processing queue
 * Automatically processes uploaded notes into claims
 */

import { Note, ClaimRecord, Claim } from '@/types';
import { runAgenticWorkflowWithMetorial } from '@/server/ai/agent-metorial-v2';
import { generateCMS1500PDF } from '@/server/pdf/generate_cms1500';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ProcessorConfig } from './config';

// In-memory stores (in production, use a database)
let claimsStore: ClaimRecord[] = [];

// Claims file for persistence
const CLAIMS_FILE = join(process.cwd(), 'data', 'claims.json');

// Try to load claims from disk on startup
try {
  if (existsSync(CLAIMS_FILE)) {
    const data = readFileSync(CLAIMS_FILE, 'utf-8');
    claimsStore = JSON.parse(data);
  }
} catch (err) {
  console.log('No existing claims file, starting fresh');
}

function saveClaimsToDisk() {
  try {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    writeFileSync(CLAIMS_FILE, JSON.stringify(claimsStore, null, 2));
  } catch (err) {
    console.error('Failed to save claims to disk:', err);
  }
}

export function getClaimsStore(): ClaimRecord[] {
  return claimsStore;
}

// Processing queue with concurrency control
class ProcessingQueue {
  private queue: string[] = [];
  private processing = new Set<string>();
  private maxConcurrency: number;

  constructor(maxConcurrency = 3) {
    this.maxConcurrency = maxConcurrency;
  }

  enqueue(noteId: string) {
    if (!this.queue.includes(noteId) && !this.processing.has(noteId)) {
      this.queue.push(noteId);
      this.processNext();
    }
  }

  private async processNext() {
    if (this.processing.size >= this.maxConcurrency) {
      return; // Already at max concurrency
    }

    const noteId = this.queue.shift();
    if (!noteId) {
      return; // Queue is empty
    }

    this.processing.add(noteId);

    try {
      await processSingleNote(noteId);
    } catch (error) {
      console.error(`Failed to process note ${noteId}:`, error);
    } finally {
      this.processing.delete(noteId);
      
      // Add configurable delay between notes to avoid rate limits
      if (ProcessorConfig.INTER_NOTE_DELAY_MS > 0) {
        await new Promise(resolve => setTimeout(resolve, ProcessorConfig.INTER_NOTE_DELAY_MS));
      }
      
      // Process next item
      this.processNext();
    }
  }

  getStatus() {
    return {
      queued: this.queue.length,
      processing: this.processing.size,
      active: Array.from(this.processing),
    };
  }
}

// Global queue instance (configured via ProcessorConfig)
const processingQueue = new ProcessingQueue(ProcessorConfig.MAX_CONCURRENCY);

/**
 * Add a note to the processing queue
 */
export function processNote(noteId: string) {
  console.log(`📝 Queuing note ${noteId} for processing`);
  processingQueue.enqueue(noteId);
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process a single note into a claim with retry logic
 */
async function processSingleNote(noteId: string, retryCount = 0): Promise<void> {
  const maxRetries = ProcessorConfig.MAX_RETRIES;
  console.log(`\n🚀 Starting processing for note ${noteId}${retryCount > 0 ? ` (Retry ${retryCount}/${maxRetries})` : ''}`);
  
  // Import the notes store dynamically to avoid circular dependencies
  const { getNotesStore, updateNoteStatus } = await import('@/pages/api/notes/upload');
  const notes = getNotesStore();
  const note = notes.find((n) => n.id === noteId);

  if (!note) {
    console.error(`Note ${noteId} not found`);
    return;
  }

  // Update status to processing
  updateNoteStatus(noteId, 'processing', {
    processing_started_at: new Date().toISOString(),
  });

  try {
    // Send progress updates
    const { sendProgressUpdate } = await import('@/pages/api/processor/progress');
    
    sendProgressUpdate(noteId, 1, 5, 'Initializing AI workflow and analyzing note structure', 'processing');
    
    // Run the agentic workflow with timeout
    console.log(`🤖 Running agentic workflow for note ${noteId}`);
    
    // Create a timeout promise
    const timeoutMs = 120000; // 2 minutes timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Processing timeout - took longer than 2 minutes')), timeoutMs)
    );
    
    sendProgressUpdate(noteId, 2, 5, 'Extracting diagnoses, procedures, and patient information', 'processing');
    
    // Race between processing and timeout
    const agentResult = await Promise.race([
      runAgenticWorkflowWithMetorial(
        'Process this clinician note into a complete, validated, and approved claim',
        { clinician_note: note.content }
      ),
      timeoutPromise
    ]) as any;

    if (!agentResult.success) {
      sendProgressUpdate(noteId, 5, 5, 'Processing failed', 'error');
      throw new Error(`Agent workflow failed: ${agentResult.final_result?.error || 'Unknown error'}`);
    }
    
    sendProgressUpdate(noteId, 3, 5, 'Mapping medical codes and checking NCCI compliance', 'processing');
    sendProgressUpdate(noteId, 4, 5, 'Validating claim data and generating CMS 1500 form', 'processing');
    
    console.log(`✅ Agent workflow completed for note ${noteId}`);

    // Extract the final result
    const finalResult = agentResult.final_result;
    
    if (!finalResult) {
      throw new Error('No final result from agent workflow');
    }

    // Extract claim ID and PDF URL
    const claimId = finalResult.claim_id || `CLM-${Date.now().toString(36).toUpperCase()}`;
    let pdfUrl = finalResult.pdf_url;

    // If no PDF was generated by the agent, try to generate one
    if (!pdfUrl && finalResult.claim) {
      try {
        pdfUrl = await generateCMS1500PDF(finalResult.claim, claimId);
        console.log(`✅ Generated PDF: ${pdfUrl}`);
      } catch (pdfError) {
        console.error('Failed to generate PDF:', pdfError);
      }
    }

    // Create claim record
    const claimRecord: ClaimRecord = {
      claim_id: claimId,
      note_id: noteId,
      note_filename: note.filename,
      pdf_url: pdfUrl || '',
      decision: finalResult.decision || 'pending',
      amount_approved: finalResult.amount_approved,
      reason: finalResult.reason || 'Claim processed successfully',
      created_at: new Date().toISOString(),
      patient_name: finalResult.claim?.patient 
        ? `${finalResult.claim.patient.first_name} ${finalResult.claim.patient.last_name}` 
        : undefined,
      provider_name: finalResult.claim?.provider?.name,
      claim_data: finalResult.claim,
    };

    // Save claim record
    claimsStore.push(claimRecord);
    saveClaimsToDisk();

    // Send final progress update
    sendProgressUpdate(noteId, 5, 5, 'Claim processing complete! CMS 1500 form generated and ready', 'completed');
    
    // Update note status to completed
    updateNoteStatus(noteId, 'completed', {
      claim_id: claimId,
      pdf_url: pdfUrl,
      processing_completed_at: new Date().toISOString(),
    });

    console.log(`✅ Successfully processed note ${noteId} -> Claim ${claimId}`);
  } catch (error: any) {
    console.error(`❌ Failed to process note ${noteId}:`, error);

    // Check if it's a rate limit error
    const isRateLimitError = error.message?.includes('429') || 
                            error.message?.includes('Rate limit') ||
                            error.message?.includes('rate_limit');

    if (isRateLimitError && retryCount < maxRetries) {
      // Exponential backoff based on config
      const delayMs = Math.pow(2, retryCount + 1) * ProcessorConfig.RETRY_BASE_DELAY_MS;
      console.log(`⏳ Rate limit hit. Retrying in ${delayMs / 1000}s...`);
      
      // Update status to pending for retry
      updateNoteStatus(noteId, 'pending', {
        error: `Rate limit - retrying in ${delayMs / 1000}s (attempt ${retryCount + 1}/${maxRetries})`,
      });
      
      await sleep(delayMs);
      
      // Retry
      return processSingleNote(noteId, retryCount + 1);
    }

    // Update note status to failed
    updateNoteStatus(noteId, 'failed', {
      error: error.message || 'Processing failed',
      processing_completed_at: new Date().toISOString(),
    });
  }
}

/**
 * Get processing queue status
 */
export function getQueueStatus() {
  return processingQueue.getStatus();
}

/**
 * Process all pending notes (useful for startup recovery)
 */
export async function processAllPendingNotes() {
  const { getNotesStore } = await import('@/pages/api/notes/upload');
  const notes = getNotesStore();
  const pendingNotes = notes.filter((n) => n.status === 'pending');

  console.log(`📋 Found ${pendingNotes.length} pending notes to process`);

  for (const note of pendingNotes) {
    processNote(note.id);
  }
}

