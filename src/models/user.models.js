/*
    _id string pk
    username string
    email string
    fullName string
    avatar string
    coverImage string
    watchHistory ObjectId[] videos
    password string
    refreshToken string
    createdAt Date
    updateAt Date
*/

import mongoose, {Schema} from "mongoose";

const userSchema = new Schema(
    {
        username :{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
        },
        fullname: {
            type:String,
            required:true,
            trim:true,
            index:true
        },
        avatar:{
            type:String, // cloudinary url
            required:true
        },
        coverImage:{
            type:String,
        },
        watchHistory :[
            {
                type:Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{
            type:String,
            required:[true,"Password is required"]
        },
        refreshToken:{
            type:String
        }
    },
    {timestamps:true}
)

// the down line says that 
// hey mongoose built a document in my database 
// called as "User"  and the "Schema" which I have defined
export const User = mongoose.model("User",userSchema)