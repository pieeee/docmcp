export {
  loadConfig,
  saveConfig,
  isFirstRun,
  initializeDataDir,
  clearConfigCache,
} from './config.js'
export type { Config, EmbeddingConfig, CrawlerConfig, SearchConfig } from './config.js'
export { defaultConfig, getDefaultDataDir, getDefaultDbPath } from './defaults.js'
export {
  detectProviders,
  getApiKeyForProvider,
  getRecommendedProvider,
  getDimensionsForProvider,
} from './detect.js'
export type { ProviderType, DetectedProviders } from './detect.js'
