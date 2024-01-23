const mongoose=require('mongoose');
const mailSender = require('../utils/mailSender');
const otpTemplete=require('../mail/templates/emailVerificationTemplate')

const otpSchema=new mongoose.Schema({
    email:{
        type:String,
        required:true,
    },
    otp:{
        type:String,
        required:true,
    },
    createdAt:{
        type:Date,
       default:Date.now,
       expires:5*60,
    },
});

// Function -->to send email
async function sendVerificationMail(email,otp){
    try {
        const mailResponse=await mailSender(email,"Verifictaion Email by StudyNotion",otpTemplete(otp));
        // console.log("Email sent Successfully: ",mailResponse);
    } catch (error) {
        console.log("Error Occured while  Sending Mail",error);
        throw error;
    }
}

otpSchema.pre("save",async function(next){
    await sendVerificationMail(this.email,this.otp);
    next();
})

module.exports=mongoose.model('OTP',otpSchema);
