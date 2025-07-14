const express = require("express");
const router = express.Router();

router.use("/user", require("./user"));
router.use("/vender", require("./vender"));
router.use("/admin", require("./admin"));
router.use("/event", require("./event"));
router.use("/service", require("./service"));
router.use("/api/auth", require("./googleAuth"))
router.use("/transaction", require("./transaction")); // Transaction routes
router.use("/payments", require("./payments")); // Vendor payment routes (Stripe integration)

module.exports = router;
