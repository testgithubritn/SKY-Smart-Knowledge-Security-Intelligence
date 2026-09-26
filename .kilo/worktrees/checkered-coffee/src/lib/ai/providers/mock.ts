/**
 * Mock provider — returns realistic sample AI responses when all 3
 * real providers (Groq, OpenAI, Gemini) fail. This lets the app work
 * in demo mode without valid API keys.
 *
 * Mock responses are clearly labeled as "Demo Mode" so users know
 * the analysis isn't from a real AI model.
 */

const MOCK_IMAGE_RESPONSE = {
  categories: ["unauthorized-entry", "fraud"],
  riskLevel: "moderate",
  confidence: 0.72,
  explanation:
    "Demo Mode: Image shows a person near an access panel with suspicious hardware overlay visible. Potential card-skimming device detected near the input slot. Pattern matches known fraud indicators. (This is a mock response — set valid API keys in .env for real AI analysis.)",
};

const MOCK_VIDEO_RESPONSE = {
  categories: ["theft"],
  riskLevel: "high",
  confidence: 0.81,
  explanation:
    "Demo Mode: Video shows rapid motion pattern consistent with snatch-theft. Subject approaches at high velocity, grabbing motion detected, immediate departure. Pattern matches KB snatch-theft playbook. (This is a mock response — set valid API keys in .env for real AI analysis.)",
};

const MOCK_AUDIO_RESPONSE = (transcript: string) => {
  const lowerTranscript = transcript.toLowerCase();
  let categories: string[] = [];
  let riskLevel = "low";
  let confidence = 0.1;
  let explanation =
    "Demo Mode: No suspicious content detected in the transcript. (This is a mock response — set valid API keys in .env for real AI analysis.)";
  let subjects: Array<{
    claimedName: string;
    claimedRole: string;
    isImpersonated: boolean;
    notes: string;
  }> = [];

  if (
    lowerTranscript.includes("otp") ||
    lowerTranscript.includes("upi") ||
    lowerTranscript.includes("transfer")
  ) {
    categories = ["payment-fraud", "impersonation", "information-exfiltration"];
    riskLevel = "critical";
    confidence = 0.92;
    explanation =
      "Demo Mode: Caller demands OTP/UPI transfer under urgency pretext. Classic authority-impersonation payment-fraud pattern. Multiple KB cues matched: urgency, OTP request, 'do not disconnect'. (This is a mock response — set valid API keys in .env for real AI analysis.)";
    // Try to extract a name from the transcript — skip common titles
    const nameMatch = transcript.match(
      /(?:this is|I am|my name is)\s+(?:Sub-Inspector|SI|Inspector|Officer|Mr\.?|Mrs\.?|Ms\.?|Shri|Smt\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/
    );
    const fallbackNameMatch = transcript.match(
      /(?:this is|I am|my name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/
    );
    const extractedName = nameMatch?.[1] || fallbackNameMatch?.[1] || "Unknown Caller";
    const roleNameMatch = transcript.match(
      /(?:from|of)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Cyber|Police|Crime|Branch|Station|Office|Department|customer|support)/
    );
    subjects = [
      {
        claimedName: extractedName,
        claimedRole: roleNameMatch ? roleNameMatch[1].toLowerCase() + "-officer" : "unknown",
        isImpersonated: true,
        notes: "Demo Mode: Subject identified from transcript pattern.",
      },
    ];
  } else if (
    lowerTranscript.includes("refund") ||
    lowerTranscript.includes("amazon") ||
    lowerTranscript.includes("customer service")
  ) {
    categories = ["scam", "fraud"];
    riskLevel = "high";
    confidence = 0.85;
    explanation =
      "Demo Mode: Caller impersonates e-commerce support offering fake refund. Requests screen-sharing app installation. Pattern matches KB refund-scam playbook. (This is a mock response — set valid API keys in .env for real AI analysis.)";
    subjects = [
      {
        claimedName: "Unknown Support Agent",
        claimedRole: "ecommerce-support",
        isImpersonated: true,
        notes: "Demo Mode: Refund-scam pattern detected.",
      },
    ];
  } else if (
    lowerTranscript.includes("accident") ||
    lowerTranscript.includes("police") ||
    lowerTranscript.includes("money")
  ) {
    categories = ["impersonation", "fraud"];
    riskLevel = "high";
    confidence = 0.78;
    explanation =
      "Demo Mode: Caller claims emergency situation requiring immediate money transfer. Possible voice-clone or family impersonation. Pattern matches KB ransom/distress scam. (This is a mock response — set valid API keys in .env for real AI analysis.)";
    subjects = [
      {
        claimedName: "Unknown Caller",
        claimedRole: "family-member",
        isImpersonated: true,
        notes: "Demo Mode: Distress/ransom pattern detected.",
      },
    ];
  }

  return JSON.stringify({
    categories,
    riskLevel,
    confidence,
    explanation,
    subjects,
  });
};

const MOCK_CHAT_RESPONSE = (userPrompt: string) => {
  // Check if this is an audio classification prompt (contains "Transcript:")
  if (userPrompt.includes("Transcript:")) {
    const match = userPrompt.match(/Transcript:\s*"""([\s\S]+?)"""/);
    const transcript = match ? match[1] : "";
    return MOCK_AUDIO_RESPONSE(transcript);
  }
  // Default mock LLM response
  return JSON.stringify({
    title: "SKY Demo Report",
    summary:
      "Demo Mode: This is a mock report generated without real AI. Set valid API keys for real analysis.",
    fullReport:
      "## Background\n\nDemo Mode report. This report was generated without a real AI provider.\n\n## Findings\n\nNo real findings — this is a mock response.\n\n## Next Steps\n\nSet GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in .env for real AI analysis.",
    recommendations: [
      "Set valid API keys in .env",
      "Restart the dev server",
      "Visit /api/sky/test-providers to verify keys",
    ],
    riskProfile: "moderate",
  });
};

export async function mockAnalyzeImage(
  _imageDataUrl: string,
  _prompt: string
): Promise<string> {
  return JSON.stringify(MOCK_IMAGE_RESPONSE);
}

export async function mockAnalyzeVideo(
  _videoDataUrl: string,
  _prompt: string
): Promise<string> {
  return JSON.stringify(MOCK_VIDEO_RESPONSE);
}

export async function mockTranscribe(
  _audioBase64OrDataUrl: string
): Promise<string> {
  return "Demo Mode: Audio transcription unavailable without valid API keys. Use the sample transcript mode instead.";
}

export async function mockChat(
  _systemPrompt: string,
  userPrompt: string
): Promise<string> {
  return MOCK_CHAT_RESPONSE(userPrompt);
}
