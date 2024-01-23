const Course = require('../models/Course');
const User = require('../models/User');
const Category = require('../models/Category');
const Section = require("../models/Section")
const SubSection = require("../models/SubSection")
const { uploadImageToCloudinary } = require('../utils/imageUploader');
const CourseProgress = require("../models/CourseProgress")
const { convertSecondsToDuration } = require('../utils/secToDuration')


// create course
exports.createCourse = async (req, res) => {
  try {
    const userId = req.user.id
    let { courseName, courseDescription, whatYouWillLearn, price, tag: _tag, category, status, instructions: _instructions } = req.body
    const thumbnail = req.files.thumbnail                         // Get thumbnail image from request files
    // let tag = JSON.stringify(_tag);
    const tag = JSON.parse(_tag)                                    //Convert the tag and instructions from stringified Array to Array

    const instructions = JSON.parse(_instructions);
    // if (typeof instructions !== 'undefined') {
    //   instructions = JSON.parse(instructions)
    // }

    // Check if any of the required fields are missing
    if (!courseName || !courseDescription || !whatYouWillLearn || !price || !category || !tag || !thumbnail) {

      return res.status(400).json({ success: false, message: "All Fields are Mandatory", })
    }
    if (!status || status === undefined) {
      status = "Draft"
    }
    // Check if user is a instructor
    const instructorDetails = await User.findById(userId, { accountType: "Instructor" });
    if (!instructorDetails) {
      return res.status(404).json({
        success: false,
        message: "Instructor Details Not Found"
      })
    }

    // Check if category given correct
    // console.log("CATEGORY IS ...... ", category)
    const categoryDetails = await Category.findById(category);
    if (!categoryDetails) {
      return res.status(404).json({
        success: false,
        message: "category Details Not Found"
      })
    }


    // upload thumbnail to cloudinary
    const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);
    // create course  entry in db
    const newCourse = await Course.create({
      courseName,
      courseDescription,
      price,
      whatYouWillLearn,
      category: categoryDetails._id,
      instructor: instructorDetails._id,
      thumbnail: thumbnailImage.secure_url,
      tag,
      status: status,
      instructions,
    })

    // add new course to user schema of  instructor.

    await User.findByIdAndUpdate(
      { _id: instructorDetails._id },
      { $push: { courses: newCourse._id } }
      , { new: true });
    // add  new   course to categories 
    await Category.findByIdAndUpdate(
      { _id: category },
      { $push: { courses: newCourse._id }, }
      , { new: true });

    return res.status(200).json({
      success: true,
      Data: newCourse,
      message: 'Course Created successfully',
    })

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "something went wrong while creating a course"
    })
  }

}

// get all course
exports.getAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find({ status: "Published" },
      {
        courseName: true,
        courseDescription: true,
        instructor: true,
        thumbnail: true,
        studentsEnrolled: true,
        price: true,
      }).populate("instructor").exec();
    return res.status(200).json({
      success: true,
      data: allCourses,
      message: 'Courses fetched successfully'
    })
  } catch (error) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      error: error.message,
      message: `Can't Fetch Course Data`
    })
  }
}

