const express = require("express");
const cors=require("cors");
const app = express();
const path = require("path");

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files from uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

require('./cron/mastercron');

// Root route
app.use(cors())
app.use("/", require("./routes"));

app.listen(8000, () => {
  console.log(`Server is running on 8000`);
});