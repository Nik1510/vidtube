import { jwt } from "jsonwebtoken";
import {User} from '../models/user.models.js'
import {ApiError} from '../utils/ApiError.js'
import {asyncHandler} from '../utils/asyncHandler.js'


export const verifyJWT = asyncHandler(async(req,_,next)=>{
    // _ simply means res , we used this notation because we are not doing anything with it.
    // next to tranfer the controller

    const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer","")

    if(!token){
        throw new ApiError(401,"Unauthorized");
    }

    try {
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)


        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        
        if (!user) {
            throw new ApiError(401,"Unauthorized")
        }

        
        req.user = user
        // now i have to transfer the flow of this i.e. from middleware to controller
        next()



    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid access Token")
    }
})