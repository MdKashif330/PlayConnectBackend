const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
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
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Court",
      required: true,
    },
    date: {
      type: String, // Single booking date (YYYY-MM-DD)
      required: true,
    },
    startDate: {
      type: String, // Start date for multi-day bookings (YYYY-MM-DD)
    },
    endDate: {
      type: String, // End date for multi-day bookings (YYYY-MM-DD)
    },
    // CHANGED: Single time slots to array of slots
    slots: [
      {
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
        slotString: {
          type: String, // Store "06:00-07:00" format for easy display
          required: true,
        },
      },
    ],
    totalSlots: {
      type: Number,
      default: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "PAYMENT_SUBMITTED",
        "CONFIRMED",
        "REJECTED",
        "CANCELLED",
      ],
      default: "PENDING",
    },
    paymentMethod: {
      type: String,
    },
    paymentProof: {
      type: String,
    },
    isMultiDay: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Pre-save middleware to automatically set isMultiDay
bookingSchema.pre("save", function () {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    this.isMultiDay = diffDays >= 3;
    // Ensure date field matches startDate for consistency
    if (!this.date) {
      this.date = this.startDate;
    }
  } else {
    this.isMultiDay = false;
  }

  // Calculate totalSlots
  this.totalSlots = this.slots.length;
});

module.exports = mongoose.model("Booking", bookingSchema);
