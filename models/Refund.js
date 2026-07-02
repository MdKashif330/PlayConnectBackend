const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED"],
      default: "PENDING",
    },
    proofImage: {
      type: String,
      default: null,
    },
    accountDetails: {
      accountType: {
        type: String,
        enum: ["easypaisa", "jazzcash", "bank"],
        required: true,
      },
      accountNumber: {
        type: String,
        required: true,
      },
      accountHolderName: {
        type: String,
        required: true,
      },
    },
    adminResponse: {
      type: String,
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    bookingStatus: {
      type: String,
      enum: ["CANCELLED", "REJECTED", "CONFIRMED"],
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Refund", refundSchema);
