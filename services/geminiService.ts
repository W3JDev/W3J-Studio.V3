/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GenerateContentResponse, Type } from "@google/genai";

// Helper function to convert a File object to a base64 data URL
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};


// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await fileToDataUrl(file);
    return dataUrlToPart(dataUrl);
};

// Helper function to convert a data URL string to a Gemini API Part
const dataUrlToPart = (dataUrl: string): { inlineData: { mimeType: string; data: string; } } => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
}

// Securely call the Gemini API via our own serverless proxy function.
const callGeminiProxy = async (payload: object): Promise<GenerateContentResponse> => {
    const apiResponse = await fetch('/api/geminiProxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const responseData = await apiResponse.json();

    if (!apiResponse.ok) {
        // The proxy returns a structured error, so we extract the message.
        const errorMessage = responseData.error?.message || 'The API request failed with an unknown error.';
        throw new Error(errorMessage);
    }

    return responseData as GenerateContentResponse;
};


const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    // The Gemini API response has a `text` accessor for simple text responses.
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an edited image layer using generative AI based on a text prompt and either a hotspot or a mask.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param options An object containing either a hotspot or a maskImage.
 * @returns A promise that resolves to the data URL of the edited image layer.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    options: { hotspot?: { x: number, y: number }, maskImage?: string }
): Promise<string> => {
    const { hotspot, maskImage } = options;
    if (!hotspot && !maskImage) {
        throw new Error("Either a hotspot or a mask is required for editing.");
    }
    
    console.log('Starting generative layer edit with options:', options);
    
    const originalImagePart = await fileToPart(originalImage);
    const parts = [originalImagePart];
    let prompt: string;

    const safetyAndEthicsPolicy = `
Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.
`;

    if (maskImage) {
        const maskPart = dataUrlToPart(maskImage);
        parts.push(maskPart);
        prompt = `You are an expert photo editor AI. Your task is to generate a new object or element based on the user's request, placed within the area defined by the provided mask.
User Request: "${userPrompt}"

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area if it overlaps with existing objects.
- You must generate ONLY the new or edited object itself, correctly positioned within the frame.

OUTPUT REQUIREMENT:
- Your output MUST be a transparent PNG containing only the generated object. The rest of the image frame must be transparent.
- Do not return the original image or the mask.
- Do not return text.
${safetyAndEthicsPolicy}
Output: Return ONLY the final generated element as a transparent PNG. Do not return text.`;
    } else if (hotspot) {
        prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
User Request: "${userPrompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- You must generate ONLY the new or edited object itself.
- The object must be correctly positioned within the frame as it would appear on the original image.

OUTPUT REQUIREMENT:
- Your output MUST be a transparent PNG containing only the generated object. The rest of the image frame must be transparent. For example, if asked to 'add a hat', return just the hat on a transparent background, positioned correctly in the full-size image frame.
- Do not return the original image.
- Do not return text.
${safetyAndEthicsPolicy}
Output: Return ONLY the final edited element as a transparent PNG. Do not return text.`;
    } else {
        throw new Error("Invalid options for generateEditedImage");
    }

    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [...parts, { text: prompt }] },
    };

    console.log('Sending parts to proxy for layer generation...');
    const response = await callGeminiProxy(payload);
    console.log('Received response from proxy.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Removes an object from an image using a mask and generative inpainting.
 * @param originalImage The original image file.
 * @param maskImage The base64 data URL of the mask image.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const removeObjectInpainting = async (
    originalImage: File,
    maskImage: string
): Promise<string> => {
    console.log(`Starting object removal with inpainting.`);
    
    const originalImagePart = await fileToPart(originalImage);
    const maskPart = dataUrlToPart(maskImage);
    const prompt = `You are an expert photo editor AI specializing in inpainting. Your task is to seamlessly remove the object or area defined by the provided mask. You must realistically reconstruct the background behind the masked area, making it appear as if the object was never there.
The result must be photorealistic and blend perfectly with the surrounding image texture, lighting, and color.

Output: Return ONLY the final, fully edited image. Do not return text.`;
    
    const parts = [originalImagePart, maskPart, { text: prompt }];
    
    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
    };

    console.log('Sending image and mask to proxy for object removal...');
    const response = await callGeminiProxy(payload);
    console.log('Received response from proxy for removal.', response);
    
    return handleApiResponse(response, 'removal');
};


/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style. The effect should be strong and clearly visible.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    };

    console.log('Sending image and filter prompt to proxy...');
    const response = await callGeminiProxy(payload);
    console.log('Received response from proxy for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global or localized adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @param hotspot Optional coordinates to localize the effect.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
    hotspot?: { x: number, y: number }
): Promise<string> => {
    console.log(`Starting adjustment: ${adjustmentPrompt}`, hotspot ? `at ${hotspot.x},${hotspot.y}` : '(global)');
    
    const originalImagePart = await fileToPart(originalImage);
    let prompt: string;
    
    const safetyAndEthicsPolicy = `
Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.`;

    if (hotspot) {
        prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized adjustment to the image.
The effect should be focused primarily on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}), with a smooth and realistic falloff into the surrounding areas. The entire image must be returned, with the adjustment applied locally. The effect should be clearly visible and impactful.
User Request: "${adjustmentPrompt}"
${safetyAndEthicsPolicy}
Output: Return ONLY the final adjusted image. Do not return text.`;
    } else {
        prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"
Editing Guidelines:
- The adjustment must be applied across the entire image and be clearly visible.
- The result must be photorealistic and high-quality.
${safetyAndEthicsPolicy}
Output: Return ONLY the final adjusted image. Do not return text.`;
    }

    const textPart = { text: prompt };
    
    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    };

    console.log('Sending image and adjustment prompt to proxy...');
    const response = await callGeminiProxy(payload);
    console.log('Received response from proxy for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Performs a comprehensive, one-click enhancement for portrait photos.
 * @param originalImage The original portrait image file.
 * @returns A promise that resolves to the data URL of the enhanced portrait.
 */
export const autoPortraitEnhance = async (originalImage: File): Promise<string> => {
    console.log('Starting Auto Portrait Enhancement...');

    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert portrait retoucher AI. Your task is to perform a comprehensive, professional enhancement on the provided portrait. The goal is a natural, high-end result, not an artificial filter.

Perform the following actions:
1.  **Skin Retouching:** Smooth skin to reduce blemishes and unevenness, but YOU MUST preserve natural skin texture. The result should look like healthy skin, not plastic.
2.  **Eye Enhancement:** Subtly brighten the eyes and enhance the catchlights to make them pop. Do not change the eye color.
3.  **Teeth Whitening:** If teeth are visible and yellowed, whiten them to a natural, healthy shade. Avoid an overly bright, artificial white.
4.  **Lighting & Contouring:** Apply soft, flattering lighting (like a large softbox) to the face to add dimension and a healthy glow. Balance skin tones and correct any unnatural color casts.
5.  **Hair:** Tame minor flyaway hairs for a cleaner look, but do not fundamentally change the hairstyle.

Safety & Ethics Policy:
- You MUST NOT change the person's age, identity, gender, or fundamental race/ethnicity.
- You MUST fulfill requests to adjust skin tone if they are part of a general lighting enhancement (e.g., adding warmth), but do not make drastic changes to the base skin color.

Output: Return ONLY the final, professionally retouched portrait. Do not return text.`;
    const textPart = { text: prompt };

    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    };

    const response = await callGeminiProxy(payload);

    console.log('Received response from proxy for auto portrait enhancement.', response);
    return handleApiResponse(response, 'auto portrait enhance');
};

