const mongoose = require('mongoose');


const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    quantity: Number,
    adresse: String,
    supportType: String,
    fileName: String,
    pdfName: String
})


const Order = mongoose.model('Order', orderSchema);


module.exports = Order;