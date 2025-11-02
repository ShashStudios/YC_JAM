# ClaimSense MCP Server - Metorial Deployment Information

## ✅ What I Have Ready

I've created a **Metorial-compatible MCP server** using the `@metorial/mcp-server-sdk`:

- **File**: `agent/server-metorial.ts`
- **SDK**: `@metorial/mcp-server-sdk` ✅ Installed
- **Server Name**: `claimsense-agent`
- **Version**: 1.0.0

## 🔧 Server Details

### Tools Registered (7 total):

1. **extract_entities** - Extract medical billing entities from clinician notes
2. **map_codes** - Map entities to CPT and ICD-10 codes
3. **build_claim** - Build structured claim from codes
4. **validate_claim** - Validate against NCCI rules and requirements
5. **fix_claim** - AI-powered claim fixing with policy citations
6. **submit_claim** - Submit claim to payer system
7. **log_action** - Audit trail logging

### How to Run Locally:

```bash
# Start the Next.js app (API endpoints)
npm run dev

# In a separate terminal, start the Metorial MCP server
npm run mcp:metorial
```

## 📋 What to Ask Metorial Team

### Question 1: How to Deploy?

"I have a custom MCP server built with `@metorial/mcp-server-sdk`. How do I deploy it to Metorial so it appears in my dashboard?"

**Options I'm aware of:**
- Upload the `server-metorial.ts` file directly?
- Point to a Git repository?
- Deploy as a serverless function?
- Connect a self-hosted endpoint?

### Question 2: Custom Server in UI?

"In the 'Create Deployment' dialog, I only see marketplace integrations (Slack, Gmail, etc.). How do I add my custom server that uses your SDK?"

**What I'm looking for:**
- "Custom Server" button or option
- "Upload Server" functionality
- "Self-hosted" configuration

### Question 3: Development Workflow?

"For local development, can I connect my `localhost:3100` MCP server to Metorial for testing before production deployment?"

### Question 4: Repository Structure?

"Do you need:
- Just the `server-metorial.ts` file?
- The entire `agent/` folder?
- Package dependencies (`package.json`)?
- Environment configuration?

## 📁 Files to Share (if they need them)

### Primary Server File:
```
agent/server-metorial.ts  (Complete Metorial-compatible server)
```

### Dependencies:
```json
{
  "@metorial/mcp-server-sdk": "^1.0.2",
  "@metorial/openai": "^1.0.2",
  "zod": "^3.24.1"
}
```

### Server Code Preview:

```typescript
import { z, metorial } from '@metorial/mcp-server-sdk';

metorial.createServer<Config>({
  name: 'claimsense-agent',
  version: '1.0.0',
  description: 'Healthcare billing AI assistant'
}, async (server, args) => {
  
  server.registerTool('extract_entities', { /* ... */ });
  server.registerTool('map_codes', { /* ... */ });
  server.registerTool('build_claim', { /* ... */ });
  server.registerTool('validate_claim', { /* ... */ });
  server.registerTool('fix_claim', { /* ... */ });
  server.registerTool('submit_claim', { /* ... */ });
  server.registerTool('log_action', { /* ... */ });
});
```

## 🎯 My Goal

Once deployed, I want to:

1. **Get a deployment ID** (e.g., `claimsense-prod-001`)
2. **Use it in my agent code**:
   ```typescript
   const result = await metorial.run({
     message: "Process this claim...",
     serverDeployments: ['claimsense-prod-001'], // Your deployment ID
     model: 'gpt-4-turbo-preview',
     client: openai,
   });
   ```
3. **See sessions in dashboard**: All tool calls, reasoning, and results

## 🔗 My Workspace

- **Workspace**: agent-jam
- **Agent**: claimgenius
- **Environment**: development-0207
- **Dashboard**: https://app.metorial.com/i/agent-jam/claimgenius/development-0207

## 📧 Additional Context

**What my app does:**
- Processes healthcare clinician notes
- Extracts billing entities (procedures, diagnoses)
- Maps to CPT/ICD codes
- Validates claims against CMS rules
- AI fixes validation issues
- Submits to payer system

**Why I need Metorial:**
- Observability into agent decision-making
- Debugging tool call sequences
- Monitoring success/failure rates
- Understanding why claims get approved/denied

## ✨ What's Working

✅ Metorial SDK installed  
✅ API key configured  
✅ Server code written with proper tool registration  
✅ Ready to deploy

## ❓ What I Need

- Instructions on how to deploy my custom MCP server
- Deployment ID once created
- Confirmation that sessions will appear in dashboard

---

**Contact**: [Your email/name if needed]  
**Priority**: Medium (development phase, but want observability soon)