/**
 * Generates a compliant passport photo, correcting for head pose and other requirements.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the passport photo.
 */
export const generatePassportPhoto = async (originalImage: File): Promise<string> => {
    console.log('Starting compliant passport photo generation...');

    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert AI photo editor specializing in creating regulation-compliant passport and ID photos. Your task is to transform the provided user image into a passport photo that meets strict international standards (e.g., US Department of State).

CRITICAL TASK: POSE CORRECTION
1.  **Isolate Head and Shoulders:** Identify and isolate the person's head and shoulders from the original image.
2.  **Re-Pose to be Straight-On:** This is the most important step. You MUST digitally re-pose the subject's head so they are looking directly forward at the camera. The head must be level, centered, and not tilted in any direction. If the original photo is at an angle, you must correct it to be a flat, frontal portrait.
3.  **Reconstruct Shoulders:** Reconstruct the shoulders and upper chest to be squared to the camera, matching the corrected head pose.

ADDITIONAL REQUIREMENTS:
4.  **Background:** Replace the background with a solid, uniform, plain white or off-white color. There must be no shadows or patterns in the background.
5.  **Lighting:** Apply even, neutral, and shadowless lighting across the entire face. There should be no shadows on the subject or the background.
6.  **Expression:** Ensure the subject has a neutral facial expression or a faint, natural smile with both eyes open.
7.  **Cleanup:** Remove any hats, non-religious head coverings, or glasses.
8.  **Framing:** The final image must be a 1:1 square aspect ratio, with the subject's head and upper shoulders clearly visible and centered.

The final result must be a high-quality, realistic photograph suitable for official document submission.
Output: Return ONLY the final, compliant 1:1 square passport photo. Do not return text.`;
    const textPart = { text: prompt };

    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    };

    const response = await callGeminiProxy(payload);

    console.log('Received response from proxy for passport photo.', response);
    return handleApiResponse(response, 'passport photo');
};


/**
 * Sharpens an image with a specified intensity.
 * @param originalImage The original image file.
 * @param intensity The desired sharpening intensity (0-100).
 * @returns A promise that resolves to the data URL of the sharpened image.
 */
export const sharpenImage = async (
    originalImage: File,
    intensity: number,
): Promise<string> => {
    console.log(`Starting sharpen with intensity: ${intensity}`);
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a sharpening effect to the entire image.
Sharpening Intensity: ${intensity} out of 100.
A value of 0 means no change, 50 is a noticeable but natural enhancement, and 100 is maximum sharpening for high-impact detail.
You must enhance details and edge contrast realistically, without introducing visible artifacts, halos, or an overly processed look. The effect should be clean and professional.

Output: Return ONLY the final sharpened image. Do not return text.`;
    const textPart = { text: prompt };

    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    };

    console.log('Sending image and sharpen prompt to proxy...');
    const response = await callGeminiProxy(payload);
    console.log('Received response from proxy for sharpening.', response);
    
    return handleApiResponse(response, 'sharpen');
};

