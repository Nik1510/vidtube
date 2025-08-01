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
import bcrypt from 'bcrypt'
import  jwt  from "jsonwebtoken";

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

// here we are using the bcrypt function to encryption of password

userSchema.pre("save",async function (next) {

    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password,10)
    next(); 
})

userSchema.methods.isPasswordCorrect = async function (password) {
   return await bcrypt.compare(password,this.password)
}
//  till here we are done with password and comparing of the password
// ------------------------------------------------

// ---------JWT Token-------
userSchema.methods.generateAccessToken =function (){
    // short lived access token 
    return jwt.sign({
        _id: this._id,
        email:this.email,
        username:this.username,
        fullname:this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
)
}

// ---- Refresh Token 
userSchema.methods.generateRefreshToken =function (){
    // short lived access token 
    return jwt.sign({
        _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
)
}


// the down line says that 
// hey mongoose built a document in my database 
// called as "User"  and the "Schema" which I have defined
export const User = mongoose.model("User",userSchema)