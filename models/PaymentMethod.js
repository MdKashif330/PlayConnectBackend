const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    methodName: {
      type: String,
      enum: ["EASYPAISA", "JAZZCASH", "CASH"],
      uppercase: true,
      trim: true,
      required: true,
    },

    accountNumber: {
      type: String,
      required: function () {
        return this.methodName !== "CASH";
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * ❗ IMPORTANT
 * Prevent same manager from adding same payment method twice
 */
paymentMethodSchema.index({ manager: 1, methodName: 1 }, { unique: true });

module.exports = mongoose.model("PaymentMethod", paymentMethodSchema);