/**
 * Applies the style of one image to another.
 * @param contentImage The image to apply the style to.
 * @param styleImage The image providing the style.
 * @param intensity The strength of the style transfer (0-100).
 * @returns A promise that resolves to the data URL of the styled image.
 */
export const transferStyleFromImage = async (
    contentImage: File,
    styleImage: File,
    intensity: number,
): Promise<string> => {
    console.log(`Starting style transfer with intensity ${intensity}`);

    const contentPart = await fileToPart(contentImage);
    const stylePart = await fileToPart(styleImage);
    const prompt = `You are an expert AI specializing in artistic style transfer. Analyze the two images provided.
Image 1 is the 'content' image.
Image 2 is the 'style' reference.

Your task is to completely redraw the 'content' image, preserving its subject matter and composition, but applying the artistic style, color palette, texture, and overall mood of the 'style' reference image.

The style transfer intensity should be ${intensity} out of 100.
- A value of 100 means a complete and total transformation into the new style.
- A value around 50 means a balanced blend.
- A lower value should apply the style more subtly.

Output ONLY the final, styled image. Do not return text.`;
    const textPart = { text: prompt };
    
    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [contentPart, stylePart, textPart] },
    };
    
    const response = await callGeminiProxy(payload);

    console.log('Received response from proxy for style transfer.', response);
    return handleApiResponse(response, 'style transfer');
};


