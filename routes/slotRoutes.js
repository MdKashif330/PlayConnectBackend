const express = require("express");
const router = express.Router();

const {
  createSlot,
  getAvailableSlots,
  bookSlot,
} = require("../controllers/slotController");

const { protect } = require("../middleware/authMiddleware");

// Manager creates slots
router.post("/", protect, createSlot);

// Public: view available slots
router.get("/", getAvailableSlots);

// User: book slot
router.put("/book/:slotId", protect, bookSlot);

module.exports = router;
