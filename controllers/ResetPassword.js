const User=require('../models/User');
const mailSender=require('../utils/mailSender');
const bcrypt=require('bcrypt');
const crypto = require("crypto");

//resetPasswordToken :- it generate token and send URL with Token to the user;
exports.resetPasswordToken=async(req,res)=>{
    try {
        // get email from body
        const {email}=req.body;
        // Check user exists or not
        const user=await User.findOne({email:email});
        if(!user){
             return res.status(401).json({
                    success:false,
                    message:'Your Email is not registerd  with us '
                })
        }
        // generate token
        const token = crypto.randomUUID();
        // update user by adding token and expiration time 
       await User.findOneAndUpdate({email:email},
                                                    {token:token,
                                                    resetPasswordExpires:Date.now() + 5*60*1000},
                                                    {new:true});
        // generate link
        const resetUrl=`https://studynotion-edutechlearning.onrender.com/update-password/${token}`
        
        // send mail
        await mailSender(email,
                        "Password Reset Link",
                        `here its link to reset your password : ${resetUrl}`);
        // Return Response 
        return res.status(200).json({
            success:true,
            message:"Reset Email Sent successfully"
        })
        
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"Something went wrong while generating reset link"
        })
    }
}

// reset Password
exports.resetPassword=async(req,res)=>{
    try {
        // fetch a data from body
        const {password,confirmPassword,token}=req.body;

        // validate a data
        if(password!==confirmPassword){
            return res.json({
                success:false,
                message:"Password Mismatched"
            })
        }
        
        // fetch user using token
        const user=await User.findOne({token:token});

        // check for token data
        if(!user){
            return res.status(401).json({
                success:false,
                message:"Invalid token"
            })
        }
        
        // check for expire time
        
        if(user.resetPasswordExpires < Date.now()){
            return res.json({
                success:false,
                message:"Reset link expired generate new link"
            })
        }
        // hash the password
        const hassedPassword=await bcrypt.hash(password,10);
        
        // update a password on user db
        await User.findOneAndUpdate({token:token},{password:hassedPassword},{new:true});

        // return res
        return res.status(200).json({
            success:true,
            message:"Password Reset successful"
        })
        
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success:false,
            message:'Something went wrong while reseting a password'
        })
    }
}