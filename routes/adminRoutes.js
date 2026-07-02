const express = require("express");
const router = express.Router();
const {
  getPendingUsers,
  getPendingManagers,
  approveUser,
  approveManager,
  makeManager,
  getAllUsers,
  rejectUser,
  rejectManager,
  getAllVenues,
  deleteUser,
} = require("../controllers/adminController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// Admin protected routes
router.get("/pending-users", protect, adminOnly, getPendingUsers);
router.get("/pending-managers", protect, adminOnly, getPendingManagers);
router.put("/approve/:id", protect, adminOnly, approveUser);
router.put("/approve-manager/:id", protect, adminOnly, approveManager);
router.put("/make-manager/:id", protect, adminOnly, makeManager);
router.get("/users", protect, adminOnly, getAllUsers);
router.delete("/users/:id", protect, adminOnly, rejectUser);
router.delete("/managers/:id", protect, adminOnly, rejectManager);
router.get("/venues", protect, adminOnly, getAllVenues);
router.delete("/users/:id", protect, adminOnly, deleteUser);

module.exports = router;
