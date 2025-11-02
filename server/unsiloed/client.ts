import { UnsiloedQuery, UnsiloedResponse, UnsiloedCitation } from '@/types';

const UNSILOED_API_URL = process.env.UNSILOED_API_URL || 'https://api.sociate.ai/v1';
const UNSILOED_API_KEY = process.env.UNSILOED_API_KEY || '';

/**
 * Query Unsiloed AI for payer policy information and CMS rule citations
 */
export async function queryUnsiloedAI(query: UnsiloedQuery): Promise<UnsiloedResponse> {
  try {
    if (!UNSILOED_API_KEY) {
      console.warn('Unsiloed API key not configured, using mock citations');
      return getMockCitations(query.query);
    }
    
    const response = await fetch(`${UNSILOED_API_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${UNSILOED_API_KEY}`,
      },
      body: JSON.stringify({
        query: query.query,
        context: query.context,
        max_results: query.max_results || 5,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Unsiloed API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      citations: data.results?.map((result: any) => ({
        text: result.text || result.content,
        source: result.source || 'Unknown',
        relevance_score: result.score || 0.8,
        url: result.url,
      })) || [],
      query: query.query,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error querying Unsiloed AI:', error);
    // Fallback to mock citations if API fails
    return getMockCitations(query.query);
  }
}

/**
 * Get mock citations for testing when Unsiloed API is not available
 */
function getMockCitations(query: string): UnsiloedResponse {
  const queryLower = query.toLowerCase();
  
  const citations: UnsiloedCitation[] = [];
  
  // Modifier 25 citations
  if (queryLower.includes('modifier 25') || queryLower.includes('modifier-25')) {
    citations.push({
      text: 'Modifier 25 - Significant, Separately Identifiable Evaluation and Management Service by the Same Physician on the Same Day of the Procedure or Other Service: It may be necessary to indicate that on the day a procedure or service identified by a CPT code was performed, the patient\'s condition required a significant, separately identifiable E/M service above and beyond the other service provided or beyond the usual preoperative and postoperative care associated with the procedure that was performed.',
      source: 'CMS Medicare Claims Processing Manual, Chapter 12, Section 40.1',
      relevance_score: 0.95,
      url: 'https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Downloads/clm104c12.pdf',
    });
    citations.push({
      text: 'When an E/M service is provided on the same day as a minor surgical procedure, append modifier 25 to the E/M service code to indicate that the E/M service is significant and separately identifiable from the procedure.',
      source: 'AMA CPT Guidelines',
      relevance_score: 0.90,
      url: 'https://www.ama-assn.org/practice-management/cpt/cpt-modifiers',
    });
  }
  
  // Prior authorization citations
  if (queryLower.includes('prior auth') || queryLower.includes('authorization')) {
    citations.push({
      text: 'Advanced imaging services including MRI, CT, and PET scans typically require prior authorization from the payer. The prior authorization number must be included on the claim at the time of submission to avoid denial.',
      source: 'CMS Coverage Guidelines',
      relevance_score: 0.92,
      url: 'https://www.cms.gov/medicare-coverage-database',
    });
    citations.push({
      text: 'Prior authorization is a requirement that your healthcare provider obtain approval from your health insurance plan before prescribing a specific medication, procedure, or service for you. This is to ensure that the service is medically necessary and covered under your plan.',
      source: 'Healthcare Payer Policy Manual',
      relevance_score: 0.88,
    });
  }
  
  // NCCI citations
  if (queryLower.includes('ncci') || queryLower.includes('bundling')) {
    citations.push({
      text: 'The National Correct Coding Initiative (NCCI) promotes national correct coding methodologies and controls improper coding leading to inappropriate payment. The NCCI Procedure to Procedure (PTP) edits define pairs of HCPCS/CPT codes that should not be reported together.',
      source: 'CMS NCCI Policy Manual',
      relevance_score: 0.93,
      url: 'https://www.cms.gov/Medicare/Coding/NationalCorrectCodInitEd',
    });
  }
  
  // NPI citations
  if (queryLower.includes('npi') || queryLower.includes('provider number')) {
    citations.push({
      text: 'The National Provider Identifier (NPI) is a unique identification number for covered health care providers. All HIPAA-covered health care providers must use NPIs in standard transactions, such as health care claims.',
      source: 'CMS NPI Registry',
      relevance_score: 0.94,
      url: 'https://nppes.cms.hhs.gov/',
    });
  }
  
  // Required fields citations
  if (queryLower.includes('required field') || queryLower.includes('missing data')) {
    citations.push({
      text: 'Clean claims must include all required data elements: provider NPI, patient demographics, service date, place of service, diagnosis codes, and procedure codes with appropriate modifiers. Missing any required field will result in claim denial.',
      source: 'CMS-1500 Claim Form Instructions',
      relevance_score: 0.91,
      url: 'https://www.cms.gov/Medicare/CMS-Forms/CMS-Forms/CMS-Forms-Items/CMS1500',
    });
  }
  
  // Default citation if no specific match
  if (citations.length === 0) {
    citations.push({
      text: 'Healthcare claims must be submitted in accordance with CMS guidelines and payer-specific policies. All required fields must be completed accurately, and services must be medically necessary and properly documented.',
      source: 'CMS General Claims Guidelines',
      relevance_score: 0.75,
      url: 'https://www.cms.gov/',
    });
  }
  
  return {
    citations,
    query,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get policy citation for a specific validation issue
 */
export async function getPolicyCitationForIssue(issueCode: string, context?: string): Promise<UnsiloedCitation[]> {
  let query = '';
  
  switch (issueCode) {
    case 'MISSING_MODIFIER_25':
      query = 'CMS modifier 25 requirements E/M same day as procedure';
      break;
    case 'MISSING_PRIOR_AUTH':
      query = 'prior authorization requirements advanced imaging MRI';
      break;
    case 'NCCI_CONFLICT':
      query = 'NCCI bundling edits procedure code conflicts';
      break;
    case 'MISSING_REQUIRED_FIELD':
      query = 'CMS-1500 required fields clean claim submission';
      break;
    case 'INVALID_CPT_CODE':
      query = 'valid CPT codes Medicare coverage';
      break;
    case 'INVALID_ICD_CODE':
      query = 'valid ICD-10 diagnosis codes';
      break;
    default:
      query = 'Medicare claims submission requirements';
  }
  
  if (context) {
    query += ` ${context}`;
  }
  
  const response = await queryUnsiloedAI({ query });
  return response.citations;
}

/**
 * Get multiple policy citations for claim fixing
 */
export async function getCitationsForClaim(issueCodes: string[]): Promise<Map<string, UnsiloedCitation[]>> {
  const citationMap = new Map<string, UnsiloedCitation[]>();
  
  // Fetch citations for each unique issue code
  const uniqueCodes = [...new Set(issueCodes)];
  
  for (const code of uniqueCodes) {
    const citations = await getPolicyCitationForIssue(code);
    citationMap.set(code, citations);
  }
  
  return citationMap;
}

