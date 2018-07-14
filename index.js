const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
var request = require('request');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const mongoose = require('mongoose');
const helmet = require('helmet')

const app = express();

//Load routes
const threads = require('./routes/threads');
const users = require('./routes/users');
const recommendations = require('./routes/recommendations');
const discover = require('./routes/discover');

// Passport config
require('./config/passport')(passport);

//DB config
const database = require('./config/database');

// Connect to Mongoose
mongoose.connect(database.mongoURI)
.then(() => console.log('MongoDB connected...'))
.catch(err => console.log(err));

// Handlebars middleware
app.engine('handlebars', exphbs({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

app.use(methodOverride('_method'))

app.use(helmet());

// Express Session middleware
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
  }));

app.use(passport.initialize());
app.use(passport.session());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(flash());

// Static Folder 
app.use(express.static(path.join(__dirname, 'public')));

// Global variables
app.use(function(req, res, next){
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.info_msg = req.flash('info_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});


// Index Route
app.get('/micro', (req, res) => {
    res.render('index', {
        title: "Micro.Threads"
    });
})

//About Route
app.get('/', (req, res) => {
    res.render('about');
});

// Use routes
app.use('/micro/threads', threads);
app.use('/users', users);
app.use('/micro/recommendations', recommendations);
app.use('/discover', discover);

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server Started on port ${port}`);
});