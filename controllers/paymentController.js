const Payment = require("../models/Payment");
const Booking = require("../models/Booking");

/**
 * @desc   User uploads payment proof
 * @route  POST /api/payments
 * @access User
 */
exports.createPayment = async (req, res) => {
  try {
    const { bookingId, paymentMethodId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Payment screenshot required" });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const payment = await Payment.create({
      booking: booking._id,
      user: req.user.id,
      manager: booking.manager,
      paymentMethod: paymentMethodId,
      screenshot: req.file.path,
    });

    res.status(201).json({
      message: "Payment submitted successfully",
      payment,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @desc   Manager approves/rejects payment
 * @route  PUT /api/payments/:id/decision
 * @access Manager
 */
exports.decidePayment = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.manager.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    payment.status = status;
    await payment.save();

    if (status === "APPROVED") {
      await Booking.findByIdAndUpdate(payment.booking, {
        status: "CONFIRMED",
      });
    }

    res.json({ message: `Payment ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
