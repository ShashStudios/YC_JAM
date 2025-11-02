/**
 * Configuration for automated claim processing
 * Adjust these values based on your API rate limits
 */

export const ProcessorConfig = {
  /**
   * Maximum number of notes to process in parallel
   * - Set to 1 to avoid rate limits (recommended for free tier)
   * - Set to 2-3 if you have higher API limits
   * - Set to 5+ only if you have enterprise limits
   */
  MAX_CONCURRENCY: 3,

  /**
   * Delay in milliseconds between processing each note
   * - 0: No delay (faster but may hit rate limits)
   * - 5000: 5 second delay (recommended for free tier)
   * - 10000: 10 second delay (very safe)
   */
  INTER_NOTE_DELAY_MS: 5000,

  /**
   * Maximum number of retry attempts on rate limit errors
   * - 0: No retries
   * - 3: Retry up to 3 times (recommended)
   * - 5: Very persistent
   */
  MAX_RETRIES: 3,

  /**
   * Base delay for exponential backoff on retries (in milliseconds)
   * - Actual delays will be: baseDelay * 2^retryCount
   * - With 1000: delays are 2s, 4s, 8s
   * - With 2000: delays are 4s, 8s, 16s
   */
  RETRY_BASE_DELAY_MS: 1000,
};

/**
 * Get configuration summary
 */
export function getConfigSummary() {
  const estimatedNotesPerHour = Math.floor(
    3600000 / (60000 + ProcessorConfig.INTER_NOTE_DELAY_MS)
  ) * ProcessorConfig.MAX_CONCURRENCY;

  return {
    maxConcurrency: ProcessorConfig.MAX_CONCURRENCY,
    interNoteDelay: `${ProcessorConfig.INTER_NOTE_DELAY_MS / 1000}s`,
    maxRetries: ProcessorConfig.MAX_RETRIES,
    estimatedThroughput: `~${estimatedNotesPerHour} notes/hour`,
  };
}

