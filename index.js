require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const ordinaryRoutes = require('./ordinary-routes/routes');
const ordinaryAuthRoutes = require('./ordinary-routes/auth-routes');
const superRoutes = require('./super-routes/routes');
const superAuthRoutes = require('./super-routes/auth-routes');
const session = require('express-session');
const MongoDBSession = require('connect-mongodb-session')(session);
const User = require('./models/User');

const app = express();


// Set up sessions in db
const stores = new MongoDBSession({
    uri: process.env.MONOG_URI,
    collection: 'sessions'
});


// Middleware
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: stores
}));


// Connect to DB
mongoose.connect(process.env.MONOG_URI)
    .then(() => console.log("Connected to DB"))
    .catch(err => console.log(`${err}`));


// Ordinary Routes
app.use('/', ordinaryRoutes);
app.use('/auth', ordinaryAuthRoutes);

// Super Routes
app.use('/super', superRoutes);
app.use('/super/auth', superAuthRoutes);


// Handle Non Existing URL
app.use((req, res) => {
    res.render('error', { pageTitle: 'Page Does Not Exist' });
})

const PORT = 3000;
app.listen(PORT, console.log(`Listening in ${PORT}`));