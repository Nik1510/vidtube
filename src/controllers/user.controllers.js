import {asyncHandler}  from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary ,deleteFromCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import  jwt  from 'jsonwebtoken'
import mongoose from 'mongoose'



const generateAccessAndRefreshToken = async (userId)=>{
    // this is helper method
    try {
        const user =await User.findById(userId);
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
    // console.info("hit the register User")

    // 🔍 Add comprehensive debugging
    console.log('=== REQUEST DEBUG INFO ===');
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Request method:', req.method);
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Request headers:', req.headers);
    console.log('========================');
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
    if (avatar) {
            await deleteFromCloudinary(avatar.public_id)
        }
        if (coverImage) {
            await deleteFromCloudinary(coverImage.public_id)
        }
    
    return res
            .status(201)
            .json(new ApiResponse(201,createdUser,"User registed user"));
        
    } catch (error) {
        console.log("User creation failed",error)
        
        throw new ApiError(500,"Something went wrong");
    }

        

})

const loginUser = asyncHandler(async(req,res)=>{
    // to test this 
    // Select "raw" instead of "form-data"

    // Change dropdown from "Text" to "JSON"

    // Enter the JSON data as shown above

    // Send the request 
    console.log("hit login user")
    console.log('=== LOGIN DEBUG ===');
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('req.body:', req.body);
    console.log('req.headers:', req.headers);
    console.log('==================');
    // plan a what to do

    // 1.) get data from the body

    const {email,username,password}=req.body;

    console.log('=== AFTER DESTRUCTURING ===');
    console.log('email:', email);
    console.log('username:', username); 
    console.log('password:', password);
    console.log('password type:', typeof password);
    console.log('password truthy:', !!password);
    console.log('========================');

    // validation
    if (!email && !username) {
        throw new ApiError(400, "Email or username is required");
    }
    if (!password) {
        throw new ApiError(400,"password is required")
    }
    // if(!username){
    //     throw new ApiError(400,"username is required")
    // }

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
              .cookie("accessToken",accessToken,options)
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

const logoutUser = asyncHandler(async(req,res)=>{
    console.log("In logout controller");
    
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined,
            }
        },
        {new:true}
    )

    const options ={
        httpOnly:true,
        secure:process.env.NODE_ENV="production"
    }
    return res
           .status(200)
           .clearCookie("accessToken",options)
           .clearCookie("refreshToken",options)
           .json(new ApiResponse(200,{},"User logged out successfully"))

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    console.warn("body",req.body)
    const {oldPassword,newPassword} =req.body;
    const user = await User.findById(req.user?._id);
    
    const isPasswordValid =await user.isPasswordCorrect(oldPassword);

    if(!isPasswordValid){
        throw new ApiError(401,"Old Password correct");
    }
    user.password=newPassword;
    // user.save is the hook from user.models.js
    await user.save({validateBeforeSave:false})

    return res.status(200).json(new ApiResponse(200,{},"Password Changed Successfully"));
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,req.user,"Current user details"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname,email} = req.body;

    if(!fullname  || !email){
        throw new ApiError(400,"Full and email are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email
            }
        },
        {new:true}
    ).select("-password -refreshToken")
    return res.status(200).json(new ApiResponse(200,user,"Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    // access the local avatar file
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,"File is required")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(500,"Something went wrong while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    // Return the updated user
    return res.status(200).json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400,"File is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage.url){
        throw new ApiError(500,"Something went wrong")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200,user,"Cover image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    //  params is used when you have to grab something from url 
    const {username} = req.params

    if(!username.trim()){
        throw new ApiError(400,"Username is required")
    }

    const channel = await User.aggregate(
        // here we are using aggregation pipeline
        [
            {
                $match:{
                    username:username?.toLowerCase()
                }
            },
            {
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"channel",
                    as:"subscribers"
                }
            },
            {
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"subscriber",
                    as:"subscribedTo"
                }
            },{
                $addFields:{
                    subscribersCount:{
                        $size:"$subscribers"
                    },
                    channelsSubscribedToCount:{
                        $size:"$subscribedTo"
                    },
                    isSubscribed:{
                        $cond:{
                            if:{
                                $in: [req.user?._id, "$subscribers.subscriber"]
                            },
                            then:true,
                            else:false
                        }
                    }
                }
            },{
                // Project only the necessary data
                $project:{
                    fullname:1,
                    username:1,
                    avatar:1,
                    subscribersCount:1,
                    channelsSubscribedToCount:1,
                    isSubscribed:1,
                    coverImage:1,
                    email:1
                }
            }
        ]
    )

    if(!channel?.length){
        throw new ApiError(404,"Channel not found")
    }

    return res.status(200).json(new ApiResponse(
        200,
        channel[0],
        "Channel profile fetched successfully"
    ))
})

const getWatchHistory =asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(String(req.user?._id))
            }
        },{
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            // going to grab some data
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200,user[0]?.watchHistory,"Watch Histroy fetched successfully"))
})


export  {
    registerUser,
    loginUser,
    refreshAcessToken,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};