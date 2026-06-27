import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  const { tasks } = await req.json();

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a productivity expert. Analyze these tasks and return a JSON array.

Tasks: ${JSON.stringify(tasks)}

For each task return exactly:
- id (same as input)
- priority: one of "urgent" or "high" or "medium" or "low"
- reason: one sentence why
- suggestedTime: best time e.g. "Morning 9-10am"

Return ONLY a JSON array. No markdown. No backticks. Just the array.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);

  } catch (err: unknown) {
    const message = String(err);
    
    // If quota exceeded, return smart mock response
    if (message.includes("429") || message.includes("quota")) {
      const mockPrioritized = tasks.map((task: {id: string, title: string, deadline: string}) => {
        const hoursUntilDeadline = (new Date(task.deadline).getTime() - Date.now()) / 3600000;
        let priority: string;
        if (hoursUntilDeadline < 2) priority = "urgent";
        else if (hoursUntilDeadline < 24) priority = "high";
        else if (hoursUntilDeadline < 72) priority = "medium";
        else priority = "low";

        return {
          id: task.id,
          priority,
          reason: `Deadline is ${Math.round(hoursUntilDeadline)} hours away.`,
          suggestedTime: hoursUntilDeadline < 24 ? "As soon as possible" : "Morning 9-11am"
        };
      });
      return NextResponse.json(mockPrioritized);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}