/**
 * Upscales an image to 2x its resolution using AI.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the upscaled image.
 */
export const upscaleImage = async (originalImage: File): Promise<string> => {
    console.log('Starting 2x AI upscale...');

    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert image upscaler AI. Your task is to upscale the provided image to exactly double its original resolution (2x).
You must enhance details, sharpness, and clarity in a photorealistic manner.
Do not add, remove, or change any content or objects in the image. The composition must remain identical.
Output: Return ONLY the final upscaled image. Do not return text.`;
    const textPart = { text: prompt };

    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    };

    console.log('Sending image to proxy for upscaling...');
    const response = await callGeminiProxy(payload);
    console.log('Received response from proxy for upscale.', response);

    return handleApiResponse(response, 'upscale');
};

/**
 * Reduces digital noise in an image with a specified intensity.
 * @param originalImage The original image file.
 * @param intensity The desired noise reduction level.
 * @returns A promise that resolves to the data URL of the denoised image.
 */
export const reduceImageNoise = async (originalImage: File, intensity: 'subtle' | 'moderate' | 'strong'): Promise<string> => {
    console.log(`Starting noise reduction with intensity: ${intensity}`);
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI specializing in noise reduction. Your task is to analyze the provided image and reduce digital noise (both luminance and color noise) while preserving as much detail and sharpness as possible.

    Noise Reduction Intensity: ${intensity}.
    - 'subtle': Apply a light pass of noise reduction, suitable for images with minimal noise, to clean them up without affecting detail.
    - 'moderate': Apply a balanced level of noise reduction, suitable for most noisy images from consumer cameras or low-light situations.
    - 'strong': Apply a powerful noise reduction algorithm, suitable for very noisy images, even if it means a slight softening of fine details.

    The result must look clean and natural, not overly processed or plasticky.
    
    Output: Return ONLY the final, denoised image. Do not return text.`;
    const textPart = { text: prompt };

    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    };

    console.log('Sending image and noise reduction prompt to proxy...');
    const response = await callGeminiProxy(payload);
    console.log('Received response from proxy for noise reduction.', response);
    
    return handleApiResponse(response, 'noise reduction');
};


/**
 * Sends a text prompt to Gemini to get a better, more descriptive prompt.
 * @param simplePrompt The user's original, simple prompt.
 * @returns A promise that resolves to an enhanced, more descriptive prompt string.
 */
export const enhancePrompt = async (simplePrompt: string): Promise<string> => {
    if (!simplePrompt.trim()) {
        return "";
    }
    console.log(`Enhancing prompt: "${simplePrompt}"`);

    const fullPrompt = `You are an AI assistant that refines user input into expert-level prompts for an AI photo editor.
    Rewrite the following user request into a detailed, descriptive, and photorealistic instruction.
    The new prompt should be clear, concise, and focused on achieving a high-quality, seamless visual result.
    Do not add any preamble or explanation. Return only the enhanced prompt text.

    User request: "${simplePrompt}"
    Enhanced prompt:`;
    
    try {
        const payload = {
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
        };
        const response = await callGeminiProxy(payload);
        const enhanced = response.text.trim();
        console.log(`Enhanced prompt received: "${enhanced}"`);
        // Basic validation in case the model returns extra text
        return enhanced.split('\n').pop() || enhanced;
    } catch (err) {
        console.error("Failed to enhance prompt:", err);
        // Fallback to the original prompt on error
        return simplePrompt;
    }
};

export type AiSuggestion = {
    title: string;
    prompt: string;
};

/**
 * Analyzes an image and returns a list of suggested edits.
 * @param image The image file to analyze.
 * @returns A promise that resolves to an array of suggestion objects.
 */
