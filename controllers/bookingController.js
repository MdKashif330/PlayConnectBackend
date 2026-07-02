const Booking = require("../models/Booking");
const Court = require("../models/Court");
const Venue = require("../models/Venue");
const Slot = require("../models/Slot");

// Helper function to format booking display
const formatBookingDisplay = (booking) => {
  const bookingObj = booking.toObject ? booking.toObject() : booking;

  if (bookingObj.slots && bookingObj.slots.length > 0) {
    if (bookingObj.slots.length === 1) {
      bookingObj.displaySlot = bookingObj.slots[0].slotString;
    } else {
      const firstSlot = bookingObj.slots[0].slotString;
      const lastSlot = bookingObj.slots[bookingObj.slots.length - 1].slotString;
      const startTime = firstSlot.split("-")[0].trim();
      const endTime = lastSlot.split("-")[1].trim();
      bookingObj.displaySlot = `${startTime} - ${endTime}`;
      bookingObj.slotCount = bookingObj.slots.length;
    }
  } else {
    // Fallback for older bookings
    bookingObj.displaySlot = `${bookingObj.startTime || ""} - ${bookingObj.endTime || ""}`;
    bookingObj.slotCount = 1;
  }

  return bookingObj;
};

// ==================== USER BOOKING FUNCTIONS ====================

const createBooking = async (req, res) => {
  try {
    const { courtId, date, slot, slots, startDate, endDate, paymentMethod } =
      req.body;

    let slotsArray = [];
    if (slots && Array.isArray(slots)) {
      slotsArray = slots;
    } else if (slot) {
      if (typeof slot === "string") {
        slotsArray = [slot];
      } else if (Array.isArray(slot)) {
        slotsArray = slot;
      }
    }

    if (!Array.isArray(slotsArray) || slotsArray.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one time slot required" });
    }

    const court = await Court.findById(courtId).populate("venue");

    if (!court || !court.isActive) {
      return res.status(404).json({ message: "Court not available" });
    }

    const checkDate = startDate || date;

    for (const slotItem of slotsArray) {
      const [startTime, endTime] = slotItem.split("-");

      const existingBooking = await Booking.findOne({
        court: courtId,
        date: checkDate,
        "slots.slotString": slotItem,
        status: { $in: ["PENDING", "CONFIRMED"] },
      });

      if (existingBooking) {
        return res.status(400).json({
          message: `Slot ${slotItem} already requested or booked`,
        });
      }
    }

    const formattedSlots = slotsArray.map((slotItem) => {
      const [startTime, endTime] = slotItem.split("-");
      return {
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        slotString: slotItem,
      };
    });

    const bookingData = {
      user: req.user._id,
      venue: court.venue._id,
      court: courtId,
      date: startDate || date,
      slots: formattedSlots,
      totalSlots: slotsArray.length,
      totalPrice: court.pricePerSlot * slotsArray.length,
      status: "PENDING",
      paymentMethod: paymentMethod || "cash", // Add this line
    };

    if (startDate && endDate) {
      bookingData.startDate = startDate;
      bookingData.endDate = endDate;
    }

    const booking = await Booking.create(bookingData);

    // ========== CREATE/UPDATE SLOT RECORDS ==========
    for (const slotItem of slotsArray) {
      const [startTime, endTime] = slotItem.split("-").map((s) => s.trim());
      const slotDate = startDate || date;

      // Check if slot already exists
      let existingSlot = await Slot.findOne({
        court: courtId,
        date: slotDate,
        startTime: startTime,
        endTime: endTime,
      });

      if (existingSlot) {
        // Update existing slot to booked
        existingSlot.isBooked = true;
        existingSlot.bookedBy = req.user._id;
        existingSlot.price = court.pricePerSlot;
        await existingSlot.save();
        console.log(`✅ Updated existing slot: ${slotItem}`);
      } else {
        // Create new slot record
        await Slot.create({
          court: courtId,
          date: slotDate,
          startTime: startTime,
          endTime: endTime,
          price: court.pricePerSlot,
          isBooked: true,
          bookedBy: req.user._id,
        });
        console.log(`✅ Created new slot record: ${slotItem}`);
      }
    }
    // ========== END SLOT CREATION ==========

    const formattedBooking = formatBookingDisplay(booking);

    const message =
      startDate && endDate
        ? `Multi-day booking created with ${slotsArray.length} slot(s).`
        : `Booking created with ${slotsArray.length} slot(s).`;

    res.status(201).json({
      message,
      booking: formattedBooking,
    });
  } catch (error) {
    console.error("❌ createBooking ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate("venue", "name location.address images")
      .populate("court", "name sportType pricePerSlot")
      .sort({ createdAt: -1 });

    const formattedBookings = bookings.map((booking) =>
      formatBookingDisplay(booking),
    );

    res.json(formattedBookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const simulatePayment = async (req, res) => {
  try {
    const { bookingId, method } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.status !== "PENDING") {
      return res.status(400).json({
        message: "Booking is not pending",
      });
    }
    booking.status = "CONFIRMED";
    booking.paymentMethod = method || "CASH";
    await booking.save();

    const formattedBooking = formatBookingDisplay(booking);

    res.json({
      message: "Payment successful. Booking confirmed.",
      booking: formattedBooking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== USER PAYMENT FUNCTIONS ====================

// Get payment methods for a booking
const getPaymentMethodsForBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).populate("court");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if booking belongs to user
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json({
      paymentMethods: booking.court.paymentMethods || ["cash"],
      accountDetails: booking.court.accountDetails || {},
    });
  } catch (error) {
    console.error("Error getting payment methods:", error);
    res.status(500).json({ message: error.message });
  }
};

// User submits payment proof
// User submits payment proof
const submitPaymentProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, transactionId } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if booking belongs to user
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Allow both AWAITING_PAYMENT and PAYMENT_SUBMITTED status
    if (
      booking.status !== "AWAITING_PAYMENT" &&
      booking.status !== "PAYMENT_SUBMITTED"
    ) {
      return res
        .status(400)
        .json({ message: "Payment not requested for this booking" });
    }

    // Handle file upload
    const paymentProof = req.file ? req.file.path : null;

    booking.paymentMethod = paymentMethod;
    booking.paymentProof = paymentProof;
    booking.paymentProofUploadedAt = new Date();
    if (transactionId) {
      booking.transactionId = transactionId;
    }
    // Keep status as PAYMENT_SUBMITTED (don't change)
    // booking.status remains "PAYMENT_SUBMITTED"

    await booking.save();

    res.json({
      message:
        "Payment proof submitted successfully. Waiting for manager verification.",
      booking,
    });
  } catch (error) {
    console.error("Error submitting payment proof:", error);
    res.status(500).json({ message: error.message });
  }
};

// User cancels booking
const cancelUserBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if booking belongs to user
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (booking.status !== "PENDING" && booking.status !== "AWAITING_PAYMENT") {
      return res.status(400).json({ message: "Cannot cancel this booking" });
    }

    booking.status = "CANCELLED";
    await booking.save();

    // FREE UP THE SLOTS - Make them available again
    const Slot = require("../models/Slot");

    for (const slot of booking.slots) {
      await Slot.updateOne(
        {
          court: booking.court,
          date: booking.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
        { isBooked: false, bookedBy: null },
      );
      console.log(
        `✅ Slot ${slot.startTime}-${slot.endTime} freed up for court ${booking.court}`,
      );
    }

    res.json({
      message: "Booking cancelled successfully. Slots are now available again.",
      booking,
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== MANAGER PAYMENT FUNCTIONS ====================

// Manager requests payment from user
const requestPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentRequestNote } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if manager owns this booking's venue
    const venue = await Venue.findOne({
      _id: booking.venue,
      manager: req.user.id,
    });

    if (!venue) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (booking.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "Booking cannot be requested for payment" });
    }

    booking.status = "PAYMENT_SUBMITTED";
    booking.managerNotes =
      paymentRequestNote || "Please complete payment to confirm your booking.";

    await booking.save();

    res.json({
      message: "Payment requested successfully",
      booking,
    });
  } catch (error) {
    console.error("Error requesting payment:", error);
    res.status(500).json({ message: error.message });
  }
};

