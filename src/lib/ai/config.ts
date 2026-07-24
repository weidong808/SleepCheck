// Runtime configuration for the optional AI story feature.
// The feature is disabled unless an API key is present, so the app degrades
// gracefully (and the UI hides the entry point) when unconfigured.

export type StoryConfig = {
  configured: boolean;
  apiKey: string;
  model: string;
  baseUrl: string;
};

export function getStoryConfig(): StoryConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const disabled = process.env.STORY_AI_DISABLED === "1";
  return {
    configured: apiKey.length > 0 && !disabled,
    apiKey,
    model: process.env.STORY_AI_MODEL?.trim() || "gpt-4o-mini",
    baseUrl:
      process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1",
  };
}
