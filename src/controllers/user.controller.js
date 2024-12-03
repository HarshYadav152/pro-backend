import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { validateEmail } from "../utils/emailValidator.js"
import {User} from "../models/user.models.js"
import {uploadingFilesonCloudinary} from "../utils/cloudinary.services.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async(req,res)=>{
    // get user details from fronted
    // validation -- at least not empty
    // check if user already exist  -- jo unique hai
    // check for images and other files
    // upload them to cloudinary
    // create user object - create entry in db 
    // remove password and refresh token field from response 
    // check for user creation 
    // return response


    const {username,email,password,fullName} = req.body
    console.log(username)

    // beginners approach
    // if(fullName === ""){
    //     throw new ApiError(400,"Pura naam toh daalo")
    // }

    // good approach 
    if ([fullName,email,password,username].some((field)=>field?.trim()==="")){
        throw new ApiError(400,"sab fields bharne hai ji") // message to be changed in english
    }
    if(!validateEmail(email)){
        throw new ApiError(400,"email sahi nahi hai") // message to be changed in english
    }

    const existedUser = User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"email pehle se system mai hai") // message to be changed in english
    }

    console.log("File object from request : ",req.files)
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar nahi mila") // message to be changed in english
    }

    // uploading on cloudinary
    const avatar = await uploadingFilesonCloudinary(avatarLocalPath)
    const coverImage = await uploadingFilesonCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400,"avatar nahi mila")
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url||"",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Kuch galat hua hai user register karne mai")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered ho gaya hai")
    )
}) 

export {registerUser}