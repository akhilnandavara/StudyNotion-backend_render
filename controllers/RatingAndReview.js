const Course = require("../models/Course");
const RatingsAndReview = require("../models/RatingsAndReview");
const { default: mongoose } = require("mongoose");

// create rating  and review
exports.createRating = async (req, res) => {
    try {
        // fetch data from body
        const { courseId, rating, review } = req.body;
        // get user id
        const userId = req.user.id;

        // check user is enrolled  for a course
        const CourseDetails = await Course.findOne(
            {
                _id: courseId,
                studentsEnrolled: { $elemMatch: { $eq: userId }, },
            });
        if (!CourseDetails) {
            return res.status(404).json({
                success: false,
                message: "user is not enrolled this course"
            })
        }
        // check user is already reviewed
        const alreadyreviewed = await RatingsAndReview.findOne({
            user: userId,
            course: courseId,
        })
        if (alreadyreviewed) {
            return res.status(400).json({
                success: false,
                message: "User has already reviewed  this course",
            })
        }
        // create rating review
        const ratingReview = await RatingsAndReview.create({
            rating, review, course:courseId, user: userId,
        })

        // update rating and review on course
        const updatedCourseDetails = await Course.findOneAndUpdate(
                                                                    { _id: courseId },
                                                                    { $push: { ratingAndReviews: ratingReview._id } },
                                                                    { new: true }
                                                                 )
        // console.log(updatedCourseDetails)
        // return res
        return res.status(200).json({
            success: true,
            message: "Review created successfully",
            ratingReview,
        })
        } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            error: error.message,
            message: "Something went wrong while creating review",
        });
    }
};

// avg rating
exports.getAverageRating = async (req, res) => {
    try {
        // get course id from body
        const courseId = req.body;
        // calculate avg rating
        const avgResult = await RatingsAndReview.aggregate([
            {
                $Match: {
                    course: new mongoose.Types.ObjectId(courseId)
                },
            },
            {
                $group:{
                    _id: null,
                    averageRating: { $avg: "$rating" }
                },
            },
        ])
        // return res
        if (avgResult.length > 0) {
            return res.status(200).json({
                success: true,
                averageRating: avgResult[0].averageRating,
            })
        }
        // if no  review exist then send 0 rating
        return res.status(200).json({
            success: true,
            averageRating: 0,
            message: "No rating given "
        })


    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

// get all ratings and reviews
exports.getAllRating = async (req, res) => {
    try {
        const allReviews = await RatingsAndReview.find({})
            .sort({ rating: "desc" })
            .populate({
                path: "user",
                select: "firstName lastName email image"
            })
            .populate({
                path: "course",
                select: "courseName"
            })
            .exec();
        return res.status(200).json({
            success: true,
            data:allReviews,
            message: "Reviews fetched successfully"
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}
