import {asyncHandler}  from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary ,deleteFromCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import { jwt } from 'jsonwebtoken'



const generateAccessAndRefreshToken = async (userId)=>{
    // this is helper method
    try {
        const user =User.findById(userId);
        if(!user){
            throw new ApiError(404,"Unable to find the userId in generateAccessAndRefreshToken method");
        }
    
        // these are brought from user.model.js
        const accessToken = user.generateAccessToken();
        const refreshToken= user.generateRefreshToken();
        // -----------------------------------------
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken};
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh token")
    }
}

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
        throw new ApiError(400,"User will email or username already exists")
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
            .json(new ApiResponse(201,createdUser,"User registed user"));
        
    } catch (error) {
        console.log("User creation failed",error)
        
        throw new ApiError(500,"Something went wrong");
    }

        if (avatar) {
            await deleteFromCloudinary(avatar.public_id)
        }
        if (coverImage) {
            await deleteFromCloudinary(coverImage.public_id)
        }

})

const loginUser = asyncHandler(async(req,res)=>{

    // plan a what to do

    // 1.) get data from the body

    const {email,username,password}=req.body;

    // validation
    if (!email) {
        throw new ApiError(400,"Email is required")
    }
    if (!password) {
        throw new ApiError(400,"password is required")
    }
    if(!username){
        throw new ApiError(400,"Password is required")
    }

    // check for the user 

    const user = await User.findOne(
        {
            $or:[{username},{email}]
        }
    )
    if(!user){
        throw new ApiError(404,"User not found")
    }

    // validate password
    // used from user.model.js
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401,"Invalid credentails")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // now i will get the user object which doesnot have password and refreshToken feild

    if(!loggedInUser){
        throw new ApiError(404,"Unable to logged in User")
    }
    const options ={
        httpOnly:true,
        secure:process.env.NODE_ENV ==="production",
    }
    return res
              .status(200)
              .cookie("accessToken",accessToken.options)
              .cookie("refreshToken",refreshToken,options)
              .json(new ApiResponse(200,
                {user:loggedInUser,accessToken,refreshToken},
                "User logged in successfully"
              ))
})



const refreshAcessToken = asyncHandler(async(req,res)=>{
    
    // taking incoming refresh token from the web or mobile
    // for web => can be accessed throught cookies which i have set in midddleware in app.js

    // for mobile => we take access throught body
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401,"Refresh toke is required");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)

        if(!user){
            throw new ApiError(401,"Invalid refresh Token")
        }

        if (user.incomingRefreshToken!== user?.refreshToken) {
            throw new ApiError(401,"Invalid refresh Token")
        }

        const options ={
            httpOnly:true,
            secure:process.env.NODE_ENV ==="production",
        }

        const {accessToken ,refreshToken:newRefreshToken}= await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken",accessToken,options)
            .cookie("refresToken",newRefreshToken,options)
            .json(
                new ApiResponse(200,
                    {accessToken,refreshToken:newRefreshToken}
                    ,"Access token refreshed successfully"
                ));
    } catch (error) {
        throw new ApiError(500,"Something went wrong while refreshing access Token")
    }
})

export  {
    registerUser,
    loginUser,
    refreshAcessToken
};