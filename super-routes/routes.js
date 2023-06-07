const express = require('express');
const router = express.Router();

const SuperUser = require('../models/superUser');
const User = require('../models/User');
const Order = require('../models/Order');


// check if user is logged in 
const isAuth = (req, res, next) => {
    if (req.session.user) {
        if (req.session.superUser.authorization === 'superuser') {
            next();
        } else {
            console.log('Not A Super User');
            res.redirect('/super/auth/login');
        }
    } else {
        console.log('Log In First');
        res.redirect('/super/auth/login');
    }
}


// dashboard
router.get('/dashboard', isAuth, async (req, res) => {
    try {
        const { userId, superUser } = req.session;
        
        const users = await User.find();
        const orders = await Order.find().populate('userId');

        res.render('dashboard', { superUser: superUser, users: users, orders: orders, pageTitle: 'Dashboard' });
    } catch (error) {
        console.error(error);
    }
})



module.exports = router;