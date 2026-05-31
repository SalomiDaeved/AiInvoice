import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  createInvoiceStyles,
  createInvoiceIconColors,
  createInvoiceCustomStyles,
} from "../assets/Styles.js";

/* ---------- API BASE ---------- */
const API_BASE = "http://localhost:4000";

/* ---------- IMAGE URL RESOLVER ---------- */
function resolveImageUrl(url) {
  if (!url) return null;
  
  const s = String(url).trim();
  
  // Already a data URL or blob URL
  if (s.startsWith("data:") || s.startsWith("blob:")) {
    console.log("URL is already data/blob:", s.slice(0, 50));
    return s;
  }
  
  // Already an absolute HTTP(S) URL
  if (/^https?:\/\//i.test(s)) {
    try {
      const parsed = new URL(s);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        const path = parsed.pathname + (parsed.search || "") + (parsed.hash || "");
        const result = `${API_BASE.replace(/\/+$/, "")}${path}`;
        console.log("Resolved localhost URL:", result);
        return result;
      }
      console.log("Keeping external URL:", parsed.href);
      return parsed.href;
    } catch (e) {
      console.warn("Invalid absolute URL:", s, e);
      return null;
    }
  }
  
  // Relative path - prepend API_BASE
  const result = `${API_BASE.replace(/\/+$/, "")}/${s.replace(/^\/+/, "")}`;
  console.log("Resolved relative path:", s, "->", result);
  return result;
}

