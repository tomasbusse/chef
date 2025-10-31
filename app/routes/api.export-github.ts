import type { ActionFunctionArgs } from '@vercel/remix';
import { json } from '@vercel/remix';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { files, repository, commitMessage, githubToken, githubUsername, token } = await request.json();

    // Validate required fields
    if (!files || !Array.isArray(files) || files.length === 0) {
      return json({ error: 'Files array is required and cannot be empty' }, { status: 400 });
    }

    if (!repository || typeof repository !== 'object') {
      return json({ error: 'Repository configuration is required' }, { status: 400 });
    }

    if (!repository.name || typeof repository.name !== 'string') {
      return json({ error: 'Repository name is required' }, { status: 400 });
    }

    if (!commitMessage || typeof commitMessage !== 'string') {
      return json({ error: 'Commit message is required' }, { status: 400 });
    }

    if (!githubToken || typeof githubToken !== 'string') {
      return json({ error: 'GitHub token is required' }, { status: 401 });
    }

    if (!githubUsername || typeof githubUsername !== 'string') {
      return json({ error: 'GitHub username is required' }, { status: 400 });
    }

    if (!token || typeof token !== 'string') {
      return json({ error: 'Authentication token is required' }, { status: 401 });
    }

    // Validate file structure
    for (const file of files) {
      if (!file.path || typeof file.path !== 'string') {
        return json({ error: 'Each file must have a valid path' }, { status: 400 });
      }
      if (!file.content || typeof file.content !== 'string') {
        return json({ error: 'Each file must have valid content' }, { status: 400 });
      }
    }

    // Initialize Convex client
    const CONVEX_URL = globalThis.process.env.VITE_CONVEX_URL || globalThis.process.env.CONVEX_URL;
    if (!CONVEX_URL) {
      throw new Error('Missing CONVEX_URL or VITE_CONVEX_URL environment variable');
    }

    const convex = new ConvexHttpClient(CONVEX_URL);
    convex.setAuth(token);

    // Call the Convex action to export to GitHub
    const result = await convex.action(api.githubExport.exportToGitHub, {
      files,
      repository: {
        name: repository.name,
        description: repository.description,
        isPrivate: repository.isPrivate ?? false,
      },
      commitMessage,
      githubToken,
      githubUsername,
    });

    return json({
      success: true,
      repositoryUrl: result.repositoryUrl,
      repositoryName: result.repositoryName,
      filesUploaded: result.filesUploaded,
      commitSha: result.commitSha,
    });
  } catch (error) {
    console.error('Error exporting to GitHub:', error);
    
    // Handle specific error messages
    if (error instanceof Error) {
      return json({ error: error.message }, { status: 500 });
    }

    return json({ error: 'An unexpected error occurred while exporting to GitHub' }, { status: 500 });
  }
}
