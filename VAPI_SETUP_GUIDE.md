# Vapi Setup Guide

## Quick Start

### 1. Environment Setup

Add these to your `.env.local` file:
```bash
VAPI_PRIVATE_API_KEY=f5a1ec6a-b7f6-4350-bb17-b0362bd5c8e2
VAPI_PUBLIC_API_KEY=44f6b825-6c3d-488a-aca3-d3bef0a2a3a7
```

### 2. Create Vapi Assistants

#### Step 1: Access Vapi Dashboard
1. Go to https://dashboard.vapi.ai
2. Log in with your credentials
3. Navigate to "Assistants" section

#### Step 2: Create an Assistant
Click "Create Assistant" and configure:

**Basic Settings:**
- **Name:** e.g., "Senior Software Engineer Interviewer"
- **Description:** e.g., "AI interviewer for technical positions"

**Voice Settings:**
- **Provider:** Choose from (11Labs, PlayHT, Azure, etc.)
- **Voice ID:** Select a voice that matches your interviewer personality
- **Speed:** Adjust speaking speed (0.8 - 1.2 recommended)
- **Stability:** Control voice consistency

**Model Settings:**
- **Provider:** OpenAI, Anthropic, etc.
- **Model:** gpt-4, claude-3-sonnet, etc.
- **Temperature:** 0.7-0.9 for conversational interviews

**System Prompt Template:**
```
You are {{candidateName}}'s interviewer for a {{interviewObjective}} position. 

Interview Context:
- Duration: {{interviewDuration}} minutes
- Job Context: {{jobContext}}
- Questions to cover: {{interviewQuestions}}
- Practice Mode: {{isPractice}}

Instructions:
1. Greet the candidate warmly
2. Ask questions naturally, one at a time
3. Listen carefully to responses
4. Ask follow-up questions based on answers
5. Keep track of time ({{interviewDuration}} minutes total)
6. If isPractice is "true", remind them this is a practice session
7. Be encouraging and professional

Begin by introducing yourself and asking the first question.
```

**Variable Configuration:**
Add these variables in the assistant settings:
- `candidateName` (string) - Default: "Candidate"
- `interviewDuration` (string) - Default: "10"
- `interviewObjective` (string) - Default: "General interview"
- `interviewQuestions` (string) - Default: ""
- `jobContext` (string) - Default: "No specific context"
- `isPractice` (string) - Default: "false"

**Advanced Settings:**
- **First Message:** "Hello {{candidateName}}, thank you for joining. I'm ready to begin your interview."
- **End Call Message:** "Thank you for your time today. This concludes our interview."
- **Max Duration:** Set to your longest interview duration + buffer (e.g., 35 minutes)
- **Background Sound:** None or subtle office ambience
- **Interruption Sensitivity:** Medium (allows natural conversation flow)

#### Step 3: Save and Get Assistant ID
1. Click "Save" or "Create"
2. Copy the Assistant ID (looks like: `asst_abc123def456`)
3. This ID will be stored in your database's `interviewer.agent_id` field

### 3. Update Database

For each interviewer in your database, update the `agent_id` field with the corresponding Vapi assistant ID:

```sql
-- Example update
UPDATE interviewer 
SET agent_id = 'asst_abc123def456'
WHERE name = 'Senior Software Engineer Interviewer';
```

### 4. Test Your Setup

#### Test Practice Mode:
1. Navigate to an interview page
2. Grant microphone permissions
3. Click "Start Practice"
4. Verify:
   - Call starts
   - You can hear the assistant
   - Mute/unmute works
   - Transcripts appear in real-time
   - Practice timer counts down from 2 minutes
   - Call ends automatically after 2 minutes

#### Test Real Interview:
1. Enter email and name (or sign in with LinkedIn)
2. Optionally upload a CV (PDF)
3. Click "Start Interview"
4. Verify:
   - Call starts
   - Interview progresses naturally
   - Transcripts update
   - Tab switching is detected and counted
   - Duration timer displays correctly
   - Call can be ended manually
   - Response is saved to database
   - Feedback form appears after call ends

### 5. Create Multiple Interviewers

You can create different assistants for different roles:

**Example Interviewers:**

1. **Technical Interviewer**
   - Focus: Coding, algorithms, system design
   - Tone: Professional, technical
   - Questions: Technical depth

2. **Behavioral Interviewer**
   - Focus: Past experiences, soft skills
   - Tone: Friendly, empathetic
   - Questions: STAR method questions

3. **Culture Fit Interviewer**
   - Focus: Values, team dynamics
   - Tone: Conversational, warm
   - Questions: Culture and values alignment

### 6. Advanced Configuration

#### Custom Transcription Settings:
```json
{
  "provider": "deepgram",
  "model": "nova-2",
  "language": "en"
}
```

#### Function Calling (Optional):
You can add functions for the assistant to call during interviews:
- Save notes
- Look up information
- Schedule follow-ups

#### Webhook Configuration:
Set up webhooks in Vapi dashboard to:
- Track call analytics
- Store conversation logs
- Trigger post-interview workflows

## Common Issues and Solutions

### Issue: Assistant doesn't respond
**Solution:** 
- Check system prompt is not empty
- Verify model provider credentials
- Ensure assistant is not in "testing" mode

### Issue: Voice sounds robotic
**Solution:**
- Adjust voice speed (try 0.9-1.0)
- Increase stability setting
- Try different voice provider
- Use premium voices

### Issue: Interview ends too quickly
**Solution:**
- Check max duration setting
- Verify interview duration variable is passed correctly
- Ensure no timeout configurations conflict

### Issue: Transcripts are delayed
**Solution:**
- Use "nova-2" transcription model
- Check network connectivity
- Verify message event listeners are set up correctly

### Issue: Variables not working
**Solution:**
- Double-check variable names match exactly (case-sensitive)
- Ensure variables are defined in assistant settings
- Verify assistant overrides are passed correctly in API call

## Best Practices

1. **Test Extensively:** Always test in practice mode first
2. **Monitor Usage:** Keep track of Vapi usage and costs
3. **Update Prompts:** Refine prompts based on interview quality
4. **Backup Assistants:** Keep backup configurations
5. **Version Control:** Document assistant changes
6. **User Feedback:** Collect and act on candidate feedback

## Resources

- **Vapi Docs:** https://docs.vapi.ai
- **API Reference:** https://docs.vapi.ai/api-reference
- **Community:** https://discord.gg/vapi
- **Status Page:** https://status.vapi.ai

## Need Help?

If you encounter issues:
1. Check the Vapi dashboard for error logs
2. Review browser console for client-side errors
3. Check server logs for backend issues
4. Reach out to Vapi support with:
   - Assistant ID
   - Call ID (if applicable)
   - Error messages
   - Steps to reproduce

## Migration Complete! 🎉

You're now ready to conduct AI-powered interviews with Vapi. Happy interviewing!

