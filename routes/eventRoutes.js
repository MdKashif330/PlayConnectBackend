const express = require("express");
const router = express.Router();
const { protect, managerOnly } = require("../middleware/authMiddleware");
const {
  // Public/User functions
  getAllPublicEvents,
  getPublicEventById,
  registerForEvent,
  cancelEventRegistration,
  getUserRegisteredEvents,

  // Manager functions
  createEvent,
  getManagerEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");

// ============ PUBLIC ROUTES (no auth required) ============
// Get all upcoming events (public)
router.get("/public", getAllPublicEvents);

// Get event details by ID (public)
router.get("/public/:id", getPublicEventById);

// ============ USER ROUTES (auth required) ============
// Register for an event
router.post("/:id/register", protect, registerForEvent);

// Cancel registration
router.delete("/:id/register", protect, cancelEventRegistration);

// Get user's registered events
router.get("/user/registered", protect, getUserRegisteredEvents);

// ============ MANAGER ROUTES (auth + manager only) ============
router.post("/", protect, managerOnly, createEvent);
router.get("/manager", protect, managerOnly, getManagerEvents);
router.get("/manager/:id", protect, managerOnly, getEventById);
router.put("/:id", protect, managerOnly, updateEvent);
router.delete("/:id", protect, managerOnly, deleteEvent);

module.exports = router;
