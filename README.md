# ClaimSense AI Billing Employee

A healthcare billing assistant that reads clinician notes, extracts and maps billing codes, validates claims, fixes errors autonomously, and submits clean claims.

## 🎯 Overview

ClaimSense reduces claim denials by validating and fixing claims before submission using:
- **AI-powered entity extraction** with OpenAI GPT-4
- **Deterministic code mapping** using CPT/ICD lookup tables
- **Rule-based validation** with NCCI edits and CMS guidelines
- **AI reasoning for fixes** with policy citations from Unsiloed AI
- **Metorial MCP integration** for agentic workflow orchestration
- **🆕 Automated parallel processing** with continuous monitoring and PDF generation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- Unsiloed AI API key (optional - falls back to mock data)
- Metorial AI API key (optional)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Your API keys are already configured in `.env.local`

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### 🆕 New: Automated Claim Processing

ClaimSense now includes an **automated processing system** that continuously monitors for new notes and processes them in parallel:

1. **Upload Notes**: Visit `/notes` to upload clinician notes (.txt files)
2. **Auto-Processing**: Background workers automatically process notes into validated claims
3. **PDF Generation**: Each claim gets a CMS 1500 PDF form
4. **View Claims**: Visit `/claims` to see all generated claims and download PDFs

**Key Features:**
- 🔄 Continuous monitoring with file system watcher
- ⚡ Parallel processing (up to 3 simultaneous)
- 📊 Real-time status updates
- 📄 Automatic PDF generation
- 🎯 Complete end-to-end automation

See [AUTO_PROCESSING_GUIDE.md](./AUTO_PROCESSING_GUIDE.md) for detailed documentation.

### Running the MCP Server

In a separate terminal:
```bash
npm run mcp
```

## 📁 Project Structure

```
/Claim-mvp
  /app/                  # Next.js frontend
    /lib/               # API client library
    page.tsx            # Main UI
    layout.tsx          # Layout wrapper
    globals.css         # Global styles
  /pages/api/           # REST API endpoints
    extract_entities.ts # Entity extraction
    map_codes.ts        # Code mapping
    build_claim.ts      # Claim construction
    validate_claim.ts   # Validation engine
    fix_claim.ts        # AI fixing
    submit_claim.ts     # Mock payer
    log_action.ts       # Audit logging
  /server/              # Backend logic
    /mapper/            # Code mapping engine
    /validation/        # Validation rules
    /unsiloed/          # Unsiloed AI client
    /ai/                # OpenAI coordinator
    logs.json           # Audit trail
  /agent/               # Metorial MCP server
    server.ts           # MCP server entry point
    mcp.config.json     # Tool definitions
    /tools/             # MCP tool implementations
  /prompts/             # AI prompts
    system.md           # System instructions
    extract.md          # Entity extraction
    fix.md              # Claim fixing
  /data/                # Sample datasets
    cpt_codes.json      # CPT code lookup
    icd_codes.json      # ICD-10 codes
    ncci_pairs.json     # NCCI conflicts
    rules.json          # Validation rules
    demo_claims.json    # Test cases
  /types/               # TypeScript types
```

## 🧪 Test Cases

The application includes 3 demo test cases:

### Case 1: E/M + Minor Procedure Without Modifier 25
- **Issue**: Missing modifier 25 on E/M code
- **Expected Fix**: AI adds modifier 25 to CPT 99213
- **Expected Outcome**: Approved

### Case 2: Missing Provider NPI
- **Issue**: Required NPI field is empty
- **Expected Fix**: AI adds default NPI
- **Expected Outcome**: Approved

### Case 3: MRI Without Prior Authorization
- **Issue**: Advanced imaging requires PA
- **Expected Fix**: AI adds prior authorization number
- **Expected Outcome**: Approved

Run the test script:
```bash
npx tsx scripts/test-demo-claims.ts
```

## 🔧 API Endpoints

### POST /api/extract_entities
Extract entities from clinician note

### POST /api/map_codes
Map entities to CPT/ICD codes

### POST /api/build_claim
Build structured claim

### POST /api/validate_claim
Validate claim against rules

### POST /api/fix_claim
Generate AI fixes

### POST /api/submit_claim
Submit to mock payer

### POST /api/log_action
Log to audit trail

## 🤖 AI Integration

### OpenAI GPT-4
- Entity extraction from clinician notes
- Claim fixing with reasoning
- Temperature: 0.1 for consistency
- Response format: JSON object

