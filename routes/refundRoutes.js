const express = require("express");
const router = express.Router();
const {
  createRefundRequest,
  getUserRefunds,
  getManagerRefunds,
  updateRefundStatus,
  getRefundById,
} = require("../controllers/refundController");
const { protect } = require("../middleware/authMiddleware");

// User routes
router.post("/", protect, createRefundRequest);
router.get("/my-refunds", protect, getUserRefunds);
router.get("/:id", protect, getRefundById);

// Manager routes
router.get("/manager/refunds", protect, getManagerRefunds);
router.put("/:id/status", protect, updateRefundStatus);

module.exports = router;
