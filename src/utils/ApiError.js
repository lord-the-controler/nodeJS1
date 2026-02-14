class ApiError extends Error{
    constructor(statusCode=400,message="Something went wrong!",stack=""){
        super(message)
        this.statusCode=statusCode
        this.message=message

        if (stack){
            this.stack=stack
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}