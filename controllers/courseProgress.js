

const CourseProgress = require('../models/CourseProgress')
const SubSection = require('../models/SubSection')

exports.updateCourseProgress=async(req,res)=>{
    const {courseId,subSectionId}=req.body
    const userId=req.user.id 
    try {
        const subSectionDetails=await SubSection.findById(subSectionId)
        if(!subSectionDetails){
            return res.status(404).json({success:false,error:"Invalid Sub Section"})
        }

        // check for course pogress template created or not  after purchase of course we make entry of course id and userid at user profile --initially set to 0
        const courseProgress=await CourseProgress.findOne({courseId:courseId,userId:userId})
        if(!courseProgress){
            return res.status(404).json({success:false,error:"Course Progress not found in user profile"})
        }
        else{
            // Chcek user is already completed course
            if( courseProgress?.completedVideos?.includes(subSectionId)){
                return res.status(400).json({success:false,error:"Lecture is already completed"})
            }
            //  push lecture to completed videos
            courseProgress.completedVideos.push(subSectionId)
        }
       await  courseProgress.save()  
       return res.status(200).json({success:true,message:"Course Progress updated sucessfully"})     
    } catch (error) {
        console.error(error)
        return res.status(500).json({success:false,message:"Internal Server Error"})
    }

}