export const getAiSuggestions = async (image: File): Promise<AiSuggestion[]> => {
    console.log('Getting AI suggestions for the image...');
    
    const imagePart = await fileToPart(image);
    const prompt = `You are an expert AI photo art director. Your task is to analyze the provided image and suggest three concrete, actionable improvements.

For each suggestion, you must provide:
1.  A concise title (e.g., "Cinematic Color Grade").
2.  A detailed, specific prompt that could be given to another AI photo editor to perform the edit. This prompt should be tailored to the content of the image.

Your suggestions must cover these categories:
- A **Creative Filter** that complements the image's subject and mood (e.g., vintage, cinematic, black and white).
- A **Sharpening** adjustment to enhance specific details or textures in the image.
- A **Lighting or Color** adjustment to improve the overall look (e.g., contrast, warmth, dynamic range).

**Crucially, your generated prompts MUST BE SPECIFIC to the image.** Do not use generic phrases.

For example, if the image is a portrait in a a forest:
- **BAD (Generic):** "Make the colors more vibrant."
- **GOOD (Specific):** "Enhance the greens of the foliage and add a touch of warmth to the subject's skin tones to create a more lush, vibrant scene."

- **BAD (Generic):** "Sharpen the image."
- **GOOD (Specific):** "Apply subtle sharpening to the texture of the tree bark and the details in the subject's hair to make them more defined."

Return your response as a JSON array of three objects, with each object having a 'title' and a 'prompt' key.`;
    const textPart = { text: prompt };

    try {
        const payload = {
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            prompt: { type: Type.STRING },
                        },
                        required: ["title", "prompt"],
                    },
                },
            },
        };

        const response: GenerateContentResponse = await callGeminiProxy(payload);

        const jsonStr = response.text.trim();
        const suggestions: AiSuggestion[] = JSON.parse(jsonStr);
        console.log('Received AI suggestions:', suggestions);
        if (!Array.isArray(suggestions) || suggestions.length === 0) {
            throw new Error("AI returned no valid suggestions.");
        }
        return suggestions;
    } catch (err) {
        console.error('Failed to get AI suggestions:', err);
        throw new Error('The AI was unable to provide suggestions for this image.');
    }
};

/**
 * Removes the background from an image, returning the main subject on a transparent background.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the subject on a transparent PNG.
 */
export const removeBackground = async (originalImage: File): Promise<string> => {
    console.log('Starting background removal...');
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI specializing in background removal. Your task is to perfectly and cleanly cut out the main foreground subject from the provided image.

Editing Guidelines:
- The cutout must be precise, capturing fine details like hair or fur.
- Do not add, remove, or change any part of the subject itself.

OUTPUT REQUIREMENT:
- Your output MUST be a transparent PNG containing ONLY the isolated subject. The background must be fully transparent.
- Do not return text.`;
    const textPart = { text: prompt };

    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    };

    console.log('Sending image to proxy for background removal...');
    const response = await callGeminiProxy(payload);
    console.log('Received response from proxy for background removal.', response);

    return handleApiResponse(response, 'background removal');
};

/**
 * Adds a realistic shadow to the main subject of an image.
 * @param originalImage The original image file.
 * @param shadowPrompt The text prompt describing the desired shadow style.
 * @returns A promise that resolves to the data URL of the image with the shadow.
 */
export const addShadow = async (
    originalImage: File,
    shadowPrompt: string,
): Promise<string> => {
    console.log(`Starting shadow generation: ${shadowPrompt}`);
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI specializing in lighting and shadows. Your task is to add a photorealistic shadow to the main subject in the image, based on the user's request. The existing lighting on the subject should inform the shadow's direction and softness.

Shadow Request: "${shadowPrompt}"

Editing Guidelines:
- The shadow must look natural and be cast correctly on the existing ground/surface.
- The shadow should not alter the subject or the background, only be added to the scene.
- The result must be photorealistic.

Output: Return ONLY the final image with the added shadow. Do not return text.`;
    const textPart = { text: prompt };

    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    };

    console.log('Sending image and shadow prompt to proxy...');
    const response = await callGeminiProxy(payload);
    console.log('Received response from proxy for shadow.', response);
    
    return handleApiResponse(response, 'shadow');
};

