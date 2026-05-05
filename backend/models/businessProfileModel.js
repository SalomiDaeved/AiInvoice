import mongoose from "mongoose";

const businessProfileSchema = new mongoose.Schema({
    owner:{type: String, required: true, index:true},

    businessName: { type: String, required: true },
    email: { type: String, required: false, trim: true , lowercase: true,default: ""},
    address :{ type: String, required: false, trim: true ,default: ""},
    phone:{ type: String, required: false, default: ""},
    gst:{ type: String, required: false, default: ""},

       //for images
       logourl:{ type: String, required: false, default: null},
       stampurl:{ type: String, required: false, default: null},
       signatureurl:{ type: String, required: false, default: null},


    signatureOwnerName:{  type: String, required: false, default: ""},
    signatureOwnerTitle:{  type: String, required: false, default: ""},
    defaultTaxPercent:{type: Number, required: false, default: 18},



},{ timestamps: true}
);


const BusinessProfile = mongoose.models.BusinessProfile || mongoose.model("BusinessProfile", businessProfileSchema);

export default BusinessProfile;