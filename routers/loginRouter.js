// External Imports
const express = require("express");

// Internal Imports
const decorateHtmlResponse = require("../middlewares/common/decorateHtmlResponse");
const { getLogin } = require("../controllers/loginController");

const router = express.Router();

// Get Login Page
router.get("/", decorateHtmlResponse("Login"), getLogin);

module.exports = router;
