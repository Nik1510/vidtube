import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription

    // mongoDB validation
    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channelId");
    }
    
    // check if 
    if(channelId === String(req.user?._id)){
        throw new ApiError(400,"Cannot subscribe to own channel")
    }

    // channel exisits 
    const channelExists = await User.exists({_id:channelId})

    if(!channelExists){
        throw new ApiError(404,"Channel not found");
    }

    const subscriberId = req.user?._id;
   
    // check if already subscribed 
    const existing = await Subscription.findOne({
        subscriber:subscriberId,
        channel:channelId,
    });

    if(existing){
        await Subscription.deleteOne({_id:existing._id});
        return res
        .status(200)
        .json(new ApiResponse(200,{subscribed:false},"Successfully unsubscribed"))
    }

    await Subscription.create({
        subscriber:subscriberId,
        channel:channelId
    });

    return res
    .status(200)
    .json(new ApiResponse(200,{subscribed:true},"subscribred successfully"))

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    // validation from mongoose
    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid Channel");
    }

    // Ensure the channel(User) exists

    const channelExists = await User.exists({_id:channelId});
    
    if(!channelExists){
        throw new ApiError(400,"Channel not found")
    }

    // Pagination params
    const page = Math.max(1,parseInt(req.query.page ||"1",10 ));
    const limit = Math.min(100,Math.max(1,parseInt(req.query.limit || "20",10)));

    const skip = (page-1)*limit;// standard skip/limit pagination [9][11]

    // Fetch subscribers for the channel, newest first
    const [items,total] = await Promise.add([
        Subscription.find({channel:channelId})
        .sort({createdAt:-1})
        .limit(limit)
        .populate("subscriber","_id username fullname avatar")
        .lean(),
        Subscription.countDocuments({ channel: channelId }),
    ])
    return res.status(200).json(
    new ApiResponse(
      200,
      {
        total,
        page,
        limit,
        items,
      },
      "Fetched channel subscribers"
    )
  );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}