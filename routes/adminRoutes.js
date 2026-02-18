const express = require("express");
const router = express.Router();
const {
  getPendingUsers,
  getPendingManagers,
  approveUser,
  approveManager,
  makeManager,
} = require("../controllers/adminController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// Admin protected routes
router.get("/pending-users", protect, adminOnly, getPendingUsers);
router.get("/pending-managers", protect, adminOnly, getPendingManagers);
router.put("/approve/:id", protect, adminOnly, approveUser);
router.put("/approve-manager/:id", protect, adminOnly, approveManager);
router.put("/make-manager/:id", protect, adminOnly, makeManager);

//
// router.get("/debug-users", async (req, res) => {
//   const users = await User.find({});
//   res.json(users);
// });

module.exports = router;
