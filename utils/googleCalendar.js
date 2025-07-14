const { google } = require("googleapis");
const { connectToDatabase } = require("../database");

async function createCalendarEvent(uid, eventDetails) {
  const db = await connectToDatabase();
  const tokens = await db.collection("googleTokens").findOne({ uid });

  if (!tokens || !tokens.refresh_token) {
    throw new Error("No Google tokens found for user.");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: tokens.refresh_token,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: eventDetails.summary,
      description: eventDetails.description,
      location: eventDetails.location,
      start: {
        dateTime: new Date(eventDetails.start).toISOString(),
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: new Date(eventDetails.end).toISOString(),
        timeZone: "Asia/Kolkata",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 * 24 * 2 }, // 2 days before
          { method: "popup", minutes: 60 },          // 1 hour before
        ],
      },
    },
  });

  return response.data;
}

module.exports = { createCalendarEvent };