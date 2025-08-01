import {asyncHandler}  from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary ,deleteFromCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'


const registerUser = asyncHandler(async (req,res)=>{
    console.info("hit the register User")
    const {fullname, email,username, password} = req.body;
    
    
    // validation

    //    ----- easy one 
    // if(fullName?.trim()===""){
    //     throw new ApiError(400,"All fields are required");
    // }

    // new thinking

    if(
        [fullname,username, email,password].some((field)=>
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
    console.warn(req.files)
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverLocalPath = req.files?.coverImage[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is missing")
    }

    // const avatar= await uploadOnCloudinary(avatarLocalPath)

    // let coverImage="";
    // if (coverLocalPath) {
    //      coverImage = await uploadOnCloudinary(coverLocalPath);
    // }
    
        let avatar;
        try {
            avatar = await uploadOnCloudinary(avatarLocalPath)
            console.log("uploaded avator",avatar);
             
        } catch (error) {
            console.log("Error uploading avatar",error);
            throw new ApiError(500,"Failed upload Avatar")
            
        }

          let coverImage;
        try {
            coverImage = await uploadOnCloudinary(coverLocalPath)
            console.log("uploaded coverImage",coverImage);
             
        } catch (error) {
            console.log("Error uploading avatar",error);
            throw new ApiError(500,"Failed upload CoverImage")
            
        }

    // here we are going to interact with the user
    try {
        const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url ||"",
        email,
        password,
        username:username.toLowerCase()
    })

    // here we are checking weather the user os created or not
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something wrong while registring the user")
    }
    return res
            .status(201)
            .json(new ApiResponse(201),createdUser,"User registed user");
        
    } catch (error) {
        console.log("User creation failed",error)
        
    }

        if (avatar) {
            await deleteFromCloudinary(avatar.public_id)
        }
        if (coverImage) {
            await deleteFromCloudinary(coverImage.public_id)
        }

        throw new ApiError(500,"Something went wrong");
})

export  {
    registerUser
};