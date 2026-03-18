const Slot = require("../models/Slot");

exports.createSlot = async (req, res) => {
  try {
    const { courtId, date, startTime, endTime } = req.body;

    if (!courtId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const slot = await Slot.create({
      court: courtId,
      date,
      startTime,
      endTime,
    });

    res.status(201).json({
      message: "Slot created successfully",
      slot,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const { courtId, date } = req.query;

    if (!courtId || !date) {
      return res.status(400).json({
        message: "courtId and date are required",
      });
    }

    const slots = await Slot.find({
      court: courtId,
      date,
      isBooked: false,
    }).sort({ startTime: 1 });

    res.status(200).json({
      message: "Available slots fetched successfully",
      slots,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.bookSlot = async (req, res) => {
  try {
    const { slotId } = req.params;

    const slot = await Slot.findById(slotId);

    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    if (slot.isBooked) {
      return res.status(400).json({ message: "Slot already booked" });
    }

    slot.isBooked = true;
    slot.bookedBy = req.user.id;

    await slot.save();

    res.status(200).json({
      message: "Slot booked successfully",
      slot,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const { courtId, date } = req.query;

    if (!courtId || !date) {
      return res.status(400).json({
        message: "courtId and date are required",
      });
    }

    const slots = await Slot.find({
      court: courtId,
      date,
      isBooked: true,
    }).sort({ startTime: 1 });

    res.status(200).json({
      message: "Booked slots fetched successfully",
      slots,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
