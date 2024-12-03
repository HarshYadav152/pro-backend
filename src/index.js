import dotenv from 'dotenv';
import connectingtoDB from "./db/config.js";
import {app} from "./app.js"
dotenv.config();

connectingtoDB()
.then(()=>{
    app.on("error",(error)=>{
        console.log("Something went wrong : ",error);
    })
    app.listen(process.env.PORT || 3000,()=>{
        console.log(`Server is running on port : ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("MONGODB connection error failed !!! : ",err);
})