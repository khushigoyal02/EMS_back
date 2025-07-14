const { connectToDatabase } = require("../database");
const { Parser } = require("json2csv");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

module.exports.getAllTransactions = async function (req, res) {
  try {
    const db = await connectToDatabase();

    const {
      page = 1,
      limit = 10,
      type,
      status,
      eventId,
      search,
      startDate,
      endDate,
      exportCSV
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};

    // Filters
    if (type) query.type = type;
    if (status) query.status = status;
    if (eventId) query.eventId = eventId;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search by user/event
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: "i" } },
        { eventName: { $regex: search, $options: "i" } }
      ];
    }

    const cursor = db.collection("transactions").find(query).sort({ createdAt: -1 });

    const total = await cursor.count();
    const transactions = await cursor.skip(skip).limit(parseInt(limit)).toArray();

    // Smart alert flagging (flag suspicious ones)
    const flagged = transactions.map(txn => ({
      ...txn,
      flagged: txn.amount > 100000 || txn.status === "failed" ? true : false
    }));

    if (exportCSV === "true") {
      const fields = ["_id", "userName", "eventName", "type", "amount", "method", "status", "createdAt"];
      const parser = new Parser({ fields });
      const csv = parser.parse(flagged);
      res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
      res.setHeader("Content-Type", "text/csv");
      return res.send(csv);
    }

    res.status(200).json({
      success: true,
      data: flagged,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Get Transactions Error:", error.message);
    res.status(500).json({ message: "Failed to fetch transactions", error: error.message });
  }
};

module.exports.createTransaction = async function (req, res) {
  try {
    const db = await connectToDatabase();
    const data = req.body;

    const transaction = {
      ...data,
      createdAt: new Date()
    };

    const result = await db.collection("transactions").insertOne(transaction);

    res.status(201).json({
      message: "Transaction recorded successfully",
      insertedId: result.insertedId
    });
  } catch (error) {
    console.error("Create Transaction Error:", error.message);
    res.status(500).json({ message: "Failed to record transaction", error: error.message });
  }
};

// ✅ ZIP download for receipts (placeholder if you store them as files)
module.exports.downloadAllReceiptsZip = async function (req, res) {
  try {
    const db = await connectToDatabase();
    const { eventId } = req.query;

    const filter = {};
    if (eventId) filter.eventId = eventId;

    const transactions = await db.collection("transactions").find(filter).toArray();

    const archive = archiver("zip", { zlib: { level: 9 } });
    res.setHeader("Content-Disposition", "attachment; filename=receipts.zip");
    res.setHeader("Content-Type", "application/zip");
    archive.pipe(res);

    for (const txn of transactions) {
      const filePath = path.join(__dirname, `../receipts/${txn._id}.pdf`);
      if (fs.existsSync(filePath)) {
        archive.append(fs.createReadStream(filePath), { name: `${txn._id}.pdf` });
      }
    }

    archive.finalize();
  } catch (error) {
    console.error("ZIP Download Error:", error.message);
    res.status(500).json({ message: "Failed to download receipts", error: error.message });
  }
};
