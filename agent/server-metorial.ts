/**
 * Metorial MCP Server for ClaimSense
 * Healthcare billing AI agent with claim validation and fixing tools
 */

import { z, metorial } from '@metorial/mcp-server-sdk';

interface Config {
  // OAuth Token is provided as `token` if needed
  // token?: string;
}

// Helper function to call API endpoints via ngrok
async function callAPI(endpoint: string, data: any): Promise<any> {
  const response = await fetch(`https://nonlucratively-unhated-beckham.ngrok-free.dev/api/${endpoint}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'  // Skip ngrok browser warning
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error?.message || `${endpoint} failed`);
  }
  
  return result.data;
}

metorial.createServer<Config>({
  name: 'claimsense-agent',
  version: '1.0.0'
}, async (server, args) => {
  
  // Tool 1: Extract Entities
  server.registerTool(
    'extract_entities',
    {
      title: 'Extract Medical Entities',
      description: 'Extract structured medical billing entities from clinician notes. Returns entities in natural language (not billing codes).',
      inputSchema: {
        clinician_note: z.string().describe('The clinician\'s note text to extract entities from')
      }
    },
    async ({ clinician_note }) => {
      const result = await callAPI('extract_entities', { clinician_note });
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(result, null, 2) 
        }]
      };
    }
  );

  // Tool 2: Map Codes
  server.registerTool(
    'map_codes',
    {
      title: 'Map to Billing Codes',
      description: 'Map extracted entities to valid CPT and ICD-10 codes using deterministic lookup tables.',
      inputSchema: {
        entities: z.object({
          procedure_name: z.string().nullish(),
          diagnosis_text: z.string().nullish(),
          body_site: z.string().nullish(),
          lesion_count: z.number().nullish(),
          visit_complexity: z.string().nullish(),
          patient_type: z.string().nullish(),
          additional_procedures: z.array(z.string()).nullish(),
          additional_diagnoses: z.array(z.string()).nullish(),
        }).describe('Extracted entities from clinician note')
      }
    },
    async ({ entities }) => {
      const result = await callAPI('map_codes', { entities });
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(result, null, 2) 
        }]
      };
    }
  );

  // Tool 3: Build Claim
  server.registerTool(
    'build_claim',
    {
      title: 'Build Claim',
      description: 'Build a structured claim from mapped CPT and ICD codes.',
      inputSchema: {
        mapping_result: z.object({
          cpt_codes: z.array(z.object({
            code: z.string(),
            description: z.string(),
            confidence: z.number().optional(),
            source: z.string().optional()
          })),
          icd_codes: z.array(z.object({
            code: z.string(),
            description: z.string(),
            confidence: z.number().optional(),
            source: z.string().optional()
          }))
        }).describe('The result from map_codes tool')
      }
    },
    async ({ mapping_result }) => {
      const result = await callAPI('build_claim', { mapping_result });
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(result, null, 2) 
        }]
      };
    }
  );

  // Tool 4: Validate Claim
  server.registerTool(
    'validate_claim',
    {
      title: 'Validate Claim',
      description: 'Validate a claim against NCCI edits, modifier rules, and prior authorization requirements. Pass the EXACT claim object returned from build_claim.',
      inputSchema: {
        claim: z.object({
          patient: z.object({
            first_name: z.string(),
            last_name: z.string(),
            date_of_birth: z.string(),
            gender: z.enum(['M', 'F', 'U'])
          }),
          provider: z.object({
            npi: z.string(),
            name: z.string(),
            taxonomy: z.string(),
            address: z.string(),
            city: z.string(),
            state: z.string(),
            zip: z.string()
          }),
          service_date: z.string(),
          place_of_service: z.string(),
          diagnosis_codes: z.array(z.string()),
          procedures: z.array(z.object({
            code: z.string(),
            description: z.string(),
            modifiers: z.array(z.string()),
            units: z.number(),
            charge: z.number()
          }))
        }).describe('The claim object to validate (use exact output from build_claim)')
      }
    },
    async ({ claim }) => {
      const result = await callAPI('validate_claim', { claim });
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(result, null, 2) 
        }]
      };
    }
  );

  // Tool 5: Fix Claim
  server.registerTool(
    'fix_claim',
    {
      title: 'AI Fix Claim',
      description: 'Generate AI-powered fixes for claim validation issues with policy citations. Pass the EXACT claim object from build_claim and validation_issues from validate_claim.',
      inputSchema: {
        claim: z.object({
          patient: z.object({
            first_name: z.string(),
            last_name: z.string(),
            date_of_birth: z.string(),
            gender: z.enum(['M', 'F', 'U'])
          }),
          provider: z.object({
            npi: z.string(),
            name: z.string(),
            taxonomy: z.string(),
            address: z.string(),
            city: z.string(),
            state: z.string(),
            zip: z.string()
          }),
          service_date: z.string(),
          place_of_service: z.string(),
          diagnosis_codes: z.array(z.string()),
          procedures: z.array(z.object({
            code: z.string(),
            description: z.string(),
            modifiers: z.array(z.string()),
            units: z.number(),
            charge: z.number()
          }))
        }).describe('The claim with validation issues (exact output from build_claim)'),
        validation_issues: z.array(z.object({
          issue_id: z.string(),
          severity: z.string(),
          category: z.string(),
          field: z.string().optional(),
          message: z.string(),
          suggested_fix: z.string().optional(),
          reference: z.string().optional()
        })).describe('Array of validation issues to fix')
      }
    },
    async ({ claim, validation_issues }) => {
      const result = await callAPI('fix_claim', { claim, validation_issues });
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(result, null, 2) 
        }]
      };
    }
  );

  // Tool 6: Submit Claim
  server.registerTool(
    'submit_claim',
    {
      title: 'Submit Claim',
      description: 'Submit a claim to the payer system for adjudication. Pass the EXACT claim object from build_claim (potentially with fixes applied).',
      inputSchema: {
        claim: z.object({
          patient: z.object({
            first_name: z.string(),
            last_name: z.string(),
            date_of_birth: z.string(),
            gender: z.enum(['M', 'F', 'U'])
          }),
          provider: z.object({
            npi: z.string(),
            name: z.string(),
            taxonomy: z.string(),
            address: z.string(),
            city: z.string(),
            state: z.string(),
            zip: z.string()
          }),
          service_date: z.string(),
          place_of_service: z.string(),
          diagnosis_codes: z.array(z.string()),
          procedures: z.array(z.object({
            code: z.string(),
            description: z.string(),
            modifiers: z.array(z.string()),
            units: z.number(),
            charge: z.number()
          }))
        }).describe('The finalized claim to submit (exact output from build_claim)')
      }
    },
    async ({ claim }) => {
      const result = await callAPI('submit_claim', { claim });
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(result, null, 2) 
        }]
      };
    }
  );

  // Tool 7: Log Action
  server.registerTool(
    'log_action',
    {
      title: 'Log Action',
      description: 'Log an action to the audit trail for compliance and debugging.',
      inputSchema: {
        action: z.string().describe('The action being logged'),
        details: z.any().describe('Details about the action'),
        result: z.any().optional().describe('The result of the action')
      }
    },
    async ({ action, details, result }) => {
      const logResult = await callAPI('log_action', { action, details, result });
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(logResult, null, 2) 
        }]
      };
    }
  );

  console.log('✅ ClaimSense MCP Server initialized with 7 tools');
  console.log('   - extract_entities: Extract medical billing entities');
  console.log('   - map_codes: Map to CPT/ICD codes');
  console.log('   - build_claim: Build structured claim');
  console.log('   - validate_claim: Validate against rules');
  console.log('   - fix_claim: AI-powered claim fixing');
  console.log('   - submit_claim: Submit to payer');
  console.log('   - log_action: Audit trail logging');
});

