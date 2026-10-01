import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const analyzeShelfImage = async (imageFile) => {
  try {
    console.log("Starting AI analysis...");
    const base64Data = await fileToGenerativePart(imageFile);
    console.log("Image converted to base64, size:", Math.round(base64Data.inlineData.data.length / 1024), "KB");

    // Use gemini-1.5-flash which is the current stable model
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      Analyze this image of a pharmacy shelf or medicine strip.
      Identify the medicine names, potential dosage (mg), and estimated quantity.
      Return strictly a JSON array with no markdown formatting.
      Format: [{"name": "Dolo", "dosage": "650mg", "type": "Tablet", "estimated_stock": 10}]
      If you cannot identify any medicines, return an empty array: []
    `;

    console.log("Sending request to Gemini...");
    const result = await model.generateContent([prompt, base64Data]);
    const response = await result.response;
    const text = response.text();

    console.log("📝 RAW AI RESPONSE:", text);

    // ROBUST JSON PARSING: Find the first '[' and last ']'
    const firstBracket = text.indexOf("[");
    const lastBracket = text.lastIndexOf("]");

    if (firstBracket === -1 || lastBracket === -1) {
      // If AI didn't return a list, force an empty array to avoid crash
      console.warn("No JSON array found in response");
      return [];
    }

    const cleanJson = text.substring(firstBracket, lastBracket + 1);
    const parsed = JSON.parse(cleanJson);
    console.log("✅ Parsed medicines:", parsed.length);
    return parsed;

  } catch (error) {
    console.error("AI Scan Error:", error);
    console.error("Error details:", error.message);
    throw error;
  }
};
// Helper: Convert file to Base64 for Gemini
async function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: { data: base64Data, mimeType: file.type },
      });
    };
    reader.onerror = reject;
  });
}