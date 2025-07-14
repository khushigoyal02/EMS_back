const { connectToDatabase } = require("../database");
const { ObjectId } = require("mongodb");
const fs = require("fs");
const path = require("path");

module.exports.addService = async function (req, res) {
    try {
      const db = await connectToDatabase();
  
      // Check vendor from token
      const vendor = await db.collection("venders").findOne({ uid: req.user.uid });
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
  
      // Build the new service object
      const newService = {
        vendor: vendor._id,
        ...req.body,
        createdAt: new Date(),
      };
  
      // If file was uploaded, attach filename
      if (req.file) {
        newService.image = req.file.filename; // assuming multer saves the file
      }
  
      const result = await db.collection("services").insertOne(newService);
  
      if (!result.insertedId) {
        return res.status(500).json({ message: "Failed to add service" });
      }
  
      res.status(201).json({ message: "Service added successfully" });
    } catch (error) {
      console.error("Error adding service:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };

  module.exports.getVendorServices = async function (req, res) {
    try {
      const db = await connectToDatabase();
      // Step 1: Get vendor using Firebase UID
      const vendor = await db.collection("venders").findOne({ uid: req.user.uid });
  
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
  
      // Step 2: Fetch services using MongoDB _id of the vendor
      const services = await db
        .collection("services")
        .find({ vendor: vendor._id })
        .toArray();
  
      res.status(200).json({ services });
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };

  // PUT /vendor/editService/:id
module.exports.editService = async function (req, res) {
    try {
      const db = await connectToDatabase();
      const { name, description, price } = req.body;
      const serviceId = req.params.id;
  
      if (!description || !price) {
        return res.status(400).json({ message: "All fields are required" });
      }
  
      // Fetch existing service
      const existingService = await db.collection("services").findOne({ _id: new ObjectId(serviceId) });
      if (!existingService) {
        return res.status(404).json({ message: "Service not found" });
      }
  
      const updatedService = {
        description,
        price: parseFloat(price),
      };
  
      // If a new image is uploaded, update it
      if (req.file) {
        updatedService.image = req.file.filename;
  
        // Delete old image if it exists
        if (existingService.image) {
          const oldImagePath = path.join(__dirname, "../uploads/services", existingService.image);
          fs.unlink(oldImagePath, (err) => {
            if (err) {
              console.error("Failed to delete old image:", err.message);
            }
          });
        }
      }
  
      await db.collection("services").updateOne(
        { _id: new ObjectId(serviceId) },
        { $set: updatedService }
      );
  
      res.status(200).json({ message: "Service updated successfully" });
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };

  // DELETE /vender/deleteService/:id
module.exports.deleteService = async function (req, res) {
    try {
      const db = await connectToDatabase();
      const serviceId = req.params.id;
  
      const result = await db.collection("services").deleteOne({ _id: new ObjectId(serviceId) });
  
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Service not found" });
      }
  
      res.status(200).json({ message: "Service deleted successfully" });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };

  module.exports.getAllServices = async function (req, res) {
  try {
    const db = await connectToDatabase();

    // Step 1: Get all services
    const services = await db.collection("services").find({}).toArray();

    // Step 2: Get unique vendor IDs from services
    const vendorIds = [
      ...new Set(services.map(service => new ObjectId(service.vendor)))
    ];

    // Step 3: Fetch vendor documents
    const vendors = await db.collection("venders")
      .find({ _id: { $in: vendorIds } })
      .project({ name: 1 })
      .toArray();

    // Step 4: Create vendor ID to name map
    const vendorMap = vendors.reduce((acc, vendor) => {
      acc[vendor._id.toString()] = vendor.name;
      return acc;
    }, {});

    // Step 5: Format services with vendor name
    const formattedServices = services.map(service => ({
      ...service,
      vendor: vendorMap[service.vendor] || "Unknown Vendor"
    }));

    res.status(200).json({ success: true, services: formattedServices });
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ success: false, message: "Failed to fetch services" });
  }
  };
  
  module.exports.submitReview = async (req, res) => {
  try {
    const { serviceId, rating, comment } = req.body;
    const db = await connectToDatabase();

    const service = await db.collection("completedBookings").findOne({ _id: new ObjectId(serviceId) });

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Check if already reviewed
    if (service.hasReviewed) {
      return res.status(400).json({ message: "Review already submitted." });
    }

    // Insert into vendorReviews collection
    await db.collection("vendorReviews").insertOne({
      bookingId: service._id,
      rating,
      comment,
      createdAt: new Date(),
    });

    // Update the service in completedBookings to mark as reviewed
    await db.collection("completedBookings").updateOne(
      { _id: new ObjectId(serviceId) },
      {
        $set: {
          hasReviewed: true,
        },
      }
    );

    return res.status(200).json({ message: "Review submitted successfully!" });
  } catch (err) {
    console.error("Error submitting review:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};