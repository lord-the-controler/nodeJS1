import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
    // 1. Get user details from frontend(react or postman)
    // 2. Validation
    // 3. Check if user exists: username,email
    // 4. Check for images and avatar
    // 5. Upload them to cloudinary, check for avatar once again
    // 6. Create user Object - create entry in db
    // 7. Remove password and refresh token field from response
    // 8. Check for user creating
    // 9. Return response
});

export { registerUser };
