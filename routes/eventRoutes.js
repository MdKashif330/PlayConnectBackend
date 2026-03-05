const express = require("express");
const router = express.Router();
const { protect, managerOnly } = require("../middleware/authMiddleware");
const {
  createEvent,
  getManagerEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");

// Manager routes
router.post("/", protect, managerOnly, createEvent);
router.get("/manager", protect, managerOnly, getManagerEvents);
router.get("/:id", protect, managerOnly, getEventById);
router.put("/:id", protect, managerOnly, updateEvent);
router.delete("/:id", protect, managerOnly, deleteEvent);

module.exports = router;
