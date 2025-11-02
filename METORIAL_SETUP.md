# Metorial Dashboard Setup Guide

## Overview

To see your ClaimSense agent sessions in the Metorial dashboard, you need to **deploy your MCP server** to Metorial's platform.

## Current Status

✅ **You have**: A Metorial workspace at `app.metorial.com/i/agent-jam/claimgenius/development-0207`  
❌ **Missing**: Your local MCP server needs to be deployed to this workspace

## Why Sessions Aren't Appearing

The Metorial SDK works by connecting to **MCP servers deployed on Metorial's platform**. Currently, our ClaimSense tools are running locally and not connected to Metorial's infrastructure.

## Two Options to Fix This

### Option 1: Deploy MCP Server to Metorial (Recommended)

This will give you full observability in the Metorial dashboard.

#### Steps:

1. **Install Metorial CLI** (if not already installed):
   ```bash
   npm install -g @metorial/cli
   ```

2. **Login to Metorial**:
   ```bash
   metorial login
   ```
   This will open a browser window to authenticate with your Metorial API key.

3. **Deploy Your MCP Server**:
   ```bash
   cd /Users/kumailjaffry/Claim-mvp
   metorial deploy ./agent/server.ts \
     --workspace agent-jam \
     --agent claimgenius \
     --deployment development-0207
   ```

4. **Verify Deployment**:
   ```bash
   metorial deployments list
   ```

5. **Update Code to Use Deployed Server**:
   Once deployed, update your agent to use the Metorial SDK:
   
   ```typescript
   import { Metorial } from 'metorial';
   
   const metorial = new Metorial({ 
     apiKey: process.env.METORIAL_API_KEY 
   });
   
   const result = await metorial.run({
     message: "Process this claim",
     serverDeployments: ['development-0207'], // Your deployment ID
     model: 'gpt-4-turbo-preview',
     client: openai
   });
   ```

### Option 2: Use Metorial's Session API Directly

If you prefer to keep the MCP server running locally, you can use Metorial's telemetry API to manually report sessions.

#### Requirements:
- Find the correct API endpoints from Metorial's documentation
- Implement proper session creation/tracking
- Handle authentication correctly

**Note**: This is more complex and the API endpoints aren't publicly documented yet. Option 1 is recommended.

## What You'll Get After Deployment

Once your MCP server is deployed to Metorial:

✅ **Automatic Session Tracking**: Every workflow appears in the dashboard  
✅ **Tool Call Logging**: All tool invocations are recorded  
✅ **Reasoning Chains**: Full step-by-step agent decisions  
✅ **Error Tracking**: Failures are captured with context  
✅ **Performance Metrics**: Duration, token usage, costs  
✅ **Searchable History**: Find past sessions by date, goal, outcome  

## Troubleshooting

### "Metorial CLI not found"
```bash
npm install -g @metorial/cli
```

### "Authentication failed"
1. Go to [https://app.metorial.com/settings/api-keys](https://app.metorial.com/settings/api-keys)
2. Generate a new API key
3. Update your `.env.local`:
   ```
   METORIAL_API_KEY=your_new_key
   ```
4. Run `metorial login` again

### "Deployment already exists"
If `development-0207` already exists, either:
- Use `--force` flag to overwrite: `metorial deploy ./agent/server.ts --force`
- Create a new deployment: `metorial deploy ./agent/server.ts --deployment development-0208`

### "MCP server won't start"
Check that all dependencies are installed:
```bash
npm install
```

## Next Steps

1. **Deploy to Metorial**: Follow Option 1 above
2. **Test the Integration**: Run a workflow through the UI
3. **Check Dashboard**: Visit https://app.metorial.com/i/agent-jam/claimgenius/development-0207/sessions
4. **View Sessions**: Your workflows should now appear in real-time!

## Additional Resources

- [Metorial Documentation](https://metorial.com/docs)
- [MCP Server Guide](https://metorial.com/docs/mcp-servers)
- [API Reference](https://metorial.com/api)
- [Support](https://metorial.com/support)

## Alternative: Simple Logging

If you just want basic observability without deploying to Metorial, the application already logs everything to:
- **Console**: Check your terminal for step-by-step logs
- **File**: `server/logs.json` contains full audit trail

You can view the audit log with:
```bash
cat server/logs.json | jq '.'
```

Or in the UI, we can add a "View Logs" button to display the local audit trail.

