#!/usr/bin/env node
/**
 * ClaimSense MCP Server
 * Exposes healthcare billing tools via Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { extractEntitiesTool } from './tools/extract_entities.js';
import { validateClaimTool } from './tools/validate_claim.js';
import { fixClaimTool } from './tools/fix_claim.js';
import { lookupPolicyTool } from './tools/lookup_policy.js';
import { logActionTool } from './tools/log_action.js';

// Create MCP server
const server = new Server(
  {
    name: 'claimsense',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'extract_entities',
        description: 'Extract structured medical entities from clinician notes. Returns entities in natural language (not billing codes).',
        inputSchema: {
          type: 'object',
          properties: {
            clinician_note: {
              type: 'string',
              description: 'The clinician\'s note text to extract entities from',
            },
          },
          required: ['clinician_note'],
        },
      },
      {
        name: 'map_codes',
        description: 'Map extracted entities to valid CPT and ICD-10 codes using deterministic lookup tables.',
        inputSchema: {
          type: 'object',
          properties: {
            entities: {
              type: 'object',
              description: 'Extracted entities from clinician note',
            },
          },
          required: ['entities'],
        },
      },
      {
        name: 'validate_claim',
        description: 'Validate a claim against CMS rules, NCCI edits, and payer policies. Returns list of validation issues.',
        inputSchema: {
          type: 'object',
          properties: {
            claim: {
              type: 'object',
              description: 'The claim to validate in CMS-1500 format',
            },
          },
          required: ['claim'],
        },
      },
      {
        name: 'fix_claim',
        description: 'Generate AI-powered fixes for validation issues using GPT-4 and policy citations from Unsiloed AI.',
        inputSchema: {
          type: 'object',
          properties: {
            claim: {
              type: 'object',
              description: 'The claim with validation issues',
            },
            validation_issues: {
              type: 'array',
              description: 'List of validation issues to fix',
            },
          },
          required: ['claim', 'validation_issues'],
        },
      },
      {
        name: 'lookup_policy',
        description: 'Query Unsiloed AI for payer policy information and CMS rule citations.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The policy question or rule to look up',
            },
            context: {
              type: 'string',
              description: 'Optional context for the query',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'submit_claim',
        description: 'Submit claim to mock payer for approval/denial decision.',
        inputSchema: {
          type: 'object',
          properties: {
            claim: {
              type: 'object',
              description: 'The claim to submit',
            },
          },
          required: ['claim'],
        },
      },
      {
        name: 'log_action',
        description: 'Log an action to the audit trail for compliance and debugging.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'Description of the action being logged',
            },
            claim_id: {
              type: 'string',
              description: 'Optional claim ID associated with this action',
            },
            details: {
              type: 'object',
              description: 'Additional details about the action',
            },
            actor: {
              type: 'string',
              enum: ['system', 'ai', 'user'],
              description: 'Who performed this action',
            },
          },
          required: ['action'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let result: any;
    
    switch (name) {
      case 'extract_entities':
        result = await extractEntitiesTool(args as any);
        break;
        
      case 'validate_claim':
        result = await validateClaimTool(args as any);
        break;
        
      case 'fix_claim':
        result = await fixClaimTool(args as any);
        break;
        
      case 'lookup_policy':
        result = await lookupPolicyTool(args as any);
        break;
        
      case 'log_action':
        result = await logActionTool(args as any);
        break;
        
      case 'submit_claim':
        // Directly call the submit API
        const submitResponse = await fetch('http://localhost:3000/api/submit_claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        });
        const submitData = await submitResponse.json();
        result = submitData.data;
        break;
        
      case 'map_codes':
        // Directly call the map_codes API
        const mapResponse = await fetch('http://localhost:3000/api/map_codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        });
        const mapData = await mapResponse.json();
        result = mapData.data;
        break;
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ClaimSense MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

