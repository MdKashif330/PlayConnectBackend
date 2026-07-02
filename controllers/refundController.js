const Refund = require("../models/Refund");
const Booking = require("../models/Booking");
const Venue = require("../models/Venue");

// Create refund request
exports.createRefundRequest = async (req, res) => {
  try {
    const { bookingId, reason, proofImage, accountDetails, bookingStatus } =
      req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if refund already exists for this booking
    const existingRefund = await Refund.findOne({ booking: bookingId });
    if (existingRefund) {
      return res
        .status(400)
        .json({ message: "Refund request already submitted for this booking" });
    }

    const refund = await Refund.create({
      booking: bookingId,
      user: req.user._id,
      venue: booking.venue,
      amount: booking.totalPrice,
      reason,
      proofImage: proofImage || null,
      accountDetails,
      bookingStatus,
    });

    res.status(201).json({
      success: true,
      message: "Refund request submitted successfully",
      refund,
    });
  } catch (error) {
    console.error("Error creating refund:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get user's refund requests
exports.getUserRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find({ user: req.user._id })
      .populate("booking", "date displaySlot totalPrice status")
      .populate("venue", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, refunds });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get manager's refund requests (for venues they manage)
exports.getManagerRefunds = async (req, res) => {
  try {
    // Get venues managed by this manager
    const venues = await Venue.find({ manager: req.user._id });
    const venueIds = venues.map((v) => v._id);

    const refunds = await Refund.find({ venue: { $in: venueIds } })
      .populate("booking", "date displaySlot totalPrice status")
      .populate("user", "name email phone")
      .populate("venue", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, refunds });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update refund status (approve/reject)
exports.updateRefundStatus = async (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    const refund = await Refund.findById(req.params.id);

    if (!refund) {
      return res.status(404).json({ message: "Refund not found" });
    }

    refund.status = status;
    refund.adminResponse = adminResponse;
    refund.respondedAt = new Date();

    await refund.save();

    res.json({
      success: true,
      message: `Refund ${status.toLowerCase()} successfully`,
      refund,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single refund by ID
exports.getRefundById = async (req, res) => {
  try {
    const refund = await Refund.findById(req.params.id)
      .populate("booking", "date displaySlot totalPrice status court")
      .populate("user", "name email phone")
      .populate("venue", "name phone email");

    if (!refund) {
      return res.status(404).json({ message: "Refund not found" });
    }

    res.json({ success: true, refund });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
