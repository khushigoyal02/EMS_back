const admin = require("firebase-admin");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require("./serviceAccountKey.json"); // fallback for local dev
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
