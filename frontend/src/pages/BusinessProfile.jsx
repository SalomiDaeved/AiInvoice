import React, { useEffect, useState } from 'react';
import { businessProfileStyles, iconColors, customStyles } from '../assets/Styles.js';
import { useAuth, useUser } from '@clerk/clerk-react';

const API_BASE = "http://localhost:4000";
const UploadIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const ImageIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const DeleteIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const SaveIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);
const ResetIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

/* ---------- CONVERT FILE TO BASE64 DATA URL ---------- */
async function fileToDataUrl(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/* ---------- RESOLVE IMAGE URL ---------- */
function resolveImageUrl(url) {
  if (!url) return null;
  const s = String(url).trim();
  
  // Already a data URL or blob URL
  if (s.startsWith("blob:") || s.startsWith("data:")) {
    console.log("Image is already data/blob URL");
    return s;
  }

  // Absolute HTTP(S) URL
  if (/^https?:\/\//i.test(s)) {
    try {
      const parsed = new URL(s);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        const path = parsed.pathname + (parsed.search || "") + (parsed.hash || "");
        return `${API_BASE.replace(/\/+$/, "")}${path}`;
      }
      return parsed.href;
    } catch (e) {
      console.warn("Invalid URL:", s);
      return null;
    }
  }

  // Relative path
  const result = `${API_BASE.replace(/\/+$/, "")}/${s.replace(/^\/+/, "")}`;
  console.log("Resolved relative URL:", s, "->", result);
  return result;
}

const EMPTY_META = {
  businessName: "",
  email: "",
  address: "",
  phone: "",
  gst: "",
  logoDataUrl: null,
  stampDataUrl: null,
  signatureDataUrl: null,
  signatureOwnerName: "",
  signatureOwnerTitle: "",
  defaultTaxPercent: 18,
  notes: "",
  profileId: null,
};

