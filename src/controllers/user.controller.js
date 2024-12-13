import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { validateEmail } from "../utils/emailValidator.js"
import {User} from "../models/user.models.js"
import {uploadingFilesonCloudinary} from "../utils/cloudinary.services.js"
import {ApiResponse} from "../utils/ApiResponse.js"


const generateAccessTokenAndRefreshToken = async(userID)=>{
    try {
        const user = await User.findOne(userID)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave:false })

        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

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

    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"email pehle se system mai hai") // message to be changed in english
    }

    console.log("File object from request : ",req.files)
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath  = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar nahi mila local path") // message to be changed in english
    }

    // uploading on cloudinary
    const avatar = await uploadingFilesonCloudinary(avatarLocalPath)
    const coverImage = await uploadingFilesonCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400,"avatar nahi mila")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url||"",
        email,
        password,
        username: username.toLowerCase()
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

const loginUser = asyncHandler(async(req,res)=>{
    // req body => se data le aao
    // username and password
    // find the user with username
    // check password -> wrong password
    // generate a access token and refresh token
    // send cookies with tokens
    // send response

    const {username,email,password} = req.body;

    if(!(username ||email)){
        throw new ApiError(400,"username aur email to dena jaruri hai")
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"user nahi hai hamare system mai")
    }

    const passwordValid = await user.isPasswordCorrect(password)

    if(!passwordValid){
        throw new ApiError(401,"password galat hai ji")  // invalid user credentials
    }

    const {accessToken,refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

    // delete user.password // remove these fields from user object
    // delete user.refreshToken // remove these fields from user object

    const loggedInUser = await User.findOne(user._id).select("-password -refreshToken")  // optional

    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
            // user,accessToken,refreshToken
            user:loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully"
        )
    )


})


const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new :true
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User Logged-out successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser
}