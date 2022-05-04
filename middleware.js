const Notebook = require('./models/notebook');
const Review = require('./models/review');
const { campgroundSchema, reviewSchema } = require('./schemas.js');

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be signed in First');
        return res.redirect('/login');
    }
    next();
}


module.exports.isAuthor = async (req, res, next) => {
    const { id } = req.params;
    const notebook = await Notebook.findById(id);
    if (!notebook.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/notebooks/${id}`);
    }
    next();
}