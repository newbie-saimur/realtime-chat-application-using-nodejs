// External Imports
const express = require("express");

// Internal Imports
const decorateHtmlResponse = require("../middlewares/common/decorateHtmlResponse");
const { getInbox } = require("../controllers/inboxController");

const router = express.Router();

// Get Inbox Page
router.get("/", decorateHtmlResponse("Inbox"), getInbox);

module.exports = router;
