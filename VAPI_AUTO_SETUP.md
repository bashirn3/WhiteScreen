# 🚀 Automatic Vapi Assistant Setup

## Quick Setup (2 minutes)

### Step 1: Create the Vapi Assistant
Call this API endpoint (with your dev server running):

```bash
curl -X POST http://localhost:3000/api/create-vapi-assistant
```

**Response will look like:**
```json
{
  "success": true,
  "assistant_id": "asst_xxxxxxxxxxxxxxx",
  "message": "Created Vapi assistant: asst_xxxxxxxxxxxxxxx",
  "sql_command": "UPDATE interviewer SET agent_id = 'asst_xxxxxxxxxxxxxxx';"
}
```

### Step 2: Copy the SQL command from the response and run it in your database

**That's it!** 🎉

---

## What This Does:

1. ✅ Creates ONE base Vapi assistant that works for ALL interviews
2. ✅ Uses your original Japanese interview prompt
3. ✅ Configured with GPT-4 and 11Labs voice
4. ✅ Passes interview-specific data (questions, job context) as variables at runtime
5. ✅ Just like Retell did!

---

## How It Works:

**Before (Retell):**
- Base agent with template prompt
- Dynamic variables passed at call time: `{{name}}`, `{{questions}}`, `{{job_context}}`

**After (Vapi):**
- Base assistant with template prompt  
- Dynamic variables passed at call time: `{{candidateName}}`, `{{interviewQuestions}}`, `{{jobContext}}`
- **Same concept, different provider!**

---

## Variables Passed to Assistant:

Every interview call automatically passes:
- `candidateName` - User's name
- `interviewDuration` - Minutes (e.g., "10")
- `interviewObjective` - Interview goals
- `interviewQuestions` - All questions formatted with follow-up counts
- `jobContext` - Job description/context
- `isPractice` - "true" or "false"

The assistant uses these to customize each interview!

---

## Alternative: Browser Method

If curl doesn't work, open your browser and visit:
```
http://localhost:3000/api/create-vapi-assistant
```

(Make sure you're making a POST request - you can use Postman, Thunder Client, or any REST client)

---

## Voice Options

The default uses 11Labs "Rachel" voice. To change:

Edit `/src/app/api/create-vapi-assistant/route.ts` line 92:
```typescript
voice: {
  provider: "11labs",
  voiceId: "YOUR_VOICE_ID_HERE", // Find voice IDs at labs.play.ht or elevenlabs.io
},
```

Popular voices:
- `21m00Tcm4TlvDq8ikWAM` - Rachel (Female, English)
- `pNInz6obpgDQGcFmaJgB` - Adam (Male, English)
- For Japanese voices, use PlayHT or Azure TTS providers

---

## Troubleshooting

**"Failed to create assistant"?**
- Check your `VAPI_PRIVATE_API_KEY` in `.env.local`
- Make sure it's the PRIVATE key (not public)
- Verify your Vapi account has credits

**"Cannot POST to /api/create-vapi-assistant"?**
- Make sure dev server is running: `npm run dev`
- Wait for compilation to finish
- Try refreshing the endpoint

---

## After Setup

Once you run the SQL command to update your database:
1. Refresh your browser
2. Try starting an interview
3. It should work! 🎊

The assistant will now handle ALL your interviews with their specific questions and job contexts automatically injected!

