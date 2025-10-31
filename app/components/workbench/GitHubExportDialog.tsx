import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { useConvex } from 'convex/react';
import { getConvexAuthToken } from '~/lib/stores/sessionId';

interface GitHubExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: Array<{ path: string; content: string }>;
}

export function GitHubExportDialog({ open, onOpenChange, files }: GitHubExportDialogProps) {
  const convex = useConvex();
  const [isExporting, setIsExporting] = useState(false);
  const [repoName, setRepoName] = useState('');
  const [repoDescription, setRepoDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [commitMessage, setCommitMessage] = useState('Initial commit from Chef');
  const [githubToken, setGithubToken] = useState('');
  const [githubUsername, setGithubUsername] = useState('');

  const handleExport = async () => {
    // Get Convex authentication token
    const convexAuthToken = getConvexAuthToken(convex);
    
    if (!convexAuthToken) {
      toast.error('You must be logged in to export to GitHub');
      return;
    }

    if (!repoName.trim()) {
      toast.error('Repository name is required');
      return;
    }

    if (!githubToken.trim()) {
      toast.error('GitHub token is required');
      return;
    }

    if (!githubUsername.trim()) {
      toast.error('GitHub username is required');
      return;
    }

    if (files.length === 0) {
      toast.error('No files to export');
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch('/api/export-github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files,
          repository: {
            name: repoName,
            description: repoDescription,
            isPrivate,
          },
          commitMessage,
          githubToken,
          githubUsername,
          token: convexAuthToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to export to GitHub');
      }

      toast.success(
        <div>
          <p className="font-semibold">Successfully exported to GitHub!</p>
          <p className="text-sm">
            {data.filesUploaded} files uploaded to {data.repositoryName}
          </p>
        </div>,
      );

      // Open the repository in a new tab
      if (data.repositoryUrl) {
        window.open(data.repositoryUrl, '_blank');
      }

      // Reset form and close dialog
      setRepoName('');
      setRepoDescription('');
      setCommitMessage('Initial commit from Chef');
      setGithubToken('');
      setGithubUsername('');
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export to GitHub');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-lg shadow-xl z-50 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <Dialog.Title className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Export to GitHub
            </Dialog.Title>

            <div className="space-y-4">
              {/* GitHub Token */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  GitHub Personal Access Token *
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Create a token
                  </a>{' '}
                  with 'repo' scope
                </p>
              </div>

              {/* GitHub Username */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  GitHub Username *
                </label>
                <input
                  type="text"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="username"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Repository Name */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Repository Name *
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="my-awesome-project"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Repository Description */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={repoDescription}
                  onChange={(e) => setRepoDescription(e.target.value)}
                  placeholder="A brief description of your project"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Commit Message */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Commit Message
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Initial commit"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Private Repository Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="private-repo"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="private-repo" className="text-sm text-gray-700 dark:text-gray-300">
                  Make repository private
                </label>
              </div>

              {/* File Count Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  📁 {files.length} file{files.length !== 1 ? 's' : ''} will be exported
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => onOpenChange(false)}
                disabled={isExporting}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? 'Exporting...' : 'Export to GitHub'}
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              This will create a new repository on GitHub with all your project files.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