/* ---------- STORAGE HELPERS ---------- */
function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to read from localStorage [${key}]:`, e);
    return fallback;
  }
}

/* ---------- FETCH IMAGE AS DATA URL ---------- */
/* Note: No longer needed - BusinessProfile now sends images as base64 data URLs */

function writeJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn(`Failed to write to localStorage [${key}]:`, e);
  }
}

function getStoredInvoices() {
  return readJSON("invoices_v1", []) || [];
}

function saveStoredInvoices(arr) {
  writeJSON("invoices_v1", arr);
}

/* ---------- UTILITIES ---------- */
function uid() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {
    console.warn("crypto.randomUUID unavailable:", e);
  }
  return Math.random().toString(36).slice(2, 9);
}

function currencyFmt(amount = 0, currency = "LKR") {
  try {
    if (currency === "LKR") {
      return new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        currencyDisplay: "symbol",
      }).format(amount);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  } catch (e) {
    console.warn("Currency formatting failed:", e);
    return `${currency} ${amount}`;
  }
}

function computeTotals(items = [], taxPercent = 0) {
  const safe = Array.isArray(items) ? items.filter(Boolean) : [];
  const subtotal = safe.reduce(
    (s, it) => s + Number(it?.qty || 0) * Number(it?.unitPrice || 0),
    0
  );
  const tax = (subtotal * Number(taxPercent || 0)) / 100;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

/* ---------- ICONS ---------- */
const PreviewIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const SaveIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const UploadIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const DeleteIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const AddIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14m-7-7h14" />
  </svg>
);

/* ---------- COMPONENT ---------- */
export default function CreateInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const loc = useLocation();
  const invoiceFromState = loc.state?.invoice ?? null;
  const isEditing = Boolean(id && id !== "new");

  const { getToken, isSignedIn } = useAuth();

  // Store fetched business profile data
  const profileRef = useRef({
    logoDataUrl: null,
    stampDataUrl: null,
    signatureDataUrl: null,
    signatureName: "",
    signatureTitle: "",
    taxPercent: 18,
  });

  const obtainToken = useCallback(async () => {
    if (typeof getToken !== "function") return null;
    try {
      let token = await getToken().catch(() => null);
      if (!token) token = await getToken({ forceRefresh: true }).catch(() => null);
      return token;
    } catch (e) {
      console.warn("Token retrieval failed:", e);
      return null;
    }
  }, [getToken]);

  function buildDefaultInvoice() {
    return {
      id: uid(),
      invoiceNumber: "",
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      fromBusinessName: "",
      fromEmail: "",
      fromAddress: "",
      fromPhone: "",
      fromGst: "",
      client: { name: "", email: "", address: "", phone: "" },
      items: [{ id: uid(), description: "Service / Item", qty: 1, unitPrice: 0 }],
      currency: "LKR",
      status: "draft",
      stampDataUrl: null,
      signatureDataUrl: null,
      logoDataUrl: null,
      signatureName: "",
      signatureTitle: "",
      taxPercent: 18,
      notes: "",
    };
  }

  const [invoice, setInvoice] = useState(() => buildDefaultInvoice());
  const [items, setItems] = useState(invoice.items || []);
  const [loading, setLoading] = useState(false);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);

  /* ---------- FIELD UPDATE HELPERS ---------- */
  function updateInvoiceField(field, value) {
    setInvoice((inv) => (inv ? { ...inv, [field]: value } : inv));
  }

  function updateClient(field, value) {
    setInvoice((inv) =>
      inv ? { ...inv, client: { ...(inv.client || {}), [field]: value } } : inv
    );
  }

  function updateItem(idx, key, value) {
    setItems((arr) => {
      const copy = arr.slice();
      const it = { ...(copy[idx] || {}) };
      if (key === "description") {
        it.description = value;
      } else {
        it[key] = Number(value) || 0;
      }
      copy[idx] = it;
      setInvoice((inv) => (inv ? { ...inv, items: copy } : inv));
      return copy;
    });
  }

  function addItem() {
    const it = { id: uid(), description: "", qty: 1, unitPrice: 0 };
    setItems((arr) => {
      const next = [...arr, it];
      setInvoice((inv) => (inv ? { ...inv, items: next } : inv));
      return next;
    });
  }

  function removeItem(idx) {
    setItems((arr) => {
      const next = arr.filter((_, i) => i !== idx);
      setInvoice((inv) => (inv ? { ...inv, items: next } : inv));
      return next;
    });
  }

  function handleStatusChange(newStatus) {
    setInvoice((inv) => (inv ? { ...inv, status: newStatus } : inv));
  }

  function handleCurrencyChange(newCurrency) {
    setInvoice((inv) => (inv ? { ...inv, currency: newCurrency } : inv));
  }

  function handleImageUpload(file, kind = "logo") {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setInvoice((inv) => (inv ? { ...inv, [`${kind}DataUrl`]: dataUrl } : inv));
    };
    reader.onerror = () => {
      console.error(`Failed to read file for ${kind}`);
      alert(`Failed to upload ${kind}. Please try again.`);
    };
    reader.readAsDataURL(file);
  }

  function removeImage(kind = "logo") {
    setInvoice((inv) => (inv ? { ...inv, [`${kind}DataUrl`]: null } : inv));
  }

  /* ---------- INVOICE NUMBER HELPERS ---------- */
  const checkInvoiceExists = useCallback(
    async (candidate) => {
      // Check local storage first
      const local = getStoredInvoices();
      if (local.some((x) => x?.invoiceNumber === candidate)) return true;

      // Check server if token available
      try {
        const token = await obtainToken();
        const headers = { Accept: "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(
          `${API_BASE}/api/invoice?invoiceNumber=${encodeURIComponent(candidate)}`,
          { method: "GET", headers, timeout: 5000 }
        );

        if (!res.ok) return false;
        const json = await res.json().catch(() => null);
        const data = json?.data || json || [];
        return Array.isArray(data) && data.length > 0;
      } catch (e) {
        console.warn("Invoice existence check failed:", e);
        return false;
      }
    },
    [obtainToken]
  );

  const generateUniqueInvoiceNumber = useCallback(
    async (attempts = 10) => {
      for (let i = 0; i < attempts; i++) {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const rand = Math.floor(Math.random() * 9000) + 1000;
        const candidate = `INV-${datePart}-${rand}`;
        const exists = await checkInvoiceExists(candidate);
        if (!exists) return candidate;
      }
      return `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${uid().slice(0, 4)}`;
    },
    [checkInvoiceExists]
  );

  /* ---------- FETCH BUSINESS PROFILE ---------- */
  useEffect(() => {
    let mounted = true;

    async function fetchBusinessProfile() {
      if (!isSignedIn) return;

      try {
        const token = await obtainToken();
        if (!token) return;

        const res = await fetch(`${API_BASE}/api/businessProfile/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          timeout: 10000,
        });

        if (!res.ok) {
          console.warn("Failed to fetch business profile:", res.status);
          return;
        }

        const json = await res.json().catch(() => null);
        const data = json?.data || json;

        if (!data || !mounted) return;

        // 🔍 DEBUG: Log what we're receiving from the API
        console.log("Business Profile Data:", {
          // ✅ FIX: correct field names are logoUrl/stampUrl/signatureUrl
          logoUrl:      data.logoUrl,
          stampUrl:     data.stampUrl,
          signatureUrl: data.signatureUrl,
          businessName: data.businessName,
          email:        data.email,
        });

        // ✅ FIX: read logoUrl/stampUrl/signatureUrl (not logoDataUrl etc.)
        const resolvedLogo      = resolveImageUrl(data.logoUrl);
        const resolvedStamp     = resolveImageUrl(data.stampUrl);
        const resolvedSignature = resolveImageUrl(data.signatureUrl);

        // Apply to invoice immediately
        setInvoice((prev) => {
          if (!prev) return prev;

          console.log("✅ Images from business profile:", {
            logo:      resolvedLogo      ? "✓ loaded" : "✗ none",
            stamp:     resolvedStamp     ? "✓ loaded" : "✗ none",
            signature: resolvedSignature ? "✓ loaded" : "✗ none",
          });

          return {
            ...prev,
            fromBusinessName: prev.fromBusinessName || data.businessName || "",
            fromEmail:        prev.fromEmail        || data.email        || "",
            fromAddress:      prev.fromAddress      || data.address      || "",
            fromPhone:        prev.fromPhone        || data.phone        || "",
            fromGst:          prev.fromGst          || data.gst          || "",
            logoDataUrl:      prev.logoDataUrl      || resolvedLogo,
            stampDataUrl:     prev.stampDataUrl     || resolvedStamp,
            signatureDataUrl: prev.signatureDataUrl || resolvedSignature,
            signatureName:    prev.signatureName    || data.signatureOwnerName  || "",
            signatureTitle:   prev.signatureTitle   || data.signatureOwnerTitle || "",
            taxPercent:
              prev.taxPercent !== undefined && prev.taxPercent !== null
                ? prev.taxPercent
                : data.defaultTaxPercent ?? 18,
          };
        });

        // Store in ref for prepare() effect
        profileRef.current = {
          logoDataUrl:      resolvedLogo      || null,
          stampDataUrl:     resolvedStamp     || null,
          signatureDataUrl: resolvedSignature || null,
          signatureName:    data.signatureOwnerName  || "",
          signatureTitle:   data.signatureOwnerTitle || "",
          taxPercent:       data.defaultTaxPercent ?? 18,
        };

        setHasLoadedProfile(true);
      } catch (err) {
        console.warn("Failed to fetch business profile:", err);
        setHasLoadedProfile(true);
      }
    }

    fetchBusinessProfile();
    return () => {
      mounted = false;
    };
  }, [isSignedIn, obtainToken]);

  /* ---------- LOAD/PREPARE INVOICE ---------- */
  useEffect(() => {
    let mounted = true;

    async function prepare() {
      function applyProfileImages(base) {
        const prof = profileRef.current;
        return {
          ...base,
          logoDataUrl:
            resolveImageUrl(base.logoDataUrl ?? base.logoUrl ?? base.logo) ||
            prof.logoDataUrl ||
            null,
          stampDataUrl:
            resolveImageUrl(base.stampDataUrl ?? base.stampUrl ?? base.stamp) ||
            prof.stampDataUrl ||
            null,
          signatureDataUrl:
            resolveImageUrl(
              base.signatureDataUrl ?? base.signatureUrl ?? base.signature
            ) || prof.signatureDataUrl || null,
          signatureName: base.signatureName || prof.signatureName || "",
          signatureTitle: base.signatureTitle || prof.signatureTitle || "",
          taxPercent:
            base.taxPercent !== undefined && base.taxPercent !== null
              ? base.taxPercent
              : prof.taxPercent,
        };
      }

      // Case 1: Invoice from navigation state
      if (invoiceFromState) {
        const base = applyProfileImages({
          ...buildDefaultInvoice(),
          ...invoiceFromState,
        });
        if (!mounted) return;
        setInvoice(base);
        setItems(
          Array.isArray(invoiceFromState.items)
            ? invoiceFromState.items.slice()
            : buildDefaultInvoice().items
        );
        return;
      }

      // Case 2: Editing existing invoice
      if (isEditing) {
        setLoading(true);
        try {
          const token = await obtainToken();
          const headers = { Accept: "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const res = await fetch(`${API_BASE}/api/invoice/${id}`, {
            method: "GET",
            headers,
            timeout: 10000,
          });

          if (res.ok) {
            const json = await res.json().catch(() => null);
            const data = json?.data || json;

            if (data && mounted) {
              const merged = applyProfileImages({
                ...buildDefaultInvoice(),
                ...data,
                id: data._id ?? data.id ?? id,
                invoiceNumber: data.invoiceNumber ?? "",
              });
              setInvoice(merged);
              setItems(Array.isArray(data.items) ? data.items.slice() : merged.items);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn("Server invoice fetch failed, checking local storage:", err);
        } finally {
          setLoading(false);
        }

        // Fallback: Local storage
        const all = getStoredInvoices();
        const found = all.find(
          (x) => x && (x.id === id || x._id === id || x.invoiceNumber === id)
        );
        if (found && mounted) {
          const fixed = applyProfileImages({ ...buildDefaultInvoice(), ...found });
          setInvoice(fixed);
          setItems(
            Array.isArray(found.items)
              ? found.items.slice()
              : buildDefaultInvoice().items
          );
        }
        return;
      }

      // Case 3: Creating new invoice
      if (!isEditing) {
        try {
          const candidate = await generateUniqueInvoiceNumber(10);
          if (mounted) {
            setInvoice((inv) =>
              inv ? { ...inv, invoiceNumber: candidate } : inv
            );
          }
        } catch (err) {
          console.warn("Invoice number generation failed:", err);
        }
      }
    }

    prepare();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, invoiceFromState, isEditing, obtainToken, generateUniqueInvoiceNumber]);

  /* ---------- SAVE INVOICE ---------- */
  async function handleSave() {
    if (!invoice) {
      alert("Invoice data missing. Please refresh and try again.");
      return;
    }

    if (!invoice.invoiceNumber || !String(invoice.invoiceNumber).trim()) {
      alert("Invoice number is required.");
      return;
    }

    if (!items || items.length === 0) {
      alert("Please add at least one item.");
      return;
    }

    setLoading(true);
    try {
      const totals = computeTotals(items, invoice.taxPercent);
      const prepared = {
        invoiceNumber: String(invoice.invoiceNumber).trim(),
        issueDate: invoice.issueDate || "",
        dueDate: invoice.dueDate || "",
        fromBusinessName: invoice.fromBusinessName || "",
        fromEmail: invoice.fromEmail || "",
        fromAddress: invoice.fromAddress || "",
        fromPhone: invoice.fromPhone || "",
        fromGst: invoice.fromGst || "",
        client: invoice.client || {},
        items: items || [],
        currency: invoice.currency || "LKR",
        status: invoice.status || "draft",
        taxPercent: Number(invoice.taxPercent ?? 18),
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        logoDataUrl: invoice.logoDataUrl || null,
        stampDataUrl: invoice.stampDataUrl || null,
        signatureDataUrl: invoice.signatureDataUrl || null,
        signatureName: invoice.signatureName || "",
        signatureTitle: invoice.signatureTitle || "",
        notes: invoice.notes || "",
        localId: invoice.id,
      };

      const endpoint =
        isEditing && invoice.id
          ? `${API_BASE}/api/invoice/${invoice.id}`
          : `${API_BASE}/api/invoice`;
      const method = isEditing && invoice.id ? "PUT" : "POST";

      const token = await obtainToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(prepared),
      });

      if (res.status === 409) {
        const json = await res.json().catch(() => null);
        throw new Error(
          json?.message || "Invoice number already exists. Choose another."
        );
      }

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || `Save failed (${res.status})`);
      }

      const json = await res.json().catch(() => null);
      const saved = json?.data || json || null;
      const savedId = saved?._id ?? saved?.id ?? invoice.id;

      const merged = {
        ...prepared,
        id: savedId,
        invoiceNumber: saved?.invoiceNumber ?? prepared.invoiceNumber,
        subtotal: saved?.subtotal ?? prepared.subtotal,
        tax: saved?.tax ?? prepared.tax,
        total: saved?.total ?? prepared.total,
      };

      setInvoice((inv) => ({ ...inv, ...merged }));
      setItems(Array.isArray(saved?.items) ? saved.items : items);

      // Update local storage
      const all = getStoredInvoices();
      if (isEditing) {
        const idx = all.findIndex(
          (x) =>
            x &&
            (x.id === invoice.id ||
              x._id === invoice.id ||
              x.invoiceNumber === invoice.invoiceNumber)
        );
        if (idx >= 0) {
          all[idx] = merged;
        } else {
          all.unshift(merged);
        }
      } else {
        all.unshift(merged);
      }
      saveStoredInvoices(all);

      alert(`Invoice ${isEditing ? "updated" : "created"} successfully.`);
      navigate("/app/invoices");
    } catch (err) {
      console.error("Failed to save invoice:", err);

      // Check for invoice number conflict
      if (String(err?.message || "").toLowerCase().includes("invoice number")) {
        alert(err.message || "Invoice number already exists. Choose another.");
        setLoading(false);
        return;
      }

      // Fallback to local storage
      try {
        const totals = computeTotals(items, invoice.taxPercent);
        const all = getStoredInvoices();
        const preparedLocal = {
          ...invoice,
          items,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
        };

        if (isEditing) {
          const idx = all.findIndex(
            (x) =>
              x &&
              (x.id === invoice.id ||
                x._id === invoice.id ||
                x.invoiceNumber === invoice.invoiceNumber)
          );
          if (idx >= 0) {
            all[idx] = preparedLocal;
          } else {
            all.unshift(preparedLocal);
          }
        } else {
          all.unshift(preparedLocal);
        }
        saveStoredInvoices(all);
        alert(
          "Saved to local storage (server unavailable). Changes will sync when online."
        );
        navigate("/app/invoices");
      } catch (localErr) {
        console.error("Local fallback failed:", localErr);
        alert(
          err?.message || "Save failed. Please check your connection and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function handlePreview() {
    const totals = computeTotals(items, invoice.taxPercent);
    const prepared = {
      ...invoice,
      items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
    };
    navigate(`/app/invoices/${invoice.id}/preview`, { state: { invoice: prepared } });
  }

  const totals = computeTotals(items, invoice?.taxPercent ?? 18);

  /* ---------- RENDER ---------- */
  return (
    <div className={createInvoiceStyles.pageContainer}>
      {/* Header */}
      <div className={createInvoiceStyles.headerContainer}>
        <div>
          <h1 className={createInvoiceStyles.headerTitle}>
            {isEditing ? "Edit Invoice" : "Create New Invoice"}
          </h1>
          <p className={createInvoiceStyles.headerSubtitle}>
            {isEditing
              ? "Update invoice details and items below"
              : "Fill in invoice details, add line items, and configure branding"}
          </p>
        </div>
        <div className={createInvoiceStyles.headerButtonContainer}>
          <button
            onClick={handlePreview}
            className={createInvoiceStyles.previewButton}
            disabled={loading}
          >
            <PreviewIcon className="w-4 h-4" /> Preview
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className={createInvoiceStyles.saveButton}
          >
            <SaveIcon className="w-4 h-4" />
            {loading ? "Saving..." : isEditing ? "Update Invoice" : "Create Invoice"}
          </button>
        </div>
      </div>

      {/* Invoice Details Card */}
      <div className={createInvoiceStyles.cardContainer}>
        <div className={createInvoiceStyles.cardHeaderContainer}>
          <div
            className={`${createInvoiceStyles.cardIconContainer} ${createInvoiceIconColors.invoice}`}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h2 className={createInvoiceStyles.cardTitle}>Invoice Details</h2>
        </div>

        <div className={createInvoiceStyles.gridCols3}>
          <div>
            <label className={createInvoiceStyles.label}>Invoice Number</label>
            <input
              id="invoiceNumber"
              name="invoiceNumber"
              value={invoice?.invoiceNumber || ""}
              onChange={(e) => updateInvoiceField("invoiceNumber", e.target.value)}
              className={createInvoiceStyles.inputMedium}
              placeholder="INV-20240101-1234"
            />
          </div>
          <div>
            <label className={createInvoiceStyles.label}>Invoice Date</label>
            <input
              id="issueDate"
              name="issueDate"
              type="date"
              value={invoice?.issueDate || ""}
              onChange={(e) => updateInvoiceField("issueDate", e.target.value)}
              className={createInvoiceStyles.input}
            />
          </div>
          <div>
            <label className={createInvoiceStyles.label}>Due Date</label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              value={invoice?.dueDate || ""}
              onChange={(e) => updateInvoiceField("dueDate", e.target.value)}
              className={createInvoiceStyles.input}
            />
          </div>
        </div>

        {/* Currency and Status */}
        <div className={createInvoiceStyles.currencyStatusGrid}>
          <div>
            <label className={createInvoiceStyles.labelWithMargin}>Currency</label>
            <div className={createInvoiceStyles.currencyContainer}>
              <button
                onClick={() => handleCurrencyChange("LKR")}
                className={`${createInvoiceStyles.currencyButton} ${
                  invoice.currency === "LKR"
                    ? createInvoiceStyles.currencyButtonActive1
                    : createInvoiceStyles.currencyButtonInactive
                }`}
              >
                <span className={createInvoiceCustomStyles.currencySymbol}>Rs</span>
                <div className="text-left">
                  <div className="font-medium">Sri Lankan Rupee</div>
                  <div className="text-xs opacity-70">LKR</div>
                </div>
              </button>
              <button
                onClick={() => handleCurrencyChange("USD")}
                className={`${createInvoiceStyles.currencyButton} ${
                  invoice.currency === "USD"
                    ? createInvoiceStyles.currencyButtonActive2
                    : createInvoiceStyles.currencyButtonInactive
                }`}
              >
                <span className={createInvoiceCustomStyles.currencySymbol}>$</span>
                <div className="text-left">
                  <div className="font-medium">US Dollar</div>
                  <div className="text-xs opacity-70">USD</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className={createInvoiceStyles.labelWithMargin}>Status</label>
            <div className={createInvoiceStyles.statusContainer}>
              {[
                { value: "draft", label: "Draft" },
                { value: "unpaid", label: "Unpaid" },
                { value: "paid", label: "Paid" },
                { value: "overdue", label: "Overdue" },
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleStatusChange(status.value)}
                  className={`${createInvoiceStyles.statusButton} ${
                    invoice.status === status.value
                      ? createInvoiceStyles.statusButtonActive
                      : createInvoiceStyles.statusButtonInactive
                  }`}
                >
                  <StatusBadge status={status.label} size="default" showIcon={true} />
                </button>
              ))}
            </div>
            <div className={createInvoiceStyles.statusDropdown}>
              <select
                id="invoiceStatus"
                name="invoiceStatus"
                value={invoice.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full"
              >
                <option value="draft">Draft</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className={createInvoiceStyles.mainGrid}>
        {/* Left Column */}
        <div className={createInvoiceStyles.leftColumn}>
          {/* Bill From */}
          <div className={createInvoiceStyles.cardContainer}>
            <div className={createInvoiceStyles.cardHeaderWithButton}>
              <div className={createInvoiceStyles.cardHeaderLeft}>
                <div
                  className={`${createInvoiceStyles.cardIconContainer} ${createInvoiceIconColors.billFrom}`}
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h3 className={createInvoiceStyles.cardTitle}>Bill From</h3>
              </div>
            </div>
            <div className={createInvoiceStyles.gridCols2}>
              <div>
                <label className={createInvoiceStyles.label}>Business Name</label>
                <input
                  id="fromBusinessName"
                  name="fromBusinessName"
                  value={invoice?.fromBusinessName ?? ""}
                  onChange={(e) => updateInvoiceField("fromBusinessName", e.target.value)}
                  placeholder="Your Business Name"
                  className={createInvoiceStyles.input}
                />
              </div>
              <div>
                <label className={createInvoiceStyles.label}>Email</label>
                <input
                  id="fromEmail"
                  name="fromEmail"
                  value={invoice?.fromEmail ?? ""}
                  onChange={(e) => updateInvoiceField("fromEmail", e.target.value)}
                  placeholder="business@email.com"
                  className={createInvoiceStyles.input}
                />
              </div>
              <div className={createInvoiceStyles.gridColSpan2}>
                <label className={createInvoiceStyles.label}>Address</label>
                <textarea
                  id="fromAddress"
                  name="fromAddress"
                  value={invoice?.fromAddress ?? ""}
                  onChange={(e) => updateInvoiceField("fromAddress", e.target.value)}
                  placeholder="Business Address"
                  rows={3}
                  className={createInvoiceStyles.textarea}
                />
              </div>
              <div>
                <label className={createInvoiceStyles.label}>Phone</label>
                <input
                  id="fromPhone"
                  name="fromPhone"
                  value={invoice?.fromPhone ?? ""}
                  onChange={(e) => updateInvoiceField("fromPhone", e.target.value)}
                  placeholder="+94 11 234 5678"
                  className={createInvoiceStyles.input}
                />
              </div>
              <div>
                <label className={createInvoiceStyles.label}>VAT Number</label>
                <input
                  id="fromGst"
                  name="fromGst"
                  value={invoice?.fromGst ?? ""}
                  onChange={(e) => updateInvoiceField("fromGst", e.target.value)}
                  placeholder="VAT123456789"
                  className={createInvoiceStyles.input}
                />
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className={createInvoiceStyles.cardContainer}>
            <div className={createInvoiceStyles.cardHeaderContainer}>
              <div
                className={`${createInvoiceStyles.cardIconContainer} ${createInvoiceIconColors.billTo}`}
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 className={createInvoiceStyles.cardTitle}>Bill To</h3>
            </div>
            <div className={createInvoiceStyles.gridCols2}>
              <div>
                <label className={createInvoiceStyles.label}>Client Name</label>
                <input
                  id="clientName"
                  name="clientName"
                  value={invoice?.client?.name || ""}
                  onChange={(e) => updateClient("name", e.target.value)}
                  placeholder="Client Name"
                  className={createInvoiceStyles.input}
                />
              </div>
              <div>
                <label className={createInvoiceStyles.label}>Client Email</label>
                <input
                  id="clientEmail"
                  name="clientEmail"
                  value={invoice?.client?.email || ""}
                  onChange={(e) => updateClient("email", e.target.value)}
                  placeholder="client@email.com"
                  className={createInvoiceStyles.input}
                />
              </div>
              <div className={createInvoiceStyles.gridColSpan2}>
                <label className={createInvoiceStyles.label}>Client Address</label>
                <textarea
                  id="clientAddress"
                  name="clientAddress"
                  value={invoice?.client?.address || ""}
                  onChange={(e) => updateClient("address", e.target.value)}
                  placeholder="Client Address"
                  rows={3}
                  className={createInvoiceStyles.textarea}
                />
              </div>
              <div>
                <label className={createInvoiceStyles.label}>Client Phone</label>
                <input
                  id="clientPhone"
                  name="clientPhone"
                  value={invoice?.client?.phone || ""}
                  onChange={(e) => updateClient("phone", e.target.value)}
                  placeholder="+94 11 234 5678"
                  className={createInvoiceStyles.input}
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className={createInvoiceStyles.cardContainer}>
            <div className={createInvoiceStyles.cardHeaderWithButton}>
              <div className={createInvoiceStyles.cardHeaderLeft}>
                <div className={createInvoiceStyles.cardIconContainer}>
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                  </svg>
                </div>
                <h3 className={createInvoiceStyles.cardTitle}>Items & Services</h3>
              </div>
              <div className={createInvoiceStyles.currencyBadge}>
                All amounts in {invoice.currency}
              </div>
            </div>

            <div className={createInvoiceStyles.itemsListWrapper}>
              {items.map((it, idx) => {
                const totalValue =
                  Number(it?.qty || 0) * Number(it?.unitPrice || 0);
                const totalLabel = currencyFmt(totalValue, invoice.currency);
                return (
                  <div
                    key={it?.id ?? idx}
                    className={`${createInvoiceStyles.itemsTableRow} ${createInvoiceStyles.itemRow}`}
                  >
                    <div className={createInvoiceStyles.itemColDescription}>
                      <label
                        className={createInvoiceStyles.itemsFieldLabel}
                        htmlFor={`desc-${idx}`}
                      >
                        Description
                      </label>
                      <input
                        id={`desc-${idx}`}
                        className={createInvoiceStyles.itemsInput}
                        value={it?.description ?? ""}
                        onChange={(e) =>
                          updateItem(idx, "description", e.target.value)
                        }
                        placeholder="Item description"
                        title={it?.description ?? ""}
                        aria-label={`Item ${idx + 1} description`}
                      />
                    </div>
                    <div className={createInvoiceStyles.itemColQuantity}>
                      <label
                        className={createInvoiceStyles.itemsFieldLabel}
                        htmlFor={`qty-${idx}`}
                      >
                        Quantity
                      </label>
                      <input
                        id={`qty-${idx}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className={createInvoiceStyles.itemsNumberInput}
                        value={String(it?.qty ?? "")}
                        onChange={(e) => updateItem(idx, "qty", e.target.value)}
                        aria-label={`Item ${idx + 1} quantity`}
                      />
                    </div>
                    <div className={createInvoiceStyles.itemColUnitPrice}>
                      <label
                        className={createInvoiceStyles.itemsFieldLabel}
                        htmlFor={`price-${idx}`}
                      >
                        Unit Price
                      </label>
                      <input
                        id={`price-${idx}`}
                        type="text"
                        inputMode="decimal"
                        className={createInvoiceStyles.itemsNumberInput}
                        value={String(it?.unitPrice ?? "")}
                        onChange={(e) =>
                          updateItem(idx, "unitPrice", e.target.value)
                        }
                        aria-label={`Item ${idx + 1} unit price`}
                      />
                    </div>
                    <div className={createInvoiceStyles.itemColTotal}>
                      <label
                        className={createInvoiceStyles.itemsFieldLabel}
                        aria-hidden
                      >
                        Total
                      </label>
                      <div
                        className={createInvoiceStyles.itemsTotal}
                        title={totalLabel}
                        aria-label={`Item ${idx + 1} total`}
                      >
                        {totalLabel}
                      </div>
                    </div>
                    <div className={createInvoiceStyles.itemColRemove}>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className={createInvoiceStyles.itemsRemoveButton}
                        aria-label={`Remove item ${idx + 1}`}
                      >
                        <DeleteIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <button onClick={addItem} className={createInvoiceStyles.addItemButton}>
                <AddIcon
                  className={`w-4 h-4 ${createInvoiceStyles.iconHover}`}
                />{" "}
                Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className={createInvoiceStyles.rightColumn}>
          {/* Branding / Logo */}
          <div className={createInvoiceStyles.cardSmallContainer}>
            <h3 className={createInvoiceStyles.cardSubtitle}>Branding</h3>
            <div className="space-y-4">
              <div>
                <label className={createInvoiceStyles.label}>Company Logo</label>
                <div className={createInvoiceStyles.uploadSmallArea}>
                  {invoice?.logoDataUrl ? (
                    <div className={createInvoiceStyles.imagePreviewContainer}>
                      <div className={createInvoiceStyles.logoPreview}>
                        <img
                          src={invoice.logoDataUrl}
                          alt="Company Logo"
                          className="object-contain w-full h-full"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                      <div className={createInvoiceStyles.buttonGroup}>
                        <label className={createInvoiceStyles.changeButton}>
                          <UploadIcon className="w-4 h-4" /> Change
                          <input
                            type="file"
                            name="logoUpload"
                            accept="image/*"
                            onChange={(e) =>
                              handleImageUpload(e.target.files?.[0], "logo")
                            }
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => removeImage("logo")}
                          className={createInvoiceStyles.removeButton}
                        >
                          <DeleteIcon className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div
                        className={`${createInvoiceStyles.imagePreviewContainer} ${createInvoiceStyles.hoverScale}`}
                      >
                        <div className={createInvoiceStyles.uploadIconContainer}>
                          <UploadIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={createInvoiceStyles.uploadTextTitle}>
                            Upload Logo
                          </p>
                          <p className={createInvoiceStyles.uploadTextSubtitle}>
                            PNG, JPG up to 5MB
                          </p>
                        </div>
                        <input
                          type="file"
                          name="logoUpload"
                          accept="image/*"
                          onChange={(e) =>
                            handleImageUpload(e.target.files?.[0], "logo")
                          }
                          className="hidden"
                        />
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Summary & Tax */}
          <div className={createInvoiceStyles.cardSmallContainer}>
            <h3 className={createInvoiceStyles.cardSubtitle}>Summary & Tax</h3>
            <div className="space-y-4">
              <div className={createInvoiceStyles.summaryRow}>
                <div className={createInvoiceStyles.summaryLabel}>Subtotal</div>
                <div className={createInvoiceStyles.summaryValue}>
                  {currencyFmt(totals.subtotal, invoice.currency)}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={createInvoiceStyles.label}>
                    Tax Percentage
                  </label>
                  <input
                    id="taxPercent"
                    name="taxPercent"
                    type="number"
                    value={invoice.taxPercent ?? 18}
                    onChange={(e) =>
                      updateInvoiceField("taxPercent", Number(e.target.value || 0))
                    }
                    className={createInvoiceStyles.inputCenter}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div className={createInvoiceStyles.taxRow}>
                  <div className="text-sm text-gray-600">Tax Amount</div>
                  <div className="font-medium text-gray-900">
                    {currencyFmt(totals.tax, invoice.currency)}
                  </div>
                </div>
              </div>
              <div className={createInvoiceStyles.totalRow}>
                <div className={createInvoiceStyles.totalLabel}>Total</div>
                <div className={createInvoiceStyles.totalValue}>
                  {currencyFmt(totals.total, invoice.currency)}
                </div>
              </div>
            </div>
          </div>

          {/* Stamp & Signature */}
          <div className={createInvoiceStyles.cardSmallContainer}>
            <h3 className={createInvoiceStyles.cardSubtitle}>Stamp & Signature</h3>
            <div className="space-y-6">
              {/* Stamp */}
              <div>
                <label className={createInvoiceStyles.label}>Digital Stamp</label>
                <div className={createInvoiceStyles.uploadSmallArea}>
                  {invoice.stampDataUrl ? (
                    <div className={createInvoiceStyles.imagePreviewContainer}>
                      <div className={createInvoiceStyles.stampPreview}>
                        <img
                          src={invoice.stampDataUrl}
                          alt="Digital Stamp"
                          className="object-contain w-full h-full"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                      <div className={createInvoiceStyles.buttonGroup}>
                        <label className={createInvoiceStyles.changeButton}>
                          <UploadIcon className="w-4 h-4" /> Change
                          <input
                            type="file"
                            name="stampUpload"
                            accept="image/*"
                            onChange={(e) =>
                              handleImageUpload(e.target.files?.[0], "stamp")
                            }
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => removeImage("stamp")}
                          className={createInvoiceStyles.removeButton}
                        >
                          <DeleteIcon className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div
                        className={`${createInvoiceStyles.imagePreviewContainer} ${createInvoiceStyles.hoverScale}`}
                      >
                        <div className={createInvoiceStyles.uploadSmallIconContainer}>
                          <UploadIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={createInvoiceStyles.uploadTextTitle}>
                            Upload Stamp
                          </p>
                          <p className={createInvoiceStyles.uploadTextSubtitle}>
                            PNG with transparency
                          </p>
                        </div>
                        <input
                          type="file"
                          name="stampUpload"
                          accept="image/*"
                          onChange={(e) =>
                            handleImageUpload(e.target.files?.[0], "stamp")
                          }
                          className="hidden"
                        />
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Signature */}
              <div>
                <label className={createInvoiceStyles.label}>
                  Digital Signature
                </label>
                <div className={createInvoiceStyles.uploadSmallArea}>
                  {invoice.signatureDataUrl ? (
                    <div className={createInvoiceStyles.imagePreviewContainer}>
                      <div className={createInvoiceStyles.signaturePreview}>
                        <img
                          src={invoice.signatureDataUrl}
                          alt="Digital Signature"
                          className="object-contain w-full h-full"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                      <div className={createInvoiceStyles.buttonGroup}>
                        <label className={createInvoiceStyles.changeButton}>
                          <UploadIcon className="w-4 h-4" /> Change
                          <input
                            type="file"
                            name="signatureUpload"
                            accept="image/*"
                            onChange={(e) =>
                              handleImageUpload(e.target.files?.[0], "signature")
                            }
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => removeImage("signature")}
                          className={createInvoiceStyles.removeButton}
                        >
                          <DeleteIcon className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div
                        className={`${createInvoiceStyles.imagePreviewContainer} ${createInvoiceStyles.hoverScale}`}
                      >
                        <div className={createInvoiceStyles.uploadSmallIconContainer}>
                          <UploadIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={createInvoiceStyles.uploadTextTitle}>
                            Upload Signature
                          </p>
                          <p className={createInvoiceStyles.uploadTextSubtitle}>
                            PNG with transparency
                          </p>
                        </div>
                        <input
                          type="file"
                          name="signatureUpload"
                          accept="image/*"
                          onChange={(e) =>
                            handleImageUpload(e.target.files?.[0], "signature")
                          }
                          className="hidden"
                        />
                      </div>
                    </label>
                  )}
                </div>

                {/* Signature Details */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className={createInvoiceStyles.label}>
                      Signature Owner Name
                    </label>
                    <input
                      id="signatureName"
                      name="signatureName"
                      placeholder="John Doe"
                      value={invoice.signatureName || ""}
                      onChange={(e) =>
                        updateInvoiceField("signatureName", e.target.value)
                      }
                      className={`${createInvoiceStyles.inputSmall} ${createInvoiceCustomStyles.inputPlaceholder}`}
                    />
                  </div>
                  <div>
                    <label className={createInvoiceStyles.label}>
                      Signature Title / Designation
                    </label>
                    <input
                      id="signatureTitle"
                      name="signatureTitle"
                      placeholder="Director / CEO"
                      value={invoice.signatureTitle || ""}
                      onChange={(e) =>
                        updateInvoiceField("signatureTitle", e.target.value)
                      }
                      className={`${createInvoiceStyles.inputSmall} ${createInvoiceCustomStyles.inputPlaceholder}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
