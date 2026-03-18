const User = require("../models/User");
const Venue = require("../models/Venue");

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;

    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add venue to favorites
// @route   POST /api/users/favorites/:venueId
// @access  Private
const addFavorite = async (req, res) => {
  try {
    const { venueId } = req.params;

    // Check if venue exists
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    const user = await User.findById(req.user._id);

    // Check if already in favorites
    if (user.favorites && user.favorites.includes(venueId)) {
      return res.status(400).json({ message: "Venue already in favorites" });
    }

    // Add to favorites
    if (!user.favorites) user.favorites = [];
    user.favorites.push(venueId);
    await user.save();

    res.json({ message: "Added to favorites", favorites: user.favorites });
  } catch (error) {
    console.error("Error in addFavorite:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove venue from favorites
// @route   DELETE /api/users/favorites/:venueId
// @access  Private
const removeFavorite = async (req, res) => {
  try {
    const { venueId } = req.params;

    const user = await User.findById(req.user._id);

    if (!user.favorites || !user.favorites.includes(venueId)) {
      return res.status(404).json({ message: "Venue not in favorites" });
    }

    // Remove from favorites
    user.favorites = user.favorites.filter((id) => id.toString() !== venueId);
    await user.save();

    res.json({ message: "Removed from favorites", favorites: user.favorites });
  } catch (error) {
    console.error("Error in removeFavorite:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's favorite venues
// @route   GET /api/users/favorites
// @access  Private
const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "favorites",
      match: { isActive: true },
    });

    // Get court counts for each favorite venue
    const favoritesWithDetails = await Promise.all(
      user.favorites.map(async (venue) => {
        const Court = require("../models/Court");
        const courts = await Court.find({
          venue: venue._id,
          isActive: true,
        });

        return {
          ...venue.toObject(),
          courtCount: courts.length,
          priceFrom:
            courts.length > 0
              ? Math.min(...courts.map((c) => c.pricePerSlot))
              : 0,
        };
      }),
    );

    res.json(favoritesWithDetails);
  } catch (error) {
    console.error("Error in getFavorites:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  addFavorite,
  removeFavorite,
  getFavorites,
};
