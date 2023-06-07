




// SIGN UP
router.get('/signup', logOutFirst, (req, res) => {
    res.render('sign-up', { pageTitle: 'Sign Up' });
})

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
