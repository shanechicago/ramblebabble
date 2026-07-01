import type {
  AIProvider,
  CleanupInput,
  CleanupResult,
  TranscribeInput,
} from "./types";
import { openAIProvider } from "./openai";
import { anthropicProvider } from "./anthropic";

// Provider registry.
//
// Transcription ALWAYS uses OpenAI Whisper. Cleanup goes to the provider named
// by CLEANUP_PROVIDER (default "anthropic" — Claude is stronger at humor, voice,
// and personas). getProvider() returns a composite that routes each half to the
// right engine, so the API routes keep calling .transcribe()/.cleanup() exactly
// as before. To roll cleanup back to OpenAI instantly, set CLEANUP_PROVIDER=openai.
const CLEANUP_PROVIDERS: Record<string, AIProvider> = {
  openai: openAIProvider,
  anthropic: anthropicProvider,
};

function getCleanupProvider(): AIProvider {
  const name = (process.env.CLEANUP_PROVIDER || "anthropic").toLowerCase();
  const provider = CLEANUP_PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unknown CLEANUP_PROVIDER "${name}".`);
  }
  return provider;
}

export function getProvider(): AIProvider {
  const cleanupProvider = getCleanupProvider();
  return {
    name: `transcribe:openai+cleanup:${cleanupProvider.name}`,
    transcribe: (input: TranscribeInput): Promise<string> =>
      openAIProvider.transcribe(input),
    cleanup: (input: CleanupInput): Promise<CleanupResult> =>
      cleanupProvider.cleanup(input),
  };
}

export type { AIProvider } from "./types";
