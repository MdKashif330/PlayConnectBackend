const express = require("express");
const router = express.Router();
const multer = require("multer"); // Add this import
const { protect } = require("../middleware/authMiddleware");

const {
  register,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  deleteAccount,
  uploadProfileImage, // Make sure this is imported
} = require("../controllers/authController");

// Configure multer for file uploads
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Protected routes
router.get("/me", protect, getCurrentUser);
router.put("/update-profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.delete("/delete-account", protect, deleteAccount);

// Image upload route with multer middleware
router.post(
  "/upload-profile-image",
  protect,
  upload.single("image"),
  uploadProfileImage,
);

module.exports = router;
