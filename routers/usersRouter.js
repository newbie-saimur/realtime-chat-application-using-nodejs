// External Imports
const express = require("express");

// Internal Imports
const decorateHtmlResponse = require("../middlewares/common/decorateHtmlResponse");
const { getUsers } = require("../controllers/usersController");

const router = express.Router();

// Get Users Page
router.get("/", decorateHtmlResponse("Users"), getUsers);

module.exports = router;
