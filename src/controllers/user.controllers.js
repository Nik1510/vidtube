import {asyncHandler}  from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'

const registerUser = asyncHandler(async (req,res)=>{
    const {fullName, email,username, password} = req.body;
    
    
    // validation

    //    ----- easy one 
    // if(fullName?.trim()===""){
    //     throw new ApiError(400,"All fields are required");
    // }

    // new thinking

    if(
        [fullName,username, email,password].some((field)=>
        field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required");
    }
    // ------------------------------------------------

    const excitedUser =  await User.findOne({
        // $or is given by mongoDB
        $or:[{username},{email}]
    })

    if (excitedUser) {
        throw new ApiError('409',"User will email or username already exists")
    }

    // now we have to handle images

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverLocalPath = req.files?.coverImage[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar= await uploadOnCloudinary(avatarLocalPath)

    let coverImage="";
    if (coverLocalPath) {
         coverImage = await uploadOnCloudinary(coverLocalPath);
    }
})

export  {
    registerUser
};