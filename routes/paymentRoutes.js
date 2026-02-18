const express = require("express");
const router = express.Router();

const {
  createPayment,
  decidePayment,
} = require("../controllers/paymentController");

const { protect, managerOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// User uploads payment screenshot
router.post("/", protect, upload.single("screenshot"), createPayment);

// Manager decision
router.put("/:id/decision", protect, managerOnly, decidePayment);

module.exports = router;
