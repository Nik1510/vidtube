import {ApiResponse} from '../utils/ApiResponse.js'
import {asyncHandler}  from '../utils/asyncHandler.js'

const healthcheck = asyncHandler( async(req,res)=>{
    console.log("in health check ");
    return res
    .status(200)
    .json(new ApiResponse(200,"Ok","Heath check passed"))
})

export {healthcheck}