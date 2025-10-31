import Cookies from 'js-cookie';
import { useStore } from '@nanostores/react';
import { EnhancePromptButton } from './EnhancePromptButton.client';
import { messageInputStore } from '~/lib/stores/messageInput';
import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ChangeEventHandler,
  type KeyboardEventHandler,
} from 'react';
import { useSearchParams } from '@remix-run/react';
import { classNames } from '~/utils/classNames';
import { ConvexConnection } from '~/components/convex/ConvexConnection';
import { PROMPT_COOKIE_KEY, type ModelSelection } from '~/utils/constants';
import { ModelSelector } from './ModelSelector';
import { TeamSelector } from '~/components/convex/TeamSelector';
import { ArrowRightIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, StopIcon } from '@radix-ui/react-icons';
import { SquaresPlusIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@ui/Tooltip';
import { setSelectedTeamSlug, useSelectedTeamSlug } from '~/lib/stores/convexTeams';
import { convexProjectStore } from '~/lib/stores/convexProject';
import { useChefAuth } from './ChefAuthWrapper';
import { getConvexAuthToken, useConvexSessionIdOrNullOrLoading } from '~/lib/stores/sessionId';
import { KeyboardShortcut } from '@ui/KeyboardShortcut';
import { Button } from '@ui/Button';
import { Spinner } from '@ui/Spinner';
import { debounce } from '~/utils/debounce';
import { toast } from 'sonner';
import { captureException } from '@sentry/remix';
import { Menu as MenuComponent, MenuItem as MenuItemComponent } from '@ui/Menu';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftIcon, DocumentArrowUpIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@workos-inc/authkit-react';
import { CodeBracketIcon, PhotoIcon } from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';
import { useConvex } from 'convex/react';

const PROMPT_LENGTH_WARNING_THRESHOLD = 10000;

type Highlight = {
  text: string; // must be lowercase
  tooltip: ReactNode;
};

const HIGHLIGHTS: Highlight[] = [
  {
    text: 'ai chat',
    tooltip: 'Unless otherwise configured, Chef will prototype with GPT‑4o mini or GPT‑4.1 nano (limits apply).',
  },
  {
    text: 'collaborative text editor',
    tooltip: (
      <>
        Chef will use the{' '}
        <TooltipLink href="https://www.convex.dev/components/prosemirror-sync">Collaborative Text Editor</TooltipLink>{' '}
        Convex <TooltipLink href="https://www.convex.dev/components">component</TooltipLink>.
      </>
    ),
  },
  {
    text: 'upload',
    tooltip: (
      <>
        Chef will use Convex’s built-in{' '}
        <TooltipLink href="https://docs.convex.dev/file-storage">file upload capabilities</TooltipLink>.
      </>
    ),
  },
  {
    text: 'full text search',
    tooltip: (
      <>
        Chef will use Convex’s built-in{' '}
        <TooltipLink href="https://docs.convex.dev/search/text-search">full text search</TooltipLink> capabilities.
      </>
    ),
  },
  {
    text: 'presence',
    tooltip: (
      <>
        Chef will use the <TooltipLink href="https://www.convex.dev/components/presence">Presence</TooltipLink>{' '}
        Convex&nbsp;<TooltipLink href="https://www.convex.dev/components">component</TooltipLink>.
      </>
    ),
  },
];

export const MessageInput = memo(function MessageInput({
  chatStarted,
  isStreaming,
  sendMessageInProgress,
  onStop,
  onSend,
  disabled,
  modelSelection,
  setModelSelection,
  numMessages,
}: {
  chatStarted: boolean;
  isStreaming: boolean;
  sendMessageInProgress: boolean;
  onStop: () => void;
  onSend: (message: string) => Promise<void>;
  disabled: boolean;
  modelSelection: ModelSelection;
  setModelSelection: (modelSelection: ModelSelection) => void;
  numMessages: number | undefined;
}) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGitHubDialogOpen, setIsGitHubDialogOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isDesignDialogOpen, setIsDesignDialogOpen] = useState(false);
  const [isUploadingDesign, setIsUploadingDesign] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const sessionId = useConvexSessionIdOrNullOrLoading();
  const chefAuthState = useChefAuth();
  const selectedTeamSlug = useSelectedTeamSlug();
  const convex = useConvex();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const input = useStore(messageInputStore);

  // Set the initial input value
  const [searchParams] = useSearchParams();
  useEffect(() => {
    messageInputStore.set(searchParams.get('prefill') || Cookies.get(PROMPT_COOKIE_KEY) || '');
  }, [searchParams]);

  // Send messages
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) {
      return;
    }

    await onSend(trimmedInput);

    Cookies.remove(PROMPT_COOKIE_KEY);
    messageInputStore.set('');
    textareaRef.current?.blur();
  }, [input, onSend]);

  const handleClickButton = useCallback(() => {
    if (isStreaming) {
      onStop?.();
      return;
    }

    handleSend();
  }, [handleSend, isStreaming, onStop]);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      if (event.key === 'Enter' && selectedTeamSlug) {
        if (event.shiftKey) {
          return;
        }

        event.preventDefault();

        if (isStreaming) {
          onStop?.();
          return;
        }

        // ignore if using input method engine
        if (event.nativeEvent.isComposing) {
          return;
        }

        handleSend();
      }
    },
    [selectedTeamSlug, handleSend, isStreaming, onStop],
  );

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = useCallback((event) => {
    const value = event.target.value;
    messageInputStore.set(value);
    cachePrompt(value);
  }, []);

  const enhancePrompt = useCallback(async () => {
    try {
      setIsEnhancing(true);

      const token = getConvexAuthToken(convex);
      if (!token) {
        throw new Error('No auth token');
      }
      const response = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: input.trim(),
          token,
          teamSlug: selectedTeamSlug,
          deploymentName: convexProjectStore.get()?.deploymentName,
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          throw new Error('No remaining tokens available for prompt enhancement');
        }
        throw new Error('Failed to enhance prompt. Please try again.');
      }

      const data = await response.json();
      if (data.enhancedPrompt) {
        messageInputStore.set(data.enhancedPrompt);
      }
    } catch (error) {
      captureException('Failed to enhance prompt', {
        level: 'error',
        extra: {
          error,
        },
      });
      toast.error(error instanceof Error ? error.message : 'Failed to enhance prompt. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  }, [input, convex, selectedTeamSlug]);

  // Helper to insert template and select '[...]'
  const insertTemplate = useCallback(
    (template: string) => {
      let newValue;
      if (input && input.trim().length > 0) {
        newValue = input + (input.endsWith('\n') ? '' : '\n\n') + template;
      } else {
        newValue = template;
      }
      messageInputStore.set(newValue);
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          const start = newValue.lastIndexOf('...');
          if (start !== -1) {
            textarea.focus();
            textarea.setSelectionRange(start, start + 5);
          }
        }
      }, 0);
    },
    [input],
  );

  // GitHub import handler
  const handleGitHubImport = useCallback(async () => {
    if (!githubUrl.trim()) {
      toast.error('Please enter a GitHub URL');
      return;
    }

    try {
      setIsImporting(true);

      const token = getConvexAuthToken(convex);
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('/api/import-github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          githubUrl: githubUrl.trim(),
          token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import repository');
      }

      // Create file manifest reference
      const filesList = data.manifest
        .map((file: { path: string; storageId: string }) => `  - ${file.path}`)
        .join('\n');

      // Create enhanced prompt with design preservation instructions
      const enhancedPrompt = `I want to recreate this app from the GitHub repository: ${githubUrl}

## Repository Information
- Owner/Repo: ${data.repository.owner}/${data.repository.repo}
- Branch: ${data.repository.branch}
- Files imported: ${data.fileCount}
- Total size: ${(data.totalSize / 1024).toFixed(2)} KB

## Uploaded Files
The following files have been uploaded to Convex storage and are available for analysis:
${filesList}

## Task Requirements

### 1. Code Analysis & Recreation
- Analyze all uploaded files to understand the application architecture and features
- Identify the data models, UI components, and business logic
- Recreate the application with a Convex backend

### 2. Backend Implementation
- Create appropriate Convex tables for all data models
- Implement Convex queries, mutations, and actions for all features
- Use Convex's built-in features (auth, file storage, search) where applicable
- Ensure real-time updates using Convex subscriptions

### 3. Design Preservation (CRITICAL)
**IMPORTANT: Maintain the EXACT visual design, layout, and styling from the original application.**

#### Design Fidelity Requirements:
- **Colors**: Extract and use the EXACT color palette from the original app
  - Preserve primary, secondary, accent, text, and background colors
  - Maintain color relationships and contrast ratios
  - Keep the same color scheme for interactive states (hover, active, disabled)

- **Typography**: Match the original fonts and text styling
  - Font families, sizes, weights, and line heights
  - Text alignment and spacing
  - Heading hierarchy and styles

- **Layout & Spacing**: Replicate the exact layout structure
  - Container widths, padding, and margins
  - Grid systems and flex layouts
  - Responsive breakpoints and behavior
  - Component spacing and alignment

- **UI Components**: Recreate all components with identical appearance
  - Buttons, inputs, cards, modals, dropdowns, etc.
  - Border radius, shadows, and borders
  - Icons and their styling
  - Loading states and animations

- **Visual Effects**: Preserve all visual details
  - Shadows and elevation
  - Transitions and animations
  - Hover and focus states
  - Background patterns or gradients

#### Format Conversion Guidelines:
If the original app uses different styling approaches, convert them while preserving the design:

**CSS Modules → Tailwind CSS:**
- Extract exact values from CSS (colors, spacing, sizes)
- Map CSS properties to equivalent Tailwind utilities
- Use arbitrary values \`[#hexcode]\` or \`[Xpx]\` for exact matches
- Preserve responsive behavior with Tailwind breakpoints

**Styled Components → Tailwind CSS:**
- Convert theme variables to Tailwind config or CSS variables
- Transform dynamic styles to conditional Tailwind classes
- Maintain all computed values and expressions

**Other CSS → Tailwind CSS:**
- Analyze computed styles for exact values
- Use Tailwind's \`@apply\` directive for complex patterns if needed
- Define custom CSS variables in your styles for non-Tailwind values

**Key Conversion Rules:**
1. NEVER approximate - use exact pixel values, hex codes, and measurements
2. If Tailwind doesn't have a utility, use arbitrary values: \`w-[347px]\`, \`bg-[#F8F7F4]\`
3. For complex gradients or effects, use inline styles or CSS variables
4. Test responsive behavior matches original at all breakpoints

### 4. Feature Completeness
- Implement ALL features from the original application
- Ensure all user interactions work identically
- Maintain the same navigation and routing structure
- Preserve any animations or transitions

### 5. Code Quality
- Write clean, maintainable TypeScript/React code
- Follow Convex best practices for data modeling
- Add appropriate error handling and loading states
- Ensure type safety throughout

**Remember: The recreated app should be visually INDISTINGUISHABLE from the original. When in doubt, inspect the original files for exact values rather than approximating.**

Please begin by analyzing the uploaded files and then recreate the application following these requirements.`;

      messageInputStore.set(enhancedPrompt);

      toast.success(`Successfully imported ${data.fileCount} files from GitHub!`);
      setIsGitHubDialogOpen(false);
      setGithubUrl('');
    } catch (error) {
      console.error('Error importing from GitHub:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import repository');
    } finally {
      setIsImporting(false);
    }
  }, [githubUrl, convex]);

  return (
    <>
      <div className="relative z-20 mx-auto w-full max-w-chat rounded-xl shadow transition-all duration-200">
        <div className="rounded-xl bg-background-primary/75 backdrop-blur-md">
          <div className="rounded-t-xl border transition-all has-[textarea:focus]:border-border-selected">
            <TextareaWithHighlights
              onKeyDown={handleKeyDown}
              onChange={handleChange}
              value={input}
              chatStarted={chatStarted}
              minHeight={100}
              maxHeight={chatStarted ? 400 : 200}
              placeholder={
                chatStarted
                  ? numMessages !== undefined && numMessages > 0
                    ? 'Request changes by sending another message…'
                    : 'Send a prompt for a new feature…'
                  : 'What app do you want to serve?'
              }
              disabled={disabled}
              highlights={HIGHLIGHTS}
            />
          </div>
        <div
          className={classNames(
            'flex items-center gap-2 border rounded-b-xl border-t-0 bg-background-secondary/80 p-1.5 text-sm flex-wrap',
          )}
        >
          {chefAuthState.kind === 'fullyLoggedIn' && (
            <ModelSelector modelSelection={modelSelection} setModelSelection={setModelSelection} size="sm" />
          )}
          {!chatStarted && sessionId && (
            <TeamSelector
              description="Your project will be created in this Convex team"
              selectedTeamSlug={selectedTeamSlug}
              setSelectedTeamSlug={setSelectedTeamSlug}
              size="sm"
            />
          )}
          {chatStarted && <ConvexConnection />}
          {input.length > 3 && input.length <= PROMPT_LENGTH_WARNING_THRESHOLD && <NewLineShortcut />}
          {input.length > PROMPT_LENGTH_WARNING_THRESHOLD && <CharacterWarning />}
          <div className="ml-auto flex items-center gap-1">
            {chefAuthState.kind === 'unauthenticated' && <SignInButton />}
            {chefAuthState.kind === 'fullyLoggedIn' && (
              <MenuComponent
                buttonProps={{
                  variant: 'neutral',
                  tip: 'Use a recipe',
                  inline: true,
                  icon: (
                    <div className="text-lg">
                      <SquaresPlusIcon className="size-4" />
                    </div>
                  ),
                }}
                placement="top-start"
              >
                <div className="ml-3 flex items-center gap-1">
                  <h2 className="text-sm font-bold">Use a recipe</h2>
                  <Tooltip tip="Recipes are Chef prompts that add powerful full-stack features to your app." side="top">
                    <span className="cursor-help text-content-tertiary">
                      <InformationCircleIcon className="size-4" />
                    </span>
                  </Tooltip>
                </div>
                <MenuItemComponent action={() => insertTemplate('Make a collaborative text editor that ...')}>
                  <div className="flex w-full items-center gap-2">
                    <PencilSquareIcon className="size-4 text-content-secondary" />
                    Make a collaborative text editor
                  </div>
                </MenuItemComponent>
                <MenuItemComponent action={() => insertTemplate('Add AI chat to ...')}>
                  <div className="flex w-full items-center gap-2">
                    <ChatBubbleLeftIcon className="size-4 text-content-secondary" />
                    Add AI chat
                  </div>
                </MenuItemComponent>
                <MenuItemComponent action={() => insertTemplate('Add file upload to ...')}>
                  <div className="flex w-full items-center gap-2">
                    <DocumentArrowUpIcon className="size-4 text-content-secondary" />
                    Add file upload
                  </div>
                </MenuItemComponent>
                <MenuItemComponent action={() => insertTemplate('Add full text search to ...')}>
                  <div className="flex w-full items-center gap-2">
                    <MagnifyingGlassIcon className="size-4 text-content-secondary" />
                    Add full text search
                  </div>
                </MenuItemComponent>
              </MenuComponent>
            )}
            {chefAuthState.kind === 'fullyLoggedIn' && !chatStarted && (
              <>
                <Button
                  variant="neutral"
                  tip="Upload Design Files"
                  inline
                  onClick={() => setIsDesignDialogOpen(true)}
                  size="xs"
                  icon={<PhotoIcon className="size-4" />}
                />
                <Button
                  variant="neutral"
                  tip="Load from GitHub"
                  inline
                  onClick={() => setIsGitHubDialogOpen(true)}
                  size="xs"
                  icon={<CodeBracketIcon className="size-4" />}
                />
              </>
            )}
            {chefAuthState.kind === 'fullyLoggedIn' && (
              <EnhancePromptButton
                isEnhancing={isEnhancing}
                disabled={!selectedTeamSlug || disabled || input.length === 0}
                onClick={enhancePrompt}
              />
            )}
            <Button
              disabled={
                (!isStreaming && input.length === 0) ||
                !selectedTeamSlug ||
                chefAuthState.kind === 'loading' ||
                sendMessageInProgress ||
                disabled
              }
              tip={
                chefAuthState.kind === 'unauthenticated'
                  ? 'Please sign in to continue'
                  : !selectedTeamSlug
                    ? 'Please select a team to continue'
                    : undefined
              }
              onClick={handleClickButton}
              size="xs"
              className="ml-2 h-[1.625rem]"
              aria-label={isStreaming ? 'Stop' : 'Send'}
              icon={
                sendMessageInProgress ? (
                  <Spinner className="text-white" />
                ) : !isStreaming ? (
                  <ArrowRightIcon />
                ) : (
                  <StopIcon />
                )
              }
            />
          </div>
        </div>
      </div>
    </div>

      {/* Design Upload Dialog */}
      <Dialog.Root open={isDesignDialogOpen} onOpenChange={setIsDesignDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background-primary border border-border-primary rounded-lg shadow-lg p-6 w-full max-w-md z-50">
            <Dialog.Title className="text-lg font-semibold mb-4">Upload Design Files</Dialog.Title>
            <Dialog.Description className="text-sm text-content-secondary mb-4">
              Upload design mockups, screenshots, Figma exports, or product requirement PDFs. Gemini Vision will analyze them to extract exact specifications.
            </Dialog.Description>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="design-files" className="block text-sm font-medium mb-2">
                  Select Files
                </label>
                <input
                  id="design-files"
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,application/pdf"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setSelectedFiles(files);
                  }}
                  className="w-full px-3 py-2 border border-border-primary rounded-md bg-background-secondary text-content-primary file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={isUploadingDesign}
                />
                <p className="mt-2 text-xs text-content-tertiary">
                  Supported: PNG, JPG, WEBP, SVG, PDF (max 10 files)
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Files ({selectedFiles.length}):</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="text-xs text-content-secondary flex items-center gap-2">
                        <PhotoIcon className="size-3" />
                        <span className="flex-1 truncate">{file.name}</span>
                        <span className="text-content-tertiary">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="neutral"
                  onClick={() => {
                    setIsDesignDialogOpen(false);
                    setSelectedFiles([]);
                  }}
                  disabled={isUploadingDesign}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (selectedFiles.length === 0) {
                      toast.error('Please select at least one file');
                      return;
                    }

                    try {
                      setIsUploadingDesign(true);

                      const token = getConvexAuthToken(convex);
                      if (!token) {
                        throw new Error('No authentication token available');
                      }

                      // Convert files to base64
                      const filePromises = selectedFiles.slice(0, 10).map((file) => {
                        return new Promise<{ name: string; type: string; base64Data: string }>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            resolve({
                              name: file.name,
                              type: file.type,
                              base64Data: reader.result as string,
                            });
                          };
                          reader.onerror = reject;
                          reader.readAsDataURL(file);
                        });
                      });

                      const filesData = await Promise.all(filePromises);

                      // Upload to Convex
                      const uploadResponse = await fetch('/api/upload-design', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ files: filesData, token }),
                      });

                      if (!uploadResponse.ok) {
                        throw new Error('Failed to upload files');
                      }

                      const uploadData = await uploadResponse.json();

                      // Analyze with Gemini Vision
                      const analyzeResponse = await fetch('/api/analyze-design', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          storageIds: uploadData.manifest.map((m: { storageId: string }) => m.storageId),
                          fileNames: uploadData.manifest.map((m: { name: string }) => m.name),
                          token,
                        }),
                      });

                      if (!analyzeResponse.ok) {
                        throw new Error('Failed to analyze design files');
                      }

                      const analyzeData = await analyzeResponse.json();

                      // Generate enhanced prompt
                      const filesList = uploadData.manifest
                        .map((file: { name: string }) => `  - ${file.name}`)
                        .join('\n');

                      const enhancedPrompt = `I want to recreate this design from uploaded files.

## Uploaded Files (${uploadData.totalFiles} files, ${(uploadData.totalSize / 1024).toFixed(2)} KB)
${filesList}

## Gemini Vision Analysis

${analyzeData.analysis}

## Task Requirements

Please recreate this design EXACTLY as shown in the uploaded files, following these guidelines:

### 1. Design Fidelity (CRITICAL)
- Use the EXACT colors, fonts, spacing, and layouts from the analysis above
- Never approximate - use exact pixel values and hex codes
- Match all visual effects (shadows, borders, gradients, animations)
- Recreate all components with identical appearance

### 2. Tailwind CSS Implementation
- Use arbitrary values for exact matches: \`w-[347px]\`, \`bg-[#F8F7F4]\`
- For complex effects, use inline styles or CSS variables
- Preserve responsive behavior at all breakpoints

### 3. Backend with Convex
- Create appropriate Convex tables for data models
- Implement real-time features using Convex subscriptions
- Use Convex's built-in capabilities (auth, file storage, search) where needed

### 4. Code Quality
- Write clean, maintainable TypeScript/React code
- Follow Convex best practices
- Add proper error handling and loading states
- Ensure type safety

**Remember: The result should be visually INDISTINGUISHABLE from the uploaded design files.**

Please begin by analyzing the specifications above and then recreate the design.`;

                      messageInputStore.set(enhancedPrompt);

                      toast.success(`Successfully analyzed ${uploadData.totalFiles} design files!`);
                      setIsDesignDialogOpen(false);
                      setSelectedFiles([]);
                    } catch (error) {
                      console.error('Error uploading design files:', error);
                      toast.error(error instanceof Error ? error.message : 'Failed to upload design files');
                    } finally {
                      setIsUploadingDesign(false);
                    }
                  }}
                  disabled={isUploadingDesign || selectedFiles.length === 0}
                  icon={isUploadingDesign ? <Spinner className="size-4" /> : undefined}
                >
                  {isUploadingDesign ? 'Analyzing...' : 'Upload & Analyze'}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* GitHub Import Dialog */}
      <Dialog.Root open={isGitHubDialogOpen} onOpenChange={setIsGitHubDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background-primary border border-border-primary rounded-lg shadow-lg p-6 w-full max-w-md z-50">
            <Dialog.Title className="text-lg font-semibold mb-4">Load from GitHub</Dialog.Title>
            <Dialog.Description className="text-sm text-content-secondary mb-4">
              Enter a GitHub repository URL to import code. Chef will analyze the code structure and create appropriate Convex tables.
            </Dialog.Description>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="github-url" className="block text-sm font-medium mb-2">
                  GitHub Repository URL
                </label>
                <input
                  id="github-url"
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-3 py-2 border border-border-primary rounded-md bg-background-secondary text-content-primary placeholder-content-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isImporting}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isImporting) {
                      handleGitHubImport();
                    }
                  }}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="neutral"
                  onClick={() => {
                    setIsGitHubDialogOpen(false);
                    setGithubUrl('');
                  }}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGitHubImport}
                  disabled={isImporting || !githubUrl.trim()}
                  icon={isImporting ? <Spinner className="size-4" /> : undefined}
                >
                  {isImporting ? 'Importing...' : 'Import'}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
});

