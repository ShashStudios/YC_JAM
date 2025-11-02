# Claim Fix Prompt

Your task is to analyze validation issues in a healthcare claim and generate appropriate fixes using JSON patch operations.

## Input
You will receive:
1. **Claim**: The current claim data
2. **Validation Issues**: List of problems found during validation
3. **Policy Citations**: Relevant CMS rules and payer policies from authoritative sources

## Your Task
For each validation issue, determine the appropriate fix and generate JSON patch operations.

## Fix Types

### 1. Missing Required Fields
Add the missing data from defaults or extract from context.

**Example Fix:**
```json
{
  "issue_id": "issue_123",
  "description": "Add missing provider NPI",
  "patches": [
    {
      "op": "replace",
      "path": "/provider/npi",
      "value": "1234567890"
    }
  ],
  "rule_citation": "CMS-1500 requires valid NPI for all providers",
  "reasoning": "Provider NPI is a required field per CMS guidelines. Added default NPI for Dr. Smith."
}
```

### 2. Missing Modifier 25
Add modifier 25 to E/M code when billed with minor procedure.

**Example Fix:**
```json
{
  "issue_id": "issue_456",
  "description": "Add modifier 25 to E/M code",
  "patches": [
    {
      "op": "add",
      "path": "/procedures/0/modifiers/-",
      "value": "25"
    }
  ],
  "rule_citation": "CMS Medicare Claims Processing Manual, Chapter 12, Section 40.1",
  "reasoning": "Modifier 25 required when E/M service (99213) is performed on same day as minor procedure (17000). The E/M was separately identifiable as documented in the visit note."
}
```

### 3. Missing Prior Authorization
Add prior authorization number for procedures that require it.

**Example Fix:**
```json
{
  "issue_id": "issue_789",
  "description": "Add prior authorization for MRI",
  "patches": [
    {
      "op": "add",
      "path": "/procedures/1/prior_authorization_number",
      "value": "PA123456789"
    }
  ],
  "rule_citation": "Payer requires prior authorization for all advanced imaging (CPT 70553)",
  "reasoning": "MRI brain with contrast requires prior authorization per payer policy. Added PA number from system defaults."
}
```

### 4. NCCI Conflicts
If codes conflict and modifier not allowed, suggest removal of bundled code.

**Example Fix:**
```json
{
  "issue_id": "issue_101",
  "description": "Remove bundled procedure",
  "patches": [
    {
      "op": "remove",
      "path": "/procedures/2"
    }
  ],
  "rule_citation": "NCCI Edit Table - Column 1/Column 2 conflict",
  "reasoning": "CPT 36415 (venipuncture) is bundled with CPT 80053 (metabolic panel) per NCCI edits and cannot be billed separately."
}
```

## Output Format
Return a JSON object with these fields. Use null for fields that aren't mentioned in the note.

## Examples

### Example 1: Simple Cryotherapy Visit
**Input Note:**
"Patient: Jane Doe, DOB 03/15/1975. Established patient presented for follow-up of actinic keratosis on forehead. Discussed treatment options. Patient elected cryotherapy. Performed cryotherapy to single lesion on forehead. Tolerated well. Return PRN."

**Output:**
```json
{
  "procedure_name": "cryotherapy",
  "diagnosis_text": "actinic keratosis",
  "body_site": "forehead",
  "lesion_count": 1,
  "visit_complexity": "moderate",
  "patient_type": "established",
  "additional_procedures": null,
  "additional_diagnoses": null
}
```

## Output Format
Return a JSON array of fix objects, each containing:
- `issue_id`: ID of the validation issue being fixed
- `description`: Brief description of the fix
- `patches`: Array of JSON patch operations
- `rule_citation`: Reference to the authoritative source
- `reasoning`: Clear explanation of why this fix is appropriate

## JSON Patch Operations
Use standard JSON Patch format (RFC 6902):
- `"op": "add"`: Add a new value
- `"op": "replace"`: Replace an existing value
- `"op": "remove"`: Remove a value

**Path Format:**
- `/provider/npi` - Provider NPI field
- `/procedures/0/modifiers/-` - Append to modifiers array of first procedure
- `/procedures/1/prior_authorization_number` - PA field of second procedure

## Important Rules
1. **Only fix issues provided** - Don't make changes for non-issues
2. **Use authoritative citations** - Reference the policy sources provided
3. **Explain reasoning** - Make it clear why each fix is correct
4. **Use correct paths** - Ensure JSON paths match claim structure
5. **Preserve existing data** - Don't remove or change unrelated fields
6. **One fix per issue** - Each validation issue gets one fix object

## Example Complete Response

**Input:**
- Claim with E/M (99213) and cryotherapy (17000), missing modifier 25
- Missing provider NPI

**Output:**
```json
[
  {
    "issue_id": "issue_abc123",
    "description": "Add modifier 25 to E/M code 99213",
    "patches": [
      {
        "op": "add",
        "path": "/procedures/0/modifiers/-",
        "value": "25"
      }
    ],
    "rule_citation": "CMS Medicare Claims Processing Manual, Chapter 12, Section 40.1 - Modifier 25 required when E/M service is significant and separately identifiable from procedure performed on same day",
    "reasoning": "The claim includes both an E/M visit (99213) and a minor procedure (17000 - cryotherapy) on the same date. Per CMS guidelines, modifier 25 must be appended to the E/M code to indicate it was a separately identifiable service."
  },
  {
    "issue_id": "issue_def456",
    "description": "Add missing provider NPI",
    "patches": [
      {
        "op": "replace",
        "path": "/provider/npi",
        "value": "1234567890"
      }
    ],
    "rule_citation": "CMS-1500 Claim Form Instructions - NPI is a required field for all providers",
    "reasoning": "Provider NPI is mandatory per HIPAA transaction standards. Added the registered NPI for this provider from the system defaults."
  }
]
```

Remember: Your fixes must be based on real policy requirements, not assumptions. Use the provided citations to justify every change.

