import express from 'express';
import { clerkMiddleware } from '@clerk/express';
import { get } from 'mongoose';
import { createInvoice, deleteInvoice, getInvoiceById, getInvoices, updateInvoice } from './invoiceController.js';


const invoiceRouter = express.Router();
invoiceRouter.use(clerkMiddleware());

invoiceRouter.get("/", getInvoices);

invoiceRouter.get("/:id", getInvoiceById);

invoiceRouter.post("/", createInvoice);

invoiceRouter.put("/:id", updateInvoice);

invoiceRouter.delete("/:id", deleteInvoice);

export default invoiceRouter;