const TextareaWithHighlights = memo(function TextareaWithHighlights({
  onKeyDown,
  onChange,
  value,
  minHeight,
  maxHeight,
  placeholder,
  disabled,
  highlights,
}: {
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  value: string;
  chatStarted: boolean;
  placeholder: string;
  disabled: boolean;
  minHeight: number;
  maxHeight: number;
  highlights: Highlight[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Textarea auto-sizing
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  const blocks = useMemo(() => {
    const pattern = highlights
      .map((h) => h.text) // we assume text doesn’t contain special characters
      .join('|');
    const regex = new RegExp(pattern, 'gi');

    return Array.from(value.matchAll(regex)).map((match) => {
      const pos = match.index;
      return {
        from: pos,
        length: match[0].length,
        tip: highlights.find((h) => h.text === match[0].toLowerCase())!.tooltip,
      };
    });
  }, [highlights, value]);

  return (
    <div className="relative overflow-y-auto" style={{ minHeight, maxHeight }}>
      <textarea
        ref={textareaRef}
        className={classNames(
          'w-full px-3 py-3 outline-none resize-none text-content-primary placeholder-content-tertiary bg-transparent text-sm leading-snug',
          'transition-opacity',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'scrollbar-thin scrollbar-thumb-macosScrollbar-thumb scrollbar-track-transparent',
        )}
        disabled={disabled}
        onKeyDown={onKeyDown}
        onChange={onChange}
        value={value}
        style={{ minHeight }}
        placeholder={placeholder}
        translate="no"
        // Disable Grammarly
        data-gramm="false"
      />

      <HighlightBlocks textareaRef={textareaRef} text={value} blocks={blocks} />
    </div>
  );
});

const HighlightBlocks = memo(function HighlightBlocks({
  text,
  blocks,
  textareaRef,
}: {
  text: string;
  blocks: {
    from: number;
    length: number;
    tip: ReactNode;
  }[];
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [forceRerender, setForceRerender] = useState(0);

  const [blockPositions, setBlockPositions] = useState<
    {
      top: number;
      left: number;
      width: number;
      height: number;
      tip: ReactNode;
    }[]
  >([]);

  // Rerender on textarea resize
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      throw new Error('Textarea not found');
    }

    const resizeObserver = new ResizeObserver(() => {
      setForceRerender((prev) => prev + 1);
    });
    resizeObserver.observe(textarea);
    return () => resizeObserver.disconnect();
  }, [textareaRef]);

  useLayoutEffect(() => {
    if (blocks.length === 0) {
      return;
    }

    const mirror = mirrorRef.current;
    if (!mirror) {
      throw new Error('Mirror not found');
    }

    const wrapperRect = mirror.getBoundingClientRect();

    const positions = blocks.flatMap((block) => {
      const range = document.createRange();
      range.setStart(mirror.firstChild!, block.from);
      range.setEnd(mirror.firstChild!, block.from + block.length);

      const result: typeof blockPositions = [];
      for (const rect of range.getClientRects()) {
        result.push({
          top: rect.top - wrapperRect.top + mirror.scrollTop,
          left: rect.left - wrapperRect.left + mirror.scrollLeft,
          width: rect.width,
          height: rect.height,
          tip: block.tip,
        });
      }
      return result;
    });
    setBlockPositions(positions);
  }, [blocks, textareaRef, forceRerender]);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div>
      <div
        ref={mirrorRef}
        className="pointer-events-none absolute inset-0 -z-20 whitespace-pre-wrap break-words p-3 text-sm leading-snug opacity-0"
        aria-hidden
      >
        {text}
      </div>

      <div>
        {blockPositions.map((block, index) => (
          <HighlightTooltip key={index} {...block} />
        ))}
      </div>
    </div>
  );
});

