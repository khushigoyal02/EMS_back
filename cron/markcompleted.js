// cron/markCompletedEvents.js
const cron = require('node-cron');
const { connectToDatabase } = require('../database');

// '0 1 * * *'
cron.schedule('0 1 * * *', async () => {
  const db = connectToDatabase();
  const now = new Date();

  const result = await db.collection('events').updateMany(
    { endDate: { $lt: now }, status: 'Confirmed' },
    { $set: { status: 'Completed' } }
  );

  console.log(`✅ ${result.modifiedCount} events marked as completed`);
});