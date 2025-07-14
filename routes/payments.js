const express = require("express");
const { getPendingVendorPayments, makeVendorPayment } = require("../controllers/paymentcontroller");

const router = express.Router();

// Route to get pending payments
router.get("/pending", getPendingVendorPayments);

// Route to make a payment to a vendor
router.post("/pay", makeVendorPayment);

module.exports = router;
