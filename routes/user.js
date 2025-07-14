const express = require("express");
const router = express.Router();
const userController = require("../controllers/usercontroller");
const verifyToken=require("../middleware/authMiddleware")

router
  .get("/getAllUser", userController.getAllUser)
  .post("/createUser", userController.createUser)
  .get("/getRole", verifyToken, userController.getRole)

module.exports = router;