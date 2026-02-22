# nodeJS1

## Dependencies

App
> - Express

DB
> - Mongoose  
> - mongoose-aggregate-paginate-v2  

Password Handling
> - Bcrypt
> - jsonwebtoken

File Uploads
> - Multer
> - Cloudinary

## Routes
### User Routes
Path:/api/v1/users
> Login  
> Logout  
> Register  

## Errors

Register User
> All fields not given : All fields are compulsory <br>
> User Exists : User with email or user name exists <br>
> Avatar Not Given : Avatar file is compulsory <br>
> User Not Created : Something Went Wrong While Registering User <br>

Login User
> Email or user name not given : Email or User Name is required<br>
> No user found : No User Found<br>
> Incorrect Password : Bad Credentials<br>

Refresh Access Token
> No incoming token : Unauthorized Request<br>
> Invalid Tokens: Invalid Tokens<br>
> Refresh Token expired or used : Refresh Token is expired or used<br>

Change Password
> Passwords don't match : Passwords don't match<br>
> Old Password Incorrect : Invalid Credentials<br>
