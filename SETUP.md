# ClaimSense Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js 18+** (check with `node --version`)
- **npm** (comes with Node.js)
- **OpenAI API Key** (required for entity extraction and claim fixing)
- **Unsiloed AI API Key** (optional - falls back to mock citations)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 15 with React 19
- OpenAI SDK
- Metorial MCP SDK
- Zod for validation
- TypeScript and all type definitions

### 2. Configure Environment Variables

You need to create a `.env.local` file in the root directory with your API keys.

**Option A: Copy from example (if you haven't set up the keys yet)**
```bash
# Create .env.local manually and add:
OPENAI_API_KEY=your_actual_openai_key_here
UNSILOED_API_KEY=your_actual_unsiloed_key_here
UNSILOED_API_URL=https://api.sociate.ai/v1
NODE_ENV=development
```

**Option B: Use your existing keys**

If you already have the keys in your environment, you can reference them:
```bash
export OPENAI_API_KEY="sk-..."
export UNSILOED_API_KEY="..."
```

### 3. Verify Installation

Build the project to ensure everything compiles:
```bash
npm run build
```

You should see output like:
```
✓ Compiled successfully
✓ Generating static pages
```

### 4. Run Tests

Test the demo claims to verify the validation engine works:
```bash
npx tsx scripts/test-demo-claims.ts
```

Expected output:
```
✓ Expected Issue Found: YES (for all 3 test cases)
✓ All Tests Completed
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### 6. (Optional) Start MCP Server

In a **separate terminal**, run the Metorial MCP server:
```bash
npm run mcp
```

This starts the MCP server that exposes healthcare billing tools via the Model Context Protocol.

## Troubleshooting

### Error: "OpenAI API key not found"
**Solution**: Ensure `OPENAI_API_KEY` is set in your `.env.local` file.

### Error: "Module not found"
**Solution**: Run `npm install` again to ensure all dependencies are installed.

### Error: "Port 3000 already in use"
**Solution**: Kill the process using port 3000 or specify a different port:
```bash
PORT=3001 npm run dev
```

### MCP Server Not Responding
**Solution**: Ensure the Next.js dev server is running on port 3000 before starting the MCP server, as the MCP tools make API calls to localhost:3000.

## Testing the Application

### Using the Web Interface

1. Open [http://localhost:3000](http://localhost:3000)
2. Select a demo case from the dropdown
3. Click "Process Claim"
4. Review the results:
   - Extracted entities
   - Mapped codes
   - Validation issues
   - AI-generated fixes
   - Payer decision

### Demo Cases Available

1. **E/M + Minor Procedure** - Tests modifier 25 logic
2. **Missing NPI** - Tests required field validation
3. **MRI Without PA** - Tests prior authorization requirements

### Using the API Directly

You can also test individual endpoints using curl or Postman:

```bash
# Extract entities
curl -X POST http://localhost:3000/api/extract_entities \
  -H "Content-Type: application/json" \
  -d '{"clinician_note": "Patient presented with actinic keratosis..."}'

# Validate claim
curl -X POST http://localhost:3000/api/validate_claim \
  -H "Content-Type: application/json" \
  -d @path/to/claim.json
```

## Project Structure Overview

```
/Claim-mvp
├── app/                    # Frontend (Next.js App Router)
│   ├── lib/               # API client
│   └── page.tsx           # Main UI
├── pages/api/             # Backend API endpoints
│   ├── extract_entities.ts
│   ├── map_codes.ts
│   ├── validate_claim.ts
│   ├── fix_claim.ts
│   └── submit_claim.ts
├── server/                # Core business logic
│   ├── mapper/           # Code mapping engine
│   ├── validation/       # Validation rules
│   ├── unsiloed/         # Unsiloed AI client
│   └── ai/               # OpenAI coordinator
├── agent/                 # Metorial MCP server
│   ├── server.ts         # MCP entry point
│   └── tools/            # MCP tool implementations
├── data/                  # Sample datasets
│   ├── cpt_codes.json
│   ├── icd_codes.json
│   ├── ncci_pairs.json
│   ├── rules.json
│   └── demo_claims.json
└── prompts/               # AI prompts
    ├── system.md
    ├── extract.md
    └── fix.md
```

## Next Steps

1. **Test the Demo Cases**: Run through all 3 demo cases in the web interface
2. **Try Custom Notes**: Enter your own clinician notes to see entity extraction
3. **Explore the API**: Use the API endpoints directly for integration
4. **Review Audit Logs**: Check `server/logs.json` for the audit trail
5. **Customize Rules**: Modify `data/rules.json` to add your own validation logic

## Production Considerations

Before deploying to production:

1. **Security**
   - Use secure environment variable management (e.g., AWS Secrets Manager)
   - Implement rate limiting on API endpoints
   - Add authentication and authorization

2. **Data**
   - Replace sample datasets with full CMS CPT/ICD lists
   - Integrate with real payer policies
   - Add proper database for audit logs

3. **Integration**
   - Connect to real clearinghouse instead of mock payer
   - Implement actual prior authorization workflows
   - Add EHR integration for automated note extraction

4. **Monitoring**
   - Add application performance monitoring (APM)
   - Set up error tracking (e.g., Sentry)
   - Implement analytics for denial tracking

## Support

For issues or questions:
- Check the README.md for API documentation
- Review the test script output for validation logic
- Examine server/logs.json for detailed execution logs

## License

MIT License - See LICENSE file for details

