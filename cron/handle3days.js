// cron/handleThreeDaysBefore.js
const cron = require('node-cron');
const { connectToDatabase } = require('../database');
const sendEmail = require('../utils/sendEmail');

// '0 9 * * *'
cron.schedule('0 9 * * *', async () => {
  const db = connectToDatabase();
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 3);
  targetDate.setHours(0, 0, 0, 0);

  const events = await db.collection('events').find({ date: targetDate }).toArray();

  for (const event of events) {
    const eventId = event._id;

    // Cancel pending or partially-confirmed events
    if (['Pending', 'Partially-confirmed'].includes(event.status)) {
      await db.collection('events').updateOne(
        { _id: eventId },
        { $set: { status: 'Cancelled' } }
      );
    }

    // Send invites for confirmed events
    else if (event.status === 'confirmed') {
      const guestListDoc = await db.collection('guestLists').findOne({ eventId: eventId });

      /*if (guestListDoc && Array.isArray(guestListDoc.guests)) {
        for (const guest of guestListDoc.guests) {
          await sendEmail(
            guest.email,
            `🎉 You're Invited to ${event.name}`,
            `Hello ${guest.name},\n\nYou're invited to "${event.name}" on ${event.date.toDateString()} at ${event.location}.\n\nWe look forward to seeing you!`
          );
        }
      }*/

        if (guestListDoc && Array.isArray(guestListDoc.guests)) {
  for (const guest of guestListDoc.guests) {
    const guestName = guest.name;
    const locationLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
    const rsvpDeadlineStr = "October 1, 2025"; // Optional: replace with dynamic date
    const dateTimeDisplay = `📅 ${new Date(event.date).toDateString()}`;
    const rsvpButtonsHtml = `
      <div style="margin-top: 20px;">
        <a href="https://yourdomain.com/rsvp/yes" style="padding: 10px 20px; background: #B0C4B1; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;">Accept</a>
        <a href="https://yourdomain.com/rsvp/no" style="padding: 10px 20px; background: #EDAFB8; color: white; text-decoration: none; border-radius: 5px;">Decline</a>
      </div>`;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', sans-serif; background: #F7E1D7; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); overflow: hidden;">
          <div style="background-color: #EDAFB8; padding: 20px 30px; color: #fff; text-align: center;">
            <h2 style="margin: 0;">You're Invited!</h2>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 18px;">Dear <strong>${guestName}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6;">
              We are delighted to invite you to <strong>${event.name}</strong> — ${event.description}.
            </p>
            <div style="margin: 25px 0;">
              <p style="font-size: 16px; margin: 6px 0;">${dateTimeDisplay}</p>
              <p style="font-size: 16px; margin: 6px 0;">📍 <strong>Venue:</strong> ${event.location}</p>
              <p style="font-size: 16px; margin: 6px 0;">
                🔗 <a href="${locationLink}" target="_blank" style="color: #4A5759; text-decoration: underline;">
                  View Location on Google Maps
                </a>
              </p>
            </div>
            <p style="font-size: 16px; margin-top: 20px;">
              Kindly RSVP by <strong>${rsvpDeadlineStr}</strong> by clicking one of the options below:
            </p>
            ${rsvpButtonsHtml}
            <p style="font-size: 16px; margin-top: 30px;">
              We look forward to celebrating with you!
            </p>
            <p style="font-size: 15px; color: #333;">
              Warm regards,<br/>
              Plannova Events<br/>
              (On behalf of ${event.organizerName || 'Your Host'})
            </p>
          </div>
          <div style="background-color: #DEDBD2; text-align: center; padding: 15px; font-size: 14px; color: #555;">
            Plannova · Your Event. Your Way.
          </div>
        </div>
      </div>
    `;

    await sendEmail(
      guest.email,
      `You're Invited to ${event.name}!`,
      htmlContent
    );
  }
}

    }
  }

  console.log('✅ 3-day check complete');
});
