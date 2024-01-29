const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    accountType: {
        type: String,
        enum: ["Admin", "Student", "Instructor"],
        required: true,
    },
    additionalDetails: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        required: true,
     },
    courses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    image: {
        type: String,
        required: true,
    },
    courseProgress: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CourseProgress'
    }],
    token:{
        type:String,
    },
    expiresIn:{
        type:Number,
    },
    resetPasswordExpires:{
        type:String,
    },
    active: {
        type: Boolean,
        default: true,
    },
    approved: {
        type: Boolean,
        default: true,
    },
    demo: {
        type: Boolean,
        default: false,
    },
})

module.exports = mongoose.model("User", userSchema);