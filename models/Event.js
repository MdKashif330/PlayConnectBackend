const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    // Basic event info
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },

    // Event details
    prize: {
      type: String,
      default: "",
    },
    entryFee: {
      type: Number,
      default: 0,
    },
    maxParticipants: {
      type: Number,
      default: 0, // 0 means unlimited
    },

    // Date and time
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },

    // Which court(s) this event uses
    courts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Court",
        required: true,
      },
    ],

    // Venue (for easy filtering)
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },

    // Manager who created it
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Event status
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },

    // Participants
    registeredParticipants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        registeredAt: {
          type: Date,
          default: Date.now,
        },
        paymentStatus: {
          type: String,
          enum: ["pending", "completed", "failed"],
          default: "pending",
        },
      },
    ],

    // Banner image
    bannerImage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Ensure end date is after start date
eventSchema.pre("save", function (next) {
  if (this.endDate <= this.startDate) {
    next(new Error("End date must be after start date"));
  }
  next();
});

module.exports = mongoose.model("Event", eventSchema);
