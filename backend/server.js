import express from 'express';  
import cors from 'cors';
import 'dotenv/config';
import{ clerkMiddleware } from '@clerk/express';
import {connectDB} from './config/db.js';

const app = express();
const port = process.env.PORT || 5000;

//MIDDLEWARES
app.use(cors());
app.use(express.json({limit: "20mb"}));
app.use(express.urlencoded({limit: "20mb", extended: true}));


//DB
connectDB();



//ROUTES


app.get('/', (req, res) => {
    res.send('API working');
});

app.listen(port, () => {
    console.log(`Server running on port  http://localhost:${port}`);
});