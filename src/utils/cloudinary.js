import {v2 as cloudinary} from 'cloudinary'
import dotenv from 'dotenv'
import fs from 'fs'


dotenv.config();
// configure cloudinary

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECERT
});

const uploadOnCloudinary = async (localFilePath)=>{
    try {
            if(!localFilePath){
                return;
            }
            const response =await cloudinary.uploader.upload(
                localFilePath,{
                    resource_type:"auto"
                }
            )
        console.log("File uploaded on cloudinary .file src"+response.url);
        // once the file is uploaded , we would like to delete
        // it from our server
        fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
        console.log("Uploading wrong in Cloudinary.middleware.js");
        fs.unlinkSync(localFilePath)
        return null;
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log("Deleted from cloudinary",publicId);
        
    } catch (error) {
        console.log("Error deleting from cloudinary",error);
        
    }
}

export {uploadOnCloudinary,deleteFromCloudinary}