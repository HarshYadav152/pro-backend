// require('dotenv').config();
// import dotenv from 'dotenv';
import connectingtoDB from "./db/config.js";

import dotenv from 'dotenv';
dotenv.config();

console.log(process.env.MONGODB_URI);
console.log(process.env.PORT);


connectingtoDB();