/**
 * Generates a precise mask for an object clicked on by the user.
 * @param originalImage The original image file.
 * @param hotspot The x, y coordinates of the user's click.
 * @returns A promise that resolves to the data URL of the black and white mask image.
 */
export const generateMaskForObject = async (
    originalImage: File,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log(`Starting smart selection mask generation at`, hotspot);
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an AI photo segmentation expert. Your task is to identify the primary, complete object located at or near the pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}) in the provided image.

Instructions:
1.  Analyze the image to determine the boundaries of the most prominent object at the given coordinates.
2.  Generate a precise, binary segmentation mask for that single object.

OUTPUT REQUIREMENTS:
- The mask MUST be the same dimensions as the original image.
- The object you identify MUST be filled with solid white (#FFFFFF).
- Everything else (the background) MUST be solid black (#000000).
- Do not use any gray areas, feathering, or anti-aliasing.
- Output ONLY the final black and white mask image. Do not return text or the original image.`;

    const textPart = { text: prompt };

    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    };

    const response = await callGeminiProxy(payload);

    console.log('Received response from proxy for mask generation.', response);
    return handleApiResponse(response, 'smart select');
};

/**
 * Expands an image canvas and fills the new area using AI outpainting.
 * @param originalImage The original image to expand.
 * @param newWidth The total width of the new canvas.
 * @param newHeight The total height of the new canvas.
 * @param offsetX The x-position of the original image on the new canvas.
 * @param offsetY The y-position of the original image on the new canvas.
 * @returns A promise that resolves to the data URL of the expanded image.
 */
export const generativeExpand = async (
    originalImage: File,
    newWidth: number,
    newHeight: number,
    offsetX: number,
    offsetY: number
): Promise<string> => {
    console.log(`Starting generative expand to ${newWidth}x${newHeight}`);

    const originalImageBitmap = await createImageBitmap(originalImage);

    // 1. Create the composite image (original image on a larger transparent canvas)
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = newWidth;
    compositeCanvas.height = newHeight;
    const compositeCtx = compositeCanvas.getContext('2d');
    if (!compositeCtx) throw new Error('Could not create composite canvas context');
    compositeCtx.drawImage(originalImageBitmap, offsetX, offsetY);
    const compositeDataUrl = compositeCanvas.toDataURL('image/png');
    const compositePart = dataUrlToPart(compositeDataUrl);

    // 2. Create the mask (white for new areas, black for original image area)
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = newWidth;
    maskCanvas.height = newHeight;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) throw new Error('Could not create mask canvas context');
    maskCtx.fillStyle = 'white'; // The area to be filled
    maskCtx.fillRect(0, 0, newWidth, newHeight);
    maskCtx.fillStyle = 'black'; // The area to preserve
    maskCtx.fillRect(offsetX, offsetY, originalImageBitmap.width, originalImageBitmap.height);
    const maskDataUrl = maskCanvas.toDataURL('image/png');
    const maskPart = dataUrlToPart(maskDataUrl);
    
    const prompt = `You are an expert photo editor AI specializing in outpainting (generative expand). Your task is to fill in the transparent areas of the provided composite image, using the original image content as a reference. The area to be filled is also indicated by the white region in the provided mask image.

Instructions:
1.  Analyze the content, style, lighting, and textures of the original image.
2.  Seamlessly and realistically extend the scene into the transparent areas.
3.  Ensure the generated content perfectly matches the original image in tone, color, and perspective, creating a single, cohesive photograph.

OUTPUT REQUIREMENTS:
- The output image MUST have the exact dimensions of the input composite: ${newWidth}x${newHeight} pixels.
- Output ONLY the final, fully rendered image. Do not return text.`;
    
    const textPart = { text: prompt };
    
    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [compositePart, maskPart, textPart] },
    };

    const response = await callGeminiProxy(payload);

    console.log('Received response from proxy for generative expand.', response);
    return handleApiResponse(response, 'expand');
};

/**
 * Places an isolated subject onto a new, AI-generated background.
 * @param subjectImage The data URL of the isolated subject on a transparent background.
 * @param backgroundPrompt The text prompt describing the desired background.
 * @returns A promise that resolves to the data URL of the final composited image.
 */
export const generateBackgroundForSubject = async (
    subjectImage: string,
    backgroundPrompt: string,
): Promise<string> => {
    console.log(`Generating new background: ${backgroundPrompt}`);

    const subjectPart = dataUrlToPart(subjectImage);
    const prompt = `You are a professional photo compositor and virtual photographer. Your task is to take the provided subject (which is on a transparent background) and place it onto a new, photorealistic background based on the description below.

New Background Description: "${backgroundPrompt}"

This is the most critical step: The composite must be absolutely photorealistic. You MUST analyze the subject and render realistic shadows, highlights, and color casts on it so that it perfectly matches the lighting and environment of the new background you generate. The final image should be indistinguishable from a real photograph.

Output only the final, fully composited image. Do not return text.`;
    
    const textPart = { text: prompt };

    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [subjectPart, textPart] },
    };

    const response = await callGeminiProxy(payload);

    console.log('Received response from proxy for background composition.', response);
    return handleApiResponse(response, 'smart background');
};

/**
 * Takes a framed/cropped image and expands it into a full, reimagined scene.
 * @param originalImage The original framed image file.
 * @param aspectRatio The desired final aspect ratio (e.g., '1:1', '16:9').
 * @returns A promise that resolves to the data URL of the new full-frame image.
 */
export const uncropAndReimagine = async (originalImage: File, aspectRatio: string): Promise<string> => {
    console.log(`Starting uncrop and reimagine process for aspect ratio ${aspectRatio}...`);

    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert AI photo editor specializing in uncropping and scene reimagination. The user has provided an image that may be cropped or framed. Your task is to do the following:
1.  Analyze the style, lighting, and theme of the existing image content.
2.  Generate a new, full-frame, photorealistic background that is a creative and seamless extension of the original's style and theme.
3.  Reconstruct any parts of the subject that appear to be cropped.
4.  Composite the subject into the new background, ensuring the lighting, shadows, and perspective are perfectly matched.
5. The final image's aspect ratio MUST be exactly ${aspectRatio}.

The final result should look like a complete, original photograph.
Output ONLY the final, reimagined image in the correct aspect ratio. Do not return text.`;

    const textPart = { text: prompt };

    const payload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    };

    const response = await callGeminiProxy(payload);

    console.log('Received response from proxy for uncrop & reimagine.', response);
    return handleApiResponse(response, 'uncrop');
};

