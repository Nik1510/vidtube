import  jwt  from "jsonwebtoken";
import {User} from '../models/user.models.js'
import {ApiError} from '../utils/ApiError.js'
import {asyncHandler} from '../utils/asyncHandler.js'


export const verifyJWT = asyncHandler(async(req,_,next)=>{
    // _ simply means res , we used this notation because we are not doing anything with it.
    // next to tranfer the controller
    console.log("in verifyJWT");
        const headerToken = req.header("Authorization")?.replace("Bearer ", "");
        const cookieToken = req.cookies?.accessToken;

    // Use header token first, fall back to cookie only if header is not available
    const token = headerToken || (cookieToken !== 'undefined' ? cookieToken : null);
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