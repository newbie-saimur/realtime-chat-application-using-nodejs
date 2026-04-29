function decorateHtmlResponse(page_title) {
    return function (req, res, next) {
        res.locals.title = `${page_title} - ${process.env.APP_NAME}`;
        res.locals.html = true;
        next();
    };
}

module.exports = decorateHtmlResponse;
