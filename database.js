const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGODB_URL; // Your MongoDB URI
let client;
let db;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect(); // Establish connection
    db = client.db(); 
    console.log("Connected to MongoDB");
  }
  return db; // Return the database instance
}

module.exports = { connectToDatabase };