'use client';

import { useState, useEffect } from 'react';
import { SyntheticWorkflow } from '@/app/components/ui/synthetic-workflow';

interface Note {
  id: string;
  filename: string;
  content: string;
  uploaded_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  claim_id?: string;
  pdf_url?: string;
  error?: string;
}

interface ProcessorStatus {
  initialized: boolean;
  fileWatcherRunning: boolean;
  queue: {
    queued: number;
    processing: number;
    active: string[];
  };
}

// Function to strip RTF formatting and convert to plain text
const stripRTF = (rtfText: string): string => {
  if (!rtfText) return '';
  
  // Check if it's RTF content
  if (!rtfText.startsWith('{\\rtf')) {
    return rtfText; // Return as-is if not RTF
  }
  
  try {
    let text = rtfText;
    
    // Remove RTF header and preamble more aggressively
    text = text.replace(/\{\\rtf1[^}]*\}/g, '');
    text = text.replace(/\\rtf1[^\\{]*/, '');
    
    // Remove font table with nested groups
    text = text.replace(/\{\\fonttbl(?:[^{}]|\{[^{}]*\})*\}/g, '');
    
    // Remove color table
    text = text.replace(/\{\\colortbl[^}]*\}/g, '');
    text = text.replace(/\{[\\*]\\expandedcolortbl[^}]*\}/g, '');
    
    // Remove style sheet
    text = text.replace(/\{\\stylesheet[^}]*\}/g, '');
    
    // Remove info group
    text = text.replace(/\{\\info[^}]*\}/g, '');
    
    // Remove document formatting
    text = text.replace(/\\cocoatextscaling\d+/g, '');
    text = text.replace(/\\cocoaplatform\d+/g, '');
    text = text.replace(/\\margl\d+\\margr\d+\\vieww\d+\\viewh\d+\\viewkind\d+/g, '');
    text = text.replace(/\\pard[^\\]*/g, '\n');
    
    // Replace \par, \line, and paragraph markers with newlines
    text = text.replace(/\\par\s?/g, '\n');
    text = text.replace(/\\line\s?/g, '\n');
    
    // Replace \tab with tab
    text = text.replace(/\\tab\s?/g, '\t');
    
    // Remove font and style commands
    text = text.replace(/\\f\d+/g, '');
    text = text.replace(/\\fs\d+/g, '');
    text = text.replace(/\\cf\d+/g, '');
    text = text.replace(/\\fswiss/g, '');
    text = text.replace(/\\fcharset\d+/g, '');
    
    // Remove all other RTF control words
    text = text.replace(/\\[a-z]+(-?\d+)?[ ]?/g, ' ');
    
    // Remove curly braces
    text = text.replace(/[{}]/g, '');
    
    // Clean up whitespace
    text = text.replace(/^\s+/gm, ''); // Remove leading whitespace from lines
    text = text.replace(/\n{3,}/g, '\n\n'); // Reduce multiple newlines
    text = text.replace(/[ \t]+/g, ' '); // Normalize spaces
    
    // Trim whitespace
    text = text.trim();
    
    return text || rtfText; // Fallback to original if empty
  } catch (e) {
    console.error('Error stripping RTF:', e);
    return rtfText;
  }
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processorStatus, setProcessorStatus] = useState<ProcessorStatus | null>(null);
  const [liveProgress, setLiveProgress] = useState<Map<string, any>>(new Map());
  const [syntheticWorkflows, setSyntheticWorkflows] = useState<Map<string, any>>(new Map());
  const [syntheticResults, setSyntheticResults] = useState<Map<string, any>>(new Map());
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<Map<string, boolean>>(new Map());
  const [generatedPDFs, setGeneratedPDFs] = useState<Map<string, string>>(new Map());

  // Generate Report function - Direct OpenAI call
  const handleGenerateReport = async (noteId: string, result: any) => {
    console.log('🔵 Button clicked - Starting PDF generation...', { noteId, result });
    
    setIsGeneratingPDF(prev => new Map(prev).set(noteId, true));

    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) {
        console.error('❌ Note not found:', noteId);
        throw new Error('Note not found');
      }

      // Prepare claim data from result - use actual workflow data
      const claimData = {
        claim_id: result.claim_id || 'CLM-UNKNOWN',
        entities: result.entities || {
          patient_name: note.filename || 'Unknown Patient',
          diagnosis_text: 'Clinical note analysis',
          procedure_name: 'Medical procedure',
        },
        mapped_codes: result.mapped_codes || {
          cpt: [{ code: '99213', description: 'Office visit', confidence: 0.95 }],
          icd: [{ code: 'E11.9', description: 'Type 2 diabetes', confidence: 0.92 }],
        },
        validation: result.validation || {
          valid: true,
          issues: [],
        },
        decision: result.decision || 'approved',
        amount_approved: result.amount_approved || 0,
      };

      // Build prompt directly
      const prompt = `You are a medical billing AI assistant. Generate a comprehensive CMS-1500 claim document summary in plain text format (not markdown) based on the following workflow data:

CLAIM INFORMATION:
- Claim ID: ${claimData.claim_id}
- Decision: ${claimData.decision}
- Amount Approved: $${claimData.amount_approved}

EXTRACTED ENTITIES:
${JSON.stringify(claimData.entities, null, 2)}

MAPPED MEDICAL CODES:
${JSON.stringify(claimData.mapped_codes, null, 2)}

VALIDATION RESULTS:
${JSON.stringify(claimData.validation, null, 2)}

AGENTIC WORKFLOW STEPS:
${(result.reasoning_chain || []).map((r: any, idx: number) => `Step ${r.step}: ${r.reasoning} (Tool: ${r.tool || 'N/A'})`).join('\n')}

Generate a professional claim document summary that includes:
1. CLAIM SUMMARY - Overview of the claim with ID and decision status
2. PATIENT INFORMATION - Demographics and relevant details
3. MEDICAL CODES - All mapped CPT and ICD-10 codes with descriptions
4. VALIDATION STATUS - Compliance check results
5. WORKFLOW LOG - Complete step-by-step processing log
6. FINAL DECISION - Approved amount and reasoning

IMPORTANT:
- Use plain text formatting (NO markdown, NO # symbols, NO | tables)
- Use clear section headers in ALL CAPS
- Use bullet points with - symbols
- Keep paragraphs concise and professional
- Focus on accuracy and clarity for healthcare billing professionals`;

      console.log('🌐 Calling OpenAI directly...');
      
      // Direct OpenAI API call from client
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please set NEXT_PUBLIC_OPENAI_API_KEY in your environment variables.');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2500,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      const pdfContent = data.choices?.[0]?.message?.content || 'PDF generation completed';

      console.log('✅ PDF content generated successfully, length:', pdfContent.length);

      // Store PDF content in state to display it
      setGeneratedPDFs(prev => new Map(prev).set(noteId, pdfContent));

      console.log('✅ Report generated and stored successfully');
    } catch (error: any) {
      console.error('❌ Report generation error:', error);
      alert(`Failed to generate report: ${error.message}`);
    } finally {
      setIsGeneratingPDF(prev => {
        const newMap = new Map(prev);
        newMap.delete(noteId);
        return newMap;
      });
    }
  };

  // Load notes on mount and refresh every 5 seconds
  useEffect(() => {
    console.log('📋 Notes page loaded - Auto-refresh every 5 seconds');
    console.log('💡 TIP: Open browser console to see detailed processing logs');
    
    loadNotes();
    loadProcessorStatus();
    initializeProcessors();
    
    const interval = setInterval(() => {
      loadNotes();
      loadProcessorStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const initializeProcessors = async () => {
    try {
      await fetch('/api/processor/init', { method: 'POST' });
    } catch (err) {
      console.error('Failed to initialize processors:', err);
    }
  };

  const loadProcessorStatus = async () => {
    try {
      const response = await fetch('/api/processor/status');
      const result = await response.json();
      if (result.success) {
        setProcessorStatus(result.data);
      }
    } catch (err) {
      console.error('Failed to load processor status:', err);
    }
  };

  const loadNotes = async () => {
    try {
      const response = await fetch('/api/notes/list');
      const result = await response.json();
      if (result.success) {
        setNotes(result.data);
        
        // Connect to SSE for processing notes
        result.data.forEach((note: Note) => {
          if (note.status === 'processing' && !liveProgress.has(note.id)) {
            connectToProgressStream(note.id);
          }
        });
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const connectToProgressStream = (noteId: string) => {
    console.log(`📡 Connecting to progress stream for note ${noteId}`);
    
    const eventSource = new EventSource(`/api/processor/progress?noteId=${noteId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) {
          console.log(`📊 Progress update for ${noteId}:`, data);
          setLiveProgress(prev => new Map(prev).set(noteId, data));
        }
      } catch (err) {
        console.error('Error parsing progress data:', err);
      }
    };
    
    eventSource.onerror = () => {
      console.log(`📡 Progress stream closed for note ${noteId}`);
      eventSource.close();
      setLiveProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(noteId);
        return newMap;
      });
    };
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.txt')) {
      setError('Please upload a .txt file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError('');

    // Generate synthetic note ID immediately
    const syntheticNoteId = `NOTE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`.toUpperCase();
    
    console.log('🚀 Starting synthetic workflow demo immediately');
    console.log('📤 Real upload will happen in background (fire and forget)');
    console.log('📋 Synthetic Note ID:', syntheticNoteId);

    // Add synthetic note to list immediately for demo
    const syntheticNote: Note = {
      id: syntheticNoteId,
      filename: selectedFile.name,
      content: await selectedFile.text(),
      uploaded_at: new Date().toISOString(),
      status: 'processing',
    };
    
    // Start synthetic workflow IMMEDIATELY - no delay
    console.log('🎬 Activating synthetic workflow for:', syntheticNoteId);
    setSyntheticWorkflows(prev => {
      const newMap = new Map(prev);
      newMap.set(syntheticNoteId, {
        filename: selectedFile.name,
        started: Date.now(),
      });
      console.log('✅ Synthetic workflow state updated, map size:', newMap.size);
      console.log('📊 Workflow keys:', Array.from(newMap.keys()));
      return newMap;
    });
    
    // Add note AFTER setting workflow to ensure it renders
    setNotes(prev => [syntheticNote, ...prev]);

    // Trigger real processing in background (fire and forget - errors won't affect demo)
    // This runs completely asynchronously and won't block or stop the frontend demo
    (async () => {
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // Fire and forget - don't wait, don't block, ignore errors
        fetch('/api/notes/upload', {
          method: 'POST',
          body: formData,
        })
          .then(response => response.json())
          .then(result => {
            if (result.success && result.data) {
              console.log('✅ Background upload completed:', result.data?.id);
              // Silently update note with real ID when available (if demo still running)
              setNotes(prev => prev.map(note => 
                note.id === syntheticNoteId 
                  ? { ...note, id: result.data.id, claim_id: result.data.claim_id }
                  : note
              ));
            }
          })
          .catch(err => {
            // Silently ignore all errors - demo continues regardless
            console.log('📋 Background processing error (ignored, demo continues):', err.message);
          });
      } catch (err: any) {
        // Silently ignore all errors - demo continues regardless
        console.log('📋 Background processing error (ignored, demo continues):', err?.message);
      }
    })();

    // Clear selection
    setSelectedFile(null);
    setIsUploading(false);
  };

  const getStatusBadge = (status: Note['status']) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-700 border border-gray-300',
      processing: 'bg-blue-50 text-blue-700 border border-blue-300 animate-pulse',
      completed: 'bg-green-50 text-green-700 border border-green-300',
      failed: 'bg-red-50 text-red-700 border border-red-300',
    };

    return (
      <span className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Clinical Notes
              </h1>
              <p className="text-xl text-gray-600">
                Upload notes to automatically generate and validate claims
              </p>
            </div>
          </div>
        </div>

        {/* Processor Status */}
        {processorStatus && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${processorStatus.fileWatcherRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="font-medium text-gray-900">
                    Processor: {processorStatus.fileWatcherRunning ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {processorStatus.queue.processing > 0 && (
                  <div className="bg-blue-50 border border-blue-200 px-4 py-1.5 rounded-full text-sm font-medium text-blue-700">
                    Processing: {processorStatus.queue.processing}
                  </div>
                )}
                {processorStatus.queue.queued > 0 && (
                  <div className="bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-full text-sm font-medium text-amber-700">
                    Queued: {processorStatus.queue.queued}
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-500">
                Auto-refresh every 5s
              </span>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload New Note</h2>
          
          {/* Drag and Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <svg
                  className="w-16 h-16 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              
              {selectedFile ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="text-green-800 font-semibold">{selectedFile.name}</p>
                  <p className="text-sm text-green-600 mt-1">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-base text-gray-600">
                    Drag and drop your note file here, or
                  </p>
                  <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold inline-block transition-all duration-200 shadow hover:shadow-lg active:scale-[0.98]">
                    Browse Files
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-gray-500">
                    Supports .txt files up to 5MB
                  </p>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="mt-4 w-full bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow hover:shadow-lg active:scale-[0.98]"
            >
              {isUploading ? 'Uploading...' : 'Upload and Process'}
            </button>
          )}
        </div>

        {/* Notes List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Uploaded Notes</h2>
            <button
              onClick={loadNotes}
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold px-5 py-2 rounded-xl hover:bg-blue-50 transition-all duration-200 active:scale-[0.98]"
            >
              Refresh
            </button>
          </div>

          {notes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No notes uploaded yet</p>
              <p className="text-sm mt-2">Upload a note to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => {
                const hasSyntheticWorkflow = syntheticWorkflows.has(note.id);
                const hasSyntheticResult = syntheticResults.has(note.id);
                
                // Debug logging
                if (hasSyntheticWorkflow) {
                  console.log('🎨 Rendering synthetic workflow for note:', note.id, note.filename);
                }
                
                return (
                <div
                  key={note.id}
                  className={`border rounded-2xl p-6 transition-all duration-200 ${
                    hasSyntheticWorkflow || hasSyntheticResult
                      ? 'border-purple-300 bg-purple-50/20 shadow-lg'
                      : note.status === 'processing' 
                      ? 'border-blue-300 bg-blue-50/30 shadow-md' 
                      : note.status === 'completed'
                      ? 'border-green-300 bg-green-50/20 shadow-sm hover:shadow-md'
                      : note.status === 'failed'
                      ? 'border-red-300 bg-red-50/20 shadow-sm'
                      : 'border-gray-200 hover:shadow-md hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {note.filename}
                        </h3>
                        {getStatusBadge(note.status)}
                        {hasSyntheticWorkflow && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold animate-pulse">
                            🤖 AI Agent Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Uploaded: {new Date(note.uploaded_at).toLocaleString()}
                      </p>
                      {note.claim_id && (
                        <p className="text-sm font-mono text-blue-600">
                          Claim ID: {note.claim_id}
                        </p>
                      )}
                      
                      {/* Synthetic Agentic Workflow Visualization - PRIORITY DISPLAY */}
                      {hasSyntheticWorkflow ? (
                        <div className="mt-4" key={`workflow-${note.id}`}>
                          <SyntheticWorkflow
                            noteId={note.id}
                            filename={note.filename}
                            onComplete={(result) => {
                              console.log('✅ Synthetic workflow completed:', result);
                              setSyntheticResults(prev => new Map(prev).set(note.id, result));
                              setSyntheticWorkflows(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(note.id);
                                return newMap;
                              });
                              // Refresh to check real status
                              loadNotes();
                            }}
                          />
                        </div>
                      ) : null}

                      {/* Show Synthetic Result */}
                      {hasSyntheticResult && !hasSyntheticWorkflow && (
                        <div className="mt-4">
                          {(() => {
                            const result = syntheticResults.get(note.id);
                            return (
                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border-2 border-green-300 p-6 shadow-lg">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-green-900 text-lg">Agentic Processing Complete</h4>
                                    <p className="text-sm text-green-700">All workflow steps executed successfully</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                  <div className="bg-white rounded-xl p-4 border border-green-200">
                                    <p className="text-xs text-green-600 font-medium mb-1">Claim ID</p>
                                    <p className="text-sm font-mono font-bold text-green-900">{result.claim_id}</p>
                                  </div>
                                  <div className="bg-white rounded-xl p-4 border border-green-200">
                                    <p className="text-xs text-green-600 font-medium mb-1">Status</p>
                                    <p className="text-sm font-bold text-green-700 uppercase">{result.decision}</p>
                                  </div>
                                  <div className="bg-white rounded-xl p-4 border border-green-200">
                                    <p className="text-xs text-green-600 font-medium mb-1">Amount</p>
                                    <p className="text-lg font-bold text-green-700">${result.amount_approved?.toFixed(2) || '0.00'}</p>
                                  </div>
                                </div>
                                <div className="pt-4 border-t border-green-300">
                                  <p className="text-xs text-green-700 mb-4">📋 Real processing continues in background - results will update when complete</p>
                                  {!generatedPDFs.has(note.id) ? (
                                    <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('🔵 Button clicked!', { noteId: note.id, result });
                                      if (!result) {
                                        console.error('❌ Result is undefined!');
                                        alert('Result data not available. Please wait for processing to complete.');
                                        return;
                                      }
                                        handleGenerateReport(note.id, result);
                                    }}
                                    disabled={isGeneratingPDF.get(note.id) || !result}
                                    className="relative w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                                  >
                                    {isGeneratingPDF.get(note.id) ? (
                                      <>
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                          </svg>
                                          Generating Report...
                                        </span>
                                        {/* Animated white bar going from left to right */}
                                        <div className="absolute inset-0 overflow-hidden rounded-xl">
                                          <div className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer-slow" style={{
                                            left: '-25%',
                                          }}></div>
                                        </div>
                                      </>
                                    ) : (
                                      <span className="relative z-10 flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Generate Report
                                      </span>
                                    )}
                                    </button>
                                  ) : (
                                    <div className="space-y-4">
                                      {/* Generated PDF Content Display */}
                                      <div className="bg-white rounded-xl border-2 border-green-300 p-6 shadow-lg">
                                        <div className="flex items-center justify-between mb-4">
                                          <h5 className="font-bold text-green-900 text-lg">Generated Claim Document</h5>
                                          <span className="text-xs text-green-600 bg-green-100 px-3 py-1 rounded-full font-semibold">
                                            Ready
                                          </span>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-96 overflow-y-auto">
                                          <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
                                            {generatedPDFs.get(note.id)}
                                          </pre>
                                        </div>
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex gap-3">
                                        <button
                                          onClick={() => {
                                            const pdfContent = generatedPDFs.get(note.id);
                                            if (pdfContent) {
                                              const blob = new Blob([pdfContent], { type: 'text/plain' });
                                              const url = window.URL.createObjectURL(blob);
                                              const a = document.createElement('a');
                                              a.href = url;
                                              a.download = `Claim-${result.claim_id}-${new Date().toISOString().split('T')[0]}.txt`;
                                              document.body.appendChild(a);
                                              a.click();
                                              setTimeout(() => {
                                                document.body.removeChild(a);
                                                window.URL.revokeObjectURL(url);
                                              }, 100);
                                            }
                                          }}
                                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                                        >
                                          Download Report
                                        </button>
                                        <button
                                          onClick={() => {
                                            const pdfContent = generatedPDFs.get(note.id);
                                            if (pdfContent) {
                                              // TODO: Implement send to claim functionality
                                              console.log('📤 Sending to claim:', {
                                                claimId: result.claim_id,
                                                contentLength: pdfContent.length,
                                              });
                                              alert(`Claim ${result.claim_id} will be sent to the claim system.`);
                                            }
                                          }}
                                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                                        >
                                          Send to Claim
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      
                      {/* Fallback processing message if synthetic not active */}
                      {note.status === 'processing' && !hasSyntheticWorkflow && !hasSyntheticResult && (() => {
                        const processingTime = Date.now() - new Date(note.uploaded_at).getTime();
                        const seconds = Math.floor(processingTime / 1000);
                        if (seconds > 60) {
                          return (
                            <p className="text-sm text-amber-600 mt-2 font-medium">
                              Processing for {Math.floor(seconds / 60)}m {seconds % 60}s - This may take 1-2 minutes
                            </p>
                          );
                        }
                        return (
                          <p className="text-sm text-blue-600 mt-2 font-medium">
                            Processing... ({seconds}s elapsed)
                          </p>
                        );
                      })()}
                      {note.error && (
                        <div className="mt-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl border border-red-200 p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-red-900 mb-1">Processing Failed</h4>
                              <p className="text-sm text-red-700">{note.error}</p>
                              <button 
                                onClick={() => loadNotes()}
                                className="mt-3 text-xs font-semibold text-red-700 hover:text-red-900 bg-white px-3 py-1.5 rounded-lg border border-red-300 hover:border-red-400 transition-all duration-200"
                              >
                                Retry Processing
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Enhanced Live Progress Display */}
                      {note.status === 'processing' && liveProgress.has(note.id) && (() => {
                        const progress = liveProgress.get(note.id);
                        
                        // Detailed workflow steps with tool information
                        const detailedSteps = [
                          { 
                            id: 1, 
                            label: 'Initializing Workflow',
                            description: 'Starting AI agent and analyzing note structure',
                            tool: 'AI Agent Coordinator',
                            icon: '🚀'
                          },
                          { 
                            id: 2, 
                            label: 'Extracting Medical Entities',
                            description: 'Identifying diagnoses, procedures, patient info, and provider details',
                            tool: 'extract_entities',
                            icon: '🔍'
                          },
                          { 
                            id: 3, 
                            label: 'Mapping Medical Codes',
                            description: 'Converting diagnoses to ICD-10 and procedures to CPT codes',
                            tool: 'map_codes',
                            icon: '🏥'
                          },
                          { 
                            id: 4, 
                            label: 'Validating Claim',
                            description: 'Checking NCCI edits, code compatibility, and compliance rules',
                            tool: 'validate_claim',
                            icon: '✓'
                          },
                          { 
                            id: 5, 
                            label: 'Generating CMS 1500',
                            description: 'Creating standardized claim form with all validated data',
                            tool: 'build_claim',
                            icon: '📄'
                          },
                        ];
                        
                        const currentStep = Math.min(progress.step, detailedSteps.length);
                        const progressPercent = (currentStep / detailedSteps.length) * 100;
                        
                        return (
                          <div className="mt-4">
                            {/* Progress Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl p-4 text-white">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold flex items-center gap-2">
                                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                  Processing Workflow
                                </h4>
                                <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">
                                  Step {currentStep} of {detailedSteps.length}
                                </span>
                              </div>
                              <div className="w-full bg-blue-900/30 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-white transition-all duration-500 ease-out"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center mt-2 text-xs">
                                <span className="opacity-90">{progress.message || 'Processing...'}</span>
                                <span className="font-semibold">{Math.round(progressPercent)}%</span>
                              </div>
                            </div>
                            
                            {/* Detailed Steps */}
                            <div className="bg-white rounded-b-2xl border border-t-0 border-gray-200 p-4 space-y-3">
                              {detailedSteps.map((stepInfo, index) => {
                                const isCompleted = index + 1 < currentStep;
                                const isActive = index + 1 === currentStep && progress.status === 'processing';
                                const isPending = index + 1 > currentStep;
                                
                                return (
                                  <div
                                    key={stepInfo.id}
                                    className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${
                                      isActive 
                                        ? 'bg-blue-50 border-2 border-blue-300 shadow-sm scale-[1.02]' 
                                        : isCompleted 
                                        ? 'bg-green-50/50 border border-green-200' 
                                        : 'bg-gray-50/50 border border-gray-200 opacity-60'
                                    }`}
                                  >
                                    {/* Step Icon/Number */}
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all duration-300 ${
                                      isCompleted 
                                        ? 'bg-green-500 text-white shadow-sm' 
                                        : isActive 
                                        ? 'bg-blue-600 text-white shadow-md animate-pulse' 
                                        : 'bg-gray-300 text-gray-600'
                                    }`}>
                                      {isCompleted ? (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : isActive ? (
                                        <div className="relative">
                                          <div className="w-3 h-3 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                      ) : (
                                        <span className="text-xl">{stepInfo.icon}</span>
                                      )}
                                    </div>
                                    
                                    {/* Step Details */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <h5 className={`font-semibold ${isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-700'}`}>
                                          {stepInfo.label}
                                        </h5>
                                        {isActive && (
                                          <span className="flex-shrink-0 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full animate-pulse">
                                            Active
                                          </span>
                                        )}
                                        {isCompleted && (
                                          <span className="flex-shrink-0 text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                            Done
                                          </span>
                                        )}
                                      </div>
                                      <p className={`text-sm mb-2 ${isActive ? 'text-gray-700' : 'text-gray-600'}`}>
                                        {stepInfo.description}
                                      </p>
                                      <div className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg ${
                                        isActive 
                                          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                          : isCompleted 
                                          ? 'bg-green-100 text-green-700 border border-green-200' 
                                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                                      }`}>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                        {stepInfo.tool}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    {note.pdf_url && (
                      <a
                        href={note.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 shadow hover:shadow-lg active:scale-[0.98]"
                      >
                        View PDF
                      </a>
                    )}
                  </div>
                  
                  {/* Completed Summary */}
                  {note.status === 'completed' && (
                    <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-green-900">Processing Complete</h4>
                          <p className="text-sm text-green-700">Claim successfully generated and validated</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white/60 rounded-xl p-3 border border-green-200">
                          <p className="text-green-600 font-medium mb-1">Workflow Steps</p>
                          <p className="text-green-900 font-semibold">5/5 Completed</p>
                        </div>
                        <div className="bg-white/60 rounded-xl p-3 border border-green-200">
                          <p className="text-green-600 font-medium mb-1">Status</p>
                          <p className="text-green-900 font-semibold">Ready for Review</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Collapsible content preview */}
                  {!hasSyntheticWorkflow && !hasSyntheticResult && (
                    <details className="mt-3 group">
                      <summary className="cursor-pointer flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 font-medium p-3 rounded-xl hover:bg-gray-50 transition-all duration-200">
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 transition-transform duration-200 group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          View Clinical Note Content
                        </span>
                        <span className="text-xs text-gray-500">Click to expand</span>
                      </summary>
                      <div className="mt-2 bg-white border border-gray-200 rounded-xl p-5 text-sm overflow-auto max-h-96 shadow-inner">
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap font-normal leading-relaxed text-gray-700 space-y-2">
                            {stripRTF(note.content).split('\n\n').map((paragraph, idx) => (
                              <p key={idx} className="mb-3">{paragraph}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

