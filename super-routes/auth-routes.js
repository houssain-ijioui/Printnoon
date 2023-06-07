const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');


const superUser = require('../models/superUser');

// log out first
const logOutFirst = (req, res, next) => {
    if (req.session.isAuth) {
        console.log('Log Out First');
        res.redirect('back');
    } else {
        next();
    }
}


// superUser
router.get('/login', logOutFirst, (req, res) => {
    try {
        res.render('super-user-login', { pageTitle: 'Super User LogIn' });
    } catch (error) {
        console.log(error);
    }
})


router.post('/login', logOutFirst, async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await superUser.findOne({ email: email });

        if (!user) {
            console.log("Email Not Found!");
            res.redirect('/super/auth/login');
        } else {
            const result = await bcrypt.compare(password, user.password);
            if (result) {
                req.session.superUser = user;
                req.session.cookie.expires = 3600000;
                res.redirect('/super/dashboard');
            } else if (!result) {
                console.log('Password Incorrect!');
                res.redirect('/super/auth/login');
            }
        } 
    } catch (error) {
        console.error(error);
    }
})


// SuperUser LOGOUT
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.log(err);
        res.redirect('/super/auth/login');
    })
})

module.exports = router;