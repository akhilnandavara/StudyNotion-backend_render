const Course = require('../models/Course');
const Section = require('../models/Section');
const SubSection = require('../models/SubSection');


// section creation 
exports.createSection = async (req, res) => {
    try {
        // get data from body
        const { sectionName, courseId } = req.body;

        // validate
        if (!sectionName || !courseId) {
            return res.status(403).json({
                success: false,
                message: "All the fields are required"
            })
        }
        // create section in db
        const newSection = await Section.create({ sectionName });

        // update section id at course
        const course = await Course.findByIdAndUpdate(courseId, 
                                                                    { $push: { courseContent: newSection._id } }, { new: true })
                                                                    .populate({path: "courseContent",populate: {path: "subSection",},}).exec();                     
        // return res
        return res.status(200).json({
            success: true,
            data:course,
            message: 'Section Created Successfully'
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false, 
            message: "Unable to create Section, please try again"
        })
    }
}

// section updation 
exports.updateSection = async (req, res) => {
    try {
        //   get data from body
        const { sectionName, sectionId,courseId } = req.body;
        // validation
        if (!sectionName || !sectionId||!courseId) {
            return res.status(403).json({
                success: false,
                message: "All the fields are required ",
            })
        }
        // section update on db
        const section = await Section.findByIdAndUpdate(sectionId, { sectionName }, { new: true });
        // update section on  course 
     
        const course = await Course.findById(courseId).populate({ path: "courseContent", populate: { path: "subSection" }, }).exec();

        // return res
        return res.status(200).json({
            success: true,
            data:course,
            message: "Section Updated Successfully"
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: "Unable to update Section, please try again"
        })
    }
}

// section deletion 
exports.deleteSection = async (req, res) => {
    try {
        //  get data from parameter
        const { sectionId,courseId } = req.body;
        // findby id and delete a section
        const section = await Section.findById({_id:sectionId});
		if(!section) {
			return res.status(404).json({success:false, message:"Section not Found",})	 
		}
        
        //delete sub section
        await SubSection.deleteMany({_id: {$in: section.subSection}});
        
        //delete section from course
		await Course.findByIdAndUpdate(courseId, {$pull: {courseContent: sectionId,}})                 
        
        // find section  and dlt 
		await Section.findByIdAndDelete(sectionId);

        //find the updated course and return 
		const course = await Course.findById(courseId).populate({                               //here there is no use of const course , its only store updated course;
			path:"courseContent",                                                               // if you also write without  "const course = " then it also work;
			populate: {
				path: "subSection"
			}
		})
		.exec();

        //  return res
        return res.status(200).json({
            success: true,
            data:course,
            message: "Section deleted successfully"
        })

    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: "Something wen wrong while deleting section"
        })
    }
}
