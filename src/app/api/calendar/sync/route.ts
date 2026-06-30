import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  const { tasks, accessToken } = await req.json();

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth });

    const results = [];
    const skipped = [];

    for (const task of tasks) {
      // Skip if already synced to calendar
      if (task.calendarEventId) {
        skipped.push(task.id);
        continue;
      }

      const deadlineDate = new Date(task.deadline);
      const startTime = new Date(deadlineDate.getTime() - 60 * 60 * 1000);

      const event = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: task.title,
          description: `Priority: ${task.priority}\n${task.reason || ""}\nCreated by Last-Minute Life Saver`,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: "Asia/Kolkata"
          },
          end: {
            dateTime: deadlineDate.toISOString(),
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
      results.push({ taskId: task.id, eventId: event.data.id });
    }

    return NextResponse.json({ 
      success: true, 
      events: results,
      skipped: skipped.length
    });
  } catch (err) {
    console.error("Calendar error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}