import type { ActionFunctionArgs } from '@vercel/remix';
import { json } from '@vercel/remix';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

const DESIGN_ANALYSIS_PROMPT = `You are an expert UI/UX designer and front-end developer. Analyze this design image in extreme detail and extract ALL visual specifications.

Provide a comprehensive analysis in the following format:

## Color Palette
List ALL colors used with exact hex codes:
- Primary colors
- Secondary colors
- Text colors
- Background colors
- Border colors
- Hover/active states

## Typography
- Font families (or closest web-safe alternatives)
- Font sizes for all text elements (headings, body, buttons, etc.)
- Font weights
- Line heights
- Letter spacing

## Layout & Spacing
- Page/container widths
- Padding values
- Margin values
- Grid systems (number of columns, gaps)
- Responsive breakpoints (if visible)

## Components
For each visible component (buttons, inputs, cards, etc.):
- Exact dimensions (width, height)
- Border radius values
- Border width and style
- Box shadows
- Padding and margin
- Background colors
- Text styles

## Visual Effects
- Shadow specifications (x, y, blur, spread, color)
- Gradients (if any)
- Transitions/animations (if discernible)
- Opacity values
- Backdrop filters or blurs

## Responsive Design
- Mobile vs Desktop differences
- Breakpoint behaviors
- Element stacking order

Be extremely precise with measurements and values. Use pixel values where possible.`;

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { storageIds, fileNames, token } = await request.json();

    if (!storageIds || !Array.isArray(storageIds) || storageIds.length === 0) {
      return json({ error: 'Storage IDs are required' }, { status: 400 });
    }

    if (!token || typeof token !== 'string') {
      return json({ error: 'Authentication token is required' }, { status: 401 });
    }

    // Get Convex URLs for the uploaded files
    const CONVEX_URL = globalThis.process.env.VITE_CONVEX_URL || globalThis.process.env.CONVEX_URL;
    if (!CONVEX_URL) {
      throw new Error('Missing CONVEX_URL environment variable');
    }

    const convex = new ConvexHttpClient(CONVEX_URL);
    convex.setAuth(token);

    const urlsResult = await convex.action(api.designUpload.getDesignFileUrls, {
      storageIds,
    });

    const validUrls = urlsResult.filter((item: { storageId: string; url: string | null }) => item.url !== null);
    
    if (validUrls.length === 0) {
      return json({ error: 'Could not retrieve URLs for uploaded files' }, { status: 500 });
    }

    // Initialize Gemini
    const GOOGLE_API_KEY = globalThis.process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) {
      return json({ error: 'Google API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Prepare content for Gemini
    const imageParts = await Promise.all(
      validUrls.map(async (urlItem: { storageId: string; url: string | null }) => {
        try {
          const response = await fetch(urlItem.url!);
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          
          // Get mime type from response
          const mimeType = response.headers.get('content-type') || 'image/jpeg';
          
          return {
            inlineData: {
              data: base64,
              mimeType,
            },
          };
        } catch (error) {
          console.error('Failed to fetch image:', error);
          return null;
        }
      }),
    );

    const validImageParts = imageParts.filter((part: { inlineData: { data: string; mimeType: string } } | null) => part !== null);

    if (validImageParts.length === 0) {
      return json({ error: 'Failed to process uploaded images' }, { status: 500 });
    }

    // Send to Gemini for analysis
    const result = await model.generateContent([
      DESIGN_ANALYSIS_PROMPT,
      ...validImageParts,
    ]);

    const response = await result.response;
    const analysis = response.text();

    return json({
      success: true,
      analysis,
      filesAnalyzed: validUrls.length,
      fileNames: fileNames || storageIds,
    });
  } catch (error) {
    console.error('Error analyzing design:', error);
    return json(
      { 
        error: 'An unexpected error occurred while analyzing the design',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
