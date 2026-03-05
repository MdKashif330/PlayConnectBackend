const express = require("express");
const router = express.Router();

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
} = require("../controllers/managerController");

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

// Court routes
router.post("/courts", protect, managerOnly, createCourt);
router.get("/courts", protect, managerOnly, getCourts);

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
