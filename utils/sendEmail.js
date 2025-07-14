/*const nodemailer = require("nodemailer");
const baseUrl=process.env.REACT_APP_BASE_URL;

const transporter = nodemailer.createTransport({
  service: "Gmail", // or another SMTP provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendInvitationEmail = async (to, guestName, event, host) => {
  // RSVP URLs
  const encoded = Buffer.from(to).toString('base64');

  const rsvpAcceptUrl  = `${baseUrl}/event/rsvp/${event._id}/${encoded}/accept`;
  const rsvpDeclineUrl = `${baseUrl}/event/rsvp/${event._id}/${encoded}/decline`;

  // Google Maps link for the venue
  const locationLink = `https://www.google.com/maps?q=${encodeURIComponent(event.location)}`;

  // Format helpers
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year:    "numeric",
      month:   "long",
      day:     "numeric",
    });
  }

  function formatTime(timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = ((h + 11) % 12 + 1);
    return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
  }

  // Date/time display
  const isSingleDay = new Date(event.startDate).toDateString() === new Date(event.endDate).toDateString();
  const dateTimeDisplay = isSingleDay
    ? `📅 ${formatDate(event.startDate)}<br>🕕 ${formatTime(event.startTime)} – ${formatTime(event.endTime)}`
    : `📅 ${formatDate(event.startDate)} – ${formatDate(event.endDate)}`;

  // RSVP deadline: 2 days before startDate
  const deadline = new Date(event.startDate);
  deadline.setDate(deadline.getDate() - 2);
  const rsvpDeadlineStr = deadline.toLocaleDateString("en-US", {
    year:  "numeric",
    month: "long",
    day:   "numeric",
  });

  // Always include both buttons; expiration will be enforced in the RSVP endpoint
  const rsvpButtonsHtml = `
    <div style="display: flex; justify-content: center; gap: 15px; margin-top: 20px;">
      <a href="${rsvpAcceptUrl}"  style="background: #4A5759; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-right: 10px;">
        Accept
      </a>
      <a href="${rsvpDeclineUrl}" style="background: #EDAFB8; color: #4A5759; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Decline
      </a>
    </div>
  `;

  const mailOptions = {
    from: `"Plannova Events" <${process.env.EMAIL_USER}>`,
    to,
    subject: `You're Invited to ${event.name}!`,
    html: `
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
              (On behalf of ${host})
            </p>
          </div>
          <div style="background-color: #DEDBD2; text-align: center; padding: 15px; font-size: 14px; color: #555;">
            Plannova · Your Event. Your Way.
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendInvitationEmail;*/

const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Sends an HTML-only email.
 * 
 * @param {string} to - Recipient email address.
 * @param {string} subject - Subject of the email.
 * @param {string} html - HTML content of the message.
 */
async function sendEmail(to, subject, html) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendEmail;
