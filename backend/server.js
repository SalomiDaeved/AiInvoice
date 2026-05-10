import express from 'express';  
import cors from 'cors';
import 'dotenv/config';
import{ clerkMiddleware } from '@clerk/express';
import {connectDB} from './config/db.js';
import path from 'path';
import invoiceRouter from './routes/invoiceRouter.js';
import businessProfileRouter from './routes/businessProfileRouter.js';
import aiInvoiceRouter from './routes/aiInvoiceRouter.js';



const app = express();
const port = process.env.PORT || 5000;

//MIDDLEWARES
app.use(cors(

    {
        orgin: process.env.CORS_ORIGIN ,
        credentials: true
    }
));
app.use(express.json({limit: "20mb"}));
app.use(express.urlencoded({limit: "20mb", extended: true}));


//DB
connectDB();



//ROUTES
app.use('/uploads',express.static(path.join(process.cwd(),"uploads")));

app.use('/api/invoice', invoiceRouter);

app.use('/api/businessProfile', businessProfileRouter);

app.use('/api/ai',aiInvoiceRouter);





app.get('/', (req, res) => {
    res.send('API working');
});

app.listen(port, () => {
    console.log(`Server running on port  http://localhost:${port}`);
});