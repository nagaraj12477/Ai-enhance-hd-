import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AIResponse {
  processedImage: string | null;
  description: string;
}

export type EnhancementType = 
  | 'ai_photo_video' 
  | 'vibrant'
  | 'relight'
  | 'restore'
  | 'beautify'
  | 'ai_enhance'
  | 'studio_pro'
  | 'van_gogh'
  | 'sketch'
  | 'anime'
  | 'cyberpunk'
  | 'vintage_film'
  | 'monochrome';

export async function enhanceImage(
  base64Image: string, 
  type: EnhancementType = 'ai_photo_video',
  customPrompt?: string,
  refImage?: string
): Promise<AIResponse> {
  const prompts: Record<EnhancementType, string> = {
    ai_photo_video: "Enrich colors and contrast for a cinematic look.",
    vibrant: "Increase color saturation and vibrance.",
    relight: "Adjust shadows and highlights for professional lighting.",
    restore: "Improve image quality and remove noise.",
    beautify: "Apply soft lighting and smooth textures.",
    ai_enhance: "Increase resolution and clarity.",
    studio_pro: "Apply professional studio aesthetic.",
    van_gogh: "Vincent van Gogh oil painting style.",
    sketch: "Artistic pencil sketch drawing.",
    anime: "Digital anime illustration style.",
    cyberpunk: "Modern neon cyberpunk style.",
    vintage_film: "Classic cinematic film look.",
    monochrome: "High quality black and white photography."
  };

  try {
    const parts = base64Image.split(',');
    const data = parts.length > 1 ? parts[1] : base64Image;
    const mimeType = parts.length > 1 ? (parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg') : 'image/jpeg';

    const aiParts: any[] = [
      {
        inlineData: {
          data: data,
          mimeType: mimeType,
        },
      }
    ];

    if (refImage) {
      const refParts = refImage.split(',');
      const refData = refParts.length > 1 ? refParts[1] : refImage;
      const refMime = refParts.length > 1 ? (refParts[0].match(/:(.*?);/)?.[1] || 'image/jpeg') : 'image/jpeg';
      aiParts.push({
        inlineData: {
          data: refData,
          mimeType: refMime,
        }
      });
    }

    const taskText = customPrompt || `Apply a ${prompts[type]} aesthetic. ${refImage ? 'Use the second image as style reference.' : ''}`;
    aiParts.push({ text: taskText });

    const modelName = 'gemini-2.5-flash-image';
    const fallbackModel = 'gemini-2.0-flash';

    const getProcessedImageFromResponse = (response: any): { img: string | null; desc: string; error?: string } => {
      const candidate = response.candidates?.[0];
      const contentParts = candidate?.content?.parts;
      const finishReason = candidate?.finishReason;

      // Handle cases where the model returns an error/refusal reason but no content
      if (!contentParts || contentParts.length === 0) {
        if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
          return { error: finishReason, img: null, desc: "" };
        }
        return { error: 'EMPTY_RESPONSE', img: null, desc: "" };
      }

      let img: string | null = null;
      let desc = "";
      for (const part of contentParts) {
        if (part.inlineData) {
          img = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        } else if (part.text) {
          desc += part.text;
        }
      }
      return { img, desc };
    };

    const callAI = async (selectedModel: string, customText?: string) => {
      const parts = [...aiParts];
      if (customText) {
        const textIdx = parts.findIndex(p => p.text);
        if (textIdx !== -1) parts[textIdx] = { text: customText };
      }

      return await ai.models.generateContent({
        model: selectedModel,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: "You are a specialized neural image renderer. Your goal is to apply advanced aesthetic transformations to input images. You MUST return exactly one image part representing the modified version. Do not provide text explanations unless an image cannot be generated.",
          imageConfig: { aspectRatio: "1:1" },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        },
      });
    };

    let result: { img: string | null; desc: string; error?: string } = { img: null, desc: "" };

    try {
      // Step 1: Principal attempt (2.5-flash-image)
      console.log(`Attempting enhancement with ${modelName}...`);
      const resp1 = await callAI(modelName);
      result = getProcessedImageFromResponse(resp1);
      
      // Step 2: Retry 2.5 with a simpler prompt if initial one failed or was blocked
      if (result.error || !result.img) {
        console.warn(`Attempt 1 (${modelName}) failed: ${result.error}. Trying simplified prompt...`);
        const simplePrompt = `Enhance this image with ${type.replace(/_/g, ' ')} style.`;
        const resp2 = await callAI(modelName, simplePrompt);
        result = getProcessedImageFromResponse(resp2);
      }

      // Step 3: Switch to fallback model (2.0-flash) if 2.5 still fails
      if (result.error || !result.img) {
        console.warn(`Attempt 2 (${modelName} simple) failed: ${result.error}. Trying ${fallbackModel}...`);
        const resp3 = await callAI(fallbackModel);
        result = getProcessedImageFromResponse(resp3);
      }

      // Step 4: Final clinical attempt with 2.0-flash
      if (result.error || !result.img) {
        console.warn(`Attempt 3 (${fallbackModel}) failed: ${result.error}. Final clinical retry...`);
        const clinicalPrompt = `Apply high-quality ${type.replace(/_/g, ' ')} processing to this image.`;
        const resp4 = await callAI(fallbackModel, clinicalPrompt);
        result = getProcessedImageFromResponse(resp4);
      }
    } catch (e: any) {
      console.error(`Fatal model execution error:`, e);
      // Emergency last-resort retry
      try {
        const respEmergency = await callAI(fallbackModel, "Apply professional enhancement.");
        result = getProcessedImageFromResponse(respEmergency);
      } catch (e2: any) {
        throw new Error("The image processing engine is currently at capacity. Please rotate the image or try another photo.");
      }
    }

    if (result.error === 'SAFETY' || result.error === 'IMAGE_OTHER') {
      throw new Error("This specific visual transformation triggered a safety filter. Try a different effect or photo.");
    }
    
    if (result.error === 'RECITATION') {
      throw new Error("The requested style resembles protected content. Try a more general enhancement option.");
    }

    let processedImage = result.img;
    let description = result.desc;

    // Advanced extraction if inlineData is missing but base64 is in text
    if (!processedImage && description) {
      const dataUriMatch = description.match(/data:image\/[a-zA-Z]+;base64,([a-zA-Z0-9+/=]{500,})/);
      if (dataUriMatch) processedImage = dataUriMatch[0];
      
      if (!processedImage) {
        const rawBase64Match = description.match(/([a-zA-Z0-9+/=]{1000,})/);
        if (rawBase64Match) processedImage = `data:image/png;base64,${rawBase64Match[0]}`;
      }
    }

    if (!processedImage) {
      const reason = result.error || "UNKNOWN_AI_DECLINED";
      console.error(`Enhancement finalized with no image. AI Reason: ${reason}`);
      throw new Error("The enhancement could not be completed for this image. This can happen if the image is too complex or triggers a neural filter.");
    }

    return { processedImage, description };
  } catch (error) {
    console.error("AI Enhancement failed:", error);
    throw error;
  }
}

