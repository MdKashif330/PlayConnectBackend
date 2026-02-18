const Booking = require("../models/Booking");
const Court = require("../models/Court");
const Venue = require("../models/Venue");

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
    const { courtId, date, slot, slots, startDate, endDate } = req.body;

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
    };

    if (startDate && endDate) {
      bookingData.startDate = startDate;
      bookingData.endDate = endDate;
    }

    const booking = await Booking.create(bookingData);
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
      .populate("venue", "name location.address")
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

// ==================== MANAGER BOOKING FUNCTIONS ====================

const getManagerFutureBookingsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const managerId = req.user.id;

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

    const allBookings = await Booking.find({
      venue: { $in: venueIds },
      status: status.toUpperCase(),
    })
      .populate("venue", "name")
      .populate("court", "name")
      .populate("user", "name email")
      .sort({ date: 1 });

    const futureBookings = allBookings.filter((booking) => {
      const bookingDate = booking.startDate || booking.date;
      const date = new Date(bookingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (date > today) return true;
      if (date.getTime() === today.getTime()) {
        // Get last slot end time
        const lastSlot =
          booking.slots && booking.slots.length > 0
            ? booking.slots[booking.slots.length - 1].endTime
            : booking.endTime;
        return lastSlot >= currentTime;
      }
      return false;
    });

    const formattedBookings = futureBookings.map((booking) =>
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

// ==================== EXPORT ALL FUNCTIONS ====================

module.exports = {
  // User functions
  createBooking,
  getUserBookings,
  simulatePayment,

  // Manager functions
  getManagerFutureBookingsByStatus,
  getManagerBookingHistory,
  getManagerReservations,
  getManagerDashboardStats,
  getManagerBookingsByDate,
};
