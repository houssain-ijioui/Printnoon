const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const nodeMailer = require('nodemailer');


const User = require('../models/User');
const flash = require('express-flash');




// log out first
function logOutFirst (req, res, next) {
    if (req.session.user || req.session.passport) {
        console.log('Log Out First');
        res.redirect('/user');
    }
    else {
        next();
    }
}


// GET @/auth/signup
router.get('/signup', logOutFirst, (req, res) => {
    res.render('sign-up', { pageTitle: 'Sign Up' });
})


// POST @/auth/signup
router.post('/signup', logOutFirst, (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    // check if user already exists
    User.findOne({ email: email }, (err, user) => {
        if (err) {
            console.log(err);
        } else if (user) {
            res.redirect('/auth/login');
            console.log('User already exists');
        } else {
            // hash password then save user to DB
            bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
                if (err) {
                    console.log(err);
                } else {
                    const user = new User({
                        firstName: firstName,
                        lastName: lastName,
                        userName: `${firstName}-${lastName}`,
                        email: email,
                        password: hashedPassword,
                        profileImage: null,
                        authorization: 'user',
                        source: 'local'
                    })

                    user.save((err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            res.redirect('/auth/login');
                            console.log('User Created Successfully');
                        }
                    })
                }
            })
        }
    })
})


// GET @/auth/login
router.get('/login', logOutFirst, (req, res) => {
    res.render('login', { pageTitle: 'Login' })
})


// POST @/auth/login
router.post('/login', logOutFirst, (req, res) => {
    const { email, password } = req.body;

    User.findOne({ email: email }, (err, user) => {
        if (err) {
            console.log(err);
        } else if (user) {
            bcrypt.compare(password, user.password, (err, result) => {
                if (err) {
                    console.log(err);
                } else if (result == true) {
                    req.session.user = user;
                    req.session.cookie.expires = 3600000; // one hour 
                    res.redirect(`/user`);
                } else if (result == false) {
                    res.redirect('/auth/login');
                    console.log('Incorrect Password');
                }
            })
        } else {
            console.log("Email Not found");
            res.redirect('/auth/signup')
        }
    })
})

// PASSPORT AUTHETICATION
passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  "http://localhost:3000/auth/oauth2/redirect/google",
    passReqToCallback: true
}, 
    function (request, accessToken, refreshToken, profile, done) {
        User.findOne({ email: profile.email }, async (err, user) => {
            if (err) { console.log(err); }
            if (user) { return done(err, user) }
            if (!user) {
                try {
                    const user = new User({
                        email: profile.email, 
                        userName: profile.given_name,
                        firstName: profile.given_name,
                        lastName: profile.family_name,
                        authorization: 'user',
                        source: profile.provider
                    })
    
                    user.save();

                    let transporter = nodeMailer.createTransport({
                        host: 'smtp.gmail.com',
                        port: 587,
                        secure: false,
                        auth: {
                            user: process.env.USER_EMAIL, 
                            pass: process.env.EMAIL_PASSWORD, 
                        },
                    });
    
                    
                    let info = await transporter.sendMail({
                        from: process.env.USER_EMAIL,
                        to: profile.email,
                        subject: "Account Created Successfuly on PRINTNOON",
                        text: "Welcome to Printnoon", 
                        html: "<b>Welcome to Printnoon</b>",
                    })
    
                    console.log('Email sent: ' + info.response);

                    return done(err, user);
                } catch (error) {
                    
                }
            }
        })
        
        // User.findOrCreate({ email: profile.email }, 
        // { 
        //     email: profile.email, 
        //     userName: profile.given_name,
        //     firstName: profile.given_name,
        //     lastName: profile.family_name,
        //     authorization: 'user',
        //     source: profile.provider
        // }, function (err, user) {
        //     if (err) { console.log(err); }
        //     return done(err, user);
        // });
    }
));



passport.serializeUser(function(user, done) {
    done(null, user);
});
  
passport.deserializeUser(function(user, done) {
    done(null, user);
});


router.get('/google',
    passport.authenticate('google', { scope:
        [ 'email', 'profile' ] }
    )    
);

router.get('/oauth2/redirect/google',
    passport.authenticate( 'google', {
        successRedirect: '/user',
        failureRedirect: '/auth/login'
}));


// LOGOUT
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.log(err);
        res.redirect('/auth/login');
    })
})


// RESET PASSWORD
router.get('/reset-password', (req, res) => {
    res.render('reset-password', { pageTitle: 'Reset Password' });
})


// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
    const email = req.body.email;
    try {
        const user = await User.findOne({email: email, source: 'local'});
        if (user) {
            try {
                let transporter = nodeMailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                    auth: {
                        user: process.env.USER_EMAIL, 
                        pass: process.env.EMAIL_PASSWORD, 
                    },
                });

                
                let info = await transporter.sendMail({
                    from: process.env.USER_EMAIL,
                    to: email,
                    subject: "Password recovery",
                    text: "HERE YOU CAN RECOVER YOUR PASSWORD", 
                    html: "<b>Hello world?</b>",
                })

                console.log('Email sent: ' + info.response);
                res.redirect('back');
            } catch (error) {
                console.log(error);
            }
        } else {
            console.log('no email was found');
            res.redirect('back');
        }
    } catch (error) {
        console.error(error);
    }
})



module.exports = router;