const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcrypt');


const User = require('../models/User');
const Order = require('../models/Order');

const filesBucktName = process.env.FILE_BUCKET_NAME;
const profileImageBucket = process.env.PROFILE_IMAGE_BUCKET_NAME;
const recieptBucketName = process.env.RECIEPT_BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION
const accessKey = process.env.ACCESS_KEY
const secretAccessKey = process.env.SECRET_ACCESS_KEY

// Set Up multer midlleware
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// setting up s3 credentials
const s3 = new S3Client({
    credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretAccessKey
    },
    region: bucketRegion
})

// generating a random name for the image stored in s3
const randomImageName = () => crypto.randomBytes(32).toString('hex');
const randomFileName = () => crypto.randomBytes(30).toString('hex');
const randomPdfName = () => crypto.randomBytes(31).toString('hex');


// check if user is logged in 
const isAuth = (req, res, next) => {
    if (req.session.user || req.session.passport) {
        next();
    }
    else {
        res.redirect('/auth/login');
    }
}



// @GET /
router.get('/user', isAuth, async (req, res) => {
    // check if local user or google user and get user id
    var id = '';
    if (req.session.user) { id = req.session.user._id.toHexString(); }
    if (req.session.passport) { id = req.session.passport.user._id.toHexString(); }

    
    try {
        const user = await User.findById(id);

        if (user) {
            if (user.profileImage != null) {
                const getObjectParams = {
                    Bucket: profileImageBucket,
                    Key: user.profileImage,
                }
        
                const command = new GetObjectCommand(getObjectParams);
                const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    
                res.render('main', { user: user, profileImageUrl: url, pageTitle: `${user.firstName} ${user.lastName}` });
            } else {
                res.render('main', { user: user ,  pageTitle: `${user.userName}` })
            }
        } else {
            res.redirect('/super/dashboard');
        }
    } catch (error) {
        console.error(error);
    }
});

// GET edit profile page
router.get('/edit-profile', isAuth, (req, res) => {
    // check if local user or google user and get user id
    var id = '';
    if (req.session.user) { id = req.session.user._id.toHexString(); }
    if (req.session.passport) { id = req.session.passport.user._id.toHexString(); }

    User.findById( id, (err, user) => {
        if (err) {
            console.log(err);
        } else {
            res.render('edit-profile', { user: user, pageTitle: `${user.userName}` });
        }
    })
})


// Edit Profile
router.post('/edit-profile', isAuth, (req, res) => {
    // check if local user or google user and get user id
    var id = '';
    if (req.session.user) { id = req.session.user._id.toHexString(); }
    if (req.session.passport) { id = req.session.passport.user._id.toHexString(); }

    const { firstName, lastName } = req.body;
    
    User.findByIdAndUpdate(id, { firstName: firstName, lastName: lastName }, (err) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect(`/user`)
        }
    })
    
}) 


// GET change-password
router.get('/change-password', isAuth, (req, res) => {
    res.render('change-password', { pageTitle: 'Change Password'});
})

// POST change-password
router.post('/change-password', isAuth, async (req, res) => {
    const id = req.session.user._id.toHexString();
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    try {
        const user = await User.findById(id);
        const result = await bcrypt.compare(currentPassword, user.password);
        if (result == true) {
            if (newPassword === confirmNewPassword) {
                const hashedNewPassword = await bcrypt.hash(newPassword, 10);
                await User.findByIdAndUpdate(id, { password: hashedNewPassword });
                res.redirect('/user');
                console.log('Password changed');
            } else {
                console.log('Wrong confirming passwords');
                res.redirect('back')
            }
        } else {
            console.log('Wrong Password');
            res.redirect('back')
        }
    } catch (error) {
     console.log(error);   
    }
})

