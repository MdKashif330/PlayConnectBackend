const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  console.log("🔐 protect middleware called");
  console.log("next is function?", typeof next === "function");

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      console.log("Token received");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded user id:", decoded.id);
      req.user = await User.findById(decoded.id).select("-password");
      console.log("User found:", req.user ? "YES" : "NO");
      console.log("Calling next()...");
      return next(); // Use return to prevent double execution
    } catch (error) {
      console.log("Auth error:", error.message);
      return res.status(401).json({ message: "Not authorized" });
    }
  } else {
    console.log("No Bearer token");
    return res.status(401).json({ message: "No token provided" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

const managerOnly = (req, res, next) => {
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
