import { ApiError } from "./ApiError.js";
import {User} from "../models/user.models.js"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        let accessToken = await user.generateAccessToken();
        let refreshToken = await user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something Went Wrong While Generating Access and Refresh Tokens"
        );
    }
};

export { generateAccessAndRefreshToken as generateTokens };
