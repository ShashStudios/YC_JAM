import type { NextApiRequest, NextApiResponse } from 'next';

interface GeneratePDFRequest {
  claimData: {
    claim_id: string;
    entities: any;
    mapped_codes: any;
    validation: any;
    decision: string;
    amount_approved: number;
  };
  reasoningChain: Array<{
    step: number;
    reasoning: string;
    tool?: string;
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set longer timeout for Next.js API route
  res.setTimeout(60000);
  
  console.log('📥 PDF generation API called:', {
    method: req.method,
    url: req.url,
    hasBody: !!req.body,
    timestamp: new Date().toISOString(),
  });

  if (req.method !== 'POST') {
    console.error('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📦 Request body received:', {
      hasClaimData: !!req.body?.claimData,
      hasReasoningChain: !!req.body?.reasoningChain,
      claimId: req.body?.claimData?.claim_id,
    });

    const { claimData, reasoningChain }: GeneratePDFRequest = req.body;

    if (!claimData || !reasoningChain) {
      return res.status(400).json({ error: 'Missing claimData or reasoningChain' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      return res.status(500).json({ 
        error: 'API key not configured', 
        success: false 
      });
    }

    console.log('✅ OPENAI_API_KEY found:', apiKey.substring(0, 7) + '...');

    // Build the prompt for PDF generation
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
${reasoningChain.map((r, idx) => `Step ${r.step}: ${r.reasoning} (Tool: ${r.tool || 'N/A'})`).join('\n')}

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

    console.log('📤 Making request to OpenAI for PDF generation...');
    console.log('📊 Data being sent:', {
      claimId: claimData.claim_id,
      entities: Object.keys(claimData.entities || {}),
      codesCount: {
        cpt: claimData.mapped_codes?.cpt?.length || 0,
        icd: claimData.mapped_codes?.icd?.length || 0,
      },
      workflowSteps: reasoningChain.length,
    });
    
    const requestBody = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2500,
      temperature: 0.3,
    };

    console.log('🌐 Calling OpenAI API:', {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: requestBody.model,
      promptLength: prompt.length,
      hasApiKey: !!apiKey,
    });
    
    let pdfContent = '';
    
    try {
      // Add timeout to OpenAI request (55 seconds max)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('❌ OpenAI request timed out');
      }, 55000);

      console.log('⏳ Sending request to OpenAI...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('✅ OpenAI request completed');

      console.log('📥 OpenAI response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI API error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500), // Limit error text length
        });
        return res.status(response.status).json({ 
          error: 'Failed to generate PDF content', 
          details: errorText,
          success: false 
        });
      }

      const result = await response.json();
      console.log('📄 OpenAI response structure:', {
        hasChoices: !!result.choices,
        choicesLength: result.choices?.length || 0,
        model: result.model,
        usage: result.usage,
      });

      pdfContent = result.choices?.[0]?.message?.content || 'PDF generation completed';
      console.log('✅ PDF content generated successfully, length:', pdfContent.length);
    } catch (fetchError: any) {
      console.error('❌ Network error calling OpenAI:', {
        message: fetchError.message,
        stack: fetchError.stack,
      });
      return res.status(500).json({ 
        error: 'Network error calling OpenAI API',
        details: fetchError.message,
        success: false 
      });
    }

    const responseData = {
      success: true,
      pdfContent,
      claimId: claimData.claim_id,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Sending response:', {
      success: responseData.success,
      pdfContentLength: responseData.pdfContent.length,
      claimId: responseData.claimId,
    });

    res.status(200).json(responseData);
    console.log('📤 Response sent successfully');

  } catch (error: any) {
    console.error('❌ Error generating PDF:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      success: false 
    });
  }
}

