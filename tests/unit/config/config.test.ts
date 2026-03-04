import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, rmSync, mkdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Mock the defaults module before importing config
const mockDataDir = join(tmpdir(), `docmcp-test-${Date.now()}`)

vi.mock('../../../src/config/defaults.js', () => ({
  getDefaultDataDir: () => mockDataDir,
  defaultConfig: () => ({
    version: 1,
    dataDir: mockDataDir,
    dbPath: join(mockDataDir, 'db', 'docs.db'),
    embedding: {
      provider: 'bm25only',
      dimensions: null,
    },
    crawler: {
      defaultDelay: 200,
      defaultConcurrency: 3,
      defaultMaxDepth: 10,
      userAgent: 'DocMCP/0.1.0',
    },
    search: {
      defaultLimit: 5,
      rrfK: 60,
    },
  }),
}))

// Import after mocking
import { loadConfig, saveConfig, initializeDataDir, clearConfigCache, isFirstRun } from '../../../src/config/config.js'

describe('config', () => {
  beforeEach(() => {
    clearConfigCache()
    if (existsSync(mockDataDir)) {
      rmSync(mockDataDir, { recursive: true })
    }
  })

  afterEach(() => {
    clearConfigCache()
    if (existsSync(mockDataDir)) {
      rmSync(mockDataDir, { recursive: true })
    }
  })

  describe('isFirstRun', () => {
    it('should return true when config does not exist', async () => {
      const result = await isFirstRun()
      expect(result).toBe(true)
    })

    it('should return false when config exists', async () => {
      // Create config directory and file
      mkdirSync(mockDataDir, { recursive: true })
      // Need a complete config structure
      const config = await loadConfig()
      await saveConfig(config)

      clearConfigCache()
      const result = await isFirstRun()
      expect(result).toBe(false)
    })
  })

  describe('loadConfig', () => {
    it('should return default config when no config file exists', async () => {
      const config = await loadConfig()

      expect(config).toHaveProperty('version', 1)
      expect(config).toHaveProperty('dataDir')
      expect(config).toHaveProperty('dbPath')
      expect(config).toHaveProperty('embedding')
      expect(config).toHaveProperty('crawler')
      expect(config).toHaveProperty('search')
    })

    it('should cache config after first load', async () => {
      const config1 = await loadConfig()
      const config2 = await loadConfig()

      expect(config1).toBe(config2)
    })

    it('should use fresh config after clearConfigCache', async () => {
      const config1 = await loadConfig()
      clearConfigCache()
      const config2 = await loadConfig()

      expect(config1).not.toBe(config2)
      expect(config1).toEqual(config2)
    })
  })

  describe('saveConfig', () => {
    it('should create config directory if it does not exist', async () => {
      const config = await loadConfig()
      await saveConfig(config)

      expect(existsSync(mockDataDir)).toBe(true)
    })

    it('should save config to JSON file', async () => {
      const config = await loadConfig()
      await saveConfig(config)

      const configPath = join(mockDataDir, 'config.json')
      expect(existsSync(configPath)).toBe(true)

      const savedContent = readFileSync(configPath, 'utf-8')
      const parsed = JSON.parse(savedContent)
      expect(parsed).toHaveProperty('version')
    })

    it('should set restrictive permissions on Unix', async () => {
      if (process.platform === 'win32') {
        return // Skip on Windows
      }

      const config = await loadConfig()
      await saveConfig(config)

      const configPath = join(mockDataDir, 'config.json')
      const stats = statSync(configPath)
      const mode = stats.mode & 0o777

      // Should be 0600 (owner read/write only)
      expect(mode).toBe(0o600)
    })
  })

  describe('initializeDataDir', () => {
    it('should create all required directories', async () => {
      await initializeDataDir(mockDataDir)

      expect(existsSync(mockDataDir)).toBe(true)
      expect(existsSync(join(mockDataDir, 'db'))).toBe(true)
      expect(existsSync(join(mockDataDir, 'models'))).toBe(true)
    })

    it('should set restrictive permissions on Unix', async () => {
      if (process.platform === 'win32') {
        return // Skip on Windows
      }

      await initializeDataDir(mockDataDir)

      const stats = statSync(mockDataDir)
      const mode = stats.mode & 0o777

      // Should be 0700 (owner read/write/execute only)
      expect(mode).toBe(0o700)
    })

    it('should not fail if directories already exist', async () => {
      await initializeDataDir(mockDataDir)
      await initializeDataDir(mockDataDir) // Second call should not throw

      expect(existsSync(mockDataDir)).toBe(true)
    })
  })
})
