import express from 'express';
import multer from 'multer';
import { clerkMiddleware } from '@clerk/express';
import path from 'path';
import {
  createBusinessProfile,
  getMyBusinessProfile,
  updateBusinessProfile,
} from '../controllers/businessProfileController.js';
 
const businessProfileRouter = express.Router();
businessProfileRouter.use(clerkMiddleware());
 
// ─── Multer setup ────────────────────────────────────────────────────────────
 
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `business-${unique}${ext}`);
  },
});
 
const upload = multer({ storage });
 
// FIX: accept both the frontend field names ("logo", "stamp", "signature")
// AND the legacy names so req.files is always populated correctly
const uploadFields = upload.fields([
  { name: "logo",              maxCount: 1 },   // ← what the frontend sends
  { name: "stamp",             maxCount: 1 },
  { name: "signature",         maxCount: 1 },
  { name: "logoName",          maxCount: 1 },   // kept for backwards compat
  { name: "stampName",         maxCount: 1 },
  { name: "signatureNameMeta", maxCount: 1 },
]);


 
// ─── Routes ──────────────────────────────────────────────────────────────────
 
// FIX: /me MUST be declared before /:id so Express doesn't treat "me" as an id
businessProfileRouter.get("/me", getMyBusinessProfile);
 
businessProfileRouter.post("/", uploadFields, createBusinessProfile);
 
businessProfileRouter.put("/:id", uploadFields, updateBusinessProfile);
 
export default businessProfileRouter;