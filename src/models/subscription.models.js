import { Schema, model } from "mongoose";

const subscriptionSchema=new Schema({
    subscriber:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:[true,"subscriber is required"],
    },
    channel:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:[true,"channel is required"],
    },
},{timestamps:true})

const Subscription=model("Subscription",subscriptionSchema)

export {Subscription}