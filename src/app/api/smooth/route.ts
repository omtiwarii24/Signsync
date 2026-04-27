import { NextResponse } from "next/server";
import Groq from "groq-sdk";

// Initialize Groq securely using the environment variable you added to Vercel
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { words } = body;

    if (!words || words.length === 0) {
      return NextResponse.json({ sentence: "" });
    }

    // Command the AI to format the sentence perfectly
    const prompt = `You are a sign language translator. Convert the following sequence of raw sign language words into a natural, grammatically correct English sentence. ONLY return the final sentence, absolutely no other text, quotes, or explanations. 
    Words: ${words.join(", ")}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192", // Fast and reliable Groq model
      temperature: 0.2,
    });

    const sentence = chatCompletion.choices[0]?.message?.content || "";

    return NextResponse.json({ sentence: sentence.trim() });
    
  } catch (error) {
    console.error("Groq Translation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate sentence" },
      { status: 500 }
    );
  }
}