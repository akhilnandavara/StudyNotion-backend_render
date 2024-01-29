
const User = require('../models/User');
const Profile = require('../models/Profile');
const OTP = require('../models/OTP');
const otpGenerator = require('otp-generator')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mailSender = require('../utils/mailSender');
const passwordUpdated = require('../mail/templates/passwordUpdate');

// send otp
exports.sendOTP = async (req, res) => {
    try {
        // fetch email from body 
        const { email } = req.body;
        // check user registered or not
        const userEmailCheck = await User.findOne({ email });
        if (userEmailCheck) {
            return res.status(401).json({
                success: false,
                message: 'User with this email already registered'
            })
        }
        let otp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        })
        // console.log("OTP generated : ", otp)

        let result = await OTP.findOne({ otp: otp });
        while (result) {
            otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            })
            result = await OTP.findOne({ otp: otp });
        }
        // create entry in db
        const otpPayload = { email, otp }
        const response = await OTP.create(otpPayload);

        res.status(200).json({
            success: true,
            response,
            message: 'OTP Sent Successfully'
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Internal server error while otp generation'
        })
    }

}

// signup
exports.signUp = async (req, res) => {
    try {
        // fetch a user data
        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            accountType,
            contactNumber,
            otp,
        } = req.body
        // Validation part

        if (!firstName || !email || !password || !confirmPassword || !otp) {
            return res.status(403).json({
                success: false,
                message: 'All field are required',
            })
        }

        
        // Chcek for two password match

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Password and confirmPassword doesn't mactched please try again!!",
            })
        }

        // User exists or not
        const userExists = await User.findOne({ email })

        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "User with this email id already registered please login ",
            })
        }

        // find most recent otp from db
        const recentOtp = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);
        // console.log(recentOtp);
        // validate otp
        if (recentOtp.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'OTP Not Found'
            })
        }
        else if (otp !== recentOtp[0].otp) {
            // Invalid otp
            return res.status(401).json({
                success: false,
                message: 'Invalid Otp'
            })
        }
        // hash a password
        const hassedPassword = await bcrypt.hash(password, 10)

        // Create the user
        let approved = accountType==="Instructor"?"Instructor":""
        approved === "Instructor" ? (approved = false) : (approved = true);

        //created entry in Profile in DB
        const profileDetails = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumber: null,
        })

        // create entry in db
        const user = await User.create({
            firstName,
            lastName:`${lastName===undefined? null:lastName}`,
            email,
            contactNumber,
            password: hassedPassword,
            accountType: accountType,
            approved: approved,
            additionalDetails: profileDetails._id,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`
        })
        // return res
        return res.status(200).json({
            success: true,
            user,
            message: "User Sign Up Successful"
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Internal server error'
        })
    }
}

// login
exports.login = async (req, res) => {
    try {
        // fetch email and password
        const { email, password } = req.body;
        // validation

        if (!email || !password) {
            return res.status(403).json({
                success: false,
                message: 'All field are required',
            });
        }
        

        // user check
        const user = await User.findOne({ email }).populate('additionalDetails');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "user is not registered pls signUp Now"
            })
        }
        if(user.approved===false){
            return res.status(401).json({
                success: false,
                message: "Pls wait for a admins Approval"
            })
        }
        
        // password check
        if (await bcrypt.compare(password, user.password)) {
            // token generation
            const payload = {
                email: user.email,
                id: user._id,
                accountType: user.accountType,
            }

            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: "24h",
            })

            user.token = token;
            user.password = undefined;
            user.expiresIn = new Date(Date.now() +  24 * 60 * 60 * 1000);
            // create cookie and send res
            const options = {                                               //create cookie and send response
                expires: new Date(Date.now() +  24 * 60 * 60 * 1000),
                httpOnly: true,
            }
            res.cookie("token", token, options).status(200).json({
                success: true,
                token,
                user,
                message: 'Logged in successfully'
            })
        }
        else {
            return res.status(401).json({
                success: false,
                message: 'Incorrect Password'
            })
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Login failer please try again'
        })
    }
}

// controller for change password
exports.changePassword = async (req, res) => {
    try {
        // fetch user id 
        const userId = req.user.id;
        const userDetails = await User.findById(userId);
        if (!userDetails) {
            return res.status(401).json({
                success: false,
                message: 'user does not exist'
            })
        }

        const demoUser = await User.findById(userId)
        if (demoUser.demo) {
            return res.status(403).json({
                success: false,
                message: "This is a Demo Account"
            })
        }


        // get data from body
        const { oldPassword, newPassword, confirmPassword } = req.body;
        // validation
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(403).json({
                success: false,
                message: 'All fields are required'
            })
        }


        // validation for Two passwords matched  
        if (newPassword !== confirmPassword) {
            return res.status(401).json({
                success: false,
                message: 'The Password and  Confirm Password Does Not Matched.'
            })
        }
        // find password and update on db
        // check for a password 
        if (await bcrypt.compare(oldPassword, userDetails.password)) {
            const hassedPassword = await  bcrypt.hash(newPassword, 10)
            // console.log("password encrypted ")
            // update new password on user db
            const updatedPassword = await User.findByIdAndUpdate(userId, { password: hassedPassword }, { new: true })
            // send mail on password updated
            try {
                console.log("userDetails ",userDetails)
                const mailResponse = await mailSender(userDetails.email, "Email from StudyNotion", (passwordUpdated(updatedPassword.email, `Password updated for ${updatedPassword.firstName} ${updatedPassword.lastName}`)));
                // console.log("Email sent Successfully: ", mailResponse);
            } catch (error) {
                return res.status(401).json({
                    success: false,
                    error: error.message,
                    message: "Error occurred while sending email",
                })
            }

            // return res
            return res.status(200).json({
                success: true,
                message: 'Password Updated Successfully'
            })
        }
        else {
            return res.status(401).json({
                success: false,
                message: "Wrong password",
            })
        }
    } catch (error) {
        console.error("Error occurred while Updating a  password",error)
        return res.status(500).json({
            success: false,
            message: 'Password changing failed please try again',
            error: error.message,
        })
    }
}
