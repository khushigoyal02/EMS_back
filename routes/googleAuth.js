const express = require("express");
const { google } = require("googleapis");
const dotenv = require("dotenv");
const { connectToDatabase } = require("../database");

dotenv.config();
const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Define scopes for Google Calendar access
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar",
];

// STEP 1: Redirect to Google OAuth
router.get("/google", (req, res) => {
  const uid = req.query.uid; // Get the Firebase UID from the frontend query param
  console.log(uid);
  if (!uid) {
    return res.status(400).json({ message: "Missing UID" });
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // needed for refresh_token
    scope: SCOPES,
    prompt: "consent", // force user to choose account and grant permission
    state: uid, // pass UID securely so we can access it in the callback
  });

  res.redirect(authUrl);
});

// STEP 2: Google redirects back with code
router.get("/google/callback", async (req, res) => {
  const code = req.query.code;
  const uid = req.query.state;

  try {
    // Exchange authorization code for access and refresh tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const db = await connectToDatabase();

    // Save tokens to the DB (upsert: true to insert if not found)
    await db.collection("googleTokens").updateOne(
      { uid },
      {
        $set: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          token_type: tokens.token_type,
          expiry_date: tokens.expiry_date,
        },
      },
      { upsert: true }
    );

    const vendor = await db.collection("venders").findOne({ uid: uid });
    const customer = await db.collection("users").findOne({ uid: uid });
    const admin = await db.collection("admin").findOne({ uid: uid });

    if (vendor) {
      res.redirect("http://localhost:5173/vendor/dashboard?role=vendor");
    } else if (customer) {
      res.redirect("http://localhost:5173/customer/dashboard?role=customer");
    } else if (admin) {
      res.redirect("http://localhost:5173/admin/dashboard?role=admin");
    } else {
      // No matching user found
      res.status(404).send("User not found");
    }
  } catch (err) {
    console.error("OAuth Callback Error:", err);
    res.status(500).send("Failed to connect Google Calendar");
  }
});


module.exports = router;
