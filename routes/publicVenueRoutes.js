const express = require("express");
const router = express.Router();
const {
  getAllVenues,
  getVenueById,
  getVenueCourts,
} = require("../controllers/publicVenueController");

// Public venue routes
router.get("/", getAllVenues);
router.get("/:id", getVenueById);
router.get("/:id/courts", getVenueCourts);

module.exports = router;
