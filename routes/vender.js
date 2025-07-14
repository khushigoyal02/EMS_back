const express = require("express");
const router = express.Router();
const venderController = require("../controllers/vendercontroller");
const verifyToken=require("../middleware/authMiddleware")

router
  .post("/createVender", venderController.createVender)
  .get("/getAllVender", venderController.getAllVender)
  .get("/bookings", verifyToken, venderController.getVendorBookings)
  .patch("/bookings", verifyToken, venderController.changeBookingStatus)
  .get("/completed-bookings", verifyToken, venderController.getCompletedBookings)
  .get("/reviews", verifyToken, venderController.getVendorReviews)
  .get("/get-stats", verifyToken, venderController.getMonthlyStats);

module.exports = router;