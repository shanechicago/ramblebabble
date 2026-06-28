import type { AIProvider } from "./types";
import { openAIProvider } from "./openai";

// Provider registry. Swap or add providers here; the rest of the app calls
// getProvider() and never imports a vendor SDK directly.
const PROVIDERS: Record<string, AIProvider> = {
  openai: openAIProvider,
};

export function getProvider(): AIProvider {
  const name = (process.env.AI_PROVIDER || "openai").toLowerCase();
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unknown AI_PROVIDER "${name}".`);
  }
  return provider;
}

export type { AIProvider } from "./types";
