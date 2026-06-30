import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  const { emails } = await req.json();

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const currentDate = new Date().toISOString();

    const prompt = `You are a deadline extraction assistant. Today's date is ${currentDate}.

For each email below, find the actual deadline date mentioned in the subject or body text. If a specific date/time is mentioned (e.g. "June 30th", "tomorrow", "by Friday", "extended to July 5"), calculate the exact ISO datetime. If no specific deadline is found in the text, use null.

Emails:
${JSON.stringify(emails.map((e: { subject: string; bodySnippet: string; id: string }) => ({
  id: e.id,
  subject: e.subject,
  body: e.bodySnippet
})))}

Return ONLY a JSON array with this exact format, no markdown, no backticks:
[{"id": "email_id", "extractedDeadline": "2026-06-30T23:59:00.000Z" or null, "confidence": "high" or "low"}]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);

  } catch (err) {
    console.error("Deadline extraction error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}