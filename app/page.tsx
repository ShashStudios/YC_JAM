'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { processCompleteWorkflow } from './lib/api-client';
import demoClaimsData from '@/data/demo_claims.json';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { AgentProcessor } from '@/app/components/ui/agent-processor';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';

export default function Home() {
  const [selectedDemo, setSelectedDemo] = useState<string>('');
  const [clinicianNote, setClinicianNote] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [workflow, setWorkflow] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [useAgenticMode, setUseAgenticMode] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [processingSteps, setProcessingSteps] = useState<any[]>([]);
  const [fileUploaded, setFileUploaded] = useState(false);
  const router = useRouter();

  // Safely handle demo claims data
  let demoClaims: any[] = [];
  try {
    demoClaims = Array.isArray(demoClaimsData) ? demoClaimsData : [];
  } catch (err) {
    console.error('Error loading demo claims:', err);
    demoClaims = [];
  }

  const handleDemoSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const demoId = e.target.value;
    setSelectedDemo(demoId);
    
    const demo = demoClaims.find(d => d.id === demoId);
    if (demo) {
      setClinicianNote(demo.clinician_note);
      setWorkflow(null);
      setError('');
      setProcessingSteps([]);
      setCurrentStep(0);
      setFileUploaded(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file extension
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.txt', '.json', '.pdf', '.md', '.doc', '.docx', '.rtf'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      setError('Please upload a PDF, JSON, or text file (.txt, .json, .pdf, .md, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    try {
      let text = '';
      
      if (fileName.endsWith('.pdf')) {
        // For PDF files, we'll need to extract text
        // Note: This requires a PDF parsing library in production
        setError('PDF file reading requires additional setup. Please use a text file or copy-paste the content.');
        return;
      } else {
        // For text-based files, read as text
        text = await file.text();
      }

      // If it's a JSON file, try to extract relevant text fields
      if (fileName.endsWith('.json')) {
        try {
          const jsonData = JSON.parse(text);
          // Try to extract clinician note or similar fields
          if (jsonData.clinician_note) {
            text = jsonData.clinician_note;
          } else if (jsonData.note) {
            text = jsonData.note;
          } else if (jsonData.content) {
            text = jsonData.content;
          } else if (typeof jsonData === 'string') {
            text = jsonData;
          } else {
            // If it's structured JSON, stringify it
            text = JSON.stringify(jsonData, null, 2);
          }
        } catch (jsonErr) {
          // If JSON parsing fails, use the raw text
          console.log('JSON parse failed, using raw text');
        }
      }

      setClinicianNote(text);
      setSelectedDemo('');
      setError('');
      setWorkflow(null);
      setProcessingSteps([]);
      setCurrentStep(0);
      setFileUploaded(true);
    } catch (err) {
      setError('Failed to read file. Please try a different file or copy-paste the content.');
      console.error('File read error:', err);
    }
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validExtensions = ['.txt', '.json', '.pdf', '.md', '.doc', '.docx', '.rtf'];
    const validFiles: File[] = [];

    // Validate all files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name.toLowerCase();
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

      if (!hasValidExtension) {
        setError(`File "${file.name}" has an invalid extension. Skipping...`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(`File "${file.name}" is too large (max 5MB). Skipping...`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      setError('No valid files selected');
      return;
    }

    // Store files in sessionStorage as base64 for transfer
    try {
      const filesData = await Promise.all(
        validFiles.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );
          return {
            name: file.name,
            size: file.size,
            type: file.type,
            data: base64,
          };
        })
      );

      sessionStorage.setItem('batchUploadFiles', JSON.stringify(filesData));
      sessionStorage.setItem('batchUploadCount', validFiles.length.toString());
      
      // Redirect to notes page
      router.push('/notes');
    } catch (err) {
      setError('Failed to process files. Please try again.');
      console.error('Batch upload error:', err);
    }
  };

  const handleProcess = async () => {
    if (!clinicianNote.trim()) {
      setError('Please enter a clinician note');
      return;
    }

    setIsProcessing(true);
    setError('');
    setWorkflow(null);
    setProcessingSteps([]);
    setCurrentStep(0);

    try {
      const demo = demoClaims.find(d => d.id === selectedDemo);
      const initialClaim = demo?.initial_claim as any;

      if (useAgenticMode) {
        // Simulate processing steps for visual feedback
        const steps = [
          { step: 1, reasoning: 'Analyzing clinician note...', status: 'processing' as const },
          { step: 2, reasoning: 'Extracting medical entities...', status: 'pending' as const },
          { step: 3, reasoning: 'Mapping to CPT/ICD codes...', status: 'pending' as const },
          { step: 4, reasoning: 'Validating claim structure...', status: 'pending' as const },
          { step: 5, reasoning: 'Applying fixes if needed...', status: 'pending' as const },
        ];
        
        setProcessingSteps(steps.map(s => ({ ...s, timestamp: new Date().toISOString() })));

        const response = await fetch('/api/agent/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinician_note: clinicianNote,
            initial_claim: initialClaim,
          }),
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error?.message || 'Agent processing failed');
        }
        
        const agentResult = result.data;
        setWorkflow({
          agenticMode: true,
          reasoning_chain: agentResult.reasoning_chain,
          final_result: agentResult.final_result,
          total_steps: agentResult.total_steps,
          duration_ms: agentResult.duration_ms,
        });
      } else {
        const result = await processCompleteWorkflow(clinicianNote, initialClaim);
        setWorkflow({ ...result, agenticMode: false });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during processing');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
      setProcessingSteps([]);
      setCurrentStep(0);
    }
  };

  // Debug: Log to verify component is rendering
  if (typeof window !== 'undefined') {
    console.log('Home component rendering...', { demoClaimsCount: demoClaims.length });
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero + Demo Split Section */}
      <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white min-h-[100vh] pb-32 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-8 py-12 lg:py-16">
          <div className="max-w-4xl mx-auto">
            {/* Hero Content */}
            <div className="space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium mb-4 border border-white/20">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>AI-Powered Healthcare Billing Automation</span>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                AI-Driven CPT Coding &<br />
                <span className="bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
                  Billing Automation for Hospitals
                </span>
              </h1>
              
              <p className="text-lg lg:text-xl text-blue-100 mb-4 leading-relaxed max-w-2xl">
                Solving healthcare's biggest hidden inefficiency: post-procedure billing.
              </p>
              
              <p className="text-sm lg:text-base text-blue-200 mb-6 max-w-2xl">
                15% of all claims are denied. 94,000 denied claims every day. <strong className="text-white">$20+ billion lost annually.</strong><br />
                Our AI agent fully automates CPT coding & claim drafting — cutting costs by 50% with <strong className="text-white">zero data leaving the hospital</strong>.
              </p>

              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6 max-w-3xl">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border-2 border-white/30 shadow-lg text-left">
                  <div className="text-3xl lg:text-4xl font-bold mb-1 text-white">15%</div>
                  <div className="text-blue-100 text-xs lg:text-sm font-medium">Claims denied</div>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border-2 border-white/30 shadow-lg text-left">
                  <div className="text-3xl lg:text-4xl font-bold mb-1 text-white">$20B+</div>
                  <div className="text-blue-100 text-xs lg:text-sm font-medium">Lost annually</div>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border-2 border-white/30 shadow-lg text-left">
                  <div className="text-3xl lg:text-4xl font-bold mb-1 text-white">50%</div>
                  <div className="text-blue-100 text-xs lg:text-sm font-medium">Cost reduction</div>
                </div>
              </div>

              {/* HIPAA Compliance Badge */}
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-4 border-2 border-green-400/50 shadow-lg max-w-xl">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center border-2 border-green-400">
                    <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white text-base lg:text-lg mb-1">HIPAA Compliant</div>
                  <div className="text-blue-100 text-xs lg:text-sm">
                    Patient data is protected with local de-identification
                  </div>
                </div>
              </div>

              {/* Try Demo Button */}
              <div className="pt-4">
                <Link href="/notes">
                  <Button
                    className="bg-white text-gray-900 hover:bg-gray-100 border-2 border-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    size="lg"
                  >
                    <span className="flex items-center gap-2">
                      Try the Demo
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    </span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Gradient Fade Overlay - more gradual transition from blue to white */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent via-indigo-900/30 via-blue-900/20 to-gray-50 pointer-events-none"></div>
      </div>

      {/* Problem Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              The Hidden Cost of Post-Procedure Billing
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
              Healthcare consumes ~20% of U.S. GDP — that's $4.9 trillion. A surprising portion isn't spent on medicine or patients.
            </p>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              After every surgery or procedure, hospitals manually translate doctors' notes into CPT codes to get reimbursed. 
              This slow, error-prone workflow drains billions of dollars and time from clinicians and billing staff.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">$172</div>
                    <div className="text-sm text-gray-600">per bill in the U.S.</div>
                  </div>
                </div>
                <p className="text-gray-700">
                  Coding & billing administrative processes cost over <strong>$172 per bill</strong>.
                  <a 
                    href="https://med.stanford.edu/news/all-news/2022/08/study-lower-us-billing-costs.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 block mt-2 underline"
                  >
                    Stanford Medicine Study
                  </a>
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">30%</div>
                    <div className="text-sm text-gray-600">of healthcare costs</div>
                  </div>
                </div>
                <p className="text-gray-700">
                  Administrative/billing costs account for approximately <strong>30% of U.S. healthcare costs</strong>.
                  <a 
                    href="https://med.stanford.edu/news/all-news/2022/08/study-lower-us-billing-costs.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 block mt-2 underline"
                  >
                    Stanford Medicine Study
                  </a>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">The Billing Workflow Today</h3>
              <p className="text-gray-700 mb-6">
                A doctor writes a note. A billing clerk manually reads it, searches for codes, fills in forms, 
                sends claims to insurers, and waits. Every step is manual. Every typo, missing modifier, or late 
                submission means money lost. <strong>It's like using a typewriter in the era of GPT-5.</strong>
              </p>
              <h4 className="text-xl font-semibold text-gray-900 mb-4">Pain Points</h4>
        <div className="space-y-4">
                {[
                  'Manual de-identification & review processes',
                  'Coders reading free-text notes, selecting CPT codes manually',
                  'Drafting claims in Excel templates',
                  'High error/denial rates, slow reimbursement cycles',
                  'Diverts skilled staff from higher-value work',
                ].map((point, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-gray-700 flex-1">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
