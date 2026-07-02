const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "user"],
      default: "user",
    },
    location: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },
    lastLocationUpdate: {
      type: Date,
      default: null,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    // ADD THESE NEW FIELDS
    phone: {
      type: String,
      default: "",
    },
    profileImage: {
      type: String,
      default: "",
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Venue",
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
