# ⚠️ URGENT: Database Update Required

## The Problem
The database still has **old Retell agent IDs**, not Vapi assistant IDs. When you try to start an interview, Vapi rejects the invalid ID and the call ends immediately, sending you straight to the finish screen.

## Quick Fix (2 steps):

### Step 1: Create a Vapi Assistant (5 minutes)
1. Go to https://dashboard.vapi.ai
2. Click "Assistants" → "Create Assistant"
3. Configure:
   - **Name:** "Interview Assistant" (or any name)
   - **Model:** GPT-4 or Claude (your choice)
   - **Voice:** Choose any voice provider (11Labs, PlayHT, etc.)
   - **System Prompt:** Copy this:
   ```
   You are an AI interviewer conducting a professional interview.
   
   Candidate Name: {{candidateName}}
   Interview Duration: {{interviewDuration}} minutes
   Interview Objective: {{interviewObjective}}
   Questions to ask: {{interviewQuestions}}
   Job Context: {{jobContext}}
   Practice Mode: {{isPractice}}
   
   Instructions:
   1. Greet the candidate warmly
   2. Ask questions one at a time naturally
   3. Listen to their responses
   4. Ask follow-up questions
   5. Keep track of time
   6. Be professional and encouraging
   ```
4. **Save** and copy the **Assistant ID** (looks like: `asst_abc123...`)

### Step 2: Update Your Database
Run this SQL query in your database (replace `YOUR_VAPI_ASSISTANT_ID` with the ID from Step 1):

```sql
-- Update ALL interviewers with the new Vapi assistant ID
UPDATE interviewer 
SET agent_id = 'YOUR_VAPI_ASSISTANT_ID';

-- Or update a specific interviewer:
UPDATE interviewer 
SET agent_id = 'YOUR_VAPI_ASSISTANT_ID'
WHERE name = 'Your Interviewer Name';
```

### Step 3: Test
1. Refresh your browser (Cmd+Shift+R)
2. Try starting an interview
3. It should now work! 🎉

---

## Example:
If your Vapi assistant ID is `asst_8kJ9mN3pQ2rT5vW7x`:

```sql
UPDATE interviewer 
SET agent_id = 'asst_8kJ9mN3pQ2rT5vW7x';
```

---

## Why This Happened:
The old database had Retell agent IDs (format: `agent_xxxxx`). Vapi uses different assistant IDs (format: `asst_xxxxx` or similar). The migration updated the code but couldn't automatically update your database IDs since only you have access to create new Vapi assistants.

---

## Check Current Database Values:
```sql
-- See what's currently in the database
SELECT id, name, agent_id FROM interviewer;
```

If you see agent IDs starting with old Retell formats, they need to be updated!