// getCourseDetials-genral
exports.getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body
    const courseDetails = await Course.findOne({ _id: courseId, })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
          // select: "videoUrl",
        },
      })
      .exec()
    //validation
    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find a course with this id ${courseId}`,
      })
    }


    let totalDurationInSeconds = 0
    courseDetails?.courseContent.forEach((content) => {
      content?.subSection.forEach((subSection) => {
        const timeDurationInSeconds = parseInt(subSection.timeDuration)
        totalDurationInSeconds += timeDurationInSeconds
      })
    })
    const totalDuration = convertSecondsToDuration(totalDurationInSeconds)

    return res.status(200).json({
      success: true,
      message: "Course details fetched successfully",
      data: {
        courseDetails,
        totalDuration,
      },
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching a course details",
      error: error.message,
    })

  }
}

// get full courseDetails -student
exports.getFullCourseDetails = async (req, res) => {
  try {
    const {courseId}=req.body
    const userId = req.user.id
    const courseDetails =await Course.findOne({_id:courseId})
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
          // select: "videoUrl",
        },
      })
      .exec()

    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find course with id: ${courseId}`,
      })
    }

    let courseProgressCount = await CourseProgress.findOne( {courseId,userId})

    let totalDurationInSeconds = 0
    courseDetails.courseContent.forEach((content) => {
      content.subSection.forEach((subSection) => {
        const timeDurationInSeconds = parseInt(subSection.timeDuration)
        totalDurationInSeconds += timeDurationInSeconds
      })
    })

    const totalDuration = convertSecondsToDuration(totalDurationInSeconds)

    return res.status(200).json({
      success: true,
      data: {
        courseDetails,
        totalDuration,
        completedVideos: courseProgressCount?.completedVideos ? courseProgressCount?.completedVideos : [],
      },
    })
  }
  catch (error) {
    console.log(error)
    return res.status(500).json({
      success: false,
      error: error.message,
      message: error.message,
    })
  }
}


// Get a list of Course for a given Instructor
exports.getInstructorCourses = async (req, res) => {
  try {
    const instructorId = req.user.id                      // Get the instructor ID from the authenticated user or request body

    // Find all courses belonging to the instructor
    const instructorCourses = await Course.find({ instructor: instructorId, }).sort({ createdAt: -1 })

    res.status(200).json({                     // Return the instructor's courses
      success: true,
      data: instructorCourses,
    })
  }
  catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve instructor courses",
      error: error.message,
    })
  }
}


//   edit Course
exports.editCourse = async (req, res) => {
  try {
    // fetch a data from body
    const { courseId } = req.body;
    const updates = req.body;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      })
    }


    if (req.files && req.files.thumbnail !== undefined) {
      const thumbnail = req.file.thumbnail;
      // upload thumbnail to cloudinary
      const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);
      return course.thumbnail = thumbnailImage.secure_url;
    }

    // Update a field present in req body
    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        if (key === "tag" || key === "instructions") {
          course[key] = JSON.parse(updates[key])
        } else {
          course[key] = updates[key]
        }
      }
    }
    course.save();

    // add course Update and poplate instructor and category
    const updatedCourse = await Course.findOne({ _id: courseId, })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()

    return res.status(200).json({
      success: true,
      data: updatedCourse,
      message: 'Course Updated successfully',
    })

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "something went wrong while updating a course"
    })
  }

}

// Delete the Course
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.body
    const instructorId = req.user.id

    const course = await Course.findById({ _id: courseId })                     // Find the course
    if (!course) {
      console.log("course for loop : ", course)
      return res.status(404).json({ message: "Course not found" })
    }

    const studentsEnrolled = course.studentsEnrolled                   // Unenroll students from the course
    for (const studentId of studentsEnrolled) {
      await User.findByIdAndUpdate(studentId, { $pull: { courses: courseId }, })
    }

    const courseSections = course.courseContent                   // Delete sections and sub-sections
    for (const sectionId of courseSections) {
      const section = await Section.findById(sectionId)             // Delete sub-sections of the section
      if (section) {
        const subSections = section.subSection
        for (const subSectionId of subSections) {
          await SubSection.findByIdAndDelete(subSectionId)
        }
      }
      await Section.findByIdAndDelete(sectionId)           // Delete the section
    }


    const courseDetails = await Course.findById(courseId);

    await User.findByIdAndUpdate(instructorId, { $pull: { courses: courseId, } }, { new: true })  //  delete course id from user
    await Category.findByIdAndUpdate(courseDetails.category, { $pull: { courses: courseId, } }, { new: true })  //delete course id from category link

    const updatedCourse = await Course.findByIdAndDelete(courseId)               // Delete the course



    return res.status(200).json({
      success: true,
      data: updatedCourse,
      message: "Course deleted successfully",
    })
  }
  catch (error) {
    console.error(error.message)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}