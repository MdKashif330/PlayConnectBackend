const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/adminMiddleware");
const { addPaymentMethod } = require("../controllers/paymentMethodController");

const { protect, managerOnly } = require("../middleware/authMiddleware");

router.post("/", protect, managerOnly, addPaymentMethod);

module.exports = router;
