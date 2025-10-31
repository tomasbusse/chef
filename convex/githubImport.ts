import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Convex action to upload GitHub repository files to Convex file storage
 * Returns a manifest with file paths and their corresponding storage IDs
 */
export const uploadGitHubFiles = action({
  args: {
    files: v.array(
      v.object({
        path: v.string(),
        content: v.string(),
      }),
    ),
    repository: v.object({
      owner: v.string(),
      repo: v.string(),
      branch: v.string(),
      url: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const manifest: Array<{
      path: string;
      storageId: string;
      size: number;
    }> = [];

    // Upload each file to Convex storage
    for (const file of args.files) {
      try {
        // Convert string content to Blob
        const blob = new Blob([file.content], { type: "text/plain" });
        
        // Store in Convex file storage
        const storageId = await ctx.storage.store(blob);
        
        manifest.push({
          path: file.path,
          storageId,
          size: file.content.length,
        });
      } catch (error) {
        console.error(`Failed to upload file ${file.path}:`, error);
        // Continue with other files even if one fails
      }
    }

    return {
      manifest,
      repository: args.repository,
      totalFiles: manifest.length,
      totalSize: manifest.reduce((sum, file) => sum + file.size, 0),
    };
  },
});
