import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";


const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORGIN,
        credentials:true
    })
)

// commom middleware
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser());
// ----------------------it is general ------------------


// import routes 
import healthcheckRouter from './routes/healthcheck.routes.js'
import userRouter from './routes/user.routes.js'
import { errorHandler } from "./middleware/error.middleware.js";
import videoRouter from './routes/video.routes.js'
// routes

app.use("/api/v1/healthcheck",healthcheckRouter)
console.info("in app.js going to hit userRoutes");
app.use("/api/v1/users",userRouter)
app.use("/api/v1/videos", videoRouter)
app.use(errorHandler)


export {app};