import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateTokens } from "../utils/generateTokens.js";
import { remove } from "../utils/removeFields.js";
import { User } from "../models/user.models.js";
import { options } from "../constants.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Register User

const registerUser = asyncHandler(async (req, res) => {
    // 1. Get user details from frontend(react or postman)
    const { username, fullName, password, email } = req.body;
    // console.log(`Email: ${email}`);
    // 2. Validation - not empty
    if (
        [fullName, username, email, password].some(
            (field) => !field || field.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are compulsory");
    }
    // 3. Check if user exists: username,email
    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    });
    if (existingUser) {
        throw new ApiError(409, "User with email or user name exists");
    }
    // 4. Check for images and avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;

    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is compulsory");
    }
    // 5. Upload them to cloudinary, check for avatar once again
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    let coverImage;

    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }
    if (!avatar) {
        throw new ApiError(400, "Avatar file is compulsory");
    }
    // 6. Create user Object - create entry in db - and check if it exists
    const user = await User.create({
        email,
        fullName,
        password,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage.url || "",
    });

    // 7. Remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        remove("password", "refreshToken")
    );
    // 8. Check if the user is created
    if (!createdUser) {
        throw new ApiError(500, "Something Went Wrong While Registering User");
    }
    // 9. Check Objects For Practice
    // console.log("req.body:",req.body);
    // console.log("req.files:",req.files);

    // 10. Return response
    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User Registered Successfully")
        );
});

// Login User

const loginUser = asyncHandler(async (req, res) => {
    // 1. Get Data From Request Body
    const { username, email, password } = req.body;
    // 2. Check for user Validation
    if (!(username || email)) {
        throw new ApiError(400, "Email or User Name is required");
    }
    // 3. Find User from DB
    const user = await User.findOne({ $or: [{ email }, { username }] });
    // 4. Check if User exists
    if (!user) {
        throw new ApiError(404, "No User Found");
    }
    // 5. Check Password
    if (!(await user.isPasswordCorrect(password))) {
        throw new ApiError(400, "Bad Credentials");
    }
    // 6. Generate Access and Refresh Token
    const { accessToken, refreshToken } = await generateTokens(user._id);

    const loggedInUser = await User.findById(user._id).select(
        remove("password", "refreshToken")
    );
    // 7. Send Cookie Containing Tokens
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser,
                accessToken,
                refreshToken,
            })
        );
});

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
    // Find user, then update the refresh token
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined },
        },
        { new: true }
    );

    // Clear the cookies

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
});

// Refresh Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
    // Get refresh token from User
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    // Check is the token exists

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request");
    }

    // Verify and Decode Refresh Token
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        // Get the User from db using decodedToken
        const user = await User.findById(decodedToken?._id);

        // Check for User
        if (!user) {
            throw new ApiError(401, "Invalid Tokens");
        }

        // Check if the Tokens Match
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used");
        }

        // Generate Tokens
        const { newAccessToken, newRefreshToken } = await generateTokens(
            user._id
        );

        // Return Tokens
        return res
            .status(200)
            .cookie("accessToken", newAccessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { newAccessToken, newRefreshToken },
                    "Tokens Refreshed"
                )
            );
    } catch (error) {
        return new ApiError(401, error?.message || "Invalid Refresh Token");
    }
});

// Change Password

const changeCurrentPassword = asyncHandler(async (req, res) => {
    // Get Passwords
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // Check if newPassword and confirmPassword match
    if (!(newPassword === confirmPassword)) {
        throw new ApiError(400, "Passwords don't match");
    }

    // Get the user by the user id
    const user = await User.findById(req.user?._id);

    // Check if Password is Correct
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    // If not, throw an error
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Credentials");
    }

    user.password = newPassword;

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

// Get Current User

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "Current User Fetched Successfully");
});

// Update Account Details
const updateAccountDetails = asyncHandler(async (req, res) => {
    // Get User Details
    const { fullName, email } = request.body;

    // Check For Details
    if (!(fullName || email)) {
        throw new ApiError(400, "All fields are required");
    }

    // Get the user, change fullName and password and remove password and refreshToken
    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email,
            },
        },
        {
            new: true,
        }
    ).select(remove("password", "refreshToken"));

    // Return the user and the message
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Details Updated Successfully"));
});

// Update User Avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
    // Get avatar local address
    const avatarLocalPath = req.file?.path;

    // Check For Details
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    // Upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // Check if avatar has url
    if (!avatar.url) {
        throw new ApiError(500, "Error While Uploading Avatar on Cloudinary");
    }

    // Get the user, change avatar and remove password and refreshToken
    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        {
            new: true,
        }
    ).select(remove("password", "refreshToken"));

    // Return the user and the message
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar Updated Successfully"));
});

// Update User Cover Image
const updateUserCoverImage = asyncHandler(async (req, res) => {
    // Get coverImage local address
    const coverImageLocalPath = req.file?.path;

    // Check For Details
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    // Upload on cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // Check if coverImage has url
    if (!coverImage.url) {
        throw new ApiError(
            500,
            "Error While Uploading coverImage on Cloudinary"
        );
    }

    // Get the user, change coverImage and remove password and refreshToken
    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            },
        },
        {
            new: true,
        }
    ).select(remove("password", "refreshToken"));

    // Return the user and the message
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover Image Updated Successfully"));
});

// Get User Channel Profile
const getUserChannelProfile = asyncHandler(async (req, res) => {
    // Get Channel/User Name
    const { username } = req.params;

    // Check if it exists
    if (!username?.trim) {
        throw new ApiError(400, "UserName does not exists");
    }

    // Get The Channel Details
    const channel = await User.aggregate([
        // Match The User(Get the user)
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        // Join on _id=channel(from subscriptions)
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        // Join on _id=subscriber(from subscriptions)
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        // Add Fields
        {
            $addFields: {
                // Subscribers Count: Look up on Line number 360
                subscribersCount: {
                    $size: "$subscribers",
                },
                // Subscribed To Count: Look up on Line number 367
                channelsSubscribedToCount: {
                    $size: "$subscribedTo",
                },
                // Is the user(you) subscribed to this(the one you are viewing) channel
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        // Only return the following fields
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            },
        },
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "Channel Not Found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel Fetched Successfully"));
});

// Get User Watch History
const getUserWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            // Match on User Id
            // Note: We use mongoose.Types.ObjectId cause if we did'nt it will compare _id as Object id and other one as string
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            // Match and Add videos by matching User.watchHistory with Video._id
            // Note: We did not used mongoose.Types.ObjectId because it is not match
            // Note: If it sees a list then it will loop through and match
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                // Used to create a sub pipeline
                pipeline: [
                    // Add the Owner Details
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    // Only Project username, fullName and avatar
                                    $project: {
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);

    // Remove Later
    console.log(user);

    // Return the response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch History Fetched Successfully"
            )
        );
});

// Exports
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    // Updating Details
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    // Getting Details
    getUserChannelProfile,
    getUserWatchHistory,
};