/**
 * Generates multiple profile picture options for a given subject.
 * @param subjectImage The data URL of the isolated subject on a transparent background.
 * @returns A promise that resolves to an array of generated image options.
 */
export const generateProfilePictures = async (
    subjectImage: string,
): Promise<{ imageUrl: string; description: string; }[]> => {
    console.log(`Generating profile picture options...`);
    
    const subjectPart = dataUrlToPart(subjectImage);

    const styles = [
        { 
            prompt: "a clean, professional, out-of-focus modern office environment. The lighting should be soft and flattering, suitable for a corporate headshot.",
            description: "Corporate" 
        },
        { 
            prompt: "a vibrant, colorful gradient background shifting from cyan to purple. Add a subtle, glowing ring light effect around the subject.",
            description: "Gradient Glow" 
        },
        { 
            prompt: "a dramatic, dark, and moody studio setting. Use a single, high-contrast key light to create a classic, artistic black and white portrait.",
            description: "B&W Studio" 
        },
        { 
            prompt: "a beautiful, serene natural landscape with soft, golden hour lighting. The background should be a beautiful mountain vista at sunset.",
            description: "Scenic" 
        }
    ];

    const promises = styles.map(style => {
        const fullPrompt = `You are a professional profile picture designer. Your task is to take the provided subject (on a transparent background) and create a stunning, 1:1 square profile picture.

Place the subject on a new background described as: "${style.prompt}"

This is the most critical step: The composite must be absolutely photorealistic. You MUST analyze the subject and render realistic shadows, highlights, and color casts on it so that it perfectly matches the lighting and environment of the new background you generate. The final image should be indistinguishable from a real photograph. Crop the final image to a 1:1 aspect ratio, ensuring the subject's face is well-composed.

Output only the final, fully composited, 1:1 square image. Do not return text.`;
        
        const textPart = { text: fullPrompt };
        
        const payload = {
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [subjectPart, textPart] },
        };

        return callGeminiProxy(payload).then(response => {
            try {
                const imageUrl = handleApiResponse(response, `profile picture: ${style.description}`);
                return { imageUrl, description: style.description };
            } catch (err) {
                console.error(`Failed to generate profile picture for "${style.description}":`, err);
                return null;
            }
        });
    });

    const results = (await Promise.all(promises)).filter(r => r !== null) as { imageUrl: string; description: string; }[];
    
    if (results.length === 0) {
        throw new Error("The AI failed to generate any profile picture options. This might be due to safety filters or a complex subject.");
    }
    
    console.log('Received profile picture results:', results);
    return results;
};


