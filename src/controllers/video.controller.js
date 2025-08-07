import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import fs from 'fs'
import { title } from "process"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    // req.query will return a JS object after the query string is parsed.
    // for example :- /api/videos?query=tutorial&sortBy=createdAt&sortType=desc&page=2&limit=8

    //TODO: get all videos based on query, sort, pagination

    // Building the aggregation pipeline

    const pipeline =[];

    // Match stage for filtering
    const matchStage = {};


    if (userId) {
        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }

    // only show published video by default
    matchStage.isPublished=true;

    // Search query -search in title and description 
    if (query) {
        matchStage.$or=[
            // i -> apply case in-senseitive search
            {title:{$regex:query,$options:'i'}},
            {description:{$regex:query,$options:'i'}}
        ];
    }
    pipeline.push({$match:matchStage}); // here i add filteration stage to pipeline

    // Lookup owner details
    pipeline.push({
        $lookup:{
            from:'users', // Join with 'users' collection
            localField:'owner', // Video's owner field
            foreignField:'_id',// User's _id field
            as:'ownerDetails', // Store result as 'ownerDetails'
            pipeline:[
                { // only fetch  username , fullname, avatar
                    $project:{
                        username:1,
                        fullname:1,
                        avatar:1
                    }
                }
            ]
        }
    });

    // Unwind stage
    pipeline.push({
        $unwind:'$ownerDetails'
        // here i convert ownerDetails :[userObj] to ownerDetails :userObj
    })

    // Add Feild stage 
    pipeline.push({
        $addFields:{
            owner:'$ownerDetails'
        }
        // replace the original 'owner' .ObjectId with full user details
        // now owner contains {username, full,avatar}
    })

    // now at Sort Stage

    let sortStage ={};
    if (sortBy && sortType) {
        sortStage[sortBy] = sortType ==='desc'? -1:1;
    }else{
        sortStage.createdAt = -1; // Default :newset stage
    }
    pipeline.push({$sort:sortStage})


    // 9. Project Stage 
    pipeline.push({
        $project:{
            videoFile:1,
            thumbnail:1,
            title:1,
            description:1,
            duration:1,
            views:1,
            createdAt:1,
            owner:1
        }
    });

    // Aggregation options for pagination

    const options={
        page:parseInt(page,10),
        limit:parseInt(limit,10),
        customLabels:{
            totalDocs:'totalVideos',
            docs:'videos',
            limit:'pageSize',
            page:'currentPage',
            nextPage:'next',
            prevPage:'prev',
            totalPages:'totalPages',
            pagingCounter:'slNo',
            meta:'paginator'
        }
    };

    try {
        const videos = await Video.aggregatePaginate(
            Video.aggregate(pipeline),
            options
        )
        return res
                  .status(200)
                  .json(new ApiResponse(200,videos,"Videos fetched successfully"))
    } catch (error) {
        throw new ApiError(500,`Failed to fetch videos ${error.message}`)
    }


})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if(!title){
        throw new ApiError(404,"Need title for the video");
    }
    if (!description) {
        throw new ApiError(404,"Need description for the video")
    }

    if(!req.file || !req.file.path){
        throw new ApiError(400,"Video file is required");
    }

    try {
        const videoUpload = await uploadOnCloudinary(req.file.path)  

        if (!videoUpload) {
            throw new ApiError(400,"Failed to upload to Cloudinary")
        }

        // now i have to create record in the database
        const video = await Video.create({
            title,
            description,
            videoFile:videoUpload.secure_url,
            thumbnail:videoUpload.secure_url,
            duration:videoUpload.duration || 0,
            cloudinaryVideoId:videoUpload.public_id,
            owner:req.user?._id
        });
        return res.
                   status(201)
                   .json(new ApiResponse(201,video,"Video published successfully"));

    } catch (error) {
        if(req.file.path && fs.existsSync(req.file.path)){
            fs.unlinkSync(req.file.path)
        }
        throw new ApiError(500,`Failed to publish video ${error.message}`)
    }
    
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}