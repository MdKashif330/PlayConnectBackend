const User = require("../models/User");
const Venue = require("../models/Venue");

// GET all pending users
exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ isApproved: false });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET all pending managers
exports.getPendingManagers = async (req, res) => {
  try {
    const managers = await User.find({
      role: "manager",
      isApproved: false,
    }).select("-password");

    res.json(managers);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// APPROVE user
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true },
    );

    res.json({ message: "User approved successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// APPROVE manager
exports.approveManager = async (req, res) => {
  try {
    const manager = await User.findById(req.params.id);

    if (!manager || manager.role !== "manager") {
      return res.status(404).json({ message: "Manager not found" });
    }

    manager.isApproved = true;
    await manager.save();

    res.json({ message: "Manager approved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// MAKE USER MANAGER
exports.makeManager = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = "manager";
    user.isApproved = true;
    await user.save();

    res.json({ message: "User promoted to manager successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET all users (for admin panel)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE user (admin can delete any user)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE user (reject)
exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User rejected and deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE manager (reject)
exports.rejectManager = async (req, res) => {
  try {
    const manager = await User.findByIdAndDelete(req.params.id);

    if (!manager) {
      return res.status(404).json({ message: "Manager not found" });
    }

    res.json({ message: "Manager rejected and deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET all venues
exports.getAllVenues = async (req, res) => {
  try {
    const venues = await Venue.find({}).populate("manager", "name email");
    res.json(venues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
