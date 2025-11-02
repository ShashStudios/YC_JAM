# Metorial AI Dashboard Integration

## Overview
Your ClaimSense agent sessions are now automatically logged to the Metorial AI dashboard for observability and debugging.

## What's Logged

Every time you process a claim using the agentic workflow, the system logs:

1. **Session Creation**
   - Unique session ID
   - Goal/objective
   - Start timestamp
   - Agent name: "ClaimSense AI Agent"

2. **Agent Steps**
   - Step number
   - Reasoning/thinking
   - Tool used (if any)
   - Tool input parameters
   - Tool output results
   - Success/error status
   - Timestamp

3. **Session Completion**
   - Total steps taken
   - Duration in milliseconds
   - Final result
   - Success/failure status

4. **Errors**
   - Error messages
   - Stack traces
   - Context (which tool failed, with what arguments)

## Viewing Sessions in Metorial Dashboard

### Option 1: Direct Link (shown in console)
After each workflow completes, check your terminal for:
```
🔗 View in dashboard: https://app.metorial.com/i/agent-jam/claimgenius/development-0207/sessions/{session_id}
```

Click this link to see the full session trace.

### Option 2: Navigate Manually
1. Go to [https://app.metorial.com](https://app.metorial.com)
2. Log in with your Metorial account
3. Navigate to your workspace: **agent-jam → claimgenius → development-0207**
4. Click on **Sessions** in the left sidebar
5. Find your session by:
   - Session ID (printed in console)
   - Timestamp
   - Goal description

## Session Details Page

In the Metorial dashboard, you'll see:

### Session Overview
- **Session ID**: Unique identifier
- **Goal**: What the agent was trying to achieve
- **Status**: Running, Completed, or Failed
- **Duration**: Total time taken
- **Steps**: Number of reasoning/tool execution steps

### Reasoning Chain
A step-by-step trace showing:
- **Reasoning**: The agent's thought process
- **Tool Calls**: Which tools were invoked
- **Arguments**: Parameters passed to each tool
- **Results**: Output from each tool
- **Timestamps**: When each step occurred

### Metrics
- Total tool calls
- Success rate
- Token usage (if tracked)
- Cost estimation (if enabled)

### Error Details
If any step failed:
- Error message
- Stack trace
- Context (what the agent was trying to do)

## Configuration

The Metorial integration requires the `METORIAL_API_KEY` environment variable in `.env.local`:

```bash
METORIAL_API_KEY=metorial_sk_6h41VUhU0ScUH1XYxje3R7eCjrgrQzXvDg9wX5Ouwdff6Gqcg6UOPqj9Q2y04bnX7G6OgTddJPq0hGQhkrWQVzwyi66DZo7ZT3v1
```

### Verify Configuration
When you start a workflow, look for these console messages:

✅ **Working**:
```
✅ Metorial session created: session_1234567890_abc123
📊 Metorial step logged: 1 - extract_entities
✅ Metorial session completed: session_1234567890_abc123
🔗 View in dashboard: https://app.metorial.com/i/...
```

⚠️ **Not Configured**:
```
⚠️  Metorial API key not configured, skipping session creation
```

## Troubleshooting

### Sessions Not Appearing

1. **Check API Key**
   - Ensure `METORIAL_API_KEY` is in `.env.local`
   - Restart the dev server after adding the key
   - Verify the key starts with `metorial_sk_`

2. **Check Console**
   - Look for "Metorial session created" messages
   - If you see warnings, the integration isn't active

3. **Check Dashboard Access**
   - Ensure you're logged into the correct Metorial account
   - Verify you have access to the workspace

4. **API Connectivity**
   - The system requires internet access to send telemetry
   - Check for network errors in the console

### Partial Data

If sessions appear but steps are missing:
- Some steps may log before tool calls complete
- Refresh the dashboard page
- Check for error messages in your console

### Failed Requests

The integration is designed to **fail silently** - if Metorial is unavailable, your workflow will continue normally. Check console for:
```
⚠️  Metorial step logging failed: [error details]
```

## Privacy & Data

What's sent to Metorial:
- Session metadata (ID, timestamps, durations)
- Agent reasoning text
- Tool names and parameters
- Tool output results
- Error messages

What's NOT sent:
- Raw API keys or credentials
- Full patient data (only extracted entities)
- Internal system paths or secrets

## Benefits

### Real-Time Monitoring
- See agent sessions as they happen
- Monitor long-running workflows
- Track success/failure rates

### Debugging
- Detailed step-by-step traces
- Understand why the agent made certain decisions
- Identify which tools fail and why

### Analytics
- Compare sessions over time
- Measure performance improvements
- Track cost and token usage

### Collaboration
- Share specific session links with team members
- Review problematic workflows together
- Document edge cases

## Example Session Flow

Here's what a typical session looks like in the dashboard:

**Session: `session_1730534820_a7x9m2`**
- Goal: Process clinician note and submit claim
- Status: ✅ Completed
- Duration: 8,456ms
- Steps: 12

**Step 1** (0ms)
- Reasoning: "I need to extract entities from the clinician note first..."
- Tool: `extract_entities`
- Input: `{ clinician_note: "Patient presented with..." }`
- Output: `{ procedure_name: "cryotherapy", diagnosis_text: "actinic keratosis", ... }`

**Step 2** (1,234ms)
- Reasoning: "Now I'll map these entities to CPT and ICD codes..."
- Tool: `map_codes`
- Input: `{ entities: { ... } }`
- Output: `{ cpt_codes: [...], icd_codes: [...] }`

... *and so on*

**Step 12** (8,456ms)
- Reasoning: "All validation passed, submitting the claim..."
- Tool: `submit_claim`
- Input: `{ claim: { ... } }`
- Output: `{ status: "APPROVED", claim_id: "CLM-..." }`

## Advanced Features

### Filtering Sessions
In the dashboard, filter by:
- Date range
- Status (completed, failed, running)
- Duration
- Agent name
- Goal keywords

### Exporting Data
Export session data as:
- JSON (for programmatic analysis)
- CSV (for spreadsheets)
- PDF (for reports)

### Alerts
Set up alerts for:
- Failed sessions
- Long-running sessions
- High error rates
- Specific tool failures

## Next Steps

1. ✅ Process a claim with the agentic workflow
2. 📊 Check your console for the Metorial session link
3. 🔗 Click the link to view the full trace
4. 🎯 Explore the reasoning chain and tool calls
5. 📈 Set up custom dashboards and alerts (optional)

## Support

If you need help:
- Check [Metorial docs](https://docs.metorial.com)
- Contact Metorial support
- Review console logs for error details

