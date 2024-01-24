const express=require('express');
const app=express();


// import routes
const userRoute=require('./routes/User');
const courseRoute=require('./routes/Course');
const paymentsRoute=require('./routes/Payments');
const profileRoute=require('./routes/Profile');
const contactRoute=require('./routes/Contact');

const cookieParser=require('cookie-parser');
const {dbConnect}=require('./config/database')
const {cloudinaryConnect}=require('./config/cloudinary')
const cors=require('cors');
const fileUpload=require('express-fileupload');
require('dotenv').config();

const PORT=process.env.PORT||4000;

// middlewares
app.use(express.json());// json parser
app.use(cookieParser());// cookie parser

app.use(cors({
    origin:"https://studynotion-edutechlearning.vercel.app/",
    credentials:true,
}))

app.use(
    fileUpload({
        useTempFiles:true,
        tempFileDir:"/tmp"
    })
)

// database connection 
dbConnect();// db connect
cloudinaryConnect(); // cloudinary connect


// mount routes
app.use("/api/v1/auth",userRoute);  
app.use("/api/v1/course",courseRoute);  
app.use("/api/v1/payment",paymentsRoute);  
app.use("/api/v1/profile",profileRoute);  
app.use("/api/v1/reach",contactRoute);  

// default route 
app.use('/',(req,res)=>{
    return res.json({
        success:true,
        message:"Server is up and running"
    })
})
// server  listen 
app.listen(PORT,()=>{
    console.log(`App is running at port  ${PORT} `)
})

