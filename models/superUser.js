const mongoose = require('mongoose');


const superUserSchema = new mongoose.Schema({
    userName: String,
    email: {
        type: String,
        required: true
    },
    password: String,
    authorization: String
});


const superUser = mongoose.model('superUser', superUserSchema);


module.exports = superUser;