import type { NextApiRequest, NextApiResponse } from 'next';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import formidable from 'formidable';
import { APIResponse, Note } from '@/types';
import { readFileSync } from 'fs';

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Simple in-memory store for notes (in production, use a database)
let notesStore: Note[] = [];

// Try to load notes from disk on startup
const NOTES_FILE = join(process.cwd(), 'data', 'notes.json');
try {
  if (existsSync(NOTES_FILE)) {
    const data = readFileSync(NOTES_FILE, 'utf-8');
    notesStore = JSON.parse(data);
  }
} catch (err) {
  console.log('No existing notes file, starting fresh');
}

function saveNotesToDisk() {
  try {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    writeFileSync(NOTES_FILE, JSON.stringify(notesStore, null, 2));
  } catch (err) {
    console.error('Failed to save notes to disk:', err);
  }
}

export function getNotesStore(): Note[] {
  return notesStore;
}

export function updateNoteStatus(
  noteId: string,
  status: Note['status'],
  updates: Partial<Note> = {}
) {
  const note = notesStore.find((n) => n.id === noteId);
  if (note) {
    note.status = status;
    Object.assign(note, updates);
    saveNotesToDisk();
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<Note>>
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
    // Parse form data
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB
    });

    const [fields, files] = await form.parse(req);

    const uploadedFile = files.file?.[0];
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate file type
    if (!uploadedFile.originalFilename?.endsWith('.txt')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Only .txt files are allowed',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Read file content
    const content = readFileSync(uploadedFile.filepath, 'utf-8');

    // Create notes directory if it doesn't exist
    const notesDir = join(process.cwd(), 'public', 'notes');
    if (!existsSync(notesDir)) {
      mkdirSync(notesDir, { recursive: true });
    }

    // Generate unique ID
    const noteId = `NOTE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`.toUpperCase();
    
    // Save file to notes directory
    const filename = uploadedFile.originalFilename;
    const savedFilename = `${noteId}-${filename}`;
    const savedPath = join(notesDir, savedFilename);
    writeFileSync(savedPath, content);

    // Create note record
    const note: Note = {
      id: noteId,
      filename,
      content,
      uploaded_at: new Date().toISOString(),
      status: 'pending',
    };

    // Add to store
    notesStore.push(note);
    saveNotesToDisk();

    // Trigger background processing (fire and forget)
    // This will be picked up by the processor
    setImmediate(() => {
      import('@/server/processor/claim-processor').then((module) => {
        module.processNote(noteId);
      });
    });

    return res.status(200).json({
      success: true,
      data: note,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in notes/upload:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: error.message || 'Failed to upload file',
        details: error,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

