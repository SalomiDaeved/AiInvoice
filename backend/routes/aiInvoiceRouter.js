import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const aiInvoiceRouter = express.Router();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("No Gemini Key found in the .env");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// models to try
const MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0",
];

function buildInvoicePrompt(promptText) {
  const invoiceTemplate = {
    invoiceNumber: `INV-${Math.floor(Math.random() * 9000) + 1000}`,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    fromBusinessName: "",
    fromEmail: "",
    fromAddress: "",
    fromPhone: "",
    client: {
      name: "",
      email: "",
      address: "",
      phone: "",
    },
    items: [
      {
        id: "1",
        description: "",
        qty: 1,
        unitPrice: 0,
      },
    ],
    taxPercent: 18,
    notes: "",
  };

  return `
You are an invoice generation assistant.

Task:
- Convert user input into VALID JSON ONLY.
- Follow this schema exactly:
${JSON.stringify(invoiceTemplate, null, 2)}

Rules:
- No explanations
- No markdown
- No extra text
- Only JSON output

User input:
${promptText}
`;
}

async function tryGenerateWithModel(modelName, prompt) {
  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
  });

  let text =
    response?.text ||
    response?.output?.[0]?.content?.[0]?.text ||
    response?.outputs?.[0]?.text ||
    null;

  if (!text && response) {
    text = JSON.stringify(response);
  }

  if (!text || !text.trim()) {
    throw new Error("Empty response from model");
  }

  return { text: text.trim(), modelName };
}

// ================= ROUTE =================

aiInvoiceRouter.post("/generate", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        message: "AI API key not configured",
      });
    }

    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required",
      });
    }

    const fullPrompt = buildInvoicePrompt(prompt);

    let lastErr = null;
    let lastText = null;
    let usedModel = null;

    // Try multiple models
    for (const model of MODEL_CANDIDATES) {
      try {
        const result = await tryGenerateWithModel(model, fullPrompt);
        lastText = result.text;
        usedModel = result.modelName;
        if (lastText) break;
      } catch (err) {
        lastErr = err;
        console.warn(`Model ${model} failed:`, err?.message || err);
      }
    }

    if (!lastText) {
      return res.status(502).json({
        success: false,
        message: "AI generation failed",
        detail:
          lastErr?.message ||
          "All candidate models failed",
      });
    }

    const text = lastText.trim();

    // Extract JSON safely
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return res.status(502).json({
        success: false,
        message: "AI returned invalid JSON format",
        raw: text,
        model: usedModel,
      });
    }

    const jsonText = text.slice(firstBrace, lastBrace + 1);

    let data;
    try {
      data = JSON.parse(jsonText);
    } catch (err) {
      return res.status(502).json({
        success: false,
        message: "Failed to parse JSON from AI response",
        raw: text,
        model: usedModel,
      });
    }

    return res.json({
      success: true,
      data,
      modelUsed: usedModel,
    });
  } catch (err) {
    console.error("Route error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error during AI generation",
      detail: err?.message || String(err),
    });
  }
});

export default aiInvoiceRouter;