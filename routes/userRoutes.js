const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getUserProfile,
  updateUserProfile,
  addFavorite,
  removeFavorite,
  getFavorites,
} = require("../controllers/userController");

// Profile routes
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);

// Favorites routes
router.get("/favorites", protect, getFavorites);
router.post("/favorites/:venueId", protect, addFavorite);
router.delete("/favorites/:venueId", protect, removeFavorite);

module.exports = router;
