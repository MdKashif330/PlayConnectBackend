const Venue = require("../models/Venue");
const Court = require("../models/Court");

// @desc    Get all venues (with filters)
// @route   GET /api/venues
// @access  Public
const getAllVenues = async (req, res) => {
  try {
    const { sport, location, lat, lng, radius, limit = 20 } = req.query;

    let query = { isActive: true };

    // Filter by sport if provided
    if (sport) {
      // Find venues that have courts with this sport
      const courtsWithSport = await Court.find({
        sportType: { $regex: new RegExp(sport, "i") },
        isActive: true,
      }).distinct("venue");
      query._id = { $in: courtsWithSport };
    }

    // Filter by location if coordinates provided
    if (lat && lng && radius) {
      // Parse radius (in km) and convert to radians
      const radiusInRadians = radius / 6371; // Earth's radius in km

      query.location = {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], radiusInRadians],
        },
      };
    } else if (location) {
      // Simple text search on location
      query["location.address"] = { $regex: new RegExp(location, "i") };
    }

    const venues = await Venue.find(query)
      .populate("manager", "name")
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get court counts and min price for each venue
    const venuesWithDetails = await Promise.all(
      venues.map(async (venue) => {
        const courts = await Court.find({
          venue: venue._id,
          isActive: true,
        });

        const courtCount = courts.length;
        const minPrice =
          courts.length > 0
            ? Math.min(...courts.map((c) => c.pricePerSlot))
            : 0;

        return {
          ...venue.toObject(),
          courtCount,
          priceFrom: minPrice,
        };
      }),
    );

    res.json(venuesWithDetails);
  } catch (error) {
    console.error("Error in getAllVenues:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get venue by ID
// @route   GET /api/venues/:id
// @access  Public
const getVenueById = async (req, res) => {
  try {
    const venue = await Venue.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate("manager", "name phone email");

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    // Get all courts for this venue
    const courts = await Court.find({
      venue: venue._id,
      isActive: true,
    });

    // Get available payment methods
    const paymentMethods = [
      ...new Set(courts.flatMap((c) => c.paymentMethods || [])),
    ];

    res.json({
      ...venue.toObject(),
      courts,
      paymentMethods,
      courtCount: courts.length,
    });
  } catch (error) {
    console.error("Error in getVenueById:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get courts for a venue
// @route   GET /api/venues/:id/courts
// @access  Public
const getVenueCourts = async (req, res) => {
  try {
    const courts = await Court.find({
      venue: req.params.id,
      isActive: true,
    });

    res.json(courts);
  } catch (error) {
    console.error("Error in getVenueCourts:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllVenues,
  getVenueById,
  getVenueCourts,
};
