// cron/notifyTenDaysBefore.js
const cron = require('node-cron');
const sendEmail = require('../utils/sendEmail');
const { connectToDatabase } = require('../database');

// '0 9 * * *'
cron.schedule('0 9 * * *', async () => {
  const db = connectToDatabase();
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 10);
  targetDate.setHours(0, 0, 0, 0);

  const events = await db.collection('events').find({ date: targetDate }).toArray();

  for (const event of events) {
    const requests = await db.collection('bookingRequests').find({ eventId: event._id }).toArray();

    const statuses = requests.map(r => r.status);
    const allConfirmed = statuses.every(status => status === 'Accepted');
    const hasPendingOrPartial = statuses.some(status =>
      ['Pending', 'Declined', 'Accepted'].includes(status)
    );

    // Send email if any are not confirmed
    /*if (hasPendingOrPartial) {
      const user = await db.collection('users').findOne({ _id: event.customerId });
      await sendEmail(
        user.email,
        'Vendor Booking Pending',
        `Some vendor bookings for your event on ${event.date.toDateString()} are still pending. You have only today to replace them.`
      );
    }*/

      if (hasPendingOrPartial) {
  const user = await db.collection('users').findOne({ _id: event.customerId });

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #F7E1D7; padding: 30px;">
      <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); overflow: hidden;">
        <div style="background-color: #EDAFB8; padding: 20px 30px; color: #fff; text-align: center;">
          <h2 style="margin: 0;">Action Required: Vendor Bookings Pending</h2>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px;">Dear <strong>${user.name || 'Customer'}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.6;">
            Some of the vendors for your event <strong>${event.name}</strong> scheduled on 
            <strong>${new Date(event.date).toDateString()}</strong> are still marked as 
            <span style="color: #EDAFB8;"><strong>Pending</strong></span> or 
            <span style="color: #B0C4B1;"><strong>Partially Confirmed</strong></span>.
          </p>
          <p style="font-size: 16px; margin-top: 15px;">
            You have <strong>only today</strong> left to review or replace the pending vendors to avoid disruptions.
          </p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="https://plannova.com/user/events/${event._id}" target="_blank"
               style="background-color: #4A5759; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px;">
              View My Event
            </a>
          </div>
          <p style="font-size: 15px; color: #555; margin-top: 30px;">
            Thank you for using Plannova. We're here to ensure your event is seamless.
          </p>
        </div>
        <div style="background-color: #DEDBD2; text-align: center; padding: 15px; font-size: 14px; color: #555;">
          Plannova · Your Event. Your Way.
        </div>
      </div>
    </div>
  `;

  await sendEmail(
    user.email,
    '⚠️ Vendor Booking Pending for Your Event',
    html
  );
}


    // Update event status
    let newStatus = event.status;
    if (allConfirmed) {
      newStatus = 'Confirmed';
    } else if (hasPendingOrPartial) {
      newStatus = 'Partially-confirmed';
    }

    if (newStatus !== event.status) {
      await db.collection('events').updateOne(
        { _id: event._id },
        { $set: { status: newStatus } }
      );
    }
  }

  console.log('🔔 10-day bookingRequests notification complete');
});
