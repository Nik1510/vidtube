// whenever you connect the database the database connection may not 
// go through 
// 1.) wrap aroung try -catch 
// 2.) database is always i another continent

import mongoose from 'mongoose'
import { DB_NAME} from '../constants.js'


const connectDB = async ()=>{
    try{
       const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
       console.log(`\n MongoDB connected ! DB host:${connectionInstance.connection.host} `);
       
    }
    catch(err){
        console.log("MongoDB Connection error",err);
        process.exit(1);

    }
}

export default connectDB;