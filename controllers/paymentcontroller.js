const { connectToDatabase } = require("../database");
const { ObjectId } = require("mongodb");

// Function to handle making a vendor payment
const makeVendorPayment = async (req, res) => {
  const { paymentId } = req.body;

  try {
    const db = await connectToDatabase();
    const completedBookings = db.collection("completedBookings");

    const vendorPayment = await completedBookings.findOne({ _id: new ObjectId(paymentId) });

    if (!vendorPayment) {
      return res.status(404).json({ success: false, message: "Vendor payment not found" });
    }

    const paidAt = new Date();

    // Update status in completedBookings
    await completedBookings.updateOne(
      { _id: new ObjectId(paymentId) },
      {
        $set: {
          status: "paid",
          paidAt,
        },
      }
    );

    res.status(200).json({ success: true, message: "Payment successful and transaction recorded." });
  } catch (error) {
    console.error("Error making vendor payment:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// Function to get pending vendor payments
const getPendingVendorPayments = async (req, res) => {
  try {
    const db = await connectToDatabase();

    const pendingPayments = await db.collection("completedBookings").aggregate([
      // Join with events collection on eventId
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "eventDetails",
        },
      },
      {
        $unwind: { path: "$eventDetails", preserveNullAndEmptyArrays: true }
      },

      // Join with services collection on serviceId
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "serviceDetails",
        },
      },
      {
        $unwind: { path: "$serviceDetails", preserveNullAndEmptyArrays: true }
      },

      // Join with vendors collection on vendorId
      {
        $lookup: {
          from: "venders",
          localField: "vendorId",
          foreignField: "_id",
          as: "vendorDetails",
        },
      },
      {
        $unwind: { path: "$vendorDetails", preserveNullAndEmptyArrays: true }
      },

      // Project the needed fields including amount, status, completedAt, and names
      {
        $project: {
          _id: 1,
          amount: 1,
          status: 1,
          completedAt: 1,
          eventName: "$eventDetails.name",
          serviceName: "$serviceDetails.name",
          vendorName: "$vendorDetails.name"
        }
      }
    ]).toArray();

    res.status(200).json({ success: true, data: pendingPayments });
  } catch (error) {
    console.error("Error fetching vendor payments:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports = {
  makeVendorPayment,
  getPendingVendorPayments,
};
