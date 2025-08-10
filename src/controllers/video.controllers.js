import mongoose, {isValidObjectId} from "mongoose"
import { Video } from "../models/video.models.js"
import {User} from '../models/user.models.js'
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import fs from 'fs'


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
    const { title, description } = req.body;
    
    
    if(!title){
        throw new ApiError(400,"Title is required");
    }
    if (!description) {
        throw new ApiError(400,"Description is required");
    }

    if(!req.files || !req.files.video || !req.files.video[0]){
        throw new ApiError(400,"Video file is required");
    }

    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

 
    const videoUpload = await uploadOnCloudinary(videoFile.path);
    
    if (!videoUpload) {
        throw new ApiError(400,"Failed to upload video to Cloudinary");
    }

    // Upload thumbnail if provided
    let thumbnailUpload = null;
    if (thumbnailFile) {
        thumbnailUpload = await uploadOnCloudinary(thumbnailFile.path);
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoUpload.secure_url,
        thumbnail: thumbnailUpload?.secure_url || videoUpload.secure_url,
        duration: videoUpload.duration || 0,
        owner: req.user?._id
    });

    try {
        if (videoFile.path && fs.existsSync(videoFile.path)) {
            fs.unlinkSync(videoFile.path);
        }
        if (thumbnailFile?.path && fs.existsSync(thumbnailFile.path)) {
            fs.unlinkSync(thumbnailFile.path);
        }
    } catch (cleanupError) {
        console.error('Error cleaning up files:', cleanupError);
        // Don't throw error for cleanup failure
    }

    return res
        .status(201)
        .json(new ApiResponse(201, video, "Video published successfully"));
});


const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    // validation videoId
    if(!videoId){
        throw new ApiError(400,"Video Id is required")
    }

    // check if videoId is a valid Object Id
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid video ID format")
    }

    try {
        // Use aggregation pipeline to get video with owner details
        const video = await Video.aggregate([
            {
                $match:{
                    _id:new mongoose.Types.ObjectId(String(videoId)),
                    isPublished:true // Only show published videos
                }
            },
            {
                $lookup:{
                    from:'users',
                    localField:'owner',
                    foreignField:'_id',
                    as:'ownerDetails',
                    pipeline:[
                        {
                            $project:{
                                username:1,
                                fullname:1,
                                avatar:1
                            }
                        }
                    ]
                }
            },
            {
                $unwind:'$ownerDetails'
                // Converts ownerDetails: [userObject] → ownerDetails: userObject
            },
            {
                $addFields:{
                    owner:'$ownerDetails'
                }
            },
            {
                $project:{
                    videoFile:1,
                    thumbnail:1,
                    title:1,
                    description:1,
                    duration:1,
                    views:1,
                    createdAt:1,
                    updatedAt:1,
                    owner:1
                }
            }
        ]);

        // Check if video exists

        if(!video || video.length===0){
            throw new ApiError(404,"Video not found or not published")
        }

        // Increment view count 
        await Video.findByIdAndUpdate(
            videoId,
            {$inc:{views:1}},
            {new :true}
        );

        return res
                .status(200)
                .json(new ApiResponse(200,video[0],"Video fetched successfully"))

    } catch (error) {
        throw new ApiError(500,`Failed to fetch video:${error.message}`)
    }

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const {title,description,thumbnail} = req.body;

    if(!videoId){
        throw new ApiError(400,'Video Id is required');
    }

    if(!mongoose.Types.ObjectId.isValid(videoId)){
       throw new ApiError(400,'Invalid video ID format');
    }

    if(!title && !description && !thumbnail){
        throw new ApiError(400,'At least one field (title, description, or thumbnail) is required for update')
    }

    // Build update object dynamically 
    const updateFields = {};
    if (title) {
        updateFields.title = title;
    }
    if (description) {
        updateFields.description=description;
    }
    if (thumbnail) {
        updateFields.thumbnail=thumbnail;
    }

    // now i will set to update the data 
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {$set:updateFields},
        {
            new:true, // Return the modified document rather than the original 
            runValidators: true // Ensure scehma validation is applied during the update
        }
    );

    if (!updatedVideo) {
        throw new ApiError(404,'Video not found');
    }
   
    return res
    .status(200)
    .json(new ApiResponse(200,updatedVideo,"Video updated successfully"))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if(!videoId){
        throw new ApiError(400,"Video ID is required");
    }

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid video ID format");
    }

    const deletedVideo = await Video.findByIdAndDelete(
        videoId
    )
    if(!deletedVideo){
         throw new ApiError(404,"Video not found or already deleted");
    }
    return res
    .status(200)
    .json(new ApiResponse(200,deletedVideo,"Video deleted Successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    // validation 
    if (!videoId) {
        throw new ApiError(400,"Video Id is required");
    }

    // validation in moongoose
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid Video ID format")
    }

    // First get the current video to check its current publish status 
    const currentVideo = await Video.findById(videoId);

    if (!currentVideo) {
        throw new ApiError(404,"Video not found")
    }

    // Toggle the isPublished status
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {$set:{
            isPublished:!currentVideo.isPublished
        }},
        {
            new:true,
            runValidators:true
        }
    );

    return res
    .status(200)
    .json(new ApiResponse(200,updatedVideo,`Video ${updatedVideo.isPublished? 'published':'unpublished'} successfully`))

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}