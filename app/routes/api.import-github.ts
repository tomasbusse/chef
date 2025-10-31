import type { ActionFunctionArgs } from '@vercel/remix';
import { json } from '@vercel/remix';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { githubUrl, token } = await request.json();

    if (!githubUrl || typeof githubUrl !== 'string') {
      return json({ error: 'GitHub URL is required' }, { status: 400 });
    }

    if (!token || typeof token !== 'string') {
      return json({ error: 'Authentication token is required' }, { status: 401 });
    }

    // Parse GitHub URL
    const urlMatch = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
      return json({ error: 'Invalid GitHub URL format. Expected: https://github.com/owner/repo' }, { status: 400 });
    }

    const [, owner, repoName] = urlMatch;
    const repo = repoName.replace(/\.git$/, ''); // Remove .git if present

    // Fetch default branch
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Chef-App',
      },
    });

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return json({ error: 'Repository not found. Make sure the repository is public.' }, { status: 404 });
      }
      return json({ error: 'Failed to fetch repository information' }, { status: repoResponse.status });
    }

    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch || 'main';

    // Fetch file tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Chef-App',
        },
      },
    );

    if (!treeResponse.ok) {
      return json({ error: 'Failed to fetch repository contents' }, { status: treeResponse.status });
    }

    const treeData: GitHubTreeResponse = await treeResponse.json();

    // Filter only files (blobs), exclude large files and certain directories
    const files = treeData.tree.filter(
      (item) =>
        item.type === 'blob' &&
        !item.path.startsWith('.git/') &&
        !item.path.includes('node_modules/') &&
        !item.path.includes('.next/') &&
        !item.path.includes('dist/') &&
        !item.path.includes('build/') &&
        (item.size || 0) < 1024 * 1024, // Skip files larger than 1MB
    );

    // Fetch file contents
    const fileContents = await Promise.all(
      files.slice(0, 200).map(async (file) => {
        // Limit to 200 files to avoid rate limits
        try {
          const contentResponse = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}`,
            {
              headers: {
                'User-Agent': 'Chef-App',
              },
            },
          );

          if (!contentResponse.ok) {
            return null;
          }

          const content = await contentResponse.text();

          return {
            path: file.path,
            content,
          };
        } catch (error) {
          console.error(`Failed to fetch ${file.path}:`, error);
          return null;
        }
      }),
    );

    const validFiles = fileContents.filter((f): f is { path: string; content: string } => f !== null);

    // Upload files to Convex storage
    const CONVEX_URL = globalThis.process.env.VITE_CONVEX_URL || globalThis.process.env.CONVEX_URL;
    if (!CONVEX_URL) {
      throw new Error('Missing CONVEX_URL or VITE_CONVEX_URL environment variable');
    }

    const convex = new ConvexHttpClient(CONVEX_URL);
    convex.setAuth(token);

    const uploadResult = await convex.action(api.githubImport.uploadGitHubFiles, {
      files: validFiles,
      repository: {
        owner,
        repo,
        branch: defaultBranch,
        url: githubUrl,
      },
    });

    return json({
      success: true,
      repository: uploadResult.repository,
      manifest: uploadResult.manifest,
      fileCount: uploadResult.totalFiles,
      totalFiles: files.length,
      totalSize: uploadResult.totalSize,
    });
  } catch (error) {
    console.error('Error importing from GitHub:', error);
    return json({ error: 'An unexpected error occurred while importing the repository' }, { status: 500 });
  }
}
