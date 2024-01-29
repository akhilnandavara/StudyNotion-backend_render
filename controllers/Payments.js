const { instance } = require('../config/razorpay')
const Course = require('../models/Course');
const User = require('../models/User');
const { default: mongoose } = require('mongoose');
const mailSender = require('../utils/mailSender');
const { courseEnrollmentEmail } = require('../mail/templates/courseEnrollmentEmail');
const { paymentSuccessEmail } = require('../mail/templates/paymentSuccessEmail');
const crypto=require('crypto');
const CourseProgress = require('../models/CourseProgress');
const PaymentHistory = require('../models/PaymentHistory');


exports.capturePayment = async (req, res) => {
    const courses = req.body;
    const userId = req.user.id;

    if (courses.length === 0) {
        return res.json({
            success: false,
            message: "Please provide a Course Id"
        })
    }

    let totalAmount = 0;

    for (const course_id of courses) {
        let course;
        try {
            // fetch a course Data
            course = await Course.findById(course_id)
            if (!course) {
                return res.status(200).json({ success: false, message: "Could not find a course" })
            }
            // check  for user is already enrolled or not
            const uid = new mongoose.Types.ObjectId(userId)
            if (course.studentsEnrolled.includes(uid)) {
                return res.status(200).json({ success: false, message: "Student is already enrolled to this course" })
            }

            totalAmount += course.price
        }
        catch(error){
            console.log(error)
            return res.status(500).json({
                success: false,
                message: error.message
            })
        }
    }

            // create option
            
            const options = {
                amount: totalAmount * 100,
                currency:"INR",
                receipt: Math.random(Date.now()).toString()
            }

            try {
               
                const paymentResponse=await instance.orders.create(options)
                
                return res.status(200).json({
                    success: true,
                    message: paymentResponse,
                })

            } catch (error) {
                console.log("error in capturePayment",error)
                return res.status(500).json({
                    success: false,
                    message: error.message
                })
            }

}

exports.verifyPayment = async(req, res) => {
    const razorpay_order_id = req.body.razorpay_order_id;
    const razorpay_payment_id = req.body.razorpay_payment_id;
    const razorpay_signature = req.body.razorpay_signature;
    const courses = req.body.courses;
    const userId = req.user.id;


    if(!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courses || !userId) {
           return res.status(404).json({success:false, message:"oops! Missing Field"});   
    }


    let body = razorpay_order_id + "|" + razorpay_payment_id;
    
    const expectedSignature =crypto.createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body.toString())
        .digest("hex");

        if(expectedSignature === razorpay_signature) {
            await enrollStudents(courses, userId, res);                   //enroll karwao student ko
            await PaymentHistory.findOneAndUpdate({orderId:razorpay_order_id,userId:userId},{status:"Success"})

            return res.status(200).json({success:true, message:"Payment Verified"});    //return res
        }
        await PaymentHistory.findOneAndUpdate({orderId:razorpay_order_id,userId:userId},{status:"Failed"})
        return res.status(200).json({success:"false", message:"Payment Failed"});
}


const enrollStudents = async (courses, userId, res) => {

    if (!courses || !userId) {
        return res.status(400).json({ success: false, message: "Missing courses or userId" })
    }

    for (const courseId of courses) {
        try {
            // add the student  to Published  courses
            const enrolledCourse = await Course.findByIdAndUpdate(
                { _id:courseId },
                { $push: { studentsEnrolled: userId } },
                { new: true },
            )
            if (!enrolledCourse) {
                return res.status(400).json({ success: false, message: "Course Not Found" })
            }
            const courseProgress=await CourseProgress.create({
                courseId:courseId,
                userId:userId,
                completedVideos:[],
            })
            

            // Add courses to student
            const enrolledStudent = await User.findByIdAndUpdate(
                { _id:userId },
                { $push: { courses: courseId,courseProgress:courseProgress._id} },
                { new: true }
            )
            if (!enrolledStudent) {
                return res.status(400).json({ success: false, message: "Failed to update course to student dashboard" })
            }

            // Send mail to student
           const emailResponse= await mailSender(enrolledStudent.email,
                                                `Sucessfully Enrolled to ${enrolledCourse?.courseName}`,
                                                courseEnrollmentEmail(enrolledCourse?.courseName,enrolledStudent?.firstName))

                // console.log("Email sent successfully ",emailResponse);
        } catch (error) {
            console.log(error)
            return res.status(500).json({success:false,message:error})

        }

    }
}


exports.sendPaymentSuccessMail=async(req,res)=>{
    const {orderId,paymentId,amount}=req.body;
    const userId=req.user.id

    if(!userId||!orderId||!paymentId||!amount){
        console.log("MISSING FIELD TO SEND MAIL")
    return res.status(404).json({success:false,message:"Missing field to  send a payment success mail"})
    }
    try {
        const userData=await User.findById(userId)
        await mailSender(userData.email,"Payment Received",paymentSuccessEmail(`${userData.firstName}`,amount/100,orderId,paymentId))
    
    } catch (error) {
        console.log(error)
        return res.status(500).json({success:false,message:"Internal server error"})
        
    }
}

exports.createPaymentHistory = async(req,res) => {
    const userId=req.user.id
    const {orderId,amount,status}=req.body
    try {
        
        // Validation
        if (!orderId || !userId||!amount||!status) {
            return res.status(400).json({ success: false, message: "Missing Field to create payment History" })
        }

        // Chcek Payment history is already present
        const PaymentHistoryDetails=await PaymentHistory.findOne({userId,orderId})
        if(PaymentHistoryDetails){
            return res.status(404).json({sucess:false,message:"Payment History is already created"})
          }
          else{
            await PaymentHistory.create({
                orderId,
                userId,
                amount:amount/100,
                status,
            })
            return res.status(200).json({success:true,message:"Payment History Created sucessfully"})     
          }
        } catch (error) {
            console.error(error)
            return res.status(500).json({success:false,message:"Internal Server Error"})
        } 
}
exports.getPaymentHistory=async(req,res)=>{
    try {
        const userId=req.user.id
        const paymentHistory=await PaymentHistory.find({userId:userId}).sort({paidAt:-1})
        res.status(200).json({                     // Return the Payment History
            success: true,
            data:paymentHistory,
          })
        }
        catch (error) {
          res.status(500).json({
            success: false,
            message: "Failed to retrieve Payment History",
            error: error.message,
          })
}
}
