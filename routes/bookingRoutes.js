const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const bookingController = require("../controllers/bookingController");
const { protect, managerOnly } = require("../middleware/authMiddleware");

// Configure multer for payment proof uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = "uploads/payments/";
    const fs = require("fs");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "payment-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// ============ USER ROUTES ============
router.post("/", protect, bookingController.createBooking);
router.post("/simulate-payment", protect, bookingController.simulatePayment);
router.get("/user", protect, bookingController.getUserBookings);
router.get("/dates", protect, bookingController.getBookedDates);
router.get("/:id", protect, bookingController.getBookingById);
router.get(
  "/:id/payment-methods",
  protect,
  bookingController.getPaymentMethodsForBooking,
);
router.post(
  "/:id/submit-payment",
  protect,
  upload.single("paymentProof"),
  bookingController.submitPaymentProof,
);
router.put("/:id/cancel", protect, bookingController.cancelUserBooking);

// ============ MANAGER ROUTES ============

// Manager update booking status (NEW)
router.put(
  "/manager/:id/status",
  protect,
  managerOnly,
  bookingController.updateBookingStatus,
);

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

// Legacy payment routes (keep for backward compatibility)
router.post(
  "/manager/:id/request-payment",
  protect,
  managerOnly,
  bookingController.requestPayment,
);
router.post(
  "/manager/:id/verify-payment",
  protect,
  managerOnly,
  bookingController.verifyPayment,
);
router.post(
  "/manager/:id/reject",
  protect,
  managerOnly,
  bookingController.rejectBooking,
);

module.exports = router;
