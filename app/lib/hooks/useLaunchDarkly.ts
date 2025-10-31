const flagDefaults: {
  maintenanceMode: boolean;
  showUsageAnnotations: boolean;
  recordRawPromptsForDebugging: boolean;
  maxCollapsedMessagesSize: number;
  maxRelevantFilesSize: number;
  minCollapsedMessagesSize: number;
  useGeminiAuto: boolean;
  notionClonePrompt: boolean;
  newChatFeature: boolean;
  minMessagesForNudge: number;
  enableResend: boolean;
  enableGpt5: boolean;
  useAnthropicFraction: number;
} = {
  maintenanceMode: false,
  showUsageAnnotations: false,
  recordRawPromptsForDebugging: false,
  maxCollapsedMessagesSize: 65536,
  maxRelevantFilesSize: 8192,
  minCollapsedMessagesSize: 8192,
  useGeminiAuto: false,
  notionClonePrompt: false,
  newChatFeature: false,
  minMessagesForNudge: 40,
  enableResend: false,
  enableGpt5: false,
  useAnthropicFraction: 1.0,
};

// Returns default flag values
// LaunchDarkly has been removed - this hook now returns static defaults
export function useLaunchDarkly() {
  return flagDefaults;
}
