const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    images: [
      {
        type: String,
      },
    ],
    address: {
      type: String,
      default: "",
    },
    location: {
      address: String,
      latitude: Number,
      longitude: Number,
    },
    facilities: {
      lights: { type: Boolean, default: false },
      parking: { type: Boolean, default: false },
      cafeteria: { type: Boolean, default: false },
      coaching: { type: Boolean, default: false },
      sportsGoods: { type: Boolean, default: false },
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Venue", venueSchema);
