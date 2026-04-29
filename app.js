// External Imports
const cookieParser = require("cookie-parser");
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

// Internal Imports
const loginRouter = require("./routers/loginRouter");
const usersRouter = require("./routers/usersRouter");
const inboxRouter = require("./routers/inboxRouter");
const {
    notFoundHandler,
    errorHandler,
} = require("./middlewares/common/errorHandler");

const app = express();

// Database Connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("Database Connection Successful!"))
    .catch((err) => console.log(err));

// Request Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set View Engine
app.set("view engine", "ejs");

// Set Static Folder
app.use(express.static(path.join(__dirname, "public")));

// Set Cookie Parser
app.use(cookieParser(process.env.COOKIE_SECRET));

// Routing Setup
app.use("/", loginRouter);
app.use("/users", usersRouter);
app.use("/inbox", inboxRouter);

// 404 Error Handler
app.use(notFoundHandler);

// Default Error Handler
app.use(errorHandler);

app.listen(process.env.PORT, () => {
    console.log(`Listening to port: ${process.env.PORT}`);
});
