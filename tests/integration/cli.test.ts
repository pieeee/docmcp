import { describe, it, expect } from 'vitest'
import { spawn } from 'child_process'

describe('CLI Integration', () => {
  const runCLI = (args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> => {
    return new Promise((resolve) => {
      const proc = spawn('node', ['--import', 'tsx', 'src/index.ts', ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('close', (code) => {
        resolve({ stdout, stderr, code })
      })

      // Timeout after 10 seconds
      setTimeout(() => {
        proc.kill()
        resolve({ stdout, stderr, code: null })
      }, 10000)
    })
  }

  describe('help and version', () => {
    it('should show help with --help flag', async () => {
      const result = await runCLI(['--help'])

      expect(result.stdout).toContain('docmcp')
      expect(result.stdout).toContain('Commands:')
      expect(result.code).toBe(0)
    })

    it('should show version with --version flag', async () => {
      const result = await runCLI(['--version'])

      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
      expect(result.code).toBe(0)
    })
  })

  describe('command parsing', () => {
    it('should show add command help', async () => {
      const result = await runCLI(['add', '--help'])

      expect(result.stdout).toContain('add')
      expect(result.stdout).toContain('url')
      expect(result.code).toBe(0)
    })

    it('should show list command help', async () => {
      const result = await runCLI(['list', '--help'])

      expect(result.stdout).toContain('list')
      expect(result.code).toBe(0)
    })

    it('should show remove command help', async () => {
      const result = await runCLI(['remove', '--help'])

      expect(result.stdout).toContain('remove')
      expect(result.code).toBe(0)
    })
  })

  describe('error handling', () => {
    it('should show error for invalid URL in add command', async () => {
      const result = await runCLI(['add', 'not-a-valid-url'])

      // Should fail with error message about invalid URL or not initialized
      expect(result.code).not.toBe(0)
    })

    it('should show error for unknown command', async () => {
      const result = await runCLI(['unknowncommand'])

      expect(result.stderr).toContain('unknown command')
      expect(result.code).not.toBe(0)
    })
  })
})
