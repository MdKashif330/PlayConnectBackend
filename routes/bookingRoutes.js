const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { protect, managerOnly } = require("../middleware/authMiddleware");

// User routes
router.post("/", protect, bookingController.createBooking);
router.post("/simulate-payment", protect, bookingController.simulatePayment);
router.get("/user", protect, bookingController.getUserBookings);

// Manager routes
router.get(
  "/manager/status/:status",
  protect,
  managerOnly,
  bookingController.getManagerFutureBookingsByStatus,
);
router.get(
  "/manager/history",
  protect,
  managerOnly,
  bookingController.getManagerBookingHistory,
);
router.get(
  "/manager/reservations",
  protect,
  managerOnly,
  bookingController.getManagerReservations,
);
router.get(
  "/manager/date/:date",
  protect,
  managerOnly,
  bookingController.getManagerBookingsByDate,
);
router.get(
  "/manager/stats",
  protect,
  managerOnly,
  bookingController.getManagerDashboardStats,
);

module.exports = router;
