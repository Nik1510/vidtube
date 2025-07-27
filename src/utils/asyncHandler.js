const asyncHandler = (requestHandler)=>{
    // next is the middleware here
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
    }
}

export {asyncHandler}

// write a try- catch for this 