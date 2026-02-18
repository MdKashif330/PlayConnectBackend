const Court = require("../models/Court");
const Venue = require("../models/Venue");

// GET available courts
exports.getAvailableCourts = async (req, res) => {
  try {
    const courts = await Court.find({ isActive: true }).populate(
      "venue",
      "name location.address",
    );
    res.json(courts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET single court
exports.getCourtById = async (req, res) => {
  try {
    const court = await Court.findById(req.params.id).populate("venue");
    if (!court) {
      return res.status(404).json({ message: "Court not found" });
    }
    res.json(court);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE court (Manager only)
exports.createCourt = async (req, res) => {
  try {
    const { venueId, name, sportType, dimensions, pricePerSlot } = req.body;

    // Verify venue exists and belongs to this manager
    const venue = await Venue.findOne({ _id: venueId, manager: req.user.id });
    if (!venue) {
      return res
        .status(404)
        .json({ message: "Venue not found or unauthorized" });
    }

    const court = await Court.create({
      venue: venueId,
      name,
      sportType,
      dimensions,
      pricePerSlot,
    });

    res.status(201).json(court);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE court (Manager only)
exports.updateCourt = async (req, res) => {
  try {
    const court = await Court.findById(req.params.id).populate("venue");
    if (!court) {
      return res.status(404).json({ message: "Court not found" });
    }

    // Check if manager owns the venue
    if (court.venue.manager.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const updatedCourt = await Court.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );
    res.json(updatedCourt);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE court (Manager only)
exports.deleteCourt = async (req, res) => {
  try {
    const court = await Court.findById(req.params.id).populate("venue");
    if (!court) {
      return res.status(404).json({ message: "Court not found" });
    }

    if (court.venue.manager.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Soft delete (set inactive)
    court.isActive = false;
    await court.save();

    res.json({ message: "Court deactivated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get courts by venue ID
exports.getCourtsByVenue = async (req, res) => {
  try {
    const { venueId } = req.params;

    const courts = await Court.find({ venue: venueId, isActive: true })
      .populate("venue", "name")
      .sort({ name: 1 });

    res.json(courts);
  } catch (error) {
    console.error("Error fetching courts by venue:", error);
    res.status(500).json({ message: "Server error" });
  }
};
