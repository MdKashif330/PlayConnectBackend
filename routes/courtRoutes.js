const express = require("express");
const router = express.Router();

const {
  getAvailableCourts,
  getCourtById,
  getCourtsByVenue,
  createCourt,
  updateCourt,
  deleteCourt,
} = require("../controllers/courtController");

const { protect } = require("../middleware/authMiddleware");
const { managerOnly } = require("../middleware/authMiddleware");

// Public routes
router.get("/available", getAvailableCourts);
router.get("/venue/:venueId", getCourtsByVenue);
router.get("/:id", getCourtById);

// Protected routes (Manager only)
router.post("/", protect, managerOnly, createCourt);
router.put("/:id", protect, managerOnly, updateCourt);
router.delete("/:id", protect, managerOnly, deleteCourt);

module.exports = router;
