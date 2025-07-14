const validator = require("validator");
const { connectToDatabase } = require("../database");

module.exports.createUser = async function (req, res) {
  try {
    const db = await connectToDatabase();
    const { name, email, phone, uid } = req.body;

    // Validation
    if (!name || !email || !phone || !uid) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    if (!validator.isMobilePhone(phone, "any")) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    const newUser = {
      name,
      email,
      phone,
      uid,
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection("users").insertOne(newUser);

    res.status(201).json({
      message: "User Created Successfully",
      userId: result.insertedId,
    });
  } catch (error) {
    console.error("Create User Error:", error.message);
    res.status(500).json({ error: "Failed to create user" });
  }
};

// Get all users
module.exports.getAllUser = async function (req, res) {
  try {
    const db = await connectToDatabase();
    const users = await db.collection("users").find({}).toArray();

    const formattedUsers = users.map(user => ({
      id: user._id,
      data: user
    }));

    res.status(200).json(formattedUsers);
  } catch (error) {
    console.error("Get All Users Error:", error.message);
    res.status(500).json({ message: "Failed to get users", error: error.message });
  }
};

// Get Role
module.exports.getRole=async(req,res)=>{
  try {
    const db = await connectToDatabase();
    let user = await db.collection("venders").findOne({ uid: req.user.uid });
    if (user) return res.json({ role: "vendor" });

    user = await db.collection("users").findOne({ uid: req.user.uid });
    if (user) return res.json({ role: "customer" });

    user = await db.collection("admins").findOne({ uid: req.user.uid });
    if (user) return res.json({ role: "admin" });

    return res.status(404).json({ message: "User not found" });
} catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
}
}