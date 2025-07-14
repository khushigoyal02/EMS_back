const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventcontroller");
const verifyToken=require("../middleware/authMiddleware")

router
  .get("/getAllEvents", eventController.getAllEvents)
  .get("/getUserEvents", verifyToken, eventController.getUserEvents)
  .post("/createEvent", verifyToken, eventController.createEvent)
  .post("/list-upload", verifyToken, eventController.uploadGuestList)
  .post("/sendInvites", eventController.sendInvitations)
  .get("/rsvp/:eventId/:guestId/:response", eventController.handleRSVP);
module.exports = router;
