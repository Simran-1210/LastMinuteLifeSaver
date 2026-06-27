import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  const { accessToken } = await req.json();

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth });

    // Search for deadline-related emails
    const response = await gmail.users.messages.list({
      userId: "me",
      q: "subject:(deadline OR due OR submit OR urgent OR reminder) newer_than:7d",
      maxResults: 10,
    });

    const messages = response.data.messages || [];
    const deadlines = [];

    for (const msg of messages.slice(0, 5)) {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });

      const headers = detail.data.payload?.headers || [];
      const subject = headers.find(h => h.name === "Subject")?.value || "";
      const from = headers.find(h => h.name === "From")?.value || "";
      const date = headers.find(h => h.name === "Date")?.value || "";

      deadlines.push({ subject, from, date, id: msg.id });
    }

    return NextResponse.json({ deadlines });
  } catch (err) {
    console.error("Gmail error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}