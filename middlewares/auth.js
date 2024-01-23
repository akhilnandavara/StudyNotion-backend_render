const  jwt=require('jsonwebtoken');
require('dotenv').config();

// auth 
exports.auth=async(req,res,next)=>{
    try {
        // extract token
        const token=req.body.token||req.cookies.token||req.header('Authorization').replace("bearer ","");
        // validate token
        if(!token){
            return res.status(401).json({
                success:false,
                message:"Token is missing"
            })
        }
        // verify token
        try {
            const decode=jwt.verify(token,process.env.JWT_SECRET);
            // console.log(decode);
            req.user=decode;
        } catch (error) {
            // error in verifcation
            return res.status(401).json({
                success:false,
                message:"Invalid token",
            })
        }
        next();
    } catch (error) {
        return res.status(401).json({
            success:false,
            message:'Something went wrong please try again '
        })
    }
}
// isStudent
exports.isStudent=(req,res,next)=>{
   try {
    if(req.user.accountType!=="Student"){
        return res.status(401).json({
            success:false,
            message:'This is a Protected Route for Student'
        })
    }
    next();
   } catch (error) {
    return res.status(500).json({
        success:false,
        message:'User role cannot be verified'
    })
    
   } 
}
// isInstructor
exports.isInstructor=(req,res,next)=>{
    try {
     if(req.user.accountType!=="Instructor"){
         return res.status(401).json({
             success:false,
             message:'This is a Protected Route for Instructor'
         })
     }
     next();
    } catch (error) {
     return res.status(500).json({
         success:false,
         message:'User role cannot be verified'
     })
     
    } 
 }
// isAdmin
exports.isAdmin=(req,res,next)=>{
    try {
     if(req.user.accountType!=="Admin"){
         return res.status(401).json({
             success:false,
             message:'This is a Protected Route for Admin'
         })
     }
     next();
    } catch (error) {
     return res.status(500).json({
         success:false,
         message:'User role cannot be verified'
     })   
    } 
 }