### Unsiloed AI
- Payer policy lookups
- CMS rule citations
- Falls back to mock data if unavailable

### Metorial MCP
- Tool-based agentic workflow
- Stdio transport for local execution
- 7 registered tools for claim processing

## 📊 Data Sources

### CPT Codes (~40 codes)
Common procedures including E/M visits, minor surgery, imaging, lab tests

### ICD-10 Codes (~50 codes)
Frequently used diagnosis codes for primary care

### NCCI Pairs (~20 pairs)
Bundling conflicts and modifier requirements

### Validation Rules
- Required fields
- Modifier 25 logic
- Prior authorization watchlist
- NCCI conflict detection

## 🔒 Security & Compliance

- HIPAA-compliant data handling
- Secure API key storage in environment variables
- Audit trail for all actions
- No PHI in logs without safeguards

## 📝 Workflow

1. **Clinician Note** → AI extracts entities (natural language)
2. **Entities** → Deterministic mapper assigns CPT/ICD codes
3. **Codes** → Build structured CMS-1500 claim
4. **Claim** → Validate against rules (NCCI, modifiers, PA)
5. **Issues** → AI generates fixes with policy citations
6. **Fixed Claim** → Submit to mock payer
7. **Decision** → Approved/Denied with reasoning

## 🎨 Frontend Features

- Demo case selector
- Real-time processing status
- Step-by-step workflow visualization
- Color-coded validation issues
- Before/after claim comparison
- Payer decision display
- ROI metrics (amount approved)
- Agentic mode toggle for autonomous AI workflow

## 📊 Metorial Dashboard Observability

All agentic workflow sessions are automatically logged to the **Metorial AI dashboard** for real-time monitoring and debugging:

### What's Tracked
- ✅ Session creation with goals and metadata
- 🧠 Agent reasoning at each step
- 🔧 Tool calls with inputs and outputs
- ⏱️ Execution times and durations
- ❌ Errors with full context and stack traces
- 📈 Performance metrics and success rates

### Viewing Sessions
After processing a claim with agentic mode:
1. Check the console for the session link
2. Click to view in Metorial dashboard at `https://app.metorial.com`
3. See full reasoning chain, tool calls, and results

### Testing Integration
```bash
npm run test:metorial
```

### Configuration
Ensure `METORIAL_API_KEY` is set in `.env.local` (already configured).

**✅ Deployment Active**: Your custom MCP server is deployed to Metorial!
- **Deployment ID**: `svd_0mhhgmyjc4bNAM6yDLd9gD` (v6 - Fixed schemas ✅)
- **ngrok URL**: `https://nonlucratively-unhated-beckham.ngrok-free.dev`
- **Dashboard**: https://app.metorial.com/i/agent-jam/claimgenius/development-0207/sessions
- Sessions now automatically appear in the Metorial dashboard when you process claims with agentic mode enabled.

**📝 Latest Changes (v6)**: Fixed claim schemas in all tools to match the actual ClaimSchema format. All tools now use consistent patient/provider structure with proper field names.

For detailed dashboard documentation, see [METORIAL_DASHBOARD.md](./METORIAL_DASHBOARD.md)

## 🧰 Development

### Build for production:
```bash
npm run build
```

### Start production server:
```bash
npm start
```

### Lint code:
```bash
npm run lint
```

## 📚 Technologies

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, TypeScript
- **AI**: OpenAI GPT-4 Turbo, Unsiloed AI
- **MCP**: @modelcontextprotocol/sdk
- **Validation**: Zod schemas
- **Data**: JSON lookup tables

## 🤝 Contributing

This is an MVP demonstration project. For production use:
1. Replace mock payer with real clearinghouse integration
2. Expand CPT/ICD datasets to full CMS lists
3. Add user authentication and authorization
4. Implement real-time prior authorization workflows
5. Add appeal letter generation
6. Build analytics dashboard

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- CMS for public CPT/ICD guidelines
- AMA for CPT coding standards
- NCCI for bundling edit tables
- OpenAI for GPT-4 API
- Unsiloed AI for policy search
- Metorial for MCP framework

---

## ⚠️ Important Security Note

**Never commit your `.env.local` file to version control.** It's already in `.gitignore` to protect your API keys.

If you accidentally expose your API keys:
1. Rotate them immediately on the respective platforms
2. OpenAI: https://platform.openai.com/api-keys
3. Unsiloed AI: Contact their support
4. Metorial AI: Contact their support

