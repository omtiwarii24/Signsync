import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { words } = await req.json();
    console.log(`\n📝 [API/SMOOTH] Received words to process: [${words.join(", ")}]`);

    if (!words || words.length === 0) {
      console.log("⚠️ [API/SMOOTH] No words received. Aborting.");
      return NextResponse.json({ sentence: "" });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("❌ [API/SMOOTH] ERROR: GROQ_API_KEY is missing from your .env.local file!");
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    // STRICT PROMPT: Forces merging and prevents word repetition
    const prompt = `Merge these sign language keywords into ONE complete, natural, and polite spoken English sentence: ${words.join(", ")}.
        
STRICT RULES:
1. Do NOT just repeat the keywords. 
2. Do NOT use a list format or bullet points.
3. Add conversational words to make it sound human (e.g., "I want to say", "It is", "very much").
4. If you see "HELLO" and "THANK YOU", a perfect response is: "Hello there, I just wanted to say thank you so much."
5. Return ONLY the final sentence. No extra text or explanations.`;

    console.log("🚀 [API/SMOOTH] Sending request to Groq LLM...");
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7, 
      })
    });

    const data = await response.json();
    
    // Check if the API request itself failed (e.g., bad key, rate limit)
    if (!response.ok || data.error) {
      console.error("❌ [API/SMOOTH] Groq API Error Rejected the Request:");
      console.error(data.error || data);
      
      const fallbackSentence = `I saw you sign: ${words.join(" and ")}.`;
      return NextResponse.json({ sentence: fallbackSentence });
    }

    let sentence = data.choices[0].message.content.trim();
    sentence = sentence.replace(/[\*\"\'\n]/g, ""); 
    
    console.log(`✅ [API/SMOOTH] Success! Generated sentence: "${sentence}"\n`);
    
    return NextResponse.json({ sentence });
    
  } catch (error) {
    console.error("❌ [API/SMOOTH] Fatal error executing route:", error);
    return NextResponse.json({ error: "Failed to smooth text" }, { status: 500 });
  }
}