const { contactUsEmail } = require('../mail/templates/contactFormRes');
const mailSender=require('../utils/mailSender');

exports.contactUsController=async(req,res)=>{
    try {
        // get data
        const {firstName,lastName,email,phoneNo,message,countryCode}=req.body.data;
        // validation
        // console.log("data at server...",req.body.data)
        if(!firstName||!email||!phoneNo||!message||!countryCode){
            return res.status(403).json({
                succcess:false,
                message:"All the field are required to send message"
            })
        }
        // send mail to team
        await mailSender(process.env.CS_EMAIL,`query by user`,contactUsEmail(email,firstName,lastName,message,phoneNo,countryCode))
        // send confirmation to user
        await mailSender(email,`Mail recevied successfully`,contactUsEmail(email,firstName,lastName,message,phoneNo,countryCode))
        // return res
        return res.status(200).json({
            succcess:true,
            message:"Email sent successfully."
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            succcess:false,
            error:error,
            message:"Something Went Wrong..."
        })

    }
}