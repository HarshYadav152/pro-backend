import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { validateEmail } from "../utils/emailValidator.js"
import {User} from "../models/user.models.js"
import {uploadingFilesonCloudinary} from "../utils/cloudinary.services.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"


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

const registerUser = asyncHandler(async(req,res)=>{
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

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(!incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("newRefreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,refreshToken:newRefreshToken
                },
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body;

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"invalid password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(200,req.user,"current user fetch successfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName} = req.body

    if(!fullName){
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))
})

const UpdateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    // delete old image TODO

    const avatar = await uploadingFilesonCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"User avatar updated successfully"))
})

const UpdateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image file is missing")
    }

    const coverImage = await uploadingFilesonCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    
    return res
    .status(200)
    .json(new ApiResponse(200,user,"User cover image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params

    if(!username?.trim){
        throw new ApiError(400,"Username is missing")
    }

    // writing aggregation pipelines
    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers" // total subscribers count
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"  // total channel subscribed by the give channel
                },
                isSubscribed:{  // giving channel is subscribed or not by you or (who are seeing)
                    $cond:{
                        if:{$in: [req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiResponse(404,"Channel does not exist")
    }

    console.log("user details after aggregate : ",channel);

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req,res)=>{

    const user = await User.aggregate([
        {
            $match:{
                _id: mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner"  ,
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]                
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetch successfully"
        )
    )
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    UpdateUserAvatar,
    UpdateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}