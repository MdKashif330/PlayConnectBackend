const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const { protect } = require("../middleware/authMiddleware");
const {
  createVenue,
  createCourt,
  getCourts,
  getManagerVenues,
  getManagerBookings,
  approveBooking,
  rejectBooking,
  getCourtBookings,
  getVenueById,
  deleteCourt,
  updateVenue,
  updateCourt,
  deleteVenue,
  uploadCourtImage,
  uploadVenueImage,
} = require("../controllers/managerController");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath =
      file.fieldname === "image" && req.baseUrl.includes("courts")
        ? "uploads/courts/"
        : "uploads/venues/";

    const fs = require("fs");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const prefix = req.baseUrl.includes("courts") ? "court" : "venue";
    cb(null, prefix + "-" + uniqueSuffix + path.extname(file.originalname));
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

// Manager-only middleware
const managerOnly = (req, res, next) => {
  if (req.user.role !== "manager") {
    return res.status(403).json({ message: "Manager access only" });
  }
  next();
};

// Venue routes
router.post("/venues", protect, managerOnly, createVenue);
router.get("/venues", protect, managerOnly, getManagerVenues);

// NEW: Venue image upload route
router.post(
  "/venues/upload-image",
  protect,
  managerOnly,
  upload.single("image"),
  uploadVenueImage,
);

// Court routes
router.post("/courts", protect, managerOnly, createCourt);
router.get("/courts", protect, managerOnly, getCourts);

// Court image upload route
router.post(
  "/courts/upload-image",
  protect,
  managerOnly,
  upload.single("image"),
  uploadCourtImage,
);

// Booking routes
router.get("/bookings", protect, managerOnly, getManagerBookings);
router.put("/bookings/:id/approve", protect, managerOnly, approveBooking);
router.put("/bookings/:id/reject", protect, managerOnly, rejectBooking);
router.get("/courts/:courtId/bookings", protect, managerOnly, getCourtBookings);
router.get("/venues/:id", protect, managerOnly, getVenueById);
router.put("/venues/:id", protect, managerOnly, updateVenue);
router.put("/courts/:id", protect, managerOnly, updateCourt);

router.delete("/venues/:id", protect, managerOnly, deleteVenue);
router.delete("/courts/:id", protect, managerOnly, deleteCourt);

module.exports = router;
