import { Claim, ValidationIssue, ValidationResult, NCCIPair } from '@/types';
import { validateCPTCode, validateICDCode } from '@/server/mapper/map_codes';
import ncciPairsData from '@/data/ncci_pairs.json';
import rulesData from '@/data/rules.json';

const ncciPairs: NCCIPair[] = ncciPairsData as NCCIPair[];

interface Rules {
  required_fields: {
    provider: string[];
    patient: string[];
    claim: string[];
    billing: string[];
  };
  modifier_25_rule: {
    trigger_codes: {
      em_codes: string[];
      minor_procedures: string[];
    };
    required_modifier: string;
    applies_to: string;
    cms_reference: string;
  };
  prior_authorization_watchlist: {
    codes: Array<{
      code: string;
      description: string;
      reason: string;
    }>;
    required_field: string;
  };
}

const rules: Rules = rulesData as Rules;

/**
 * Generate a unique ID for validation issues
 */
function generateIssueId(): string {
  return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if all required fields are present in the claim
 */
function validateRequiredFields(claim: Claim): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Validate provider fields
  for (const field of rules.required_fields.provider) {
    const value = claim.provider[field as keyof typeof claim.provider];
    if (!value || value === '') {
      issues.push({
        id: generateIssueId(),
        severity: 'error',
        code: 'MISSING_REQUIRED_FIELD',
        message: `Missing required provider field: ${field}`,
        field: `provider.${field}`,
        suggested_fix: `Add provider ${field}`,
      });
    }
  }
  
  // Validate patient fields
  for (const field of rules.required_fields.patient) {
    const value = claim.patient[field as keyof typeof claim.patient];
    if (!value || value === '') {
      issues.push({
        id: generateIssueId(),
        severity: 'error',
        code: 'MISSING_REQUIRED_FIELD',
        message: `Missing required patient field: ${field}`,
        field: `patient.${field}`,
        suggested_fix: `Add patient ${field}`,
      });
    }
  }
  
  // Validate claim fields
  if (!claim.service_date || claim.service_date === '') {
    issues.push({
      id: generateIssueId(),
      severity: 'error',
      code: 'MISSING_REQUIRED_FIELD',
      message: 'Missing service date',
      field: 'service_date',
      suggested_fix: 'Add service date',
    });
  }
  
  if (!claim.place_of_service || claim.place_of_service === '') {
    issues.push({
      id: generateIssueId(),
      severity: 'error',
      code: 'MISSING_REQUIRED_FIELD',
      message: 'Missing place of service',
      field: 'place_of_service',
      suggested_fix: 'Add place of service code',
    });
  }
  
  // Validate billing fields
  if (!claim.diagnosis_codes || claim.diagnosis_codes.length === 0) {
    issues.push({
      id: generateIssueId(),
      severity: 'error',
      code: 'MISSING_REQUIRED_FIELD',
      message: 'No diagnosis codes provided',
      field: 'diagnosis_codes',
      suggested_fix: 'Add at least one diagnosis code',
    });
  }
  
  if (!claim.procedures || claim.procedures.length === 0) {
    issues.push({
      id: generateIssueId(),
      severity: 'error',
      code: 'MISSING_REQUIRED_FIELD',
      message: 'No procedure codes provided',
      field: 'procedures',
      suggested_fix: 'Add at least one procedure code',
    });
  }
  
  return issues;
}

/**
 * Validate that all CPT and ICD codes are valid
 */
function validateCodes(claim: Claim): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Validate CPT codes
  for (const procedure of claim.procedures) {
    if (!validateCPTCode(procedure.code)) {
      issues.push({
        id: generateIssueId(),
        severity: 'error',
        code: 'INVALID_CPT_CODE',
        message: `Invalid CPT code: ${procedure.code}`,
        field: 'procedures',
        affected_codes: [procedure.code],
        suggested_fix: 'Use a valid CPT code from the approved list',
      });
    }
  }
  
  // Validate ICD codes
  for (const diagnosisCode of claim.diagnosis_codes) {
    if (!validateICDCode(diagnosisCode)) {
      issues.push({
        id: generateIssueId(),
        severity: 'error',
        code: 'INVALID_ICD_CODE',
        message: `Invalid ICD-10 code: ${diagnosisCode}`,
        field: 'diagnosis_codes',
        affected_codes: [diagnosisCode],
        suggested_fix: 'Use a valid ICD-10 code',
      });
    }
  }
  
  return issues;
}

/**
 * Check for NCCI conflicts between procedure codes
 */
function validateNCCI(claim: Claim): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const procedureCodes = claim.procedures.map(p => p.code);
  
  for (let i = 0; i < procedureCodes.length; i++) {
    for (let j = i + 1; j < procedureCodes.length; j++) {
      const code1 = procedureCodes[i];
      const code2 = procedureCodes[j];
      
      // Check both directions
      const conflict = ncciPairs.find(
        pair => 
          (pair.column1 === code1 && pair.column2 === code2) ||
          (pair.column1 === code2 && pair.column2 === code1)
      );
      
      if (conflict) {
        issues.push({
          id: generateIssueId(),
          severity: 'error',
          code: 'NCCI_CONFLICT',
          message: `NCCI conflict: ${conflict.description}`,
          affected_codes: [code1, code2],
          suggested_fix: conflict.modifier_allowed
            ? 'Add appropriate modifier if services are distinct'
            : 'Remove one of the conflicting codes',
          rule_reference: 'NCCI Edit Table',
        });
      }
    }
  }
  
  return issues;
}

/**
 * Check if modifier 25 is required for E/M + minor procedure
 */
function validateModifier25(claim: Claim): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const procedureCodes = claim.procedures.map(p => p.code);
  
  const hasEM = procedureCodes.some(code => 
    rules.modifier_25_rule.trigger_codes.em_codes.includes(code)
  );
  
  const hasMinorProcedure = procedureCodes.some(code => 
    rules.modifier_25_rule.trigger_codes.minor_procedures.includes(code)
  );
  
  if (hasEM && hasMinorProcedure) {
    // Check if modifier 25 is present on the E/M code
    const emProcedures = claim.procedures.filter(p => 
      rules.modifier_25_rule.trigger_codes.em_codes.includes(p.code)
    );
    
    for (const emProc of emProcedures) {
      if (!emProc.modifiers.includes('25')) {
        issues.push({
          id: generateIssueId(),
          severity: 'error',
          code: 'MISSING_MODIFIER_25',
          message: `Modifier 25 required on E/M code ${emProc.code} when billed with minor procedure`,
          affected_codes: [emProc.code],
          suggested_fix: `Add modifier 25 to CPT ${emProc.code}`,
          rule_reference: rules.modifier_25_rule.cms_reference,
        });
      }
    }
  }
  
  return issues;
}

/**
 * Check if prior authorization is required
 */
function validatePriorAuthorization(claim: Claim): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  for (const procedure of claim.procedures) {
    const requiresPA = rules.prior_authorization_watchlist.codes.find(
      c => c.code === procedure.code
    );
    
    if (requiresPA) {
      if (!procedure.prior_authorization_number || procedure.prior_authorization_number === '') {
        issues.push({
          id: generateIssueId(),
          severity: 'error',
          code: 'MISSING_PRIOR_AUTH',
          message: `Prior authorization required for ${procedure.code}: ${requiresPA.reason}`,
          affected_codes: [procedure.code],
          suggested_fix: 'Add prior authorization number',
          rule_reference: 'Payer Prior Authorization Policy',
        });
      }
    }
  }
  
  return issues;
}

/**
 * Main validation function
 */
export function validateClaim(claim: Claim): ValidationResult {
  const issues: ValidationIssue[] = [];
  
  // Run all validation checks
  issues.push(...validateRequiredFields(claim));
  issues.push(...validateCodes(claim));
  issues.push(...validateNCCI(claim));
  issues.push(...validateModifier25(claim));
  issues.push(...validatePriorAuthorization(claim));
  
  // Determine if claim is valid (no errors)
  const hasErrors = issues.some(issue => issue.severity === 'error');
  
  return {
    valid: !hasErrors,
    issues,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get validation rules for reference
 */
export function getValidationRules() {
  return rules;
}

