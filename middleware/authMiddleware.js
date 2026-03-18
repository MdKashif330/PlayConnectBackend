const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  console.log("🔐 protect middleware called");
  console.log(
    "Headers:",
    req.headers.authorization ? "Has Authorization" : "No Authorization",
  );

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      console.log("Token received, length:", token.length);

      // Check JWT_SECRET exists
      if (!process.env.JWT_SECRET) {
        console.log("❌ JWT_SECRET not set in environment");
        return res.status(500).json({ message: "Server configuration error" });
      }

      console.log("Verifying token with JWT_SECRET...");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ Token verified successfully");
      console.log("Decoded user id:", decoded.id);
      console.log("Decoded payload:", decoded);

      console.log("Looking up user in database...");
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        console.log("❌ User not found in database for id:", decoded.id);
        return res.status(401).json({ message: "User not found" });
      }

      console.log("✅ User found:", req.user.email);
      console.log("User role:", req.user.role);
      console.log("Calling next()...");
      return next();
    } catch (error) {
      console.log("❌ Auth error:", error.message);
      console.log("Error name:", error.name);
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Invalid token" });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Not authorized" });
    }
  } else {
    console.log("❌ No Bearer token found in headers");
    return res.status(401).json({ message: "No token provided" });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

const managerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if (req.user.role !== "manager") {
    return res.status(403).json({ message: "Manager access only" });
  }
  next();
};

module.exports = {
  protect,
  adminOnly,
  managerOnly,
};
