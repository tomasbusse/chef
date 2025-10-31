import { v } from 'convex/values';
import { action } from './_generated/server';

export const exportToGitHub = action({
  args: {
    files: v.array(
      v.object({
        path: v.string(),
        content: v.string(),
      }),
    ),
    repository: v.object({
      name: v.string(),
      description: v.optional(v.string()),
      isPrivate: v.boolean(),
    }),
    commitMessage: v.string(),
    githubToken: v.string(),
    githubUsername: v.string(),
  },
  handler: async (ctx, args) => {
    const { files, repository, commitMessage, githubToken, githubUsername } = args;

    try {
      // Step 1: Create the repository
      const createRepoResponse = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Chef-App',
        },
        body: JSON.stringify({
          name: repository.name,
          description: repository.description || 'Created with Chef',
          private: repository.isPrivate,
          auto_init: true, // Initialize with README to create default branch
        }),
      });

      if (!createRepoResponse.ok) {
        const error = await createRepoResponse.json();
        if (createRepoResponse.status === 422 && error.errors?.[0]?.message?.includes('already exists')) {
          throw new Error(`Repository '${repository.name}' already exists. Please choose a different name.`);
        }
        throw new Error(`Failed to create repository: ${error.message || 'Unknown error'}`);
      }

      const repoData = await createRepoResponse.json();
      const repoFullName = repoData.full_name;
      const defaultBranch = repoData.default_branch || 'main';

      // Step 2: Get the current commit SHA of the default branch
      const refResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/git/ref/heads/${defaultBranch}`,
        {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Chef-App',
          },
        },
      );

      if (!refResponse.ok) {
        throw new Error('Failed to get branch reference');
      }

      const refData = await refResponse.json();
      const latestCommitSha = refData.object.sha;

      // Step 3: Get the tree SHA from the latest commit
      const commitResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/commits/${latestCommitSha}`, {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Chef-App',
        },
      });

      if (!commitResponse.ok) {
        throw new Error('Failed to get commit data');
      }

      const commitData = await commitResponse.json();
      const baseTreeSha = commitData.tree.sha;

      // Step 4: Create blobs for each file
      const blobs = await Promise.all(
        files.map(async (file) => {
          const blobResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/blobs`, {
            method: 'POST',
            headers: {
              Authorization: `token ${githubToken}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'Chef-App',
            },
            body: JSON.stringify({
              content: file.content,
              encoding: 'utf-8',
            }),
          });

          if (!blobResponse.ok) {
            throw new Error(`Failed to create blob for ${file.path}`);
          }

          const blobData = await blobResponse.json();
          return {
            path: file.path,
            mode: '100644', // Regular file
            type: 'blob' as const,
            sha: blobData.sha,
          };
        }),
      );

      // Step 5: Create a new tree
      const treeResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees`, {
        method: 'POST',
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Chef-App',
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: blobs,
        }),
      });

      if (!treeResponse.ok) {
        throw new Error('Failed to create tree');
      }

      const treeData = await treeResponse.json();
      const newTreeSha = treeData.sha;

      // Step 6: Create a new commit
      const newCommitResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/commits`, {
        method: 'POST',
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Chef-App',
        },
        body: JSON.stringify({
          message: commitMessage,
          tree: newTreeSha,
          parents: [latestCommitSha],
        }),
      });

      if (!newCommitResponse.ok) {
        throw new Error('Failed to create commit');
      }

      const newCommitData = await newCommitResponse.json();
      const newCommitSha = newCommitData.sha;

      // Step 7: Update the reference to point to the new commit
      const updateRefResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/git/refs/heads/${defaultBranch}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Chef-App',
          },
          body: JSON.stringify({
            sha: newCommitSha,
            force: false,
          }),
        },
      );

      if (!updateRefResponse.ok) {
        throw new Error('Failed to update branch reference');
      }

      return {
        success: true,
        repositoryUrl: repoData.html_url,
        repositoryName: repository.name,
        filesUploaded: files.length,
        commitSha: newCommitSha,
      };
    } catch (error) {
      console.error('Error exporting to GitHub:', error);
      throw error;
    }
  },
});
