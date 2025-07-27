import dotenv from 'dotenv'
import logger from "./logger.js";
import morgan from "morgan";
import {app} from "./app.js"
import connectDB from './db/index.js';


dotenv.config({
  path:"./.env"
})


const morganFormat = ":method :url :status :response-time ms";

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);

const port = process.env.PORT || 9000;

connectDB()
.then(()=>{
  console.log(`Server is running on port ${port}`);
  
})
.catch((err)=>{
  console.log(`MongoDB connection error ${err}`);
  
})