/**
 * File system watcher for continuous monitoring of the notes directory
 * Automatically detects and processes new notes
 */

import { watch, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { processNote } from './claim-processor';

const WATCH_DIR = join(process.cwd(), 'public', 'notes');
let isWatching = false;
let watcher: any = null;

/**
 * Start watching the notes directory for new files
 */
export function startFileWatcher() {
  if (isWatching) {
    console.log('⚠️  File watcher is already running');
    return;
  }

  // Create directory if it doesn't exist
  if (!existsSync(WATCH_DIR)) {
    mkdirSync(WATCH_DIR, { recursive: true });
    console.log(`📁 Created notes directory: ${WATCH_DIR}`);
  }

  console.log(`👀 Starting file watcher on: ${WATCH_DIR}`);

  try {
    watcher = watch(WATCH_DIR, { recursive: false }, async (eventType, filename) => {
      if (!filename || !filename.endsWith('.txt')) {
        return; // Ignore non-txt files
      }

      if (eventType === 'rename' || eventType === 'change') {
        const filePath = join(WATCH_DIR, filename);
        
        // Check if file exists (rename event can be delete)
        if (!existsSync(filePath)) {
          return;
        }

        console.log(`📄 Detected new/modified file: ${filename}`);

        // Extract note ID from filename (format: NOTE-xxx-filename.txt)
        const match = filename.match(/^(NOTE-[A-Z0-9]+-[A-Z0-9]+)/);
        if (match) {
          const noteId = match[1];
          console.log(`🔔 Triggering processing for note: ${noteId}`);
          
          // Small delay to ensure file is fully written
          setTimeout(() => {
            processNote(noteId);
          }, 1000);
        }
      }
    });

    isWatching = true;
    console.log('✅ File watcher started successfully');
  } catch (error) {
    console.error('❌ Failed to start file watcher:', error);
    throw error;
  }
}

/**
 * Stop watching the notes directory
 */
export function stopFileWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
    isWatching = false;
    console.log('🛑 File watcher stopped');
  }
}

/**
 * Check if file watcher is running
 */
export function isFileWatcherRunning(): boolean {
  return isWatching;
}

/**
 * Manually scan the notes directory and process any unprocessed files
 */
export async function scanAndProcessNotes() {
  const { readdirSync } = await import('fs');
  const { getNotesStore } = await import('@/pages/api/notes/upload');
  
  console.log('🔍 Scanning notes directory for unprocessed files...');
  
  if (!existsSync(WATCH_DIR)) {
    console.log('📁 Notes directory does not exist yet');
    return;
  }

  const files = readdirSync(WATCH_DIR);
  const txtFiles = files.filter((f) => f.endsWith('.txt'));
  
  console.log(`📋 Found ${txtFiles.length} text files`);

  const notes = getNotesStore();
  
  for (const file of txtFiles) {
    const match = file.match(/^(NOTE-[A-Z0-9]+-[A-Z0-9]+)/);
    if (match) {
      const noteId = match[1];
      const note = notes.find((n) => n.id === noteId);
      
      if (note && note.status === 'pending') {
        console.log(`📝 Processing pending note: ${noteId}`);
        processNote(noteId);
      }
    }
  }
}