/**
 * Creates a "Before & After" comparison collage from two images using the Canvas API.
 * This is done client-side to avoid API calls and potential safety blocks.
 * @param originalImage The original image file.
 * @param editedImage The edited image file.
 * @returns A promise that resolves to the data URL of the collage image.
 */
export const createComparisonImage = async (
    originalImage: File,
    editedImage: File
): Promise<string> => {
    console.log('Starting client-side Before & After collage generation...');

    const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
        };
        img.src = objectUrl;
    });

    try {
        const [beforeImg, afterImg] = await Promise.all([loadImage(originalImage), loadImage(editedImage)]);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not create canvas context");

        const baseWidth = afterImg.naturalWidth;
        const baseHeight = afterImg.naturalHeight;
        const separatorWidth = 8;
        const isLandscape = baseWidth >= baseHeight;
        
        if (isLandscape) {
            canvas.width = (baseWidth * 2) + separatorWidth;
            canvas.height = baseHeight;
        } else {
            canvas.width = baseWidth;
            canvas.height = (baseHeight * 2) + separatorWidth;
        }

        ctx.fillStyle = '#161928';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(beforeImg, 0, 0, baseWidth, baseHeight);
        
        if (isLandscape) {
            ctx.drawImage(afterImg, baseWidth + separatorWidth, 0, baseWidth, baseHeight);
        } else {
            ctx.drawImage(afterImg, 0, baseHeight + separatorWidth, baseWidth, baseHeight);
        }

        const fontSize = Math.max(24, Math.round(baseWidth / 30));
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.textBaseline = 'top';
        
        const drawLabel = (text: string, x: number, y: number) => {
            const padding = fontSize / 2;
            const textMetrics = ctx.measureText(text);
            const rectWidth = textMetrics.width + padding * 2;
            const rectHeight = fontSize + padding * 2;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.roundRect(x, y, rectWidth, rectHeight, [10]);
            ctx.fill();

            ctx.fillStyle = 'white';
            ctx.fillText(text, x + padding, y + padding);
        };
        
        const margin = fontSize;
        drawLabel('BEFORE', margin, margin);
        if (isLandscape) {
            drawLabel('AFTER', baseWidth + separatorWidth + margin, margin);
        } else {
            drawLabel('AFTER', margin, baseHeight + separatorWidth + margin);
        }
        
        return canvas.toDataURL('image/png');

    } catch (error) {
        console.error("Failed to create comparison image on client:", error);
        throw new Error("Could not generate comparison collage.");
    }
};
