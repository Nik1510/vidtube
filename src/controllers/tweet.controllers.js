import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body; 

    if(!content){
        throw new ApiError(400,"Tweet content is required");
    }
    if(content.trim().length===0){
        throw new ApiError(400,"Tweet content cannot be empty");
    }

    if(content.length>250){
        throw new ApiError(400,"Tweet content cannot exced 250 words");
    }

    const tweet = await Tweet.create({
        content:content.trim(),
        owner:req.user?._id
    });
    if(!tweet){
        throw new ApiError(400,"Failed to create tweet")
    }
    return res
    .status(201)
    .json(new ApiResponse(201,tweet,"Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
       
    // if the user want the tweets => user is logged in 
    const {userId} = req.params;

    const {page =1, limit=10} =req.query ; // Pagination

    const targetUserId = userId || req.user?._id; 

    if (!targetUserId) {
        throw new ApiError(400,"User ID is required")
    }
    if(!mongoose.Types.ObjectId.isValid(targetUserId)){
        throw new ApiError(400,"Invalid user id format")
    }

    // build aggregation pipeline
    const pipeline =[
        {
            $match:{
                owner: new mongoose.Types.ObjectId(String(targetUserId))
            }
        },
        {
            $lookup:{
                from:'users',
                localField:'owner',
                foreignField:'_id',
                as:'ownerDetails',
                pipeline:[{
                    $project:{
                        username:1,
                        fullname:1,
                        avatar:1
                    }
                }]
            }
        },
        {
            $unwind:'$ownerDetails' /* //  It converts nested array data into a more flat, structured format, making it easier to work with individual array elements.

            eg :- { "_id": 1, "item": "book", "tags": ["fiction", "fantasy"] }
         { "_id": 2, "item": "pen", "tags":          ["writing"] }

             solution :- { "_id": 1, "item": "book", "tags":            "fiction" }
            { "_id": 1, "item": "book", "tags": "fantasy" }
            { "_id": 2, "item": "pen", "tags": "writing" } */
        },
        {
            $addFields:{
                owner:'$ownerDetails',
                likesCount: {$size:'$likes'},
                retweetsCount:{$size:'$retweets'}
            }
        },{
            $sort:{createdAt:-1} // Newest first
        },
        {
            $project:{
                content:1,
                owner:1,
                likesCount:1,
                retweetsCount:1,
                createdAt:1,
                updatedAt:1
            }
        }
    ];

    // Pagination option  
    // fetch only the limited set 
    const options= {
        page:parseInt(page,10), //: Which page of results to return (e.g., page 1, 2, 3...)
        limit:parseInt(limit,10), // how many tweets per page
        customLabels:{ 
            // changing labels name provided by the monogodb
            totalDocs:'totalTweets',
            docs:'tweets',
            limit:'pageSize',
            page:'currentPage',
            totalPages:'totalPages',
            pagingCounter:'slNo',
            meta:'paginator'
        }
    };

    const tweets = await Tweet.aggregatePaginate(
        Tweet.aggregate(pipeline),
        options
    )

    return res.
    status(200)
    .json(new ApiResponse(200,tweets,"User tweets fetched successfully"));

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {content} = req.body;

    const {tweetId} = req.params;

    // Validation 
    if(!content){
        throw new ApiError(400,"Content id is required");
    }

    if(!tweetId){
        throw new ApiError(400,"tweet Id is required")
    }

    if(content.trim().length===0 ){
        throw new ApiError(400,"Tweet content cannot be empty")
    }

    if(content.length>250){
        throw new ApiError(400,"Tweet content cannot exceed 250 characters")
    }

    

    // monogo-db validation 
    if(!mongoose.Types.ObjectId.isValid(tweetId)){
        throw new ApiError(400,"tweet id is not valid")
    }

    // check if tweet exists and belongs to the current user

    const existingTweet = await Tweet.findById(tweetId);

    if (!existingTweet) {
        throw new ApiError(404,"Tweet not found")
    }

    // check ownership - only tweet owner can update
    if(existingTweet.owner.toString()!== req.user._id.toString()){
        throw new ApiError(403,"You can only update your own tweets");
    }
    
    // update the tweet
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content:content.trim()
            }
        },
        {
            new:true, // returns the updated document
            runValidators:true // Run schema validation
        }
    ).populate('owner','username fullname avatar')

    if(!updatedTweet){
        throw new ApiError(500,"Failed to update tweet")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,updatedTweet,"Tweet updated successfully"))
    
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const {tweetId} = req.params;

    if(!tweetId){
        throw new ApiError(400,"No tweet Id found");
    }
    
    // monogodb - validation
    if(!mongoose.Types.ObjectId.isValid(tweetId)){
        throw new ApiError(400,"unable to find the tweet in database")
    }

    const existingTweet = await Tweet.findById(tweetId);

    if(!existingTweet){
        throw new ApiError(400,"Tweet not found")
    }

    if(existingTweet.owner.toString()!==req.user._id.toString()){
        throw new ApiError(403,"You can delete your own tweets")
    }

    const del = await Tweet.findByIdAndDelete(tweetId);

    if(!del){
        throw new ApiError(500,"failed to delete the tweet")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,{_id:tweetId},"successfully deleted"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}