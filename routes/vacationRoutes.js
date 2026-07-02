const express = require("express");
const router = express.Router();
const Vacation = require("../models/Vacation");
const Venue = require("../models/Venue");
const { protect, managerOnly } = require("../middleware/authMiddleware");

// PUBLIC ROUTE - Check if a date is a vacation (no auth required)
router.get("/check", async (req, res) => {
  try {
    const { venueId, date } = req.query;

    if (!venueId || !date) {
      return res.status(400).json({
        message: "venueId and date are required",
      });
    }

    // Create date range for the entire day (00:00:00 to 23:59:59)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Find vacation where the date falls within the range
    const vacation = await Vacation.findOne({
      venue: venueId,
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay },
    });

    res.json({
      isVacation: !!vacation,
      vacation: vacation || null,
    });
  } catch (error) {
    console.error("Error checking vacation:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET vacations for a venue
router.get("/venue/:venueId", protect, managerOnly, async (req, res) => {
  try {
    // Check if venue belongs to manager
    const venue = await Venue.findOne({
      _id: req.params.venueId,
      manager: req.user.id,
    });

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    const vacations = await Vacation.find({ venue: req.params.venueId }).sort({
      startDate: 1,
    });

    res.json(vacations);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET all vacations for manager
router.get("/", protect, managerOnly, async (req, res) => {
  try {
    const venues = await Venue.find({ manager: req.user.id });
    const venueIds = venues.map((v) => v._id);

    const vacations = await Vacation.find({
      venue: { $in: venueIds },
    })
      .populate("venue", "name")
      .sort({ startDate: 1 });

    res.json(vacations);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST create vacation
router.post("/", protect, managerOnly, async (req, res) => {
  try {
    const { venueId, startDate, endDate, reason } = req.body;

    // Validation - Check all fields
    if (!venueId || !startDate || !endDate || !reason) {
      return res.status(400).json({
        message: "Please provide venueId, startDate, endDate, and reason",
      });
    }

    // Convert to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Date validation
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        message: "End date must be after start date",
      });
    }

    // Check if start date is in past
    if (start < new Date()) {
      return res.status(400).json({
        message: "Start date cannot be in the past",
      });
    }

    // Check if venue belongs to manager
    const venue = await Venue.findOne({
      _id: venueId,
      manager: req.user.id,
    });

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    // Create vacation with Date objects
    const vacation = new Vacation({
      manager: req.user.id,
      venue: venueId,
      startDate: start,
      endDate: end,
      reason,
    });

    const savedVacation = await vacation.save();

    res.status(201).json(savedVacation);
  } catch (error) {
    console.error("Error creating vacation:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: "Server error",
      details: error.message,
    });
  }
});

// PUT update vacation
router.put("/:id", protect, managerOnly, async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;

    const vacation = await Vacation.findById(req.params.id);

    if (!vacation) {
      return res.status(404).json({ message: "Vacation not found" });
    }

    // Check if vacation belongs to manager
    const venue = await Venue.findOne({
      _id: vacation.venue,
      manager: req.user.id,
    });

    if (!venue) {
      return res.status(403).json({
        message: "Not authorized to update this vacation",
      });
    }

    // Update
    if (startDate) vacation.startDate = startDate;
    if (endDate) vacation.endDate = endDate;
    if (reason) vacation.reason = reason;

    const updatedVacation = await vacation.save();
    res.json(updatedVacation);
  } catch (error) {
    console.error("Error updating vacation:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE vacation
router.delete("/:id", protect, managerOnly, async (req, res) => {
  try {
    const vacation = await Vacation.findById(req.params.id);

    if (!vacation) {
      return res.status(404).json({ message: "Vacation not found" });
    }

    // Check if vacation belongs to manager
    const venue = await Venue.findOne({
      _id: vacation.venue,
      manager: req.user.id,
    });

    if (!venue) {
      return res.status(403).json({
        message: "Not authorized to delete this vacation",
      });
    }

    await vacation.deleteOne();
    res.json({ message: "Vacation removed" });
  } catch (error) {
    console.error("Error deleting vacation:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
