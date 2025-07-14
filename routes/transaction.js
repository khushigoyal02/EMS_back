const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactioncontroller");

// GET: Fetch all transactions with advanced filters, pagination, export
router.get("/getAllTransactions", transactionController.getAllTransactions);

// POST: Create a new transaction
router.post("/createTransaction", transactionController.createTransaction);

// GET: Download all transaction receipts as a ZIP
router.get("/downloadReceiptsZip", transactionController.downloadAllReceiptsZip);

module.exports = router;
