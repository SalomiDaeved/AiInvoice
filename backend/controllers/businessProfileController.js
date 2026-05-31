import { getAuth } from "@clerk/express";
import BusinessProfile from "../models/businessProfileModel.js";

const API_BASE = process.env.API_BASE_URL;

// ─── HELPERS ────────────────────────────────────────────────────────────────

function uploadedFilesToUrls(req) {
  const urls = {};
  if (!req.files) return urls;

  const logoArr  = req.files.logoName      || req.files.logo      || [];
  const stampArr = req.files.stampName     || req.files.stamp     || [];
  const sigArr   = req.files.signatureNameMeta || req.files.signature || [];

  if (logoArr[0])  urls.logoUrl      = `${API_BASE}/uploads/${logoArr[0].filename}`;
  if (stampArr[0]) urls.stampUrl     = `${API_BASE}/uploads/${stampArr[0].filename}`;
  if (sigArr[0])   urls.signatureUrl = `${API_BASE}/uploads/${sigArr[0].filename}`;

  return urls;
}

// ─── CREATE ─────────────────────────────────────────────────────────────────

export async function createBusinessProfile(req, res) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const body     = req.body   || {};
    const fileUrls = uploadedFilesToUrls(req);

    console.log("📥 [BusinessProfile] Creating profile:", {
      businessName: body.businessName,
      hasLogoFile:      !!fileUrls.logoUrl,
      hasLogoDataUrl:   !!body.logoDataUrl,
      hasStampFile:     !!fileUrls.stampUrl,
      hasStampDataUrl:  !!body.stampDataUrl,
      hasSignatureFile: !!fileUrls.signatureUrl,
      hasSignatureDataUrl: !!body.signatureDataUrl,
    });

    const profile = new BusinessProfile({
      owner:               userId,
      businessName:        body.businessName        || "ABC Solutions",
      email:               body.email               || "",
      address:             body.address             || "",
      phone:               body.phone               || "",
      gst:                 body.gst                 || "",
      notes:               body.notes               || "",
      // ✅ Priority: uploaded file > base64 data URL > explicit URL
      logoUrl:             fileUrls.logoUrl      || body.logoDataUrl      || body.logoUrl      || null,
      stampUrl:            fileUrls.stampUrl     || body.stampDataUrl     || body.stampUrl     || null,
      signatureUrl:        fileUrls.signatureUrl || body.signatureDataUrl || body.signatureUrl || null,
      signatureOwnerName:  body.signatureOwnerName  || "",
      signatureOwnerTitle: body.signatureOwnerTitle || "",
      defaultTaxPercent:
        body.defaultTaxPercent !== undefined ? Number(body.defaultTaxPercent) : 18,
    });

    const saved = await profile.save();

    console.log("✅ [BusinessProfile] Created successfully:", {
      id:           saved._id,
      hasLogo:      !!saved.logoUrl,
      hasStamp:     !!saved.stampUrl,
      hasSignature: !!saved.signatureUrl,
    });

    return res.status(201).json({
      success: true,
      data: saved,
      message: "Business profile created successfully",
    });
  } catch (err) {
    console.error("❌ Error creating business profile:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// ─── UPDATE ─────────────────────────────────────────────────────────────────

export async function updateBusinessProfile(req, res) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id }   = req.params;
    const body     = req.body   || {};
    const fileUrls = uploadedFilesToUrls(req);

    const existing = await BusinessProfile.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }
    if (existing.owner.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden: Not your profile" });
    }

    console.log("📝 [BusinessProfile] Updating profile:", {
      id,
      businessName:    body.businessName,
      hasNewLogo:      !!fileUrls.logoUrl || !!body.logoDataUrl,
      removeLogo:      body.removeLogo === "true",
      hasNewStamp:     !!fileUrls.stampUrl || !!body.stampDataUrl,
      removeStamp:     body.removeStamp === "true",
      hasNewSignature: !!fileUrls.signatureUrl || !!body.signatureDataUrl,
      removeSignature: body.removeSignature === "true",
    });

    const update = {};

    if (body.businessName        !== undefined) update.businessName        = body.businessName;
    if (body.email               !== undefined) update.email               = body.email;
    if (body.address             !== undefined) update.address             = body.address;
    if (body.phone               !== undefined) update.phone               = body.phone;
    if (body.gst                 !== undefined) update.gst                 = body.gst;
    if (body.signatureOwnerName  !== undefined) update.signatureOwnerName  = body.signatureOwnerName;
    if (body.signatureOwnerTitle !== undefined) update.signatureOwnerTitle = body.signatureOwnerTitle;
    if (body.defaultTaxPercent   !== undefined) update.defaultTaxPercent   = Number(body.defaultTaxPercent);
    if (body.notes               !== undefined) update.notes               = body.notes;

    // LOGO: new file > base64 > explicit URL > removal flag > leave unchanged
    if (body.removeLogo === "true") {
      update.logoUrl = null;
    } else if (fileUrls.logoUrl) {
      update.logoUrl = fileUrls.logoUrl;
    } else if (body.logoDataUrl !== undefined) {
      update.logoUrl = body.logoDataUrl;
    } else if (body.logoUrl !== undefined) {
      update.logoUrl = body.logoUrl;
    }

    // STAMP: new file > base64 > explicit URL > removal flag > leave unchanged
    if (body.removeStamp === "true") {
      update.stampUrl = null;
    } else if (fileUrls.stampUrl) {
      update.stampUrl = fileUrls.stampUrl;
    } else if (body.stampDataUrl !== undefined) {
      update.stampUrl = body.stampDataUrl;
    } else if (body.stampUrl !== undefined) {
      update.stampUrl = body.stampUrl;
    }

    // SIGNATURE: new file > base64 > explicit URL > removal flag > leave unchanged
    if (body.removeSignature === "true") {
      update.signatureUrl = null;
    } else if (fileUrls.signatureUrl) {
      update.signatureUrl = fileUrls.signatureUrl;
    } else if (body.signatureDataUrl !== undefined) {
      update.signatureUrl = body.signatureDataUrl;
    } else if (body.signatureUrl !== undefined) {
      update.signatureUrl = body.signatureUrl;
    }

    const updated = await BusinessProfile.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    );

    console.log("✅ [BusinessProfile] Updated successfully:", {
      id:           updated._id,
      hasLogo:      !!updated.logoUrl,
      hasStamp:     !!updated.stampUrl,
      hasSignature: !!updated.signatureUrl,
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Business profile updated successfully",
    });
  } catch (err) {
    console.error("❌ Error updating business profile:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// ─── GET MY PROFILE ─────────────────────────────────────────────────────────

export async function getMyBusinessProfile(req, res) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const profile = await BusinessProfile.findOne({ owner: userId }).lean();
    if (!profile) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }

    console.log("✅ [BusinessProfile] Fetched profile:", {
      id:           profile._id,
      businessName: profile.businessName,
      hasLogo:      !!profile.logoUrl,
      hasStamp:     !!profile.stampUrl,
      hasSignature: !!profile.signatureUrl,
    });

    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    console.error("❌ Error fetching business profile:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
