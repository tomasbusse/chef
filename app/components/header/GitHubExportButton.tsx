import { useState } from 'react';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { workbenchStore } from '~/lib/stores/workbench.client';
import { Button } from '@ui/Button';
import { GitHubExportDialog } from '../workbench/GitHubExportDialog';
import { useStore } from '@nanostores/react';

export function GitHubExportButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const files = useStore(workbenchStore.files);

  const handleExport = () => {
    setIsDialogOpen(true);
  };

  // Convert workbench files to the format expected by the dialog
  // Filter out folders and binary files, only export text files
  const exportFiles = Object.entries(files || {})
    .filter(([_, dirent]) => dirent?.type === 'file' && !dirent.isBinary)
    .map(([path, dirent]) => {
      if (dirent?.type === 'file') {
        return {
          path,
          content: dirent.content,
        };
      }
      return null;
    })
    .filter((file): file is { path: string; content: string } => file !== null);

  return (
    <>
      <Button onClick={handleExport} variant="neutral" size="xs" disabled={exportFiles.length === 0}>
        <GitHubLogoIcon />
        <span>Push to GitHub</span>
      </Button>
      <GitHubExportDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} files={exportFiles} />
    </>
  );
}
