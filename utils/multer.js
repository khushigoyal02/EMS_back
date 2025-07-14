// backend/utils/multer.js
const multer = require("multer");
const path = require("path");


// Service Image Storage
const serviceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + ext;
    cb(null, uniqueName);
  },
});

const uploadService = multer({ storage: serviceStorage });

module.exports = { uploadService };
