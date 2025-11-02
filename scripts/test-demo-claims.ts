/**
 * Test script to validate demo claims end-to-end
 * Run with: npx tsx scripts/test-demo-claims.ts
 */

import demoClaimsData from '../data/demo_claims.json';
import { validateClaim } from '../server/validation/validate_claim';
import { mapEntitiesToCodes } from '../server/mapper/map_codes';
import { ExtractedEntities } from '../types';

console.log('🧪 Testing ClaimSense Demo Claims\n');

const demoClaims = demoClaimsData as any[];

// Test Case 1: E/M + Minor Procedure
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST CASE 1: E/M + Minor Procedure Without Modifier 25');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const case1 = demoClaims.find(c => c.id === 'case1');
if (case1) {
  const claim1 = case1.initial_claim;
  const validation1 = validateClaim(claim1);
  
  console.log('Initial Claim Validation:');
  console.log(`  Valid: ${validation1.valid}`);
  console.log(`  Issues Found: ${validation1.issues.length}\n`);
  
  if (validation1.issues.length > 0) {
    console.log('Issues:');
    validation1.issues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
      if (issue.suggested_fix) {
        console.log(`     Suggested Fix: ${issue.suggested_fix}`);
      }
    });
  }
  
  // Check if the expected issue is found
  const hasModifier25Issue = validation1.issues.some(i => i.code === 'MISSING_MODIFIER_25');
  console.log(`\n✓ Expected Issue Found: ${hasModifier25Issue ? 'YES' : 'NO'}`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST CASE 2: Missing Provider NPI');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const case2 = demoClaims.find(c => c.id === 'case2');
if (case2) {
  const claim2 = case2.initial_claim;
  const validation2 = validateClaim(claim2);
  
  console.log('Initial Claim Validation:');
  console.log(`  Valid: ${validation2.valid}`);
  console.log(`  Issues Found: ${validation2.issues.length}\n`);
  
  if (validation2.issues.length > 0) {
    console.log('Issues:');
    validation2.issues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
      if (issue.suggested_fix) {
        console.log(`     Suggested Fix: ${issue.suggested_fix}`);
      }
    });
  }
  
  // Check if the expected issue is found
  const hasMissingNPI = validation2.issues.some(i => 
    i.code === 'MISSING_REQUIRED_FIELD' && i.field === 'provider.npi'
  );
  console.log(`\n✓ Expected Issue Found: ${hasMissingNPI ? 'YES' : 'NO'}`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST CASE 3: MRI Without Prior Authorization');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const case3 = demoClaims.find(c => c.id === 'case3');
if (case3) {
  const claim3 = case3.initial_claim;
  const validation3 = validateClaim(claim3);
  
  console.log('Initial Claim Validation:');
  console.log(`  Valid: ${validation3.valid}`);
  console.log(`  Issues Found: ${validation3.issues.length}\n`);
  
  if (validation3.issues.length > 0) {
    console.log('Issues:');
    validation3.issues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
      if (issue.suggested_fix) {
        console.log(`     Suggested Fix: ${issue.suggested_fix}`);
      }
    });
  }
  
  // Check if the expected issue is found
  const hasMissingPA = validation3.issues.some(i => i.code === 'MISSING_PRIOR_AUTH');
  console.log(`\n✓ Expected Issue Found: ${hasMissingPA ? 'YES' : 'NO'}`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('CODE MAPPING TEST');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test entity extraction and code mapping
const testEntities: ExtractedEntities = {
  procedure_name: 'cryotherapy',
  diagnosis_text: 'actinic keratosis',
  body_site: 'forehead',
  lesion_count: 1,
  visit_complexity: 'moderate',
  patient_type: 'established',
};

console.log('Test Entities:');
console.log(JSON.stringify(testEntities, null, 2));

const mappingResult = mapEntitiesToCodes(testEntities);

console.log('\nMapped CPT Codes:');
mappingResult.cpt_codes.forEach(code => {
  console.log(`  ${code.code} - ${code.description}`);
  console.log(`    Confidence: ${(code.confidence * 100).toFixed(0)}% | Source: ${code.source}`);
});

console.log('\nMapped ICD Codes:');
mappingResult.icd_codes.forEach(code => {
  console.log(`  ${code.code} - ${code.description}`);
  console.log(`    Confidence: ${(code.confidence * 100).toFixed(0)}% | Source: ${code.source}`);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✓ All Tests Completed');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

