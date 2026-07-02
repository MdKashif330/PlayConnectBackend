const express = require("express");
const router = express.Router();
const { aiChatQuery } = require("../controllers/aiChatbotController");

// Public route - no authentication needed
router.post("/query", aiChatQuery);

module.exports = router;
