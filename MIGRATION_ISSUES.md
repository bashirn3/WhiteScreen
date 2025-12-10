# 🚨 RETELL → VAPI MIGRATION ISSUES

## Original Retell Configuration (Commit 9efaa50)

### Model Configuration:
```typescript
const newModel = await retellClient.llm.create({
  model: "gpt-4o",
  general_prompt: RETELL_AGENT_GENERAL_PROMPT,
  general_tools: [
    {
      type: "end_call",
      name: "end_call_1",
      description: "End the call if the user uses goodbye phrases such as 'bye,' 'goodbye,' or 'have a nice day.' "
    }
  ],
});
```
**KEY POINTS:**
- Model: `gpt-4o` ✅
- **NO temperature specified** (defaults to 1.0) ❌
- Prompt: SAME as current

### Agent Configuration:
```typescript
const newFirstAgent = await retellClient.agent.create({
  response_engine: { llm_id: newModel.llm_id, type: "retell-llm" },
  responsiveness: 0.4,  // ❌ MISSING IN VAPI
  voice_id: "11labs-Chloe",  // ❌ CHANGED TO "21m00Tcm4TlvDq8ikWAM"
  enable_backchannel: false,  // ❌ MISSING IN VAPI
  agent_name: "Lisa",
});
```

### Transcript Handling (Original):
```typescript
webClient.on("update", (update) => {
  if (update.transcript) {
    const transcripts: transcriptType[] = update.transcript;
    const roleContents: { [key: string]: string } = {};

    transcripts.forEach((transcript) => {
      roleContents[transcript?.role] = transcript?.content;
    });

    setLastInterviewerResponse(roleContents["agent"]);
    setLastUserResponse(roleContents["user"]);
  }
});
```

**KEY BEHAVIOR:**
- Event: `"update"` (not "message")
- Gets FULL transcript array
- Extracts LATEST content for each role
- **REPLACES** previous turn with new complete turn
- Shows ONE complete turn at a time per role

---

## What I Changed (MISTAKES)

### 1. ❌ Added Temperature: 0.7
- **Original:** No temperature (defaults to 1.0)
- **Current:** `temperature: 0.7`
- **Impact:** Less creative, more predictable responses

### 2. ❌ Changed Voice IDs
- **Original:** `"11labs-Chloe"` and `"11labs-Brian"`
- **Current:** `"21m00Tcm4TlvDq8ikWAM"` and `"ErXwobaYiN019PkySvjV"`
- **Impact:** Different voice, different sound

### 3. ❌ Added firstMessage
- **Original:** No firstMessage property
- **Current:** Added explicit firstMessage
- **Impact:** Might interfere with prompt behavior

### 4. ❌ Missing responsiveness
- **Original:** `responsiveness: 0.4`
- **Current:** Not included
- **Impact:** AI response timing is different

### 5. ❌ Missing enable_backchannel
- **Original:** `enable_backchannel: false`
- **Current:** Not included
- **Impact:** Might have unwanted backchanneling

### 6. ❌ Wrong Transcript Handling
- **Original:** Used `"update"` event, got full transcript, replaced each turn
- **Current:** Using `"message"` event, accumulating word-by-word
- **Impact:** Words disappearing, not showing full turns

### 7. ❌ Different Event Names
- **Original:** `"call_started"`, `"call_ended"`, `"agent_start_talking"`, `"agent_stop_talking"`, `"update"`
- **Current:** `"call-start"`, `"call-end"`, `"speech-start"`, `"speech-end"`, `"message"`
- **Impact:** Events might not fire the same way

### 8. ❌ Started Muted
- **Original:** `webClient.mute()` (method call)
- **Current:** `vapiClient.setMuted(true)` (same behavior)
- **Impact:** Same - starts muted (might cause "not responding" issue)

---

## Fixes Needed

1. ✅ Remove temperature (or set to 1.0 to match default)
2. ✅ Change voice IDs back to `"11labs-Chloe"` and `"11labs-Brian"`
3. ✅ Remove firstMessage
4. ✅ Add responsiveness equivalent for Vapi
5. ✅ Add backchannel setting for Vapi
6. ✅ Fix transcript handling to show complete turns
7. ✅ Add error handling to get-call
8. ✅ Consider starting unmuted or with clear UI indication

