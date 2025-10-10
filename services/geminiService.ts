import { GoogleGenAI, Modality, GenerateContentResponse, Part } from "@google/genai";

const createAiClient = (apiKey: string) => {
    if (!apiKey) {
        throw new Error("API key is not provided. Please ensure your account has a key assigned.");
    }
    return new GoogleGenAI({ apiKey });
};

const dataUrlToGeminiPart = (dataUrl: string): Part => {
    const [header, data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    return {
        inlineData: {
            mimeType,
            data,
        },
    };
};

export const generateArtwork = async (prompt: string, aspectRatio: string, artRefs: string[] = [], count: number, apiKey: string): Promise<string[]> => {
    const ai = createAiClient(apiKey);
    
    // @google/genai-sdk-upgrade: Use `imagen-4.0-generate-001` for text-to-image generation and `gemini-2.5-flash-image` for editing.
    if (artRefs.length > 0) {
        // Use gemini-2.5-flash-image for image editing/reference based generation
        const parts: Part[] = [...artRefs.map(dataUrlToGeminiPart)];
        const textPrompt = `Use the provided images as strong references for style and content. ${prompt}`;
        parts.push({ text: textPrompt });
        
        const config = {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        };
        
        const generateSingleImage = async (): Promise<string> => {
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config,
            });
        
            if (!response.candidates || response.candidates.length === 0) {
                 throw new Error("AI did not return any candidates. It might have refused the request.");
            }
            
            const candidate = response.candidates[0];
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            
            throw new Error("AI did not return an image in its response. It might have refused the request.");
        };
        
        const promises = Array.from({ length: count }, () => generateSingleImage());
        return Promise.all(promises);

    } else {
        // Use imagen-4.0-generate-001 for pure text-to-image generation
        const textPrompt = `Generate a clean, high-resolution, print-ready artwork. No borders, no watermark, centered composition. ${prompt}`;
        
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: textPrompt,
            config: {
              numberOfImages: count,
              aspectRatio: aspectRatio,
              outputMimeType: 'image/png',
            },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("AI did not return any images. It might have refused the request.");
        }

        return response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
    }
};

export const generateMockup = async (prompt: string, aspectRatio: string, samples: string[], artwork: string, apiKey: string): Promise<string> => {
    const ai = createAiClient(apiKey);
    let parts: Part[];
    let textPrompt: string;

    if (samples.length > 0) {
        parts = [
            ...samples.map(dataUrlToGeminiPart),
            dataUrlToGeminiPart(artwork),
        ];
        textPrompt = `Use the earlier image(s) as product reference(s). The LAST image is the artwork to apply onto the product. Keep the product's shape and form; do not repaint or reshape the product. Apply the artwork realistically with natural lighting, shadows, and reflections. ${prompt}`;
    } else {
        parts = [
            dataUrlToGeminiPart(artwork),
        ];
        textPrompt = `The provided image is artwork. Generate a mockup of a product as described in the prompt, and apply this artwork to it realistically with natural lighting, shadows, and reflections. ${prompt}`;
    }
    parts.push({ text: textPrompt });


    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        // FIX: Removed unsupported 'imageConfig' property for the 'gemini-2.5-flash-image' model.
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("AI did not return a mockup image. It might have refused the request.");
};