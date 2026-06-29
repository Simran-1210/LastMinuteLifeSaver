import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  const { tasks, accessToken } = await req.json();
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth });
    const results = [];

    for (const task of tasks) {
      const deadlineDate = new Date(task.deadline);
      const endTime = new Date(deadlineDate.getTime() + 60 * 60 * 1000); // ✅ CHANGED: +1hr instead of -1hr

      const event = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: task.title,
          description: `Priority: ${task.priority}\n${task.reason || ""}`,
          start: { 
            dateTime: deadlineDate.toISOString(), // ✅ CHANGED: was startTime, now deadlineDate
            timeZone: "Asia/Kolkata"
          },
          end: { 
            dateTime: endTime.toISOString(),      // ✅ CHANGED: was deadlineDate, now endTime
            timeZone: "Asia/Kolkata"
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: "popup", minutes: 60 },
              { method: "popup", minutes: 10 },
            ],
          },
          colorId: task.priority === "urgent" ? "11" :
                   task.priority === "high" ? "6" :
                   task.priority === "medium" ? "5" : "2",
        },
      });
      results.push(event.data);
    }

    return NextResponse.json({ success: true, events: results });
  } catch (err) {
    console.error("Calendar error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}