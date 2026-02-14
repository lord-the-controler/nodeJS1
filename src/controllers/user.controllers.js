import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";

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
        coverImageLocalPath=req.files.coverImage
    }
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is compulsory");
    }
    // 5. Upload them to cloudinary, check for avatar once again
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
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
        "-password -refreshToken"
    );
    // 8. Check for user creating
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

export { registerUser };