// Manager rejects booking
const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    // Check if manager owns this booking's venue
    const venue = await Venue.findOne({
      _id: booking.venue,
      manager: req.user.id,
    });

    if (!venue) {
      return res.status(403).json({ message: "Not authorized" });
    }

    booking.status = "REJECTED";
    booking.managerNotes = rejectionReason || "Booking rejected";

    await booking.save();

    // FREE UP THE SLOTS - Make them available again
    const Slot = require("../models/Slot");

    for (const slot of booking.slots) {
      const result = await Slot.updateOne(
        {
          court: booking.court,
          date: booking.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
        { isBooked: false, bookedBy: null },
      );
    }

    res.json({
      message: "Booking rejected. Slots are now available again.",
      booking,
    });
  } catch (error) {
    console.error("Error rejecting booking:", error);
    res.status(500).json({ message: error.message });
  }
};

// Manager verifies payment and confirms booking
const verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved, rejectionReason } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if manager owns this booking's venue
    const venue = await Venue.findOne({
      _id: booking.venue,
      manager: req.user.id,
    });

    if (!venue) {
      return res
        .status(403)
        .json({ message: "Not authorized - You don't own this venue" });
    }

    if (booking.status !== "PAYMENT_SUBMITTED") {
      return res
        .status(400)
        .json({ message: "No payment proof submitted for this booking" });
    }

    if (isApproved) {
      booking.status = "CONFIRMED";
    } else {
      booking.status = "REJECTED";
      booking.paymentRejectionReason =
        rejectionReason || "Payment verification failed";

      // FREE UP THE SLOTS when payment is rejected
      const Slot = require("../models/Slot");

      for (const slot of booking.slots) {
        await Slot.updateOne(
          {
            court: booking.court,
            date: booking.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
          { isBooked: false, bookedBy: null },
        );
        console.log(
          `✅ Slot ${slot.startTime}-${slot.endTime} freed up for court ${booking.court}`,
        );
      }
    }

    await booking.save();

    res.json({
      message: isApproved
        ? "Payment verified, booking confirmed"
        : "Payment rejected. Slots are now available again.",
      booking,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== MANAGER UPDATE BOOKING STATUS (NEW) ====================

// Manager updates booking status directly (Unified endpoint)
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if manager owns this booking's venue
    const venue = await Venue.findOne({
      _id: booking.venue,
      manager: req.user.id,
    });

    if (!venue) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Valid status transitions
    const validStatuses = [
      "PENDING",
      "PAYMENT_SUBMITTED",
      "CONFIRMED",
      "REJECTED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    booking.status = status;
    if (notes) {
      booking.managerNotes = notes;
    }

    await booking.save();

    // If status is REJECTED or CANCELLED, free up the slots
    if (status === "REJECTED" || status === "CANCELLED") {
      const Slot = require("../models/Slot");

      for (const slot of booking.slots) {
        const result = await Slot.updateOne(
          {
            court: booking.court,
            date: booking.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
          { isBooked: false, bookedBy: null },
        );
        console.log(
          `✅ Slot ${slot.startTime}-${slot.endTime} freed up. Result:`,
          result,
        );
      }
    }

    console.log(`✅ Booking ${id} status updated to ${status}`);

    res.json({
      message: `Booking status updated to ${status}`,
      booking,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== MANAGER BOOKING FUNCTIONS ====================

const getManagerFutureBookingsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const managerId = req.user.id;

    console.log("🔍 Fetching bookings with status:", status);

    const venues = await Venue.find({ manager: managerId });
    const venueIds = venues.map((v) => v._id);

    if (venueIds.length === 0) {
      return res.status(200).json([]);
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const currentTime = today.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    const statusUpper = status.toUpperCase();

    const futureStatuses = [
      "PENDING",
      "AWAITING_PAYMENT",
      "PAYMENT_SUBMITTED",
      "CONFIRMED",
    ];
    const isFutureStatus = futureStatuses.includes(statusUpper);

    const allBookings = await Booking.find({
      venue: { $in: venueIds },
      status: statusUpper,
    })
      .populate("venue", "name")
      .populate("court", "name")
      .populate("user", "name email phone")
      .sort({ date: 1 });

    console.log(
      `📊 Found ${allBookings.length} bookings with status ${statusUpper}`,
    );

    let filteredBookings = allBookings;

    if (isFutureStatus) {
      filteredBookings = allBookings.filter((booking) => {
        const bookingDate = booking.startDate || booking.date;
        const date = new Date(bookingDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (date > today) return true;
        if (date.getTime() === today.getTime()) {
          const lastSlot =
            booking.slots && booking.slots.length > 0
              ? booking.slots[booking.slots.length - 1].endTime
              : booking.endTime;
          return lastSlot >= currentTime;
        }
        return false;
      });
    }

    const formattedBookings = filteredBookings.map((booking) =>
      formatBookingDisplay(booking),
    );

    res.status(200).json(formattedBookings);
  } catch (error) {
    console.error("Error fetching future bookings by status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getManagerBookingHistory = async (req, res) => {
  try {
    const managerId = req.user.id;

    const venues = await Venue.find({ manager: managerId });
    const venueIds = venues.map((v) => v._id);

    if (venueIds.length === 0) {
      return res.status(200).json([]);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const bookings = await Booking.find({
      venue: { $in: venueIds },
      $or: [
        {
          $or: [
            { startDate: { $gte: todayStr } },
            { date: { $gte: todayStr } },
          ],
        },
        {
          $and: [
            {
              $or: [
                { startDate: { $gte: thirtyDaysAgoStr, $lt: todayStr } },
                { date: { $gte: thirtyDaysAgoStr, $lt: todayStr } },
              ],
            },
          ],
        },
      ],
    })
      .populate("venue", "name")
      .populate("court", "name")
      .populate("user", "name email")
      .sort({ date: -1 });

    const formattedBookings = bookings.map((booking) =>
      formatBookingDisplay(booking),
    );

    res.status(200).json(formattedBookings);
  } catch (error) {
    console.error("Error fetching booking history:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getManagerReservations = async (req, res) => {
  try {
    const managerId = req.user.id;

    const venues = await Venue.find({ manager: managerId });
    const venueIds = venues.map((v) => v._id);

    if (venueIds.length === 0) return res.status(200).json([]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const reservations = await Booking.find({
      venue: { $in: venueIds },
      $or: [{ startDate: { $gte: todayStr } }, { date: { $gte: todayStr } }],
      isMultiDay: true,
    })
      .populate("venue", "name")
      .populate("court", "name")
      .populate("user", "name email")
      .sort({ startDate: 1 });

    const formattedReservations = reservations.map((booking) =>
      formatBookingDisplay(booking),
    );

    res.status(200).json(formattedReservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getManagerDashboardStats = async (req, res) => {
  try {
    const managerId = req.user.id;

    const venues = await Venue.find({ manager: managerId });
    const venueIds = venues.map((v) => v._id);

    if (venueIds.length === 0) {
      return res.json({ today: 0, week: 0 });
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekStr = startOfWeek.toISOString().split("T")[0];

    const todayBookings = await Booking.countDocuments({
      venue: { $in: venueIds },
      date: todayStr,
      status: "CONFIRMED",
    });

    const weekBookings = await Booking.countDocuments({
      venue: { $in: venueIds },
      date: { $gte: startOfWeekStr },
      status: "CONFIRMED",
    });

    res.json({
      today: todayBookings,
      week: weekBookings,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getManagerBookingsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const managerId = req.user.id;

    const venues = await Venue.find({ manager: managerId });
    const venueIds = venues.map((v) => v._id);

    if (venueIds.length === 0) {
      return res.status(200).json([]);
    }

    const bookings = await Booking.find({
      venue: { $in: venueIds },
      date: date,
    })
      .populate("venue", "name")
      .populate("court", "name")
      .populate("user", "name email")
      .sort({ date: 1 });

    const formattedBookings = bookings.map((booking) =>
      formatBookingDisplay(booking),
    );

    res.status(200).json(formattedBookings);
  } catch (error) {
    console.error("Error fetching bookings by date:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getBookedDates = async (req, res) => {
  try {
    const { month, venueId } = req.query;

    let query = {};

    if (req.user) {
      query.user = req.user.id;
    }

    if (venueId) {
      query.venue = venueId;
    }

    if (month) {
      const [year, monthNum] = month.split("-");
      const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
      const endDate = new Date(Date.UTC(year, monthNum, 1));

      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      query.date = {
        $gte: startDateStr,
        $lt: endDateStr,
      };
    }

    const bookings = await Booking.find(query).select("date status").lean();

    const bookedDates = {};
    bookings.forEach((booking) => {
      bookedDates[booking.date] = {
        marked: true,
        dotColor: booking.status === "CONFIRMED" ? "#2E7D32" : "#FFC107",
        status: booking.status,
      };
    });

    res.json(bookedDates);
  } catch (error) {
    console.error("Error getting booked dates:", error);
    res.status(500).json({ message: error.message });
  }
};

const getBookingById = async (req, res) => {
  try {
    // console.log("🔍 getBookingById called for booking:", req.params.id);
    // console.log("🔍 User ID:", req.user.id);
    // console.log("🔍 User role:", req.user.role);

    const booking = await Booking.findById(req.params.id)
      .populate("venue", "name location.address images phone")
      .populate("court", "name sportType pricePerSlot")
      .populate("user", "name email phone");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // console.log("🔍 Booking venue ID:", booking.venue?._id);
    // console.log("🔍 Booking user ID:", booking.user?._id);

    // Allow if:
    // 1. User owns the booking (user role)
    // 2. User is admin
    // 3. User is manager who owns the venue
    let isAuthorized = false;

    // Check if user owns the booking
    if (booking.user._id.toString() === req.user.id) {
      isAuthorized = true;
    }

    // Check if user is admin
    if (req.user.role === "admin") {
      isAuthorized = true;
    }

    // Check if user is manager who owns the venue
    if (req.user.role === "manager") {
      const venue = await Venue.findOne({
        _id: booking.venue,
        manager: req.user.id,
      });
      if (venue) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const formattedBooking = formatBookingDisplay(booking);
    res.json(formattedBooking);
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== EXPORT ALL FUNCTIONS ====================

module.exports = {
  // User functions
  createBooking,
  getUserBookings,
  simulatePayment,
  getBookedDates,
  getBookingById,
  getPaymentMethodsForBooking,
  submitPaymentProof,
  cancelUserBooking,

  // Manager functions
  getManagerFutureBookingsByStatus,
  getManagerBookingHistory,
  getManagerReservations,
  getManagerDashboardStats,
  getManagerBookingsByDate,
  requestPayment,
  rejectBooking,
  verifyPayment,
  updateBookingStatus,
};
