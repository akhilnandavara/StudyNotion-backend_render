const { default: mongoose } = require('mongoose');
const Category = require('../models/Category');
const Course = require('../models/Course');
function getRandomInt(max) {
    return Math.floor(Math.random() * max)
}

// Create category
exports.createCategory = async (req, res) => {
    try {
        // fetch a name and description
        const { name, description } = req.body;
        // validation
        if (!name || !description) {
            return res.status(403).json({
                success: false,
                message: "ALl the field are required",
            })
        }

        const categoryExists = await Category.findOne({ name });
        if (categoryExists) {
            return res.status(400).json({
                success: false,
                message: "Category already exists"
            })
        }
        // create db entry
        const categorysDetails = await Category.create({
            name: name,
            description: description,
        })

        console.log(categorysDetails);

        // return res
        return res.status(200).json({
            success: true,
            message: "Category Created Successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Something went wrong while creating Category'
        })
    }
}

// GetAllCategory
exports.showAllCategories = async (req, res) => {
    try {
        // fetch all category from db 
        const AllCategory = await Category.find({}, { name: true, description: true })   //find without any input reference 
        //  but make sure name and description prsent inside all tag
        // return res
        return res.status(200).json({
            success: true,
            data: AllCategory,
            message: "All categories are Fetched Successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
            message: "Something went wrong while fetching all category"
        })
    }
}

// categoryPageDetails
exports.categoryPageDetails = async (req, res) => {
    try {
        // get category id
        const { categoryId } = req.body;

        // find courses of given category
        const selectedCategory = await Category.findById(categoryId)
            .populate({
                path: "courses",
                match: { status: "Published" },
                populate:{
                    path:"ratingAndReviews",
                },
                
            })
            .populate({
                path: "courses",
                populate: {
                  path: "instructor",
                },
              })
            

            .exec();
        // Handle the case when the category is not found
        if (!selectedCategory) {
            return res.status(404).json({
                success: false,
                message: "Category Not found"
            })
        }
        // Handle the case when there are no courses
        if (selectedCategory.courses.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No courses found for selected Category"
            })
        }
        //  get  courses of other category
        const categoriesExceptSelected = await Category.find({
            _id: { $ne: categoryId }
        })
        let differentCategory = await Category.findOne(categoriesExceptSelected[getRandomInt(categoriesExceptSelected.length)]._id)
            .populate({
                path: "courses",
                match: { status: "Published" },
                populate:"instructor"
            })
            .exec()

        // Get top-selling courses across all categories
        const allCategories = await Category.find()
            .populate({
                path: "courses",
                match: { status: "Published" },
                populate: {
                    path: "instructor",
                },
            })
            .exec()

            const allCourses = allCategories.flatMap((category) => category.courses)
            const mostSellingCourses = allCourses.sort((a, b) => b.sold - a.sold).slice(0, 10)
      
        // return res
        return res.status(200).json({
            success: true,
            data: {
                selectedCategory,
                differentCategory,
                mostSellingCourses,
            },
            message: "Category page loaded successfully"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            error:error.message,
            message: "Internal Server Error."
        })
    }
}

