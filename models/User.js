const mongoose = require('mongoose');
const findOrCreate = require('mongoose-find-or-create');


const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    userName: String,
    email: {
        type: String,
        required: true
    },
    password: String,
    profileImage: String,
    authorization: String,
    source: String
})


userSchema.plugin(findOrCreate);


const User = mongoose.model('User', userSchema);


module.exports = User;