/**
 * Security configuration for sensitive information filtering.
 * Extends the hardcoded patterns with user-defined custom patterns.
 */
export type SecurityConfig = {
  /** Additional regex patterns to match sensitive content in tool results and LLM output. */
  sensitivePatterns?: string[];
  /** Additional glob patterns to match sensitive file paths. */
  sensitivePaths?: string[];
};
