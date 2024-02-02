const express = require("express")
const router = express.Router()


// Routes for deleteprofile , updateprofile ,getuserdetails , getEnrolledCourse , updateDisplayPicture;


const { auth, isInstructor, isStudent, isAdmin } = require("../middlewares/auth")
const {deleteAccount, updateProfile, getUserDetails, updateDisplayPicture,  getEnrolledCourses, instructorDashboard, adminDashboard, adminApproval, rejectInstructorRequest, getAiResponse} = require("../controllers/Profile")
   
    
// ********************************************************************************************************
//                                      Profile routes                                                    *
// ********************************************************************************************************
router.delete("/deleteProfile", auth,isStudent, deleteAccount)                        // Delet User Account
router.put("/updateProfile", auth, updateProfile)
router.get("/getUserDetails", auth, getUserDetails)
router.get("/getEnrolledCourses", auth,isStudent, getEnrolledCourses)                  // Get Enrolled Courses
router.put("/updateDisplayPicture", auth, updateDisplayPicture)
router.get("/instructorDashboard",auth, isInstructor, instructorDashboard)
router.post('/getAiResponse',getAiResponse)



//**********************************************************************************************************
//                                     Profile routes                                                    *
// ********************************************************************************************************
router.get("/adminDashboard", auth,isAdmin, adminDashboard)
router.put("/adminApproval",auth, isAdmin, adminApproval)
router.delete("/rejectInstructorApproval",auth, isAdmin, rejectInstructorRequest)

module.exports = router

 