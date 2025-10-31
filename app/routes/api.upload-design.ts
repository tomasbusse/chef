import type { ActionFunctionArgs } from '@vercel/remix';
import { json } from '@vercel/remix';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { files, token } = await request.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return json({ error: 'Files are required' }, { status: 400 });
    }

    if (!token || typeof token !== 'string') {
      return json({ error: 'Authentication token is required' }, { status: 401 });
    }

    // Get Convex URL
    const CONVEX_URL = globalThis.process.env.VITE_CONVEX_URL || globalThis.process.env.CONVEX_URL;
    if (!CONVEX_URL) {
      throw new Error('Missing CONVEX_URL environment variable');
    }

    const convex = new ConvexHttpClient(CONVEX_URL);
    convex.setAuth(token);

    // Upload files to Convex storage
    const uploadResult = await convex.action(api.designUpload.uploadDesignFiles, {
      files,
    });

    return json({
      success: true,
      manifest: uploadResult.manifest,
      totalFiles: uploadResult.totalFiles,
      totalSize: uploadResult.totalSize,
    });
  } catch (error) {
    console.error('Error uploading design files:', error);
    return json(
      {
        error: 'An unexpected error occurred while uploading design files',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
