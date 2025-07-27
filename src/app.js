import express from "express"
import cors from "cors"
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
// ----------------------it is general ------------------


// import routes 
import healthcheckRouter from './routes/healthcheck.routes.js'


// routes

app.use("/api/v1/healthcheck",healthcheckRouter)


export {app};