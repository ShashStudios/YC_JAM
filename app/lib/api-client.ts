import {
  ExtractedEntities,
  CodeMappingResult,
  Claim,
  ValidationResult,
  ClaimFixResult,
  PayerResponse,
  AuditLogEntry,
  APIResponse,
} from '@/types';

const API_BASE = '/api';

/**
 * Extract entities from clinician note
 */
export async function extractEntities(clinicianNote: string): Promise<ExtractedEntities> {
  const response = await fetch(`${API_BASE}/extract_entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clinician_note: clinicianNote }),
  });
  
  const result: APIResponse<ExtractedEntities> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to extract entities');
  }
  
  return result.data;
}

/**
 * Map entities to CPT and ICD codes
 */
export async function mapCodes(entities: ExtractedEntities): Promise<CodeMappingResult> {
  const response = await fetch(`${API_BASE}/map_codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entities }),
  });
  
  const result: APIResponse<CodeMappingResult> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to map codes');
  }
  
  return result.data;
}

/**
 * Build a claim from mapping result
 */
export async function buildClaim(
  mappingResult: CodeMappingResult,
  patientInfo?: any,
  providerInfo?: any,
  serviceDate?: string,
  placeOfService?: string
): Promise<Claim> {
  const response = await fetch(`${API_BASE}/build_claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mapping_result: mappingResult,
      patient_info: patientInfo,
      provider_info: providerInfo,
      service_date: serviceDate,
      place_of_service: placeOfService,
    }),
  });
  
  const result: APIResponse<Claim> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to build claim');
  }
  
  return result.data;
}

/**
 * Validate a claim
 */
export async function validateClaim(claim: Claim): Promise<ValidationResult> {
  const response = await fetch(`${API_BASE}/validate_claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim }),
  });
  
  const result: APIResponse<ValidationResult> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to validate claim');
  }
  
  return result.data;
}

/**
 * Fix a claim
 */
export async function fixClaim(
  claim: Claim,
  validationIssues: any[]
): Promise<ClaimFixResult> {
  const response = await fetch(`${API_BASE}/fix_claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim, validation_issues: validationIssues }),
  });
  
  const result: APIResponse<ClaimFixResult> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to fix claim');
  }
  
  return result.data;
}

/**
 * Submit a claim
 */
export async function submitClaim(claim: Claim): Promise<PayerResponse> {
  const response = await fetch(`${API_BASE}/submit_claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim }),
  });
  
  const result: APIResponse<PayerResponse> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to submit claim');
  }
  
  return result.data;
}

/**
 * Log an action
 */
export async function logAction(
  action: string,
  claimId?: string,
  details?: any,
  actor: 'system' | 'ai' | 'user' = 'system'
): Promise<AuditLogEntry> {
  const response = await fetch(`${API_BASE}/log_action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, claim_id: claimId, details, actor }),
  });
  
  const result: APIResponse<AuditLogEntry> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to log action');
  }
  
  return result.data;
}

/**
 * Process complete claim workflow
 */
export async function processCompleteWorkflow(clinicianNote: string, initialClaim?: Partial<Claim>) {
  const workflow = {
    entities: null as ExtractedEntities | null,
    mappedCodes: null as CodeMappingResult | null,
    initialClaim: null as Claim | null,
    validationResult: null as ValidationResult | null,
    fixResult: null as ClaimFixResult | null,
    payerDecision: null as PayerResponse | null,
  };
  
  // Step 1: Extract entities
  workflow.entities = await extractEntities(clinicianNote);
  await logAction('Extracted entities from clinician note', undefined, workflow.entities, 'ai');
  
  // Step 2: Map codes
  workflow.mappedCodes = await mapCodes(workflow.entities);
  await logAction('Mapped entities to CPT/ICD codes', undefined, workflow.mappedCodes, 'system');
  
  // Step 3: Build claim
  workflow.initialClaim = await buildClaim(
    workflow.mappedCodes,
    initialClaim?.patient,
    initialClaim?.provider,
    initialClaim?.service_date,
    initialClaim?.place_of_service
  );
  
  // Merge with any provided initial claim data
  if (initialClaim) {
    workflow.initialClaim = { ...workflow.initialClaim, ...initialClaim };
  }
  
  await logAction('Built initial claim', undefined, workflow.initialClaim, 'system');
  
  // Step 4: Validate claim
  workflow.validationResult = await validateClaim(workflow.initialClaim);
  await logAction('Validated claim', undefined, workflow.validationResult, 'system');
  
  // Step 5: Fix claim if needed
  if (!workflow.validationResult.valid) {
    workflow.fixResult = await fixClaim(
      workflow.initialClaim,
      workflow.validationResult.issues
    );
    await logAction('AI fixed claim issues', undefined, workflow.fixResult, 'ai');
    
    // Re-validate fixed claim
    workflow.validationResult = await validateClaim(workflow.fixResult.fixed_claim);
    await logAction('Re-validated fixed claim', undefined, workflow.validationResult, 'system');
  }
  
  // Step 6: Submit claim
  const finalClaim = workflow.fixResult?.fixed_claim || workflow.initialClaim;
  workflow.payerDecision = await submitClaim(finalClaim);
  await logAction('Submitted claim to payer', workflow.payerDecision.claim_id, workflow.payerDecision, 'system');
  
  return workflow;
}

