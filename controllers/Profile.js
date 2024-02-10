const Profile = require('../models/Profile');
const User = require('../models/User');
const Course = require('../models/Course');
const CourseProgress = require('../models/CourseProgress');
const { default: mongoose } = require('mongoose');
const { uploadImageToCloudinary } = require("../utils/imageUploader")
const { convertSecondsToDuration } = require("../utils/secToDuration");
const RatingsAndReview = require('../models/RatingsAndReview');
const mailSender = require('../utils/mailSender');
const { instructorApproved } = require('../mail/templates/instructorApproved');
const { default: OpenAI } = require('openai');


// update profile
exports.updateProfile = async (req, res) => {
    try {
        // get data from body
        const { firstName = "", lastName = "", about = "", dateOfBirth = "", gender = "", contactNumber = "" } = req.body;
        // get user id
        const id = req.user.id;


        const demoUser = await User.findById(id)
        if (demoUser.demo) {
            return res.status(403).json({
                success: false,
                message: "This is a Demo Account"
            })
        }

        // validation
        if (!contactNumber || !gender || !id) {
            return res.status(400).json({
                success: false,
                message: "Some fields are mandatry to fill",
            })
        }
        if (firstName !== undefined || lastName !== undefined) {
            const user = await User.findByIdAndUpdate(id, { firstName, lastName, })
            await user.save();
        }
        // find profile by id
        const userDetails = await User.findById(id);
        const ProfileId = userDetails.additionalDetails;
        const profileDetails = await Profile.findById(ProfileId);

        profileDetails.about = about;
        profileDetails.contactNumber = contactNumber;
        profileDetails.dateOfBirth = dateOfBirth;
        profileDetails.gender = gender;

        // update profile
        await profileDetails.save();

        // Find the updated user details
        const updatedUserDetails = await User.findById(id).populate("additionalDetails").exec()

        // return res
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            updatedUserDetails,
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
            message: "Internal error please try again"
        })
    }
}

// deletion of account
exports.deleteAccount = async (req, res) => {
    try {
        // get user id
        const id = req.user.id;

        const demoUser = await User.findById(id)
        if (demoUser.demo) {
            return res.status(403).json({
                success: false,
                message: "This is a Demo Account"
            })
        }

        // validation
        const userDetails = await User.findById(id);
        if (!userDetails) {
            return res.status(400).json({
                success: false,
                message: "User not found",
            })
        }

        // delete profile data

        await Profile.findByIdAndDelete({ _id: new mongoose.Types.ObjectId(userDetails.additionalDetails) })

        // Delete user data from studentEnrolled at course model
        for (const courseId of userDetails.courses) {
            await Course.findByIdAndUpdate(courseId, { $pull: { studentsEnrolled: id } }, { new: true })
        }

        // delete user data
        await User.findByIdAndDelete({ _id: id })

        await CourseProgress.deleteMany({ userId: id })

        // return res 
        return res.status(200).json({
            success: true,
            message: "Account deletion  successful"
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Internal server error please try again"
        })
    }
}

// get user all details
exports.getUserDetails = async (req, res) => {
    try {
        const id = req.user.id;

        const userDetails = await User.findById(id).populate("additionalDetails").exec();

        return res.status(200).json({
            success: true,
            data: userDetails,
            message: "user detailes fetched successfully"
        })

    } catch (error) {
        console.log(error.message)
        res.status(500).json({
            success: false,
            message: "Something went wrong please try again"
        })
    }
}

// update display picture
exports.updateDisplayPicture = async (req, res) => {
    try {
        const displayPicture = req.files.displayPicture
        const userId = req.user.id

        const demoUser = await User.findById(userId)
        if (demoUser.demo) {
            return res.status(403).json({
                success: false,
                message: "This is a Demo Account"
            })
        }
        const image = await uploadImageToCloudinary(displayPicture, process.env.FOLDER_NAME, 1000, 1000)

        const updatedProfile = await User.findByIdAndUpdate({ _id: userId }, { image: image.secure_url }, { new: true })

        return res.json({
            success: true,
            message: `Image Updated successfully`,
            data: updatedProfile,
        })
    }
    catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: error,
        })
    }
}