const HighlightTooltip = memo(function HighlightTooltip({
  tip,
  width,
  height,
  top,
  left,
}: {
  tip: ReactNode;
  width: number;
  height: number;
  top: number;
  left: number;
}) {
  return (
    <div
      className="absolute flex overflow-hidden bg-[#f8d077] mix-blend-color"
      style={{
        width,
        height,
        top,
        left,
      }}
    >
      <Tooltip className="absolute inset-0" tip={tip}>
        {null}
      </Tooltip>
    </div>
  );
});

const NewLineShortcut = memo(function NewLineShortcut() {
  return (
    <div className="text-xs text-content-tertiary">
      <KeyboardShortcut value={['Shift', 'Return']} className="mr-0.5 font-semibold" /> for new line
    </div>
  );
});

const CharacterWarning = memo(function CharacterWarning() {
  return (
    <Tooltip
      tip="Chef performs better with shorter prompts. Consider making your prompt more concise or breaking it into smaller chunks."
      side="bottom"
    >
      <div className="flex cursor-help items-center text-xs text-content-warning">
        <ExclamationTriangleIcon className="mr-1 size-4" />
        Prompt exceeds {PROMPT_LENGTH_WARNING_THRESHOLD.toLocaleString()} characters
      </div>
    </Tooltip>
  );
});

const SignInButton = memo(function SignInButton() {
  const { signIn } = useAuth();

  return (
    <Button
      variant="neutral"
      onClick={() => {
        void signIn();
      }}
      size="xs"
      className="text-xs font-normal"
      icon={<img className="size-4" src="/icons/Convex.svg" alt="Convex" />}
    >
      <>
        <span>Sign in</span>
      </>
    </Button>
  );
});

/**
 * Debounced function to cache the prompt in cookies.
 * Caches the trimmed value of the textarea input after a delay to optimize performance.
 */
const cachePrompt = debounce(function cachePrompt(prompt: string) {
  Cookies.set(PROMPT_COOKIE_KEY, prompt.trim(), { expires: 30 });
}, 1000);

function TooltipLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-content-link hover:underline">
      {children}
    </a>
  );
}
