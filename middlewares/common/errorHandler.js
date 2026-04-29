const createError = require("http-errors");

const notFoundHandler = (req, res, next) => {
    next(createError(404, "Your requested content was not found!"));
};

const errorHandler = (err, req, res, next) => {
    res.locals.error =
        process.env.NODE_ENV === "development" ? err : err.message;

    res.locals.title = "Error Page";

    res.status(err.status || 500);

    if (res.locals.html) {
        res.render("error");
    } else {
        res.json(res.locals.error);
    }
};

module.exports = { notFoundHandler, errorHandler };
