require("dotenv").config();
const adminRoutes = require("./routes/adminRoutes");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const managerRoutes = require("./routes/managerRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentMethodRoutes = require("./routes/paymentMethodRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const vacationRoutes = require("./routes/vacationRoutes");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection (LOCALHOST ONLY)
mongoose
  .connect("mongodb://127.0.0.1:27017/playconnect")
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/slots", require("./routes/slotRoutes"));
app.use("/api/bookings", bookingRoutes);
app.use(
  "/api/manager/payment-methods",
  require("./routes/paymentMethodRoutes"),
);
app.use("/api/payment-methods", paymentMethodRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/courts", require("./routes/courtRoutes"));
app.use("/api/vacations", vacationRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("PlayConnect Backend is running on localhost");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