exports.getEnrolledCourses = async (req, res) => {
    try {
        const userId = req.user.id
        // console.log("userId",userId)
        let userDetails = await User.findOne({ _id: userId, })
            .populate({
                path: "courses",
                populate: {
                    path: "courseContent",
                    populate: {
                        path: "subSection",
                    },
                },
            })
            .exec()
        userDetails = userDetails.toObject()
        let SubsectionLength = 0
        for (var i = 0; i < userDetails.courses.length; i++) {//loop for courses regisered by student
            let totalDurationInSeconds = 0
            SubsectionLength = 0
            for (var j = 0; j < userDetails.courses[i].courseContent.length; j++) {//loop for sections of course[i]
                totalDurationInSeconds += userDetails.courses[i].courseContent[j].subSection.reduce((acc, curr) => acc + parseInt(curr.timeDuration), 0)// return total  subsection time duration 
                userDetails.courses[i].totalDuration = convertSecondsToDuration(totalDurationInSeconds)
                SubsectionLength += userDetails.courses[i].courseContent[j].subSection.length
            }

            //finding courseProgress
            const courseId = userDetails.courses[i]._id;
            let courseProgressCount = await CourseProgress.findOne({ courseId, userId, })//returns matched course |
            courseProgressCount = courseProgressCount?.completedVideos.length //find completed video array length
            if (SubsectionLength === 0) {
                userDetails.courses[i].progressPercentage = 100
            }
            else {                                             // To make it up to 2 decimal point 
                const multiplier = Math.pow(10, 2)
                userDetails.courses[i].progressPercentage = Math.round((courseProgressCount / SubsectionLength) * 100 * multiplier) / multiplier
                // console.log( "CourseProgressPercentage",userDetails.courses[i].progressPercentage )
            }
        }


        if (!userDetails) {
            return res.status(400).json({ success: false, message: `Could not find user with id: ${userDetails}`, })
        }

        return res.status(200).json({
            success: true,
            data: userDetails.courses,
        })
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        })
    }
}


exports.instructorDashboard = async (req, res) => {
    try {
        const courseDetails = await Course.find({ instructor: req.user.id }).populate("courseContent").exec()

        const courseData = courseDetails.map((course) => {
            const totalStudentsEnrolled = course?.studentsEnrolled?.length
            const totalAmountGenerated = totalStudentsEnrolled * course.price


            // Create a new object with the additional fields
            const courseDataWithStats = {
                _id: course._id,
                courseName: course.courseName,
                courseDescription: course.courseDescription,
                totalStudentsEnrolled,                               // Include other course properties as needed
                totalAmountGenerated,
            }
            return courseDataWithStats
        })

        res.status(200).json({
            success: true,
            courses: courseData,
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server Error" })
    }
}

exports.adminDashboard = async (req, res) => {
    try {
        const userStudents = (await User.find({ accountType: "Student" })).length
        const userInstructor = (await User.find({ accountType: "Instructor" }))
        const totalCourses = (await Course.find({}))
        const ratingsAndReviews = await RatingsAndReview.find({})
            .sort({ rating: "desc" })
            .populate({
                path: "user",
                select: "firstName lastName email image"
            }).populate({
                path: "course",
                select: "courseName"
            })
            .exec();

        const totalAmountGeneratedCourseWise = totalCourses.map((course) => {
            const totalStudentsEnrolled = course?.studentsEnrolled?.length
            const totalAmountGenerated = totalStudentsEnrolled * course.price
            return totalAmountGenerated
        })
        const totalIncome = totalAmountGeneratedCourseWise?.reduce((acc, curr) => acc + curr, 0);
        const totalCoursesCount = totalCourses.length

        const adminData = {
            userStudents,
            userInstructor,
            totalCoursesCount,
            totalIncome,
            ratingsAndReviews,
        }

        res.status(200).json({
            success: true,
            data: adminData,
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Internal Server Error" })
    }

}

exports.adminApproval = async (req, res) => {
    try {
        // Valdiation
        const { instructorId } = req.body

        if (!instructorId) {
            return res.status(404).json({ success: false, error: "Missing Intructor Id" })
        }

        // update approved to true
        const updatedUserData = await User.findByIdAndUpdate({ _id: instructorId }, { approved: true }, { new: true })
        // send mail to instructor
        await mailSender(updatedUserData.email, "Successfully Approved Instructor", instructorApproved(updatedUserData.firstName, " ", updatedUserData.lastName))

        // Return  res
        return res.status(200).json({
            success: true,
            message: "Instructor is successfully Approved"
        })

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Server Error" })
    }
}


exports.rejectInstructorRequest = async (req, res) => {
    try {
        // get user id
        const { instructorId } = req.body;

        // validation
        const userDetails = await User.findById({ _id: instructorId });
        if (!userDetails) {
            return res.status(400).json({
                success: false,
                message: "Instructor  not found",
            })
        }

        // delete profile data
        await Profile.findByIdAndDelete({ _id: new mongoose.Types.ObjectId(userDetails.additionalDetails) })

        // delete user data
        await User.findByIdAndDelete({ _id: instructorId })

        // return res 
        return res.status(200).json({
            success: true,
            message: "Approval request rejected  successfully"
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Internal server error please try again"
        })
    }
}


// chat bot
exports.getAiResponse=async(req,res)=>{
    const {userPrompt}=req.body
    
    try {
          const openai = new OpenAI({
              apiKey: process.env.OPENAI_API_KEY
            });

        ;(async()=> {
            const response = await openai.chat.completions.create({
              messages: [{role: 'user', content:userPrompt }],
              model: 'gpt-3.5-turbo',
              max_tokens:100,
            });
            res.status(200).json({
                success:true,
                data:response.choices[0].message
            })
          })()
        
      } catch (error) {
        console.log(error)
        res.status(500).json({
            success:false,
            message:error.message
        })
      }
}