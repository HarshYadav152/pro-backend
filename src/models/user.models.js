import mongoose from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const UserSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true // for optimize search
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avatar:{
        type:String, // cloudinary service using soon
        required:true,
    },
    coverImage:{
        type:String, // cloudinary service using soon
    },
    watchHistory:[
        {
           type:mongoose.Schema.Types.ObjectId,
           ref:"video"
        }
    ],
    password:{
        type:String,
        required:[true,"Password can't be blank"]
    },
    refreshToken:{
        type:String
    }

},{timestamps:true});

UserSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();
    this.password = bcrypt.hash(this.password,5)
    next()
})

UserSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password)
}

UserSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
UserSchema.methods.generateRefreshToken = async function(){
    return jwt.sign(
        {
            _id:this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User",UserSchema)