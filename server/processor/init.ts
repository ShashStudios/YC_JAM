/**
 * Initialization script for background processors
 * Call this on server startup
 */

import { startFileWatcher, scanAndProcessNotes } from './file-watcher';
import { processAllPendingNotes } from './claim-processor';

let initialized = false;

/**
 * Initialize all background processors
 */
export async function initializeProcessors() {
  if (initialized) {
    console.log('⚠️  Processors already initialized');
    return;
  }

  console.log('\n🚀 ========================================');
  console.log('🚀 INITIALIZING BACKGROUND PROCESSORS');
  console.log('🚀 ========================================\n');

  try {
    // Start the file watcher
    startFileWatcher();

    // Scan for any pending notes
    await scanAndProcessNotes();

    // Process any pending notes in the database
    await processAllPendingNotes();

    initialized = true;

    console.log('\n✅ ========================================');
    console.log('✅ BACKGROUND PROCESSORS INITIALIZED');
    console.log('✅ ========================================\n');
  } catch (error) {
    console.error('❌ Failed to initialize processors:', error);
    throw error;
  }
}

/**
 * Check if processors are initialized
 */
export function areProcessorsInitialized(): boolean {
  return initialized;
}

