/**
 * Test script for automated claim processing feature
 * Tests the complete flow: upload -> process -> PDF generation
 */

import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const API_BASE = 'http://localhost:3000/api';

interface TestResult {
  step: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testStep(step: string, fn: () => Promise<any>) {
  const start = Date.now();
  try {
    const data = await fn();
    const duration = Date.now() - start;
    results.push({ step, success: true, duration, data });
    console.log(`✅ ${step} (${duration}ms)`);
    return data;
  } catch (error: any) {
    const duration = Date.now() - start;
    results.push({ step, success: false, duration, error: error.message });
    console.log(`❌ ${step} (${duration}ms): ${error.message}`);
    throw error;
  }
}

async function testInitializeProcessor() {
  const response = await fetch(`${API_BASE}/processor/init`, {
    method: 'POST',
  });
  const result = await response.json();
  if (!result.success) {
    throw new Error('Failed to initialize processor');
  }
  return result.data;
}

async function testProcessorStatus() {
  const response = await fetch(`${API_BASE}/processor/status`);
  const result = await response.json();
  if (!result.success) {
    throw new Error('Failed to get processor status');
  }
  return result.data;
}

async function testUploadNote() {
  // Read the test note
  const notePath = join(process.cwd(), 'sample_notes', 'test_note_auto.txt');
  const noteContent = readFileSync(notePath, 'utf-8');
  
  // Create form data
  const formData = new FormData();
  const blob = new Blob([noteContent], { type: 'text/plain' });
  formData.append('file', blob, 'test_note_auto.txt');
  
  const response = await fetch(`${API_BASE}/notes/upload`, {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error('Failed to upload note');
  }
  return result.data;
}

async function testListNotes() {
  const response = await fetch(`${API_BASE}/notes/list`);
  const result = await response.json();
  if (!result.success) {
    throw new Error('Failed to list notes');
  }
  return result.data;
}

async function testWaitForProcessing(noteId: string, maxWait = 120000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    const notes = await testListNotes();
    const note = notes.find((n: any) => n.id === noteId);
    
    if (!note) {
      throw new Error(`Note ${noteId} not found`);
    }
    
    console.log(`   Status: ${note.status}`);
    
    if (note.status === 'completed') {
      return note;
    }
    
    if (note.status === 'failed') {
      throw new Error(`Processing failed: ${note.error}`);
    }
    
    await sleep(5000); // Check every 5 seconds
  }
  
  throw new Error('Processing timeout');
}

async function testListClaims() {
  const response = await fetch(`${API_BASE}/claims/list`);
  const result = await response.json();
  if (!result.success) {
    throw new Error('Failed to list claims');
  }
  return result.data;
}

async function testVerifyPDF(pdfUrl: string) {
  const response = await fetch(`http://localhost:3000${pdfUrl}`);
  if (!response.ok) {
    throw new Error(`PDF not accessible: ${response.status}`);
  }
  const size = (await response.arrayBuffer()).byteLength;
  return { size, url: pdfUrl };
}

async function runTests() {
  console.log('\n🧪 ========================================');
  console.log('🧪 AUTOMATED PROCESSING FEATURE TESTS');
  console.log('🧪 ========================================\n');
  
  try {
    // Test 1: Initialize processor
    await testStep('Initialize Processor', testInitializeProcessor);
    
    // Test 2: Check processor status
    const status = await testStep('Check Processor Status', testProcessorStatus);
    console.log(`   File Watcher: ${status.fileWatcherRunning ? '✅' : '❌'}`);
    console.log(`   Queue: ${status.queue.queued} queued, ${status.queue.processing} processing`);
    
    // Test 3: Upload note
    const note = await testStep('Upload Test Note', testUploadNote);
    console.log(`   Note ID: ${note.id}`);
    
    // Test 4: Verify note in list
    await testStep('Verify Note Listed', async () => {
      const notes = await testListNotes();
      const found = notes.find((n: any) => n.id === note.id);
      if (!found) {
        throw new Error('Note not found in list');
      }
      return found;
    });
    
    // Test 5: Wait for processing
    console.log(`\n⏳ Waiting for processing (max 2 minutes)...\n`);
    const completedNote = await testStep(
      'Wait for Processing',
      () => testWaitForProcessing(note.id)
    );
    console.log(`   Claim ID: ${completedNote.claim_id}`);
    console.log(`   PDF URL: ${completedNote.pdf_url}`);
    
    // Test 6: Verify claim in list
    const claims = await testStep('List Claims', testListClaims);
    const claim = claims.find((c: any) => c.note_id === note.id);
    if (!claim) {
      throw new Error('Claim not found in list');
    }
    console.log(`   Decision: ${claim.decision}`);
    console.log(`   Amount: $${claim.amount_approved || 0}`);
    
    // Test 7: Verify PDF exists
    if (completedNote.pdf_url) {
      const pdf = await testStep('Verify PDF', () => testVerifyPDF(completedNote.pdf_url));
      console.log(`   PDF Size: ${(pdf.size / 1024).toFixed(2)} KB`);
    }
    
    // Summary
    console.log('\n✅ ========================================');
    console.log('✅ ALL TESTS PASSED');
    console.log('✅ ========================================\n');
    
    console.log('📊 Test Summary:');
    results.forEach((r) => {
      console.log(`   ${r.success ? '✅' : '❌'} ${r.step}: ${r.duration}ms`);
    });
    
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`\n⏱️  Total Time: ${(totalTime / 1000).toFixed(2)}s`);
    
  } catch (error: any) {
    console.error('\n❌ ========================================');
    console.error('❌ TEST FAILED');
    console.error('❌ ========================================\n');
    console.error('Error:', error.message);
    
    console.log('\n📊 Test Results:');
    results.forEach((r) => {
      console.log(`   ${r.success ? '✅' : '❌'} ${r.step}: ${r.duration}ms`);
      if (r.error) {
        console.log(`      Error: ${r.error}`);
      }
    });
    
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await fetch('http://localhost:3000');
    return true;
  } catch {
    return false;
  }
}

// Main
(async () => {
  console.log('🔍 Checking if server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('\n❌ Server is not running!');
    console.error('   Please start the server first: npm run dev');
    console.error('   Then run this test again.\n');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  await runTests();
})();