// add and update profile image
router.post('/edit/image/', isAuth, upload.single('image'), async (req, res) => {
    // check if local user or google user and get user id
    var id = '';
    if (req.session.user) { id = req.session.user._id.toHexString(); }
    if (req.session.passport) { id = req.session.passport.user._id.toHexString(); }

    const imageName = randomImageName();

    const params = {
        Bucket: profileImageBucket,
        Key: imageName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
    }

    const command = new PutObjectCommand(params);
    try {
        const user = await User.findById(id);

        // deleting the old profile image
        if (user.profileImage != null) {
            const deleteParams = {
                Bucket: profileImageBucket,
                Key: user.profileImage,
            }

            const deleteCommand = new DeleteObjectCommand(deleteParams);
            await s3.send(deleteCommand);
        }

        // saving the new profile image to s3 and associating it to user
        await s3.send(command);
        await User.findByIdAndUpdate(id, { profileImage: imageName });
        res.redirect(`/user`);
    } catch (error) {
        console.error(error);
    }
})


// Place Order
router.get('/place-order', isAuth, (req, res) => {
    // check if local user or google user and get user id
    var id = '';
    if (req.session.user) { id = req.session.user._id.toHexString(); }
    if (req.session.passport) { id = req.session.passport.user._id.toHexString(); }

    res.render('place-order', { id: id, pageTitle: 'Place Order' });
})


router.post('/place-order', isAuth, upload.single('file'), async (req, res) => {
    // check if local user or google user and get user id
    var id = '';
    if (req.session.user) { id = req.session.user._id.toHexString(); }
    if (req.session.passport) { id = req.session.passport.user._id.toHexString(); }

    const { quantity, adresse, supportType } = req.body;
    const fileName = randomFileName();
    const pdfName = randomPdfName();

    
    const fileParams = {
        Bucket: filesBucktName,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
    }

    const command = new PutObjectCommand(fileParams);

    try {
        
        const order = new Order({
            userId: id,
            quantity: quantity,
            adresse: adresse,
            supportType: supportType,
            fileName: fileName
        });

        await s3.send(command);
        await order.save();

        // generate pdf reciept extrat buffer and save it
        const doc = new PDFDocument({ font: 'Courier' });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            
            const pdfParams = {
                Bucket: recieptBucketName,
                Key: `reciept-${pdfName}.pdf`,
                Body: pdfData,
                ContentType: 'application/pdf'
            }

            const pdfCommand = new PutObjectCommand(pdfParams);

            await s3.send(pdfCommand);

        })
        
        // create a table in pdf file and fill it with info
        x1=doc.x;
        x6=310;
        doc.rect(doc.x, doc.y, 450, 65)
            .moveTo(300, doc.y).lineTo(300, doc.y+65)
            .moveDown(0.2)
            .text('Quantity',{indent:5, align:'left',width:140, height:doc.currentLineHeight()})
            .rect(x1,doc.y,450,0.5)
            .moveUp()
            .text(quantity ,x6,doc.y)
            .moveDown(0.2)
            .text('Adresse',x1,doc.y,{indent:5, align:'left',width:140, height:doc.currentLineHeight()})
            .rect(x1,doc.y,450,0.5)
            .moveUp()
            .text(adresse ,x6,doc.y)
            .moveDown(0.2)
            .text('Support Type',x1,doc.y,{indent:5, align:'left'})
            .rect(x1,doc.y,450,0.5)
            .moveUp()
            .text(supportType ,x6,doc.y)
            .moveDown(0.2)
            .text('Baby Due Date',x1,doc.y,{indent:5, align:'left'})
            .moveUp()
            .text('baby_due_date',x6,doc.y)
            .stroke()
            .moveDown(1.5);
        doc.end();


        console.log('Order saved !!!');
        
        res.redirect('/user');
    } catch (error) {
        console.error(error);
    }
})


// get my orders
router.get('/my-orders', isAuth, async (req, res) => {
    // check if local user or google user and get user id
    var id = '';
    if (req.session.user) { id = req.session.user._id.toHexString(); }
    if (req.session.passport) { id = req.session.passport.user._id.toHexString(); }

    try {
        const user = await User.findById(id);
        const orders = await Order.find({ userId: id });
        if (orders.length > 0) {
            const data = [];
            for (const order of orders) {
                const getObjectParams = {
                    Bucket: filesBucktName,
                    Key: order.fileName,
                }

        
                const command = new GetObjectCommand(getObjectParams);
                const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

                data.push({ order, url });
            }

            res.render('my-orders', { data: data, pageTitle: 'My Orders', user: user });
        } else {
            res.render('my-orders', { pageTitle: 'My Orders' });
        }
    } catch (error) {
        console.error(error);
    }
})






module.exports = router;