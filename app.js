const express = require('express')
const app = express();
const methodOverride = require('method-override');
const path = require('path');
const Notebook = require('./models/notebook');
const ejsMate = require('ejs-mate');
const { NotebookSchema } = require('./schemas.js');
const multer = require('multer') // v1.0.5
const upload = multer()
const Review = require('./models/review')
const User = require('./models/user')
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const { isLoggedIn, isAuthor } = require('./middleware');
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/expressError')

const bodyParser = require('body-parser')
// const LocalStrategy = require('passport-local');

const mongoose = require('mongoose');
main().catch(err => {
    console.log("OH NO MONGO CONNECTION ERROR")
    console.log(err)
});

// dbUrl
async function main() {
    await mongoose.connect("mongodb://localhost:27017/notebook");
    console.log("MONGO CONNECTION OPEN!!!")
}



app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))


app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))
app.use(flash());



const sessionConfig = {
    name: 'session',
    secret: 'sdsdsdsdsdsd',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig));


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser())

app.use((req, res, next) => {
    res.locals, currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error')
    next()
})


app.get('/', (req, res) => {
    res.render('home')
});

app.get('/notebooks', async (req, res) => {
    const notebooks = await Notebook.find({});
    res.render('notebooks/index', { notebooks })
});

app.get('/notebooks/new', isLoggedIn, (req, res, next) => {
    res.render('notebooks/new');
})

app.post('/notebooks', upload.array(), isLoggedIn, async (req, res, next) => {
    const notebook = new Notebook(req.body.notebook);
    notebook.author = req.user._id;
    await notebook.save();
    console.log(notebook);
    res.redirect(`/notebooks/page`)
});


app.get('/login', (req, res) => {
    res.render('users/login')
})

app.get('/notebooks/page', async (req, res) => {
    const notebooks = await Notebook.find({});
    res.render('notebooks/page', { notebooks })
});

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), upload.array(), async (req, res, next) => {
    req.flash('success', 'welcome back!');
    const redirectUrl = req.session.returnTo || '/notebooks';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
});

app.get('/register', (req, res) => {
    res.render('users/register')
})

app.post('/register', upload.array(), async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            // req.flash('success', 'Welcome to Yelp Camp!');
            res.redirect('/notebooks');
        })
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('register');
    }
});

app.get('/notebooks/:id', upload.array(), async (req, res) => {
    const notebook = await Notebook.findById(req.params.id)
        .populate({
            path: 'reviews',
            populate: {
                path: 'author'
            }
        }).populate('author');
    res.render('notebooks/show', { notebook });
});

app.get('/notebooks/:id/edit', isLoggedIn, isAuthor, async (req, res) => {
    const notebook = await Notebook.findById(req.params.id)
    res.render('notebooks/edit', { notebook });
})

app.put('/notebooks/:id', upload.array(), isLoggedIn, isAuthor, async (req, res, next) => {
    const { id } = req.params;
    const notebook = await Notebook.findByIdAndUpdate(id, { ...req.body.notebook });
    notebook.save();
    res.redirect(`/notebooks/${notebook._id}`)
})

app.post('/notebooks/:id/reviews', upload.array(), isLoggedIn, async (req, res, next) => {
    const notebook = await Notebook.findById(req.params.id);
    const review = new Review(req.body.review);
    review.author = req.user._id
    notebook.reviews.push(review)
    await review.save();
    await notebook.save();
    res.redirect(`/notebooks/${notebook._id}`)
})

app.delete('/notebooks/:id/reviews/:reviewId', isLoggedIn, isAuthor, upload.array(), async (req, res, next) => {
    const { id, reviewId } = req.params;
    await Notebook.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/notebooks/${id}`);
})

app.delete('/notebooks/:id', upload.array(), isLoggedIn, isAuthor, async (req, res, next) => {
    const { id } = req.params;
    await Notebook.findByIdAndDelete(id);
    res.redirect('/notebooks/page');
});

app.get('/logout', upload.array(), (req, res, next) => {
    req.logout();
    req.flash('success', "Goodbye!");
    res.redirect('/');
})


app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})


app.use((err, req, res, next) => {
    const { statusCode = 500 } = err
    if (!err.message) err.message = 'Oh No, Something Went Wrong'
    res.status(statusCode).render('error', { err });
})




app.listen(3000, () => {
    console.log('Serving on port 3000')
})

