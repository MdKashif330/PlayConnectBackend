const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema(
  {
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    location: {
      address: {
        type: String,
        required: true,
      },
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
    },

    facilities: {
      lights: { type: Boolean, default: false },
      cafeteria: { type: Boolean, default: false },
      coaching: { type: Boolean, default: false },
      sportsGoods: { type: Boolean, default: false },
      parking: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Venue", venueSchema);
