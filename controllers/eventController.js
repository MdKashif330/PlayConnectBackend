const Event = require("../models/Event");
const Court = require("../models/Court");
const Venue = require("../models/Venue");

// Create a new event
exports.createEvent = async (req, res) => {
  try {
    const {
      name,
      description,
      prize,
      entryFee,
      maxParticipants,
      startDate,
      endDate,
      courtIds,
    } = req.body;

    console.log("Creating event with data:", req.body);

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({
        message: "End date must be after start date",
      });
    }

    // Validate that the courts belong to the manager's venue
    const courts = await Court.find({ _id: { $in: courtIds } }).populate(
      "venue",
    );

    if (courts.length !== courtIds.length) {
      return res.status(400).json({ message: "One or more courts not found" });
    }

    // Check if all courts belong to the same venue
    const venueId = courts[0].venue._id;
    const sameVenue = courts.every(
      (court) => court.venue._id.toString() === venueId.toString(),
    );

    if (!sameVenue) {
      return res
        .status(400)
        .json({ message: "All courts must belong to the same venue" });
    }

    // Check if manager owns the venue
    const venue = await Venue.findOne({ _id: venueId, manager: req.user.id });
    if (!venue) {
      return res
        .status(403)
        .json({ message: "Unauthorized to create events at this venue" });
    }

    // Check for overlapping events on these courts
    const overlappingEvents = await Event.find({
      courts: { $in: courtIds },
      $or: [
        {
          startDate: { $lt: end },
          endDate: { $gt: start },
        },
      ],
      status: { $ne: "cancelled" },
    });

    if (overlappingEvents.length > 0) {
      return res.status(400).json({
        message:
          "One or more courts already have events scheduled during this time period",
      });
    }

    const event = await Event.create({
      name,
      description,
      prize,
      entryFee,
      maxParticipants,
      startDate: start,
      endDate: end,
      courts: courtIds,
      venue: venueId,
      createdBy: req.user.id,
    });

    res.status(201).json({
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all events for a manager
exports.getManagerEvents = async (req, res) => {
  try {
    const venues = await Venue.find({ manager: req.user.id });
    const venueIds = venues.map((v) => v._id);

    const events = await Event.find({ venue: { $in: venueIds } })
      .populate("courts", "name sportType")
      .populate("venue", "name")
      .populate("createdBy", "name email")
      .sort({ startDate: -1 });

    res.json(events);
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get single event details
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("courts", "name sportType pricePerSlot")
      .populate("venue", "name location")
      .populate("createdBy", "name email");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if manager owns the venue
    const venue = await Venue.findOne({
      _id: event.venue,
      manager: req.user.id,
    });
    if (!venue) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(event);
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const {
      name,
      description,
      prize,
      entryFee,
      maxParticipants,
      startDate,
      endDate,
      courtIds,
      status,
    } = req.body;

    const event = await Event.findById(req.params.id).populate("venue");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check ownership
    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Update fields
    if (name) event.name = name;
    if (description) event.description = description;
    if (prize !== undefined) event.prize = prize;
    if (entryFee !== undefined) event.entryFee = entryFee;
    if (maxParticipants !== undefined) event.maxParticipants = maxParticipants;
    if (startDate) event.startDate = startDate;
    if (endDate) event.endDate = endDate;
    if (courtIds) event.courts = courtIds;
    if (status) event.status = status;

    await event.save();
    res.json({ message: "Event updated successfully", event });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete/cancel event
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Permanently delete the event
    await Event.findByIdAndDelete(req.params.id);

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ message: error.message });
  }
};
