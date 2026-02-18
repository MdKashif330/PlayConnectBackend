const mongoose = require("mongoose");

const courtSchema = new mongoose.Schema(
  {
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    sportType: {
      type: String,
      required: true,
      enum: [
        "football",
        "cricket",
        "badminton",
        "tennis",
        "basketball",
        "Cricket",
        "Football",
        "Tenis",
        "Badminton",
      ],
    },

    dimensions: {
      length: {
        type: Number,
        required: true,
      },
      width: {
        type: Number,
        required: true,
      },
      totalArea: {
        type: Number,
        required: true,
      },
    },

    pricePerSlot: {
      type: Number,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Court", courtSchema);
