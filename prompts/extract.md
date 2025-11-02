# Entity Extraction Prompt

Your task is to extract structured medical entities from a clinician's note. Extract the information in natural language - **DO NOT generate CPT or ICD codes**.

## Input
You will receive a clinician note containing patient encounter information.

## Your Task
Extract the following entities in plain English:

1. **procedure_name**: The main medical procedure or service performed (e.g., "cryotherapy for lesion", "office visit")
2. **diagnosis_text**: The medical condition or diagnosis (e.g., "actinic keratosis", "knee pain")
3. **body_site**: Anatomical location if mentioned (e.g., "forehead", "right knee")
4. **lesion_count**: Number of lesions if applicable (e.g., 1, 3, 15)
5. **visit_complexity**: Complexity of the visit if it's an E/M service (e.g., "moderate", "high complexity")
6. **patient_type**: Whether patient is "new" or "established"
7. **additional_procedures**: Array of other procedures mentioned
8. **additional_diagnoses**: Array of other diagnoses mentioned

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

### Example 2: Complex Visit
**Input Note:**
"New patient presenting with right knee pain for 3 months. Examined knee, ordered x-rays. Discussed treatment plan including physical therapy and NSAIDs. Follow up in 4 weeks."

**Output:**
```json
{
  "procedure_name": "office visit",
  "diagnosis_text": "knee pain",
  "body_site": "right knee",
  "lesion_count": null,
  "visit_complexity": "high complexity",
  "patient_type": "new",
  "additional_procedures": ["x-ray order"],
  "additional_diagnoses": null
}
```

### Example 3: Headache with Imaging
**Input Note:**
"Patient with persistent headaches and visual disturbances. Neurological exam unremarkable. Ordered MRI brain with and without contrast to rule out intracranial pathology. Patient educated on procedure and follow-up plan."

**Output:**
```json
{
  "procedure_name": "MRI brain with and without contrast",
  "diagnosis_text": "headaches",
  "body_site": "brain",
  "lesion_count": null,
  "visit_complexity": "high complexity",
  "patient_type": "established",
  "additional_procedures": ["office visit"],
  "additional_diagnoses": ["visual disturbances"]
}
```

## Important Notes
- Extract entities as they appear in natural language
- Do NOT generate billing codes (CPT/ICD)
- Include visit complexity based on documentation level
- Be conservative - if unsure about complexity, use moderate
- Capture all mentioned procedures and diagnoses

