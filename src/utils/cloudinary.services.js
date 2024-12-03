import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})


const uploadingFilesonCloudinary = async(localFilePath) =>{
    try {
        if(!localFilePath){
            return null
        }
        // upload files on cloudinary 
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:'auto'
        })
        // files uploaded
        console.log("File object : ",response)
        console.log("File Uploaded successfully at : ",response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove  the locally saved tempporary files as the upload operation failed
    }
}

export {uploadingFilesonCloudinary}