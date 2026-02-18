// const Booking = require("../models/Booking");
// const Court = require("../models/Court");
// const Venue = require("../models/Venue");

// // CREATE BOOKING
// const createBooking = async (req, res) => {
//   console.log("📝 createBooking called with body:", req.body);

//   try {
//     const { courtId, date, slot, startDate, endDate } = req.body;

//     console.log("📝 Parsed fields:", {
//       courtId,
//       date,
//       slot,
//       startDate,
//       endDate,
//     });

//     const [startTime, endTime] = slot.split("-");
//     console.log("📝 Times parsed:", { startTime, endTime });

//     const court = await Court.findById(courtId).populate("venue");
//     console.log("📝 Court found:", court ? "YES" : "NO");

//     if (!court || !court.isActive) {
//       console.log("❌ Court not available");
//       return res.status(404).json({ message: "Court not available" });
//     }

//     // Use startDate for checking if provided
//     const checkDate = startDate || date;
//     console.log("📝 Checking for existing bookings on date:", checkDate);

//     const existingBooking = await Booking.findOne({
//       court: courtId,
//       date: checkDate,
//       startTime,
//       endTime,
//       status: { $in: ["PENDING", "CONFIRMED"] },
//     });

//     if (existingBooking) {
//       console.log("❌ Slot already booked");
//       return res.status(400).json({
//         message: "Slot already requested or booked",
//       });
//     }

//     // Prepare booking data
//     const bookingData = {
//       user: req.user._id,
//       venue: court.venue._id,
//       court: courtId,
//       date: startDate || date, // Use startDate if provided
//       startTime,
//       endTime,
//       totalPrice: court.pricePerSlot,
//       status: "PENDING",
//     };

//     console.log("📝 Base booking data:", bookingData);

//     // Add multi-day fields if provided
//     if (startDate && endDate) {
//       bookingData.startDate = startDate;
//       bookingData.endDate = endDate;
//       console.log("📝 Added multi-day fields:", { startDate, endDate });

//       // Calculate days difference for logging
//       const start = new Date(startDate);
//       const end = new Date(endDate);
//       const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
//       console.log(`📅 Date difference: ${diffDays} days`);
//       console.log(`🏷️ Will be multi-day (≥3 days): ${diffDays >= 3}`);
//     }

//     // Create booking
//     console.log("📝 Creating booking in database...");
//     const booking = await Booking.create(bookingData);

//     // Fetch the complete booking with all fields
//     const fullBooking = await Booking.findById(booking._id);
//     console.log("📝 Booking created:", fullBooking.toObject());

//     const message =
//       startDate && endDate
//         ? "Multi-day booking created. Complete payment within 30 minutes."
//         : "Booking created. Complete payment within 30 minutes.";

//     console.log("✅ Success:", message);

//     res.status(201).json({
//       message,
//       booking: fullBooking,
//     });
//   } catch (error) {
//     console.error("❌ createBooking ERROR:", error);
//     console.error("❌ Error stack:", error.stack);
//     res.status(500).json({ message: error.message });
//   }
// };

// // GET USER'S BOOKINGS
// const getUserBookings = async (req, res) => {
//   try {
//     const bookings = await Booking.find({ user: req.user.id })
//       .populate("venue", "name location.address")
//       .populate("court", "name sportType pricePerSlot")
//       .sort({ createdAt: -1 });
//     res.json(bookings);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // SIMULATE PAYMENT
// const simulatePayment = async (req, res) => {
//   try {
//     const { bookingId, method } = req.body;
//     const booking = await Booking.findById(bookingId);
//     if (!booking) {
//       return res.status(404).json({ message: "Booking not found" });
//     }
//     if (booking.status !== "PENDING") {
//       return res.status(400).json({
//         message: "Booking is not pending",
//       });
//     }
//     booking.status = "CONFIRMED";
//     booking.paymentMethod = method || "CASH";
//     await booking.save();
//     res.json({
//       message: "Payment successful. Booking confirmed.",
//       booking,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// module.exports = {
//   createBooking,
//   getUserBookings,
//   simulatePayment,
// };
