# Quick Start: Automated Claim Processing

Get started with the automated claim processing feature in 5 minutes!

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Dependencies installed (`npm install`)
- ✅ API keys configured in `.env.local`:
  - `OPENAI_API_KEY`
  - `METORIAL_API_KEY`

## Step 1: Start the Server

```bash
npm run dev
```

Wait for:
```
✓ Ready on http://localhost:3000
```

## Step 2: Upload Your First Note

### Option A: Via Web Interface (Recommended)

1. Open your browser to **http://localhost:3000/notes**

2. You'll see the upload interface with a processor status indicator

3. **Drag & drop** the test note:
   - File: `sample_notes/test_note_auto.txt`
   - Or any `.txt` file with clinician notes

4. Click **"Upload and Process"**

5. Watch the status change:
   - ⏳ **Pending** → Note is queued
   - ⚙️ **Processing** → AI is working
   - ✅ **Completed** → Claim generated!

### Option B: Via File System

1. Copy any `.txt` file to `public/notes/`
2. The file watcher will detect it automatically
3. Processing starts immediately

## Step 3: Monitor Processing

The processor status bar shows:
- 🟢 **Active** - Background processor is running
- ⚙️ **Processing: X** - Notes currently being processed
- ⏳ **Queued: X** - Notes waiting in queue

Auto-refreshes every 5 seconds.

## Step 4: View Generated Claims

1. Go to **http://localhost:3000/claims**

2. You'll see:
   - 📊 **Statistics** - Total claims, approved, denied, amounts
   - 🔍 **Filters** - View by status
   - 📄 **Claim Cards** - Detailed information

3. Click **"📄 View PDF"** to see the CMS 1500 form

4. Click **"⬇️ Download"** to save it locally

## Step 5: Test Parallel Processing (Optional)

Upload multiple notes quickly:

```bash
# Copy test note 3 times with different names
cp sample_notes/test_note_auto.txt public/notes/NOTE-TEST1-001.txt
cp sample_notes/test_note_auto.txt public/notes/NOTE-TEST2-002.txt
cp sample_notes/test_note_auto.txt public/notes/NOTE-TEST3-003.txt
```

Watch the processor status:
- Should show **"Processing: 3"** (max concurrent)
- All 3 will complete automatically

## Understanding Note Status

| Status | Icon | Meaning |
|--------|------|---------|
| **Pending** | ⏳ | Waiting in queue |
| **Processing** | ⚙️ | AI is working on it |
| **Completed** | ✅ | Claim generated, PDF ready |
| **Failed** | ❌ | Error occurred (see error message) |

## What Happens During Processing?

Each note goes through:

1. ⚙️ **Entity Extraction** - AI reads the note
2. 🔍 **Code Mapping** - Maps to CPT/ICD codes
3. 📋 **Claim Building** - Structures the claim
4. ✅ **Validation** - Checks against rules
5. 🔧 **Auto-Fixing** - Fixes any issues
6. 📄 **PDF Generation** - Creates CMS 1500 form
7. 💾 **Storage** - Saves to database

**Total time**: ~30-60 seconds per note

## Test Note Format

Your `.txt` files should contain:

```
Patient: [Name]
DOB: [Date]
Visit Date: [Date]

Chief Complaint: [Reason for visit]

History of Present Illness:
[Description]

Physical Examination:
[Findings]

Assessment and Plan:
[Diagnoses and procedures]

Physician: [Name]
NPI: [Number]
```

See `sample_notes/test_note_auto.txt` for a complete example.

## Automated Test

Run the comprehensive test suite:

```bash
# In a separate terminal (server must be running)
npm run test:auto
```

This will:
1. Initialize the processor
2. Upload a test note
3. Wait for processing
4. Verify the claim
5. Check the PDF

**Takes ~2 minutes**

## Troubleshooting

### Processor Shows 🔴 Inactive

**Fix**: Refresh the `/notes` page - it auto-initializes

### Note Stuck in Pending

**Possible causes**:
- AI API key not configured
- Network issues
- Server error

**Fix**: Check the browser console and terminal logs

### PDF Not Generated

**Possible causes**:
- Incomplete claim data
- Missing required fields
- PDF generation error

**Fix**: Check terminal logs for PDF generation errors

### High Processing Time

**Normal**: 30-60 seconds per note
**Slow**: 60+ seconds

**Reasons**:
- AI API latency
- Complex notes
- Network speed

## Advanced Usage

### Adjust Concurrency

Edit `server/processor/claim-processor.ts`:

```typescript
// Change from 3 to your desired number
const processingQueue = new ProcessingQueue(5);
```

### Change Refresh Rate

Edit `app/notes/page.tsx`:

```typescript
// Change from 5000ms (5 seconds) to your desired rate
const interval = setInterval(() => {
  loadNotes();
  loadProcessorStatus();
}, 3000); // 3 seconds
```

### Custom Processing Logic

Edit `server/processor/claim-processor.ts`:

```typescript
async function processSingleNote(noteId: string) {
  // Add your custom steps here
}
```

## File Locations

| Type | Location |
|------|----------|
| **Uploaded Notes** | `public/notes/*.txt` |
| **Generated PDFs** | `public/claims/*.pdf` |
| **Note Metadata** | `data/notes.json` |
| **Claim Metadata** | `data/claims.json` |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notes/upload` | POST | Upload note |
| `/api/notes/list` | GET | List all notes |
| `/api/claims/list` | GET | List all claims |
| `/api/processor/init` | POST | Start processor |
| `/api/processor/status` | GET | Get status |

## Pages

| Page | URL | Purpose |
|------|-----|---------|
| **Home** | `/` | Main demo interface |
| **Notes** | `/notes` | Upload & monitor |
| **Claims** | `/claims` | View & download |

## Performance

- **Throughput**: ~180 notes/hour (with 3 concurrent)
- **Latency**: 30-60 seconds per note
- **Concurrency**: 3 parallel workers
- **Storage**: ~100KB per claim

## Next Steps

✅ **You're ready to go!**

Now you can:
1. Upload real clinician notes
2. Monitor automatic processing
3. Download generated claims
4. Integrate with your workflow

## Need Help?

- 📚 **Full Documentation**: See [AUTO_PROCESSING_GUIDE.md](./AUTO_PROCESSING_GUIDE.md)
- 🔍 **Feature Summary**: See [FEATURE_SUMMARY.md](./FEATURE_SUMMARY.md)
- 🏠 **Main README**: See [README.md](./README.md)

---

**Happy Processing!** 🚀

