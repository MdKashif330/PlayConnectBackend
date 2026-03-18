// @desc    Check if a specific date is a vacation for a venue
// @route   GET /api/vacations/check
// @access  Public
exports.checkVacation = async (req, res) => {
  try {
    const { venueId, date } = req.query;

    if (!venueId || !date) {
      return res.status(400).json({ message: "venueId and date are required" });
    }

    const vacation = await Vacation.findOne({
      venue: venueId,
      startDate: { $lte: date },
      endDate: { $gte: date },
    });

    res.json({
      isVacation: !!vacation,
      vacation: vacation || null,
    });
  } catch (error) {
    console.error("Error checking vacation:", error);
    res.status(500).json({ message: error.message });
  }
};
