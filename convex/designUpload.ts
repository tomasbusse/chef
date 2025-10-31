import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Convex action to store uploaded design files (images, PDFs, etc.)
 * Returns a manifest with file information and storage IDs
 */
export const uploadDesignFiles = action({
  args: {
    files: v.array(
      v.object({
        name: v.string(),
        type: v.string(),
        base64Data: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const manifest: Array<{
      name: string;
      type: string;
      storageId: string;
      size: number;
    }> = [];

    // Upload each file to Convex storage
    for (const file of args.files) {
      try {
        // Convert base64 to Blob
        const binaryString = atob(file.base64Data.split(',')[1] || file.base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: file.type });
        
        // Store in Convex file storage
        const storageId = await ctx.storage.store(blob);
        
        manifest.push({
          name: file.name,
          type: file.type,
          storageId,
          size: bytes.length,
        });
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        // Continue with other files even if one fails
      }
    }

    return {
      manifest,
      totalFiles: manifest.length,
      totalSize: manifest.reduce((sum, file) => sum + file.size, 0),
    };
  },
});

/**
 * Get public URLs for uploaded design files
 * These URLs can be sent to Gemini Vision API
 */
export const getDesignFileUrls = action({
  args: {
    storageIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const urls: Array<{
      storageId: string;
      url: string | null;
    }> = [];

    for (const storageId of args.storageIds) {
      try {
        const url = await ctx.storage.getUrl(storageId);
        urls.push({
          storageId,
          url,
        });
      } catch (error) {
        console.error(`Failed to get URL for ${storageId}:`, error);
        urls.push({
          storageId,
          url: null,
        });
      }
    }

    return urls;
  },
});
