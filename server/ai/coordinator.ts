import OpenAI from 'openai';
import { 
  ExtractedEntities, 
  Claim, 
  ValidationIssue, 
  ClaimFix, 
  PromptContext 
} from '@/types';
import { readFileSync } from 'fs';
import { join } from 'path';

// Check if API key is loaded
if (!process.env.OPENAI_API_KEY) {
  console.error('⚠️  OPENAI_API_KEY is not set!');
} else {
  console.log('✅ OpenAI API Key loaded:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load prompts
const SYSTEM_PROMPT = readFileSync(join(process.cwd(), 'prompts', 'system.md'), 'utf-8');
const EXTRACT_PROMPT = readFileSync(join(process.cwd(), 'prompts', 'extract.md'), 'utf-8');
const FIX_PROMPT = readFileSync(join(process.cwd(), 'prompts', 'fix.md'), 'utf-8');

/**
 * Extract entities from clinician note using GPT-4
 */
export async function extractEntitiesFromNote(clinicianNote: string): Promise<ExtractedEntities> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `${EXTRACT_PROMPT}\n\n## Clinician Note to Process:\n${clinicianNote}\n\nExtract the entities as JSON:`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }
    
    const entities = JSON.parse(content);
    return entities as ExtractedEntities;
  } catch (error) {
    console.error('Error extracting entities:', error);
    throw new Error('Failed to extract entities from clinician note');
  }
}

/**
 * Generate claim fixes using GPT-4 with policy citations
 */
export async function generateClaimFixes(
  claim: Claim,
  validationIssues: ValidationIssue[],
  policyCitations: string[]
): Promise<ClaimFix[]> {
  try {
    // Prepare context
    const context = {
      claim,
      validation_issues: validationIssues,
      policy_citations: policyCitations,
    };
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `${FIX_PROMPT}\n\n## Context:\n${JSON.stringify(context, null, 2)}\n\nIMPORTANT: Return a JSON object with a "fixes" property containing an array of ALL fix objects. You must generate a fix for EACH validation issue provided. Format: {"fixes": [fix1, fix2, ...]}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }
    
    const result = JSON.parse(content);
    
    // Debug logging
    console.log('OpenAI Response:', JSON.stringify(result, null, 2));
    console.log('Is Array:', Array.isArray(result));
    console.log('Has fixes property:', 'fixes' in result);
    
    // Handle multiple response formats
    let fixes: any[];
    if (Array.isArray(result)) {
      // Direct array response
      fixes = result;
    } else if (result.fixes && Array.isArray(result.fixes)) {
      // Object with "fixes" property
      fixes = result.fixes;
    } else if (result.issue_id) {
      // Single fix object without wrapper - wrap it in an array
      console.log('⚠️  OpenAI returned single object, wrapping in array');
      fixes = [result];
    } else {
      // Unknown format
      console.error('❌ Unexpected OpenAI response format:', result);
      fixes = [];
    }
    
    console.log('Fixes to return:', fixes.length, 'fixes');
    
    return fixes as ClaimFix[];
  } catch (error) {
    console.error('Error generating claim fixes:', error);
    throw new Error('Failed to generate claim fixes');
  }
}

/**
 * Apply JSON patch operations to a claim
 */
export function applyPatchesToClaim(claim: Claim, fixes: ClaimFix[]): Claim {
  // Deep clone the claim
  let fixedClaim = JSON.parse(JSON.stringify(claim)) as Claim;
  
  for (const fix of fixes) {
    for (const patch of fix.patches) {
      const path = patch.path.split('/').filter(p => p !== '');
      
      try {
        if (patch.op === 'add' || patch.op === 'replace') {
          applyAddOrReplace(fixedClaim, path, patch.value);
        } else if (patch.op === 'remove') {
          applyRemove(fixedClaim, path);
        }
      } catch (error) {
        console.error(`Failed to apply patch ${patch.path}:`, error);
      }
    }
  }
  
  return fixedClaim;
}

/**
 * Apply add or replace operation
 */
function applyAddOrReplace(obj: any, path: string[], value: any): void {
  if (path.length === 0) return;
  
  const lastKey = path[path.length - 1];
  let current = obj;
  
  // Navigate to the parent object
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  
  // Handle array append (-)
  if (lastKey === '-') {
    if (Array.isArray(current)) {
      current.push(value);
    }
  } else {
    // Check if it's an array index
    const arrayIndex = parseInt(lastKey);
    if (!isNaN(arrayIndex) && Array.isArray(current)) {
      current[arrayIndex] = value;
    } else {
      current[lastKey] = value;
    }
  }
}

/**
 * Apply remove operation
 */
function applyRemove(obj: any, path: string[]): void {
  if (path.length === 0) return;
  
  const lastKey = path[path.length - 1];
  let current = obj;
  
  // Navigate to the parent object
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current)) return;
    current = current[key];
  }
  
  // Remove the property or array element
  const arrayIndex = parseInt(lastKey);
  if (!isNaN(arrayIndex) && Array.isArray(current)) {
    current.splice(arrayIndex, 1);
  } else {
    delete current[lastKey];
  }
}

/**
 * Orchestrate the complete claim processing workflow
 */
export async function processClaimWorkflow(clinicianNote: string) {
  const workflow = {
    step: 'start',
    entities: null as ExtractedEntities | null,
    mapped_codes: null as any,
    built_claim: null as Claim | null,
    validation_result: null as any,
    fixes: [] as ClaimFix[],
    fixed_claim: null as Claim | null,
    payer_decision: null as any,
  };
  
  try {
    // Step 1: Extract entities
    workflow.step = 'extracting_entities';
    workflow.entities = await extractEntitiesFromNote(clinicianNote);
    
    return workflow;
  } catch (error) {
    console.error('Workflow error:', error);
    throw error;
  }
}

/**
 * Check OpenAI API availability
 */
export async function checkOpenAIConnection(): Promise<boolean> {
  try {
    await openai.models.list();
    return true;
  } catch (error) {
    console.error('OpenAI connection failed:', error);
    return false;
  }
}