const BusinessProfile = () => {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  const [meta, setMeta] = useState({});
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState({ logo: null, stamp: null, signature: null });
  const [previews, setPreviews] = useState({ logo: null, stamp: null, signature: null });

  // Clerk auth token
  async function getAuthToken() {
    if (typeof getToken !== "function") return null;
    try {
      let t = await getToken().catch(() => null);
      if (!t) t = await getToken({ forceRefresh: true }).catch(() => null);
      return t;
    } catch (e) {
      console.warn("Token retrieval failed:", e);
      return null;
    }
  }

  // Pick a file locally and convert to data URL
  async function handleLocalFilePick(field, file) {
    if (!file) return;

    try {
      // Convert file to data URL
      const dataUrl = await fileToDataUrl(file);
      
      // Revoke old blob URL if one exists
      setPreviews(prev => {
        if (prev[field] && prev[field].startsWith("blob:")) {
          URL.revokeObjectURL(prev[field]);
        }
        return { ...prev, [field]: dataUrl };
      });

      // Store file for upload
      setFiles(prev => ({ ...prev, [field]: file }));

      // Also store data URL in meta so it gets saved
      const dataUrlField = `${field}DataUrl`;
      setMeta(prev => ({ ...prev, [dataUrlField]: dataUrl }));
      
      console.log(`✅ [BusinessProfile] ${field} converted to data URL (${dataUrl.slice(0, 50)}...)`);
    } catch (err) {
      console.error(`Failed to convert ${field} to data URL:`, err);
      alert(`Failed to process ${field}. Please try again.`);
    }
  }

  // Remove a file/preview
  function removeLocalFile(field) {
    setPreviews(prev => {
      if (prev[field] && prev[field].startsWith("blob:")) {
        URL.revokeObjectURL(prev[field]);
      }
      return { ...prev, [field]: null };
    });

    setFiles(prev => ({ ...prev, [field]: null }));

    // Clear from meta
    const dataUrlField = `${field}DataUrl`;
    setMeta(prev => ({ ...prev, [dataUrlField]: null }));
    
    console.log(`✅ [BusinessProfile] ${field} removed`);
  }

  // Clear all profile fields and previews
  function handleClearProfile() {
    // Revoke any blob URLs before clearing
    setPreviews(prev => {
      Object.values(prev).forEach(u => {
        if (u && u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
      return { logo: null, stamp: null, signature: null };
    });

    setFiles({ logo: null, stamp: null, signature: null });
    setMeta(EMPTY_META);
    console.log("✅ [BusinessProfile] Profile cleared");
  }

  async function handleSave(e) {
    e?.preventDefault();
    setSaving(true);
    try {
      const token = await getAuthToken();
      if (!token) { 
        alert("Sign in required."); 
        return; 
      }

      const method = meta.profileId ? "PUT" : "POST";
      const url = meta.profileId
        ? `${API_BASE}/api/businessProfile/${meta.profileId}`
        : `${API_BASE}/api/businessProfile`;

      // Prepare FormData (works with file upload backends)
      const formData = new FormData();
      
      // Text fields
      formData.append("businessName", meta.businessName || "");
      formData.append("email", meta.email || "");
      formData.append("address", meta.address || "");
      formData.append("phone", meta.phone || "");
      formData.append("gst", meta.gst || "");
      formData.append("signatureOwnerName", meta.signatureOwnerName || "");
      formData.append("signatureOwnerTitle", meta.signatureOwnerTitle || "");
      formData.append("defaultTaxPercent", Number(meta.defaultTaxPercent ?? 18));
      formData.append("notes", meta.notes || "");

      // Add actual files if they exist
      if (files.logo) formData.append("logo", files.logo);
      if (files.stamp) formData.append("stamp", files.stamp);
      if (files.signature) formData.append("signature", files.signature);

      // Also add base64 versions as fallback
      if (meta.logoDataUrl && !files.logo) formData.append("logoDataUrl", meta.logoDataUrl);
      if (meta.stampDataUrl && !files.stamp) formData.append("stampDataUrl", meta.stampDataUrl);
      if (meta.signatureDataUrl && !files.signature) formData.append("signatureDataUrl", meta.signatureDataUrl);

      // Flag removed images
      if (!previews.logo && !files.logo) formData.append("removeLogo", "true");
      if (!previews.stamp && !files.stamp) formData.append("removeStamp", "true");
      if (!previews.signature && !files.signature) formData.append("removeSignature", "true");

      console.log("🚀 [BusinessProfile] Saving profile with files:", {
        hasLogo: !!files.logo || !!meta.logoDataUrl,
        hasStamp: !!files.stamp || !!meta.stampDataUrl,
        hasSignature: !!files.signature || !!meta.signatureDataUrl,
        businessName: meta.businessName,
      });

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        console.error("❌ Save failed:", errJson);
        alert(errJson?.message ?? "Failed to save profile.");
        return;
      }

      const json = await res.json().catch(() => null);
      const data = json?.data;
      if (data) {
        console.log("✅ [BusinessProfile] Saved successfully!");
        // ✅ FIX: API returns logoUrl/stampUrl/signatureUrl (not logoDataUrl etc.)
        console.log("Response data:", {
          logoUrl:      data.logoUrl      ? data.logoUrl.slice(0, 50)      + "..." : null,
          stampUrl:     data.stampUrl     ? data.stampUrl.slice(0, 50)     + "..." : null,
          signatureUrl: data.signatureUrl ? data.signatureUrl.slice(0, 50) + "..." : null,
        });

        const resolvedLogo      = resolveImageUrl(data.logoUrl);
        const resolvedStamp     = resolveImageUrl(data.stampUrl);
        const resolvedSignature = resolveImageUrl(data.signatureUrl);

        // ✅ FIX: sync both meta dataUrl fields AND previews from the saved server values
        setMeta(prev => ({
          ...prev,
          profileId:        data._id ?? data.id ?? prev.profileId,
          logoDataUrl:      resolvedLogo      ?? prev.logoDataUrl,
          stampDataUrl:     resolvedStamp     ?? prev.stampDataUrl,
          signatureDataUrl: resolvedSignature ?? prev.signatureDataUrl,
        }));

        // Update previews with server response
        if (resolvedLogo)      setPreviews(p => ({ ...p, logo:      resolvedLogo }));
        if (resolvedStamp)     setPreviews(p => ({ ...p, stamp:     resolvedStamp }));
        if (resolvedSignature) setPreviews(p => ({ ...p, signature: resolvedSignature }));
      }

      alert("Profile saved successfully!");
    } catch (err) {
      console.error("❌ Save error:", err);
      alert("An unexpected error occurred while saving. Check console for details.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      if (!isLoaded || !isSignedIn) return;

      const token = await getAuthToken();
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/api/businessProfile/me`, {
          method: "GET",
          headers: { 
            Authorization: `Bearer ${token}`, 
            Accept: "application/json" 
          },
        });
        
        if (!res.ok) {
          console.warn("Failed to fetch profile:", res.status);
          return;
        }
        
        const json = await res.json().catch(() => null);
        const data = json?.data;
        
        if (!data || !mounted) return;

        console.log("📥 [BusinessProfile] Fetched profile:", {
          businessName: data.businessName,
          email:        data.email,
          // ✅ FIX: API returns logoUrl/stampUrl/signatureUrl
          logoUrl:      data.logoUrl      ? data.logoUrl.slice(0, 50)      + "..." : null,
          stampUrl:     data.stampUrl     ? data.stampUrl.slice(0, 50)     + "..." : null,
          signatureUrl: data.signatureUrl ? data.signatureUrl.slice(0, 50) + "..." : null,
        });

        // ✅ FIX: read logoUrl/stampUrl/signatureUrl (correct field names from model)
        const logoUrl      = resolveImageUrl(data.logoUrl);
        const stampUrl     = resolveImageUrl(data.stampUrl);
        const signatureUrl = resolveImageUrl(data.signatureUrl);

        const serverMeta = {
          businessName: data.businessName ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          phone: data.phone ?? "",
          gst: data.gst ?? "",
          logoDataUrl: logoUrl || null,
          stampDataUrl: stampUrl || null,
          signatureDataUrl: signatureUrl || null,
          signatureOwnerName: data.signatureOwnerName ?? "",
          signatureOwnerTitle: data.signatureOwnerTitle ?? "",
          defaultTaxPercent: data.defaultTaxPercent ?? 18,
          notes: data.notes ?? "",
          profileId: data._id ?? data.id ?? null,
        };

        setMeta(serverMeta);
        setPreviews({
          logo: logoUrl,
          stamp: stampUrl,
          signature: signatureUrl,
        });
        
        console.log("✅ [BusinessProfile] Profile loaded and previews set");
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    }

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [isLoaded, isSignedIn]);

  function updateMeta(field, value) {
    setMeta(m => ({ ...m, [field]: value }));
  }

  return (
    <div className={businessProfileStyles.pageContainer}>
      <div className={businessProfileStyles.headerContainer}>
        <h1 className={businessProfileStyles.headerTitle}>Business Profile</h1>
        <p className={businessProfileStyles.headerSubtitle}>
          Configure your details, branding assets and invoice defaults
        </p>

        {!isSignedIn && (
          <div style={{
            marginTop: 12,
            color: '#92400e',
            backgroundColor: '#fff7ed',
            padding: 10,
            borderRadius: 8
          }}>
            You are not signed in - changes cannot be saved. Please sign in to load and save your business profile.
          </div>
        )}

        <form onSubmit={handleSave} className={businessProfileStyles.pageContainer}>
          <div className={businessProfileStyles.cardContainer}>
            <div className={businessProfileStyles.cardHeaderContainer}>
              <div className={`${businessProfileStyles.cardIconContainer} ${iconColors.business}`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 8v-4m0 4h4" />
                </svg>
              </div>
              <h2 className={businessProfileStyles.cardTitle}>Business Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
              <div>
                <label className={businessProfileStyles.label}>Business Name</label>
                <input
                  className={businessProfileStyles.input}
                  value={meta.businessName || ""}
                  onChange={(e) => updateMeta("businessName", e.target.value)}
                  placeholder="Enter Your Business Name"
                />
              </div>

              <div>
                <label className={businessProfileStyles.label}>Email</label>
                <input
                  className={businessProfileStyles.input}
                  value={meta.email || ""}
                  onChange={(e) => updateMeta("email", e.target.value)}
                  placeholder="business@example.com"
                />
              </div>

              <div className={businessProfileStyles.gridColSpan2}>
                <label className={businessProfileStyles.label}>Address</label>
                <textarea
                  rows={3}
                  className={businessProfileStyles.textarea}
                  value={meta.address || ""}
                  onChange={(e) => updateMeta("address", e.target.value)}
                  placeholder="Enter Your Business Address"
                />
              </div>

              <div>
                <label className={businessProfileStyles.label}>Phone</label>
                <input
                  className={businessProfileStyles.input}
                  value={meta.phone || ""}
                  onChange={(e) => updateMeta("phone", e.target.value)}
                  placeholder="+94 713456321"
                />
              </div>

              <div>
                <label className={businessProfileStyles.label}>GST Number</label>
                <input
                  className={businessProfileStyles.input}
                  value={meta.gst || ""}
                  onChange={(e) => updateMeta("gst", e.target.value)}
                  placeholder="2739G7399BYH82L"
                />
              </div>
            </div>
          </div>

          {/* Branding and defaults */}
          <div className={businessProfileStyles.cardContainer}>
            <div className={businessProfileStyles.cardHeaderContainer}>
              <div className={`${businessProfileStyles.cardIconContainer} ${iconColors.branding}`}>
                <ImageIcon className="w-5 h-5" />
              </div>
              <h2 className={businessProfileStyles.cardTitle}>Branding & Defaults</h2>
            </div>

            <div className={businessProfileStyles.gridCols2Lg}>
              {/* Logo Upload */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Company Logo</h3>
                  <div className={businessProfileStyles.uploadArea}>
                    {previews.logo ? (
                      <div className={businessProfileStyles.imagePreviewContainer}>
                        <div className={businessProfileStyles.logoPreview}>
                          <img
                            src={previews.logo}
                            alt="logo preview"
                            className="object-contain w-full h-full"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              console.warn("[BusinessProfile] logo preview failed to load:", previews.logo?.slice(0, 50));
                            }}
                          />
                        </div>
                        <div className={businessProfileStyles.buttonGroup}>
                          <label className={businessProfileStyles.changeButton}>
                            <UploadIcon className="w-4 h-4" />
                            Change
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleLocalFilePick("logo", e.target.files?.[0])}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeLocalFile("logo")}
                            className={businessProfileStyles.removeButton}
                          >
                            <DeleteIcon className="w-4 h-4" /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <div className={`${businessProfileStyles.imagePreviewContainer} ${businessProfileStyles.hoverScale}`}>
                          <div className={businessProfileStyles.uploadIconContainer}>
                            <UploadIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <p className={businessProfileStyles.uploadTextTitle}>Upload Logo</p>
                            <p className={businessProfileStyles.uploadTextSubtitle}>PNG, JPG up to 5MB</p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleLocalFilePick("logo", e.target.files?.[0])}
                            className="hidden"
                          />
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Tax Settings */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Settings</h3>
                  <div className={businessProfileStyles.taxContainer}>
                    <label className={businessProfileStyles.label}>Default Tax Percentage</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className={businessProfileStyles.taxInput}
                        value={meta.defaultTaxPercent ?? 18}
                        onChange={e => updateMeta("defaultTaxPercent", Number(e.target.value || 0))}
                      />
                      <span className={customStyles.taxPercentage}>%</span>
                    </div>
                    <p className={businessProfileStyles.taxHelpText}>
                      This tax rate will prefill in new invoices. You can adjust it per invoice as needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stamp & Signature */}
          <div className={businessProfileStyles.cardContainer}>
            <div className={businessProfileStyles.cardHeaderContainer}>
              <div className={`${businessProfileStyles.cardIconContainer} ${iconColors.assets}`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  <path d="M2 2l7.586 7.586" />
                </svg>
              </div>
              <h2 className={businessProfileStyles.cardTitle}>Digital Assets</h2>
            </div>

            <div className={businessProfileStyles.gridCols2Lg}>
              {/* Stamp */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Digital Stamp</h3>
                <div className={businessProfileStyles.uploadArea}>
                  {previews.stamp ? (
                    <div className={businessProfileStyles.imagePreviewContainer}>
                      <div className={businessProfileStyles.stampPreview}>
                        <img
                          src={previews.stamp}
                          alt="stamp preview"
                          className="object-contain w-full h-full"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            console.warn("[BusinessProfile] stamp preview failed to load");
                          }}
                        />
                      </div>
                      <div className={businessProfileStyles.buttonGroup}>
                        <label className={businessProfileStyles.changeButton}>
                          <UploadIcon className="w-4 h-4" /> Change
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleLocalFilePick("stamp", e.target.files?.[0])}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeLocalFile("stamp")}
                          className={businessProfileStyles.removeButton}
                        >
                          <DeleteIcon className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className={`${businessProfileStyles.imagePreviewContainer} ${businessProfileStyles.hoverScale}`}>
                        <div className={businessProfileStyles.uploadSmallIconContainer}>
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={businessProfileStyles.uploadTextTitle}>Upload Stamp</p>
                          <p className={businessProfileStyles.uploadTextSubtitle}>PNG with transparent background</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLocalFilePick("stamp", e.target.files?.[0])}
                          className="hidden"
                        />
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Signature */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Digital Signature</h3>
                <div className={businessProfileStyles.uploadArea}>
                  {previews.signature ? (
                    <div className={businessProfileStyles.imagePreviewContainer}>
                      <div className={businessProfileStyles.signaturePreview}>
                        <img
                          src={previews.signature}
                          alt="signature preview"
                          className="object-contain w-full h-full"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            console.warn("[BusinessProfile] signature preview failed to load");
                          }}
                        />
                      </div>
                      <div className={businessProfileStyles.buttonGroup}>
                        <label className={businessProfileStyles.changeButton}>
                          <UploadIcon className="w-4 h-4" /> Change
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleLocalFilePick("signature", e.target.files?.[0])}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeLocalFile("signature")}
                          className={businessProfileStyles.removeButton}
                        >
                          <DeleteIcon className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className={`${businessProfileStyles.imagePreviewContainer} ${businessProfileStyles.hoverScale}`}>
                        <div className={businessProfileStyles.uploadSmallIconContainer}>
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                        <div>
                          <p className={businessProfileStyles.uploadTextTitle}>Upload Signature</p>
                          <p className={businessProfileStyles.uploadTextSubtitle}>PNG with transparent background</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLocalFilePick("signature", e.target.files?.[0])}
                          className="hidden"
                        />
                      </div>
                    </label>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className={businessProfileStyles.label}>Signature Owner Name</label>
                    <input
                      placeholder="John Doe"
                      value={meta.signatureOwnerName || ""}
                      onChange={(e) => updateMeta("signatureOwnerName", e.target.value)}
                      className={`${businessProfileStyles.input} ${customStyles.inputPlaceholder}`}
                    />
                  </div>
                  <div>
                    <label className={businessProfileStyles.label}>Signature Title / Designation</label>
                    <input
                      placeholder="Director / CEO"
                      value={meta.signatureOwnerTitle || ""}
                      onChange={(e) => updateMeta("signatureOwnerTitle", e.target.value)}
                      className={`${businessProfileStyles.input} ${customStyles.inputPlaceholder}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className={businessProfileStyles.actionContainer}>
            <div className={businessProfileStyles.actionInnerContainer}>
              <div className={businessProfileStyles.actionButtonGroup}>
                <button
                  type="submit"
                  disabled={saving}
                  className={businessProfileStyles.saveButton}
                >
                  <SaveIcon className="w-4 h-4" /> {saving ? "Saving..." : "Save Profile"}
                </button>

                <button
                  type="button"
                  onClick={handleClearProfile}
                  className={businessProfileStyles.resetButton}
                >
                  <ResetIcon className="w-4 h-4" /> Clear Profile
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BusinessProfile;
