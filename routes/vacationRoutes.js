const express = require("express");
const router = express.Router();
const Vacation = require("../models/Vacation");
const Venue = require("../models/Venue");
const { protect, managerOnly } = require("../middleware/authMiddleware");

router.get("/check", async (req, res) => {
  try {
    const { venueId, date } = req.query;

    if (!venueId || !date) {
      return res.status(400).json({
        message: "venueId and date are required",
      });
    }

    // Convert date string to Date object
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const vacation = await Vacation.findOne({
      venue: venueId,
      startDate: { $lte: checkDate },
      endDate: { $gte: checkDate },
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
    console.log("=== VACATION CREATE REQUEST ===");
    console.log("User ID:", req.user?.id);
    console.log("Request body:", req.body);

    const { venueId, startDate, endDate, reason } = req.body;

    // Validation - Check all fields
    if (!venueId || !startDate || !endDate || !reason) {
      console.log("Validation failed - missing fields");
      return res.status(400).json({
        message: "Please provide venueId, startDate, endDate, and reason",
      });
    }

    // Convert to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log("Parsed start date:", start);
    console.log("Parsed end date:", end);

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
    console.log("Checking venue:", venueId);
    const venue = await Venue.findOne({
      _id: venueId,
      manager: req.user.id,
    });

    if (!venue) {
      console.log("Venue not found or not owned by manager");
      return res.status(404).json({ message: "Venue not found" });
    }

    console.log("Venue found:", venue.name);

    // Create vacation with Date objects
    const vacation = new Vacation({
      manager: req.user.id,
      venue: venueId,
      startDate: start,
      endDate: end,
      reason,
    });

    console.log("Attempting to save vacation...");
    const savedVacation = await vacation.save();
    console.log("Vacation saved successfully:", savedVacation._id);

    res.status(201).json(savedVacation);
  } catch (error) {
    console.error("=== VACATION CREATE ERROR ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Full error:", error);

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
    console.error("Error:", error);
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
    console.error("Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
