const { connectToDatabase } = require("../database");
const { ObjectId } = require("mongodb");
const sendInvitationEmail = require("../utils/sendEmail");
const { encrypt, decrypt } =require("../utils/encryption");

module.exports.createEvent = async function (req, res) {
  try {
    const db = await connectToDatabase();
    const {
      name,
      startDate,
      endDate,
      date,
      startTime,  // Optional: only for one-day events
      endTime,    // Optional: only for one-day events
      location,
      description,
      services, // Array of service IDs as strings
    } = req.body;

    const customerUID = req.user.uid;
    const customer = await db.collection("users").findOne({ uid: customerUID });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const customerId = customer._id;

    // 1. Insert the event without services
    const newEvent = {
      name,
      createdBy: customerId,
      location,
      description,
      services: [], // to be updated after inserting booking requests
      status: "pending",
      createdAt: new Date(),
    };

    if (startDate && startDate) {
      newEvent.startDate = startDate;
      newEvent.endDate = endDate;     
    }
    else{
      newEvent.date=date;
      newEvent.startTime = startTime; // e.g., "13:00"
      newEvent.endTime = endTime;     // e.g., "16:00"
    }

    const result = await db.collection("events").insertOne(newEvent);

    if (!result.insertedId) {
      return res.status(500).json({ message: "Failed to create event" });
    }

    const eventId = result.insertedId;

    // 2. Create booking requests and gather serviceIds
    const serviceIds = [];
    const bookingRequests = services.map(async (serviceId) => {
      const service = await db.collection("services").findOne({
        _id: new ObjectId(serviceId),
      });

      if (!service) {
        throw new Error(`Service not found for ID: ${serviceId}`);
      }

      const bookingRequest = {
        eventId,
        customerId,
        serviceId: service._id,
        vendorId: service.vendor,
        status: "Pending",
        price: service.price,
        createdAt: new Date(),
      };

      await db.collection("bookingRequests").insertOne(bookingRequest);
      serviceIds.push(service._id);
    });

    await Promise.all(bookingRequests);

    // 3. Update the event with serviceIds
    await db.collection("events").updateOne(
      { _id: eventId },
      { $set: { services: serviceIds } }
    );

    res.status(200).json({
      message: "Event created and booking requests sent",
      eventId
    });

  } catch (error) {
    console.error("Error in createEvent:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports.uploadGuestList = async (req,res) => {
  try{
    const db= await connectToDatabase();
    const { eventId, guests } = req.body;

    if (!eventId || !Array.isArray(guests) || guests.length === 0) {
      return res.status(400).json({ error: "eventId and guests array are required" });
    }

    // Validate eventId format
    if (!ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid eventId" });
    }

    // Check if event exists
    const event = await db.collection('events').findOne({ _id: new ObjectId(eventId) });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const guestsArray = guests.map(guest => ({
  name: encrypt(guest.name),
  email: encrypt(guest.email),
  phone: guest.phone ? encrypt(guest.phone) : null,
  rsvpStatus: "Pending",
  hasResponded: false
}));

// Create a single document with eventId and guests array
const guestListDoc = {
  eventId: new ObjectId(eventId),
  guests: guestsArray,
  invitesSent: false,
};

// Insert one document into 'guestLists' collection
const insertResult = await db.collection('guestLists').insertOne(guestListDoc);


    return res.status(201).json({
      message: `${insertResult.insertedCount} guests added successfully`,
      insertedIds: insertResult.insertedIds,
    });
  } catch (error) {
    console.error('Error uploading guest list:', error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports.getUserEvents = async (req, res) => {
  try {
    const db = await connectToDatabase();
    const customer = await db.collection("users").findOne({ uid: req.user.uid });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Fetch booking requests and completed bookings concurrently
    const [bookingRequests, completedBookings] = await Promise.all([
      // Booking Requests: vendor name, service name, status
      db.collection("bookingRequests").aggregate([
        { $match: { customerId: customer._id } },
        {
          $lookup: {
            from: "venders",
            localField: "vendorId",
            foreignField: "_id",
            as: "vendor"
          }
        },
        { $unwind: "$vendor" },
        {
          $lookup: {
            from: "services",
            localField: "serviceId",
            foreignField: "_id",
            as: "service"
          }
        },
        { $unwind: "$service" },
        {
          $project: {
            vendorName: "$vendor.name",
            serviceName: "$service.title",
            serviceCategory: "$service.category",
            price: 1,
            status: 1,
            eventId: 1,
            _id: 1
          }
        }
      ]).toArray(),

      // Completed Bookings: vendor name, service name, hasReviewed
      db.collection("completedBookings").aggregate([
        { $match: { customerId: customer._id } },
        {
          $lookup: {
            from: "venders",
            localField: "vendorId",
            foreignField: "_id",
            as: "vendor"
          }
        },
        { $unwind: "$vendor" },
        {
          $lookup: {
            from: "services",
            localField: "serviceId",
            foreignField: "_id",
            as: "service"
          }
        },
        { $unwind: "$service" },
        {
          $project: {
            vendorName: "$vendor.name",
            serviceName: "$service.name",
            serviceCategory: "$service.category",
            hasReviewed: 1,
            eventId: 1,
            _id: 1
          }
        }
      ]).toArray()
    ]);

    // Group events by eventId
    const groupedEvents = bookingRequests.concat(completedBookings).reduce((acc, item) => {
      const eventId = item.eventId.toString();
      if (!acc[eventId]) {
        acc[eventId] = { eventId, bookings: [], completed: [] };
      }
      if (item.hasOwnProperty('status')) {
        acc[eventId].bookings.push(item); // Booking request
      } else {
        acc[eventId].completed.push(item); // Completed booking
      }
      return acc;
    }, {});

    const eventIds = Object.keys(groupedEvents).map(id => new ObjectId(id));
    const events = await db.collection("events").find({ _id: { $in: eventIds } }).sort({ _id: -1 }).toArray();

    // Fetch guest lists for all events in one query
    const guestLists = await db.collection("guestLists").find({ eventId: { $in: eventIds } }).toArray();

    // Create a map of eventId => guests array
    const guestListsMap = guestLists.reduce((acc, guestList) => {
      acc[guestList.eventId.toString()] = guestList.guests || [];
      return acc;
    }, {});

    const result = events.map(event => {
  const { bookings, completed } = groupedEvents[event._id.toString()] || { bookings: [], completed: [] };
  const guests = (guestListsMap[event._id.toString()] || []).map(guest => ({
    ...guest,
    email: decrypt(guest.email),
    name: decrypt(guest.name)  // only if you encrypted the name as well
  }));

  return {
    event,
    bookings,
    completed,
    guests
  };
});

    return res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching user events:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.getAllEvents = async (req, res) => {
  try {
    const db = await connectToDatabase();

    // 1. Fetch all events sorted by newest first
    const events = await db.collection("events")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // 2. Collect all unique serviceIds, customerIds, and eventIds
    const serviceIds = new Set();
    const customerIds = new Set();
    const eventIds = events.map(ev => ev._id);

    events.forEach(event => {
      (event.services || []).forEach(sid => serviceIds.add(sid.toString()));
      if (event.createdBy) customerIds.add(event.createdBy.toString());
    });

    // 3. Fetch services and customers
    const [services, customers] = await Promise.all([
      db.collection("services")
        .find({ _id: { $in: [...serviceIds].map(id => new ObjectId(id)) } })
        .toArray(),
      db.collection("users")
        .find({ _id: { $in: [...customerIds].map(id => new ObjectId(id)) } })
        .toArray(),
    ]);

    // 4. Extract vendorIds from services
    const vendorIds = [
      ...new Set(services.map(s => s.vendor?.toString()).filter(Boolean))
    ].map(id => new ObjectId(id));

    // 5. Fetch vendors
    const vendors = await db.collection("venders")
      .find({ _id: { $in: vendorIds } })
      .toArray();

    // 6. Fetch guestLists for these events
    const guestLists = await db.collection("guestLists")
      .find({ eventId: { $in: eventIds } })
      .toArray();

    // 7. Build lookup maps
    const serviceMap = Object.fromEntries(
      services.map(s => [s._id.toString(), { name: s.name, vendorId: s.vendor?.toString() }])
    );
    const vendorMap = Object.fromEntries(
      vendors.map(v => [v._id.toString(), v.name])
    );
    const customerMap = Object.fromEntries(
      customers.map(c => [c._id.toString(), c.name])
    );
    const guestListMap = Object.fromEntries(
      guestLists.map(gl => [gl.eventId.toString(), gl])
    );

    // 8. Enrich events
    const enrichedEvents = events.map(event => {
      // services
      const enrichedServices = (event.services || []).map(sid => {
        const svc = serviceMap[sid.toString()] || {};
        return {
          serviceName: svc.name || "Unknown Service",
          vendorName: vendorMap[svc.vendorId] || "Unknown Vendor",
        };
      });

      // guestList document for this event (if any)
      const gl = guestListMap[event._id.toString()] || {};
      const invitesSent = Boolean(gl.invitesSent);

      return {
        _id: event._id,
        name: event.name,
        location: event.location,
        date: event.date,
        startDate: event.startDate,
        endDate: event.endDate,
        description: event.description,
        estimatedCost: event.estimatedCost,
        createdAt: event.createdAt,
        createdBy: customerMap[event.createdBy?.toString()] || "Unknown Customer",
        services: enrichedServices,
        guestList: { invitesSent },      // <- new field
      };
    });

    // 9. Send response
    res.status(200).json({ events: enrichedEvents });
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports.sendInvitations = async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { eventId } = req.body;

    // Fetch event
    const event = await db.collection("events").findOne({ _id: new ObjectId(eventId) });
    const customerId=event.createdBy;
    const customer=await db.collection("users").findOne({_id : customerId})
    //if (!event) return res.status(404).json({ error: "Event not found" });

    // Fetch guest list by eventId
    const guestListDoc = await db.collection("guestLists").findOne({ eventId: event._id });
    if (!guestListDoc || !guestListDoc.guests || guestListDoc.guests.length === 0) {
      return res.status(404).json({ error: "No guest emails found for this event." });
    }

    // If we've already sent invites, refuse:
    if (guestListDoc.invitesSent) {
      return res.status(409).json({ error: "Invitations already sent for this event" });
    }

    // Send personalized invitation to each guest
    /*for (const guest of guestListDoc.guests) {
      await sendInvitationEmail(guest.email, guest.name, event, customer.name);
    }*/

      for (const guest of guestListDoc.guests) {
  await sendInvitationEmail(decrypt(guest.email), decrypt(guest.name), event, customer.name);
}

    await db.collection("guestLists").updateOne(
      {eventId: event._id},
      {
      $set: {
        invitesSent: true,
      }
      }
    )

    res.status(200)
    .json({
    message: "Invitations sent to all guests.",
    guestList: guestListDoc
    });
  } catch (err) {
    console.error("Error sending invitations:", err);
    res.status(500).json({ error: "Failed to send invitations." });
  }
};

module.exports.handleRSVP = async (req, res) => {
  const { eventId, guestId, response } = req.params;

  try {
    const decodedEmail = Buffer.from(guestId, 'base64').toString('utf8');
    const db = await connectToDatabase();

    // 1. Validate event
    const event = await db.collection("events").findOne({ _id: new ObjectId(eventId) });
    if (!event) return res.status(404).send("Event not found");

    // 2. Check RSVP deadline
    const cutoff = new Date(event.startDate);
    cutoff.setDate(cutoff.getDate() - 2);
    if (new Date() > cutoff) {
      return res.send(`
  <html>
    <head>
      <title>RSVP Closed</title>
      <style>
        body {
          font-family: sans-serif;
          background-color: #f7e1d7;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .container {
          background: white;
          padding: 2rem 3rem;
          border-radius: 1rem;
          text-align: center;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #edafb8;
          margin-bottom: 0.5rem;
        }
        p {
          color: #4a5759;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>RSVP Closed</h1>
        <p>We’re sorry, but the RSVP deadline was ${cutoff.toDateString()}.</p>
      </div>
    </body>
  </html>
`);
    }

    // 3. Find and update the guest
    const guestList = await db.collection("guestLists").findOne({ eventId: new ObjectId(eventId) });
    if (!guestList) return res.status(404).send("Guest list not found");

    const guestIndex = guestList.guests.findIndex(g => decrypt(g.email) === decodedEmail);
    if (guestIndex === -1) {
      return res.status(404).send("Guest not found or not invited.");
    }

    // Check if already responded
    if (guestList.guests[guestIndex].hasResponded) {
      return res.send(`
  <html>
    <head>
      <title>Already Responded</title>
      <style>
        body {
          font-family: sans-serif;
          background-color: #f7e1d7;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .container {
          background: white;
          padding: 2rem 3rem;
          border-radius: 1rem;
          text-align: center;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #edafb8;
          margin-bottom: 0.5rem;
        }
        p {
          color: #4a5759;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Already Responded</h1>
        <p>You’ve already recorded your RSVP.</p>
      </div>
    </body>
  </html>
`);
    }

    // Update RSVP status
    guestList.guests[guestIndex].rsvpStatus = response === "accept" ? "Accepted" : "Declined";
    guestList.guests[guestIndex].hasResponded = true;

    await db.collection("guestLists").updateOne(
      { _id: guestList._id },
      { $set: { guests: guestList.guests } }
    );

    // 4. Success page
    return res.send(`
  <html>
    <head>
      <title>RSVP Confirmed</title>
      <style>
        body {
          font-family: sans-serif;
          background-color: #f7e1d7;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .container {
          background: white;
          padding: 2rem 3rem;
          border-radius: 1rem;
          text-align: center;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #edafb8;
          margin-bottom: 0.5rem;
        }
        p {
          color: #4a5759;
        }
        strong {
          color: #4a5759;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Thank you!</h1>
        <p>Your RSVP has been recorded as <strong>${response === "accept" ? "Accepted" : "Declined"}</strong>.</p>
      </div>
    </body>
  </html>
`);
  } catch (error) {
    console.error("RSVP error:", error);
    return res.status(500).send("Something went wrong. Please try again.");
  }
};

