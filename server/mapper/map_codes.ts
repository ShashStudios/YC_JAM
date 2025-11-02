import { ExtractedEntities, MappedCode, CodeMappingResult, CPTCode, ICDCode } from '@/types';
import cptCodesData from '@/data/cpt_codes.json';
import icdCodesData from '@/data/icd_codes.json';

const cptCodes: CPTCode[] = cptCodesData as CPTCode[];
const icdCodes: ICDCode[] = icdCodesData as ICDCode[];

/**
 * Calculates string similarity using a simple word-based approach
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  
  let matches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matches++;
        break;
      }
    }
  }
  
  return matches / Math.max(words1.length, words2.length);
}

/**
 * Maps procedure names to CPT codes using fuzzy matching
 */
export function mapProcedureToCPT(procedureName: string, entities: ExtractedEntities): MappedCode[] {
  const results: MappedCode[] = [];
  const searchText = procedureName.toLowerCase();
  
  // First try exact keyword matching
  for (const cpt of cptCodes) {
    for (const keyword of cpt.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        const confidence = keyword.length / searchText.length;
        results.push({
          code: cpt.code,
          description: cpt.description,
          confidence: Math.min(confidence * 1.2, 0.99),
          source: 'keyword',
          matched_term: keyword,
        });
        break;
      }
    }
  }
  
  // If no keyword matches, try fuzzy matching on description
  if (results.length === 0) {
    for (const cpt of cptCodes) {
      const similarity = calculateSimilarity(searchText, cpt.description);
      if (similarity > 0.3) {
        results.push({
          code: cpt.code,
          description: cpt.description,
          confidence: similarity * 0.8,
          source: 'fuzzy',
        });
      }
    }
  }
  
  // Handle special cases based on entities
  if (entities.lesion_count !== undefined && entities.lesion_count !== null && entities.lesion_count > 0) {
    const lesionCode = getLesionCode(entities.lesion_count);
    if (lesionCode && !results.find(r => r.code === lesionCode)) {
      const cptData = cptCodes.find(c => c.code === lesionCode);
      if (cptData) {
        results.push({
          code: lesionCode,
          description: cptData.description,
          confidence: 0.95,
          source: 'exact',
          matched_term: `lesion count: ${entities.lesion_count}`,
        });
      }
    }
  }
  
  // Handle E/M visit complexity
  if (entities.visit_complexity) {
    const emCode = getEMCode(entities.visit_complexity, entities.patient_type || 'established');
    if (emCode && !results.find(r => r.code === emCode)) {
      const cptData = cptCodes.find(c => c.code === emCode);
      if (cptData) {
        results.push({
          code: emCode,
          description: cptData.description,
          confidence: 0.9,
          source: 'exact',
          matched_term: `visit complexity: ${entities.visit_complexity}`,
        });
      }
    }
  }
  
  // Sort by confidence and return top matches
  return results.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/**
 * Maps diagnosis text to ICD-10 codes
 */
export function mapDiagnosisToICD(diagnosisText: string): MappedCode[] {
  const results: MappedCode[] = [];
  const searchText = diagnosisText.toLowerCase();
  
  // Try exact keyword matching
  for (const icd of icdCodes) {
    for (const keyword of icd.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        const confidence = keyword.length / searchText.length;
        results.push({
          code: icd.code,
          description: icd.description,
          confidence: Math.min(confidence * 1.2, 0.99),
          source: 'keyword',
          matched_term: keyword,
        });
        break;
      }
    }
  }
  
  // If no keyword matches, try fuzzy matching
  if (results.length === 0) {
    for (const icd of icdCodes) {
      const similarity = calculateSimilarity(searchText, icd.description);
      if (similarity > 0.3) {
        results.push({
          code: icd.code,
          description: icd.description,
          confidence: similarity * 0.8,
          source: 'fuzzy',
        });
      }
    }
  }
  
  // Sort by confidence and return top matches
  return results.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/**
 * Helper function to determine lesion destruction CPT code based on count
 */
function getLesionCode(count: number): string | null {
  if (count === 1) return '17000';
  if (count >= 2 && count <= 14) return '17003';
  if (count >= 15) return '17004';
  return null;
}

/**
 * Helper function to determine E/M code based on complexity and patient type
 */
function getEMCode(complexity: string, patientType: 'new' | 'established'): string | null {
  const complexityLower = complexity.toLowerCase();
  
  if (patientType === 'established') {
    if (complexityLower.includes('minimal')) return '99211';
    if (complexityLower.includes('low') || complexityLower.includes('straightforward')) return '99212';
    if (complexityLower.includes('moderate')) return '99213';
    if (complexityLower.includes('high')) return '99214';
    if (complexityLower.includes('very high') || complexityLower.includes('complex')) return '99215';
  } else {
    if (complexityLower.includes('moderate')) return '99203';
    if (complexityLower.includes('high')) return '99204';
  }
  
  return null;
}

/**
 * Main function to map extracted entities to CPT and ICD codes
 */
export function mapEntitiesToCodes(entities: ExtractedEntities): CodeMappingResult {
  const cptCodes: MappedCode[] = [];
  const icdCodes: MappedCode[] = [];
  
  // Map primary procedure
  if (entities.procedure_name && entities.procedure_name !== null) {
    const procedureCodes = mapProcedureToCPT(entities.procedure_name, entities);
    cptCodes.push(...procedureCodes);
  }
  
  // Map additional procedures
  if (entities.additional_procedures && entities.additional_procedures !== null) {
    for (const proc of entities.additional_procedures) {
      const procedureCodes = mapProcedureToCPT(proc, entities);
      cptCodes.push(...procedureCodes);
    }
  }
  
  // Map primary diagnosis
  if (entities.diagnosis_text && entities.diagnosis_text !== null) {
    const diagnosisCodes = mapDiagnosisToICD(entities.diagnosis_text);
    icdCodes.push(...diagnosisCodes);
  }
  
  // Map additional diagnoses
  if (entities.additional_diagnoses && entities.additional_diagnoses !== null) {
    for (const diag of entities.additional_diagnoses) {
      const diagnosisCodes = mapDiagnosisToICD(diag);
      icdCodes.push(...diagnosisCodes);
    }
  }
  
  // Remove duplicates based on code
  const uniqueCPT = Array.from(
    new Map(cptCodes.map(c => [c.code, c])).values()
  );
  const uniqueICD = Array.from(
    new Map(icdCodes.map(c => [c.code, c])).values()
  );
  
  return {
    cpt_codes: uniqueCPT,
    icd_codes: uniqueICD,
    entities,
  };
}

/**
 * Validate that a CPT code exists in our dataset
 */
export function validateCPTCode(code: string): boolean {
  return cptCodes.some(c => c.code === code);
}

/**
 * Validate that an ICD code exists in our dataset
 */
export function validateICDCode(code: string): boolean {
  return icdCodes.some(c => c.code === code);
}

/**
 * Get CPT code details
 */
export function getCPTCodeDetails(code: string): CPTCode | null {
  return cptCodes.find(c => c.code === code) || null;
}

/**
 * Get ICD code details
 */
export function getICDCodeDetails(code: string): ICDCode | null {
  return icdCodes.find(c => c.code === code) || null;
}

