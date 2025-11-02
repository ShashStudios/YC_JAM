import { z } from 'zod';

// ============================================================================
// Core Data Types
// ============================================================================

export interface CPTCode {
  code: string;
  description: string;
  category: string;
  keywords: string[];
}

export interface ICDCode {
  code: string;
  description: string;
  keywords: string[];
}

export interface NCCIPair {
  column1: string;
  column2: string;
  description: string;
  modifier_allowed: boolean;
}

// ============================================================================
// Claim Types
// ============================================================================

export const PatientSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  date_of_birth: z.string(),
  gender: z.enum(['M', 'F', 'X', 'U']),
});

export const ProviderSchema = z.object({
  npi: z.string(),
  name: z.string(),
  taxonomy: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

export const ProcedureSchema = z.object({
  code: z.string(),
  description: z.string(),
  modifiers: z.array(z.string()),
  units: z.number(),
  charge: z.number(),
  prior_authorization_number: z.string().optional(),
});

export const ClaimSchema = z.object({
  patient: PatientSchema,
  provider: ProviderSchema,
  service_date: z.string(),
  place_of_service: z.string(),
  diagnosis_codes: z.array(z.string()),
  procedures: z.array(ProcedureSchema),
});

export type Patient = z.infer<typeof PatientSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type Procedure = z.infer<typeof ProcedureSchema>;
export type Claim = z.infer<typeof ClaimSchema>;

// ============================================================================
// Entity Extraction Types
// ============================================================================

export const ExtractedEntitiesSchema = z.object({
  procedure_name: z.string().nullish(),
  diagnosis_text: z.string().nullish(),
  body_site: z.string().nullish(),
  lesion_count: z.number().nullish(),
  visit_complexity: z.string().nullish(),
  additional_procedures: z.array(z.string()).nullish(),
  additional_diagnoses: z.array(z.string()).nullish(),
  patient_type: z.enum(['new', 'established']).nullish(),
});

export type ExtractedEntities = z.infer<typeof ExtractedEntitiesSchema>;

// ============================================================================
// Validation Types
// ============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  field?: string;
  suggested_fix?: string;
  rule_reference?: string;
  affected_codes?: string[];
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  timestamp: string;
}

// ============================================================================
// Code Mapping Types
// ============================================================================

export interface MappedCode {
  code: string;
  description: string;
  confidence: number;
  source: 'exact' | 'fuzzy' | 'keyword';
  matched_term?: string;
}

export interface CodeMappingResult {
  cpt_codes: MappedCode[];
  icd_codes: MappedCode[];
  entities: ExtractedEntities;
}

// ============================================================================
// Claim Fix Types
// ============================================================================

export type PatchOperation = {
  op: 'add' | 'replace' | 'remove';
  path: string;
  value?: any;
};

export interface ClaimFix {
  issue_id: string;
  description: string;
  patches: PatchOperation[];
  rule_citation?: string;
  reasoning: string;
}

export interface ClaimFixResult {
  original_claim: Claim;
  fixed_claim: Claim;
  fixes_applied: ClaimFix[];
  timestamp: string;
}

// ============================================================================
// Payer Decision Types
// ============================================================================

export type PayerDecision = 'approved' | 'denied' | 'pending';

export interface PayerResponse {
  decision: PayerDecision;
  claim_id: string;
  timestamp: string;
  reason?: string;
  reason_codes?: string[];
  amount_approved?: number;
  pdf_url?: string; // URL to the generated CMS 1500 PDF
}

// ============================================================================
// Audit Log Types
// ============================================================================

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  claim_id?: string;
  details: any;
  actor: 'system' | 'ai' | 'user';
}

// ============================================================================
// AI Prompt Types
// ============================================================================

export interface PromptContext {
  clinician_note?: string;
  claim?: Claim;
  validation_issues?: ValidationIssue[];
  policy_citations?: string[];
}

// ============================================================================
// Unsiloed AI Types
// ============================================================================

export interface UnsiloedQuery {
  query: string;
  context?: string;
  max_results?: number;
}

export interface UnsiloedCitation {
  text: string;
  source: string;
  relevance_score: number;
  url?: string;
}

export interface UnsiloedResponse {
  citations: UnsiloedCitation[];
  query: string;
  timestamp: string;
}

// ============================================================================
// Note Processing Types
// ============================================================================

export type NoteProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Note {
  id: string;
  filename: string;
  content: string;
  uploaded_at: string;
  status: NoteProcessingStatus;
  claim_id?: string;
  pdf_url?: string;
  error?: string;
  processing_started_at?: string;
  processing_completed_at?: string;
}

export interface ClaimRecord {
  claim_id: string;
  note_id: string;
  note_filename: string;
  pdf_url: string;
  decision: PayerDecision;
  amount_approved?: number;
  reason?: string;
  created_at: string;
  patient_name?: string;
  provider_name?: string;
  claim_data?: Claim;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

