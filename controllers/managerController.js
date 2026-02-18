const Venue = require("../models/Venue");
const Booking = require("../models/Booking");
const Court = require("../models/Court");

// CREATE VENUE (Manager)
exports.createVenue = async (req, res) => {
  try {
    const { name, location, latitude, longitude, facilities } = req.body;

    const venue = await Venue.create({
      name,
      location,
      latitude,
      longitude,
      facilities,
      manager: req.user.id,
    });

    res.status(201).json({
      message: "Venue created successfully",
      venue,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE COURT (Manager)
exports.createCourt = async (req, res) => {
  try {
    const { venueId, name, sportType, dimensions, pricePerSlot, facilities } =
      req.body;

    const court = await Court.create({
      venue: venueId,
      name,
      sportType,
      dimensions,
      pricePerSlot,
      facilities,
    });

    res.status(201).json({
      message: "Court created successfully",
      court,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get bookings for manager's venues (with status filter)
exports.getManagerBookings = async (req, res) => {
  try {
    const { status } = req.query; // Get status from query params

    // Find venues owned by this manager
    const venues = await Venue.find({ manager: req.user.id });
    const venueIds = venues.map((v) => v._id);

    // Build query
    let query = { venue: { $in: venueIds } };
    if (status && status !== "") {
      query.status = status;
    }

    // Find bookings for those venues
    const bookings = await Booking.find(query)
      .populate("venue", "name")
      .populate("court", "name sportType")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get manager's venues
exports.getManagerVenues = async (req, res) => {
  try {
    const venues = await Venue.find({ manager: req.user.id });
    res.json(venues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET all courts (manager)
exports.getCourts = async (req, res) => {
  try {
    const courts = await Court.find();
    res.json(courts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve booking
exports.approveBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("venue");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if manager owns the venue
    if (booking.venue.manager.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Update status
    booking.status = "CONFIRMED";
    await booking.save();

    res.json({ message: "Booking approved successfully", booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject booking
exports.rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("venue");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.venue.manager.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    booking.status = "REJECTED";
    await booking.save();

    res.json({ message: "Booking rejected", booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get bookings for a specific court (manager only)
exports.getCourtBookings = async (req, res) => {
  try {
    const { courtId } = req.params;
    const { status } = req.query;

    // Verify court belongs to manager's venue
    const court = await Court.findById(courtId).populate("venue");
    if (!court) {
      return res.status(404).json({ message: "Court not found" });
    }

    // Check if manager owns the venue
    if (court.venue.manager.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Build query
    let query = { court: courtId };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate("user", "name email")
      .sort({ date: -1, startTime: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single venue details
exports.getVenueById = async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }
    // Check ownership
    if (venue.manager.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    res.json(venue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get courts for a venue (with venue filter)
exports.getCourts = async (req, res) => {
  try {
    const { venue } = req.query;
    let query = {};

    if (venue) {
      // Verify manager owns the venue
      const venueDoc = await Venue.findById(venue);
      if (!venueDoc || venueDoc.manager.toString() !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      query.venue = venue;
    } else {
      // If no venue filter, get all courts for manager's venues
      const venues = await Venue.find({ manager: req.user.id });
      const venueIds = venues.map((v) => v._id);
      query.venue = { $in: venueIds };
    }

    const courts = await Court.find(query).populate("venue", "name");
    res.json(courts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete court (soft delete - set isActive: false)
exports.deleteCourt = async (req, res) => {
  try {
    const court = await Court.findById(req.params.id).populate("venue");

    if (!court) {
      return res.status(404).json({ message: "Court not found" });
    }

    if (court.venue.manager.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // HARD DELETE - remove from database
    await Court.findByIdAndDelete(req.params.id);

    res.json({ message: "Court permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update venue
exports.updateVenue = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, facilities } = req.body;

    // Find venue and ensure it belongs to this manager
    const venue = await Venue.findOne({
      _id: id,
      manager: req.user.id,
    });

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    // Update fields (only update if provided)
    if (name) venue.name = name;
    if (location) {
      venue.location = {
        address: location.address || venue.location.address,
        latitude: location.latitude || venue.location.latitude,
        longitude: location.longitude || venue.location.longitude,
      };
    }
    if (facilities) {
      venue.facilities = {
        lights:
          facilities.lights !== undefined
            ? facilities.lights
            : venue.facilities.lights,
        parking:
          facilities.parking !== undefined
            ? facilities.parking
            : venue.facilities.parking,
        cafeteria:
          facilities.cafeteria !== undefined
            ? facilities.cafeteria
            : venue.facilities.cafeteria,
        coaching:
          facilities.coaching !== undefined
            ? facilities.coaching
            : venue.facilities.coaching,
        sportsGoods:
          facilities.sportsGoods !== undefined
            ? facilities.sportsGoods
            : venue.facilities.sportsGoods,
      };
    }

    const updatedVenue = await venue.save();
    res.json(updatedVenue);
  } catch (error) {
    console.error("Update venue error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update court
exports.updateCourt = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sportType, dimensions, pricePerSlot } = req.body;

    // Find court and verify ownership
    const court = await Court.findById(id).populate("venue");

    if (!court) {
      return res.status(404).json({ message: "Court not found" });
    }

    // Check if manager owns the venue
    if (court.venue.manager.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Update fields
    if (name) court.name = name;
    if (sportType) court.sportType = sportType;
    if (dimensions) {
      court.dimensions = {
        length: dimensions.length || court.dimensions.length,
        width: dimensions.width || court.dimensions.width,
        totalArea: dimensions.totalArea || dimensions.length * dimensions.width,
      };
    }
    if (pricePerSlot) court.pricePerSlot = pricePerSlot;

    const updatedCourt = await court.save();
    res.json(updatedCourt);
  } catch (error) {
    console.error("Update court error:", error);
    res.status(500).json({ message: error.message });
  }
};
