import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY in environment variables.");
}

export const genAI = new GoogleGenerativeAI(apiKey);

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
