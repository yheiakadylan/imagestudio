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
    
    const parts: Part[] = [];
    let textPrompt = '';

    if (artRefs.length > 0) {
        parts.push(...artRefs.map(dataUrlToGeminiPart));
        textPrompt = `Use the provided images as strong references for style and content. ${prompt}`;
    } else {
        textPrompt = `Generate a clean, high-resolution, print-ready artwork. No borders, no watermark, centered composition. ${prompt}`;
    }
    parts.push({ text: textPrompt });
    
    const config = {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
        // @ts-ignore 
        imageConfig: { aspectRatio },
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
    
    // Create an array of promises, one for each image requested.
    const promises: Promise<string>[] = [];
    for (let i = 0; i < count; i++) {
        promises.push(generateSingleImage());
    }

    // Wait for all promises to resolve.
    return Promise.all(promises);
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
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            // Added imageConfig to respect the aspect ratio selection for mockups.
            // @ts-ignore
            imageConfig: { aspectRatio },
        },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("AI did not return a mockup image. It might have refused the request.");
};