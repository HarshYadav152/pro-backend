// require("dotenv").config();
import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"

const connectingtoDB = async()=>{
    try {
        const connectionResponse = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`MongoDB connected At HOST :: ${connectionResponse.connection.host}`);
    } catch (error) {
        console.log("Failed to connect to MONGODB : ",error);
        process.exit(1);
    }
}

export default connectingtoDB;