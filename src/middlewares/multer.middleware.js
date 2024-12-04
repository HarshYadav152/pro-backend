import multer from "multer";

const storage = multer.diskStorage({
    destination: function(req,file,cb){
        cb(null,"./public/temp")
    },
    filename:function(req,file,cb){
        // const uniqueSuffix = Date.now();
        console.log("File uploaded : ",file)
        // cb(null,file.originalname + "-" + uniqueSuffix)
        cb(null,file.originalname)
    }
})

export const upload = multer({
    storage,
});