export async function batchEnhance(
  images: string[],
  type: EnhancementType = 'ai_photo_video',
  onProgress?: (count: number) => void,
  customPrompt?: string,
  refImage?: string
): Promise<AIResponse[]> {
  const results: AIResponse[] = [];
  for (let i = 0; i < images.length; i++) {
    const res = await enhanceImage(images[i], type, customPrompt, refImage);
    results.push(res);
    if (onProgress) onProgress(i + 1);
  }
  return results;
}

export async function generateImage(prompt: string): Promise<string> {
  const modelName = 'gemini-2.5-flash-image';
  const fallbackModel = 'gemini-2.0-flash';

  const callAI = async (selectedModel: string) => {
    return await ai.models.generateContent({
      model: selectedModel,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        systemInstruction: "You are a professional AI image generator. You transform text prompts into high-quality images. You ALWAYS return a single image part. No text, No conversation.",
        imageConfig: {
          aspectRatio: "1:1"
        },
          safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });
  };

  const getImgFromResult = (response: any) => {
    const candidate = response.candidates?.[0];
    const contentParts = candidate?.content?.parts;
    const finishReason = candidate?.finishReason;

    if (!contentParts || contentParts.length === 0) {
      return { error: finishReason || 'EMPTY' };
    }

    for (const part of contentParts) {
      if (part.inlineData) {
        return { img: `data:image/png;base64,${part.inlineData.data}` };
      }
    }
    return { error: 'NO_IMAGE_DATA' };
  };

  try {
    let response = await callAI(modelName);
    let result = getImgFromResult(response);

    if (result.error && result.error !== 'RECITATION') {
      console.warn(`Generation with ${modelName} failed/declined (${result.error}), trying fallback...`);
      response = await callAI(fallbackModel);
      result = getImgFromResult(response);
    }

    if (result.img) return result.img;

    if (result.error === 'SAFETY' || result.error === 'IMAGE_OTHER') {
      throw new Error("This prompt could not be processed due to safety filters. Try using more general descriptive terms.");
    }
    if (result.error === 'RECITATION') {
      throw new Error("This request matches patterns for protected content. Please try a different or more creative prompt.");
    }
    throw new Error(`AI generation declined. Reason: ${result.error}.`);
  } catch (error: any) {
    console.error("Image generation failed:", error);
    if (!error.message.includes("filters") && !error.message.includes("protected")) {
       // Deep fallback for unexpected execution errors
       try {
         const response = await callAI(fallbackModel);
         const candidate = response.candidates?.[0];
         const part = candidate?.content?.parts?.find((p: any) => p.inlineData);
         if (part?.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
       } catch (e) {
         console.error("Generation deep fallback also failed", e);
       }
    }
    throw error;
  }
}

export interface SmartSuggestions {
  captions: string[];
  hashtags: string[];
  description: string;
}

export async function describeImage(base64Image: string): Promise<SmartSuggestions> {
  try {
    const parts = base64Image.split(',');
    const data = parts.length > 1 ? parts[1] : base64Image;
    const mimeType = parts.length > 1 ? (parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg') : 'image/jpeg';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: data,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyze this image and provide: 
            1. A brief technical description.
            2. Three catchy Instagram-style captions (one minimal, one creative, one professional).
            3. Ten trending relevant hashtags.
            Return the response in a clear format.`,
          },
        ],
      },
      config: {
        systemInstruction: "You are an expert image analyzer and social media strategist. Analyze the image and provide high-quality descriptions, captions, and hashtags."
      }
    });

    const text = response.text || "";
    // Crude parsing for the demo, in a real app we'd use structured output (JSON mode)
    const captions = text.match(/"([^"]+)"/g)?.map(c => c.replace(/"/g, '')) || ["A beautiful moment.", "Chasing light.", "Pure aesthetics."];
    const hashtags = text.match(/#\w+/g) || ["#lumina", "#photography", "#ai"];
    
    return {
      description: text.split('\n')[0] || "A stunning visual.",
      captions: captions.slice(0, 3),
      hashtags: hashtags.slice(0, 10)
    };
  } catch (error) {
    console.error("Image description failed:", error);
    return {
      description: "Failed to analyze image.",
      captions: ["Stay inspired."],
      hashtags: ["#photo"]
    };
  }
}
