const PaymentMethod = require("../models/PaymentMethod");

/**
 * @desc   Manager adds a payment method
 * @route  POST /api/payment-methods
 * @access Manager
 */
exports.addPaymentMethod = async (req, res) => {
  try {
    const { methodName, accountNumber } = req.body;

    if (!methodName) {
      return res.status(400).json({
        message: "Payment method name is required",
      });
    }

    // Check if payment method already exists for this manager
    const existingMethod = await PaymentMethod.findOne({
      manager: req.user.id,
      methodName: methodName.toUpperCase(),
    });

    if (existingMethod) {
      return res.status(400).json({
        message: "Payment method already exists",
      });
    }

    const paymentMethod = await PaymentMethod.create({
      manager: req.user.id,
      methodName,
      accountNumber,
    });

    res.status(201).json({
      message: "Payment method added successfully",
      paymentMethod,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error while adding payment method",
    });
  }
};
