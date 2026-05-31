import mongoose from "mongoose";

const businessProfileSchema = new mongoose.Schema({
    owner: { type: String, required: true, index: true },

    businessName: { type: String, required: true },
    email:        { type: String, required: false, trim: true, lowercase: true, default: "" },
    address:      { type: String, required: false, trim: true, default: "" },
    phone:        { type: String, required: false, default: "" },
    gst:          { type: String, required: false, default: "" },

    // ✅ FIX: camelCase field names to match controller usage (logoUrl, stampUrl, signatureUrl)
    logoUrl:      { type: String, required: false, default: null },
    stampUrl:     { type: String, required: false, default: null },
    signatureUrl: { type: String, required: false, default: null },

    signatureOwnerName:  { type: String, required: false, default: "" },
    signatureOwnerTitle: { type: String, required: false, default: "" },
    defaultTaxPercent:   { type: Number, required: false, default: 18 },
    notes:               { type: String, required: false, default: "" },

}, { timestamps: true });

const BusinessProfile = mongoose.models.BusinessProfile || mongoose.model("BusinessProfile", businessProfileSchema);

export default BusinessProfile;
