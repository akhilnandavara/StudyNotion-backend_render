const SubSection = require('../models/SubSection');
const Section = require('../models/Section');
const { uploadImageToCloudinary,deleteFilefromCloudinary } = require('../utils/imageUploader');

// Create a new sub-section for a given section
exports.createSubSection = async (req, res) => {
    try {
        // get data  from body
        const { sectionId, title, description } = req.body;
        // fetch video from files
        const video = req.files.video;
        // validation
        if (!sectionId || !title || !description  || !video) {
            return res.status(403).json({
                success: false,
                message: "All the fields are required"
            })
        }
        const sectionExists=await Section.findById({_id:sectionId});
        if(!sectionExists){
            return res.status(404).json({
                success:false,
                message:"Section not found"
            })
        }
        // upload video to cloudinary and get url
        const videoUploaded = await uploadImageToCloudinary(video, process.env.FOLDER_NAME_VIDEO);
        // create sub section on db
        const subSectionDetails = await SubSection.create({
            title: title,
            description: description,
            timeDuration: `${videoUploaded.duration}`,
            videoUrl: videoUploaded.secure_url,
            public_id:videoUploaded.public_id,
        })

        // delete sub section id at section schema
        const updatedSection = await Section.findByIdAndUpdate({_id:sectionId}, {
            $push: { subSection: subSectionDetails._id, }
        }, { new: true }).populate({path:'subSection'}).exec()

        // return res
        return res.status(200).json({
            success: true,
            data:updatedSection,
            message: "SubSection created Successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Unable to create SubSection, please try again'
        })
    }
}
// Update subsection
exports.updateSubSection = async (req, res) => {
    try {
        // get data from body

        const { sectionId, subSectionId, title, description } = req.body;
        const subSection = await SubSection.findById(subSectionId);
        // check for title and description fields
        if (title !== undefined) {
            subSection.title = title;
        }
        if (description !== undefined) {
            subSection.description = description;
        }

        if (req.files && req.files.videoFile !== undefined) {
            const video = req.file.videoFile;
            const uploadDetails = await uploadImageToCloudinary(video, process.env.FOLDER_NAME);
            subSection.videoUrl = uploadDetails.secure_url;
            subSection.timeDuration = `${uploadDetails.duration}`
        }
        subSection.save();

        // update subsection id at section model
        const updatedSection=await Section.findById(sectionId).populate("subSection").exec()

        // return res
        return res.status(200).json({
            success:true,
            data:updatedSection,
            message:"SubSection updated successfully "
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Something Went wrong"
        });
    }
}
// delete subSection
exports.deleteSubSection = async (req, res) => {
try {
    const { subSectionId, sectionId } = req.body
    const SectionDeleted=await Section.findByIdAndUpdate( { _id: sectionId },  {$pull: {subSection: subSectionId,},} )

    
    // upload video to cloudinary and get url
    const subSectionDetails=await SubSection.findById(subSectionId);
//   console.log("Public id : ", subSectionDetails);
    await deleteFilefromCloudinary(subSectionDetails.public_id); 
    const subSection = await SubSection.findByIdAndDelete({ _id: subSectionId })
    if(!subSection){
    return res.status(404).json({ success: false, message: "SubSection not found" })
    }

    const updatedSection=await Section.findById(sectionId).populate("subSection")
    return res.json({
    success: true,
    data:updatedSection,
    message: "SubSection deleted successfully",
    })
}
    catch(error) {
    return res.status(500).json({
    success: false,
    error:error.message,
    message: "An error occurred while deleting the SubSection",
    })
}
}