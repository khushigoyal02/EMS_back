const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admincontroller");

// Admin routes
router.post("/createAdmin", adminController.createAdmin);

// ✅ Transaction features
router.get("/transactions", adminController.getTransactions);
router.get("/exportCSV", adminController.exportCSV);
router.get("/downloadReceiptsZip", adminController.downloadAllReceipts);
router.get("/downloadReceipt/:filename", adminController.downloadReceipt);

module.exports = router;
