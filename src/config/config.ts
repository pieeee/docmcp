import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'fs'
import { dirname, join } from 'path'
import type { ProviderType } from './detect.js'
import { defaultConfig, getDefaultDataDir } from './defaults.js'
import { getApiKeyForProvider, getDimensionsForProvider } from './detect.js'

export interface EmbeddingConfig {
  provider: ProviderType
  apiKey?: string
  modelPath?: string
  dimensions: number | null
}

export interface CrawlerConfig {
  defaultDelay: number
  defaultConcurrency: number
  defaultMaxDepth: number
  userAgent: string
}

export interface SearchConfig {
  defaultLimit: number
  rrfK: number
}

export interface Config {
  version: number
  dataDir: string
  dbPath: string
  embedding: EmbeddingConfig
  crawler: CrawlerConfig
  search: SearchConfig
}

let cachedConfig: Config | null = null

function getConfigPath(): string {
  return join(getDefaultDataDir(), 'config.json')
}

export async function isFirstRun(): Promise<boolean> {
  const configPath = getConfigPath()
  return !existsSync(configPath)
}

export async function loadConfig(): Promise<Config> {
  if (cachedConfig) return cachedConfig

  const configPath = getConfigPath()
  let config = defaultConfig()

  // Load saved config if it exists
  if (existsSync(configPath)) {
    try {
      const saved = JSON.parse(readFileSync(configPath, 'utf-8')) as Partial<Config>
      config = deepMerge(config, saved)
    } catch {
      // Ignore parse errors, use defaults
    }
  }

  // Override with environment variables (highest priority)
  const envApiKey = getApiKeyForProvider(config.embedding.provider)
  if (envApiKey) {
    config.embedding.apiKey = envApiKey
  }

  // Auto-detect provider from env if not explicitly configured
  if (config.embedding.provider === 'bm25only') {
    if (process.env.ANTHROPIC_API_KEY) {
      config.embedding.provider = 'anthropic'
      config.embedding.apiKey = process.env.ANTHROPIC_API_KEY
      config.embedding.dimensions = getDimensionsForProvider('anthropic')
    } else if (process.env.OPENAI_API_KEY) {
      config.embedding.provider = 'openai'
      config.embedding.apiKey = process.env.OPENAI_API_KEY
      config.embedding.dimensions = getDimensionsForProvider('openai')
    }
  }

  // Ensure dimensions match provider
  if (config.embedding.provider !== 'bm25only' && !config.embedding.dimensions) {
    config.embedding.dimensions = getDimensionsForProvider(config.embedding.provider)
  }

  cachedConfig = config
  return config
}

export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath()
  const dir = dirname(configPath)

  // Create directory if it doesn't exist
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  // Only save API key if it was manually entered (not from env)
  const configToSave = { ...config }
  const envKey = getApiKeyForProvider(config.embedding.provider)
  if (envKey && config.embedding.apiKey === envKey) {
    // Key matches env var, don't persist it
    configToSave.embedding = { ...config.embedding }
    delete configToSave.embedding.apiKey
  }

  writeFileSync(configPath, JSON.stringify(configToSave, null, 2))

  // Set restrictive permissions on config file (contains API keys)
  // Only on Unix-like systems - Windows handles permissions differently
  if (process.platform !== 'win32') {
    try {
      chmodSync(configPath, 0o600) // Owner read/write only
    } catch {
      // Ignore permission errors (e.g., on some network filesystems)
    }
  }

  cachedConfig = config
}

export async function initializeDataDir(dataDir: string): Promise<void> {
  const dirs = [dataDir, join(dataDir, 'db'), join(dataDir, 'models')]

  // Use restrictive permissions on Unix (owner only)
  const mode = process.platform !== 'win32' ? 0o700 : undefined

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode })
    }
  }
}

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target }

  for (const key in source) {
    const sourceValue = source[key]
    const targetValue = target[key]

    if (
      sourceValue !== undefined &&
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== undefined &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetValue as object,
        sourceValue as object
      )
    } else if (sourceValue !== undefined) {
      (result as Record<string, unknown>)[key] = sourceValue
    }
  }

  return result
}

export function clearConfigCache(): void {
  cachedConfig = null
}
