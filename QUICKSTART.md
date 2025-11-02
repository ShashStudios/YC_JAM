# ClaimSense - Quick Start Guide

## 🚀 Get Started in 3 Minutes

### 1. Set up your API keys

Create a `.env.local` file in the root directory:

```bash
cat > .env.local << 'EOF'
OPENAI_API_KEY=your_openai_api_key_here
UNSILOED_API_KEY=your_unsiloed_api_key_here
UNSILOED_API_URL=https://api.sociate.ai/v1
NODE_ENV=development
EOF
```

**Important**: Replace `your_openai_api_key_here` with your actual OpenAI API key.

### 2. Start the application

```bash
npm run dev
```

### 3. Open in browser

Navigate to: [http://localhost:3000](http://localhost:3000)

## 🧪 Try the Demo

1. **Select a demo case** from the dropdown (e.g., "E/M + Minor Procedure")
2. Click **"Process Claim"**
3. Watch the AI:
   - Extract entities from the clinician note
   - Map entities to CPT/ICD codes
   - Validate the claim
   - Fix any issues found
   - Submit to mock payer
   - Show approval/denial decision

## 📊 Test Results

Run the validation tests:
```bash
npx tsx scripts/test-demo-claims.ts
```

Expected output:
```
✓ Expected Issue Found: YES (all 3 cases)
✓ All Tests Completed
```

## 🛠️ Optional: Run MCP Server

In a **separate terminal**:
```bash
npm run mcp
```

This enables the Metorial Model Context Protocol server for agentic workflows.

## 📖 What Each Demo Tests

### Demo 1: E/M + Minor Procedure
- **Issue**: Missing modifier 25 when billing E/M with cryotherapy
- **AI Fix**: Adds modifier 25 to E/M code
- **Result**: Approved

### Demo 2: Missing NPI
- **Issue**: Provider NPI field is empty
- **AI Fix**: Adds valid NPI from defaults
- **Result**: Approved

### Demo 3: MRI Without Prior Auth
- **Issue**: Advanced imaging requires prior authorization
- **AI Fix**: Adds PA number
- **Result**: Approved

## 🔍 Architecture Overview

```
Clinician Note
    ↓
[AI Entity Extraction] → GPT-4
    ↓
[Code Mapping] → Deterministic lookup (CPT/ICD)
    ↓
[Claim Validation] → Rule engine (NCCI, CMS)
    ↓
[AI Fixing] → GPT-4 + Unsiloed policy citations
    ↓
[Mock Payer] → Approve/Deny decision
    ↓
Audit Trail (logs.json)
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main UI |
| `pages/api/*` | REST API endpoints |
| `server/mapper/map_codes.ts` | CPT/ICD mapping |
| `server/validation/validate_claim.ts` | Validation rules |
| `server/ai/coordinator.ts` | OpenAI integration |
| `agent/server.ts` | MCP server |
| `data/*.json` | Sample datasets |

## 🎯 Next Steps

1. ✅ **Test all 3 demo cases** in the web UI
2. ✅ **Try custom clinician notes** 
3. ✅ **Review audit logs** in `server/logs.json`
4. ✅ **Explore the API** with curl or Postman
5. ✅ **Customize validation rules** in `data/rules.json`

## 🆘 Troubleshooting

### "OpenAI API key not found"
➜ Add your key to `.env.local`

### "Port 3000 already in use"
➜ Run: `PORT=3001 npm run dev`

### MCP Server errors
➜ Ensure Next.js dev server is running first

### Build errors
➜ Run: `npm install` then `npm run build`

## 📚 Full Documentation

- `README.md` - Complete project documentation
- `SETUP.md` - Detailed setup instructions
- `data/demo_claims.json` - Test case definitions

## ✨ Success Criteria

All systems are working correctly when:

✅ All 3 demo claims process successfully  
✅ Validation catches expected issues  
✅ AI generates appropriate fixes  
✅ Fixed claims get approved by mock payer  
✅ Audit trail shows complete workflow  

Happy coding! 🎉

