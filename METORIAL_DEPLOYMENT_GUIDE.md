# Metorial Deployment Guide - Step by Step

## Current Status

✅ **API Key**: Connected successfully to Metorial  
✅ **SDK Installed**: `metorial` and `@metorial/openai` packages ready  
❌ **Deployment**: No deployment exists yet - needs to be created

## Why You Need to Use the Web UI

After testing the Metorial API, I found that:
- Deployments **cannot be created via CLI** (no `@metorial/cli` package exists)
- Programmatic deployment creation requires **specific configuration parameters** not well documented
- The **recommended approach** is to use Metorial's web dashboard to create deployments

## Step-by-Step Deployment Process

### Step 1: Access Your Metorial Workspace

1. Go to: **https://app.metorial.com**
2. Log in with your account
3. Navigate to your workspace: **agent-jam → claimgenius**

### Step 2: Create a New Deployment

1. Look for one of these sections in the sidebar or main page:
   - **"Deployments"**
   - **"Servers"**
   - **"MCP Servers"**
   - **"Integrations"**

2. Click **"Create Deployment"** or **"Add Server"** button

3. You'll likely see options like:
   - **From Marketplace** (pre-built servers)
   - **Custom MCP Server** (your own server)
   - **Self-hosted** (run on your infrastructure)
   - **Serverless** (run on Metorial's infrastructure)

### Step 3: Choose Deployment Type

For ClaimSense, you have two options:

#### Option A: Self-Hosted (Local Development)
- **Type**: Custom MCP Server
- **Hosting**: Self-hosted
- **URL**: `http://localhost:3100` (or whatever port your MCP server runs on)
- **Description**: "ClaimSense healthcare billing AI agent"

#### Option B: Serverless (Recommended for Production)
- **Type**: Custom MCP Server  
- **Hosting**: Metorial serverless
- **Upload**: Your `agent/server.ts` file or provide git repository
- **Description**: "ClaimSense healthcare billing AI agent"

### Step 4: Configure Tools

When creating the deployment, you may need to specify which tools are available. Your MCP server exposes these tools:

- `extract_entities` - Extract medical billing entities from clinical notes
- `map_codes` - Map entities to CPT and ICD-10 codes
- `build_claim` - Build a structured claim from mapped codes
- `validate_claim` - Validate claim against NCCI rules and requirements
- `fix_claim` - Generate AI-powered fixes for validation issues
- `submit_claim` - Submit claim to mock payer system
- `log_action` - Log an audit trail action

### Step 5: Save and Note the Deployment ID

After creating the deployment:
1. **Copy the Deployment ID** (e.g., `clm-abc123xyz` or `deployment-12345`)
2. **Save it** - you'll need this for your code
3. Check that the status shows **"Active"** or **"Running"**

### Step 6: Update Your Code

Once you have the deployment ID, update the agent code:

```typescript
// In pages/api/agent/process.ts
import { Metorial } from 'metorial';
import OpenAI from 'openai';

const metorial = new Metorial({ 
  apiKey: process.env.METORIAL_API_KEY 
});

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Use your deployment ID here
const result = await metorial.run({
  message: `Process this healthcare claim: ${clinicianNote}`,
  serverDeployments: ['YOUR_DEPLOYMENT_ID_HERE'], // <-- Replace this
  model: 'gpt-4-turbo-preview',
  client: openai,
  maxSteps: 20,
});
```

### Step 7: Test the Integration

1. **Start your local MCP server** (if self-hosted):
   ```bash
   npm run mcp
   ```

2. **Process a claim** through the UI with agentic mode enabled

3. **Check the Metorial dashboard**:
   - Go to: https://app.metorial.com/i/agent-jam/claimgenius/[your-workspace]/sessions
   - You should see your session appear in real-time!

## Troubleshooting

### "Deployment not found" error
- Double-check the deployment ID in your code
- Verify the deployment shows as "Active" in the dashboard
- Try refreshing the Metorial dashboard

### "Connection refused" (Self-hosted)
- Ensure your MCP server is running: `npm run mcp`
- Check that the port matches what you configured (default: 3100)
- Verify your firewall allows the connection

### "No tools available"
- Check that your MCP server exposes tools correctly
- Review the `agent/mcp.config.json` configuration
- Look for errors in the MCP server console logs

### Sessions not appearing
- Verify the deployment ID is correct
- Check that you're using `metorial.run()` method
- Ensure `METORIAL_API_KEY` is set in `.env.local`
- Look for errors in your application console

## Alternative: Manual Session Tracking

If you can't create a deployment through the UI (maybe it's in beta or requires special access), you can still use the local logging:

1. **View local logs**:
   ```bash
   cat server/logs.json | jq '.'
   ```

2. **Check console output**: The terminal shows detailed step-by-step execution

3. **Add UI logging**: We can add a "View Session Log" button in the frontend to display the audit trail

## What to Expect After Deployment

Once everything is connected, you'll see in the Metorial dashboard:

✅ **Live Sessions**: Each claim processing workflow appears as a session  
✅ **Tool Calls**: Every tool invocation (extract, map, validate, fix, submit)  
✅ **Reasoning**: Agent's decision-making at each step  
✅ **Timing**: Duration for each tool call  
✅ **Errors**: Stack traces if something fails  
✅ **History**: Searchable archive of all past sessions  

## Next Steps

1. **Access the Metorial web dashboard** at https://app.metorial.com
2. **Create a deployment** following Step 2 above
3. **Copy the deployment ID**
4. **Let me know the ID** and I'll update the code to use it
5. **Test it** by processing a claim with agentic mode

---

## Need Help?

If you encounter any issues:
- Check the [Metorial Documentation](https://metorial.com/docs)
- Contact [Metorial Support](https://metorial.com/support)
- Or let me know what error you're seeing, and I'll help troubleshoot!

