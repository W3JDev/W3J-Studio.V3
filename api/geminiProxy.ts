/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// This file is a Vercel Serverless Function that acts as a secure proxy
// to the Google Gemini API. It prevents your API key from being exposed
// in the client-side browser code.

import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

// We recommend using the Vercel Edge runtime for low latency.
export const config = {
  runtime: 'edge',
};

// The main handler for the serverless function.
export default async function handler(req: Request) {
  // Ensure the request is a POST request, as we're sending data.
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // The body from the frontend will be the exact payload for the Gemini API.
    const requestBody = await req.json();

    // Securely retrieve the API key from Vercel's environment variables.
    // This key is NEVER exposed to the client.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY environment variable is not configured in Vercel.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // The requestBody from the frontend contains everything needed: { model, contents, config }
    const response: GenerateContentResponse = await ai.models.generateContent(requestBody);

    // Send the complete response from the Gemini API back to the frontend.
    // Using `Response` is standard for Edge functions.
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in Gemini Proxy:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    // Return a structured error message to the frontend for better debugging.
    return new Response(JSON.stringify({ error: { message: errorMessage } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}
