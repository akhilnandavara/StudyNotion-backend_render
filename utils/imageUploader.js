const cloudinary = require('cloudinary').v2


exports.uploadImageToCloudinary=async(file,folder,heigth,width)=>{

    const options={folder}
    if(heigth){ options.heigth=heigth;}
    if(width){options.width=width}
    options.resource_type = "auto"; 
    return await cloudinary.uploader.upload(file.tempFilePath,options)
}



exports.deleteFilefromCloudinary=async(file)=>{
    const options={resource_type:"video"}
    return await cloudinary.uploader.destroy(file,options)
}