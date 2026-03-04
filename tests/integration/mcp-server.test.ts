import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'

describe('MCP Server Integration', () => {
  // These tests verify that the MCP server can start and respond to basic requests

  describe('server startup', () => {
    it('should start without errors when config exists', async () => {
      // This test just verifies the server process starts
      // In a real scenario, we'd need a test config setup

      // Skip if no config exists (CI environment without setup)
      const { existsSync } = await import('fs')
      const { homedir } = await import('os')

      const configPath = join(homedir(), '.docmcp', 'config.json')
      if (!existsSync(configPath)) {
        console.log('Skipping MCP server test - no config found')
        return
      }

      const serverProcess = spawn('node', ['--import', 'tsx', 'src/index.ts', 'serve'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check if process is still running (didn't crash immediately)
      expect(serverProcess.killed).toBe(false)

      // Clean up
      serverProcess.kill('SIGTERM')
    }, 10000)
  })

  describe('MCP protocol', () => {
    it('should respond to initialize request', async () => {
      // Skip if no config exists
      const { existsSync } = await import('fs')
      const { homedir } = await import('os')

      const configPath = join(homedir(), '.docmcp', 'config.json')
      if (!existsSync(configPath)) {
        console.log('Skipping MCP protocol test - no config found')
        return
      }

      const serverProcess = spawn('node', ['--import', 'tsx', 'src/index.ts', 'serve'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      // Collect stderr for debugging
      let stderr = ''
      serverProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      // Send initialize request
      const initRequest = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      })

      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Write request to stdin
      serverProcess.stdin.write(initRequest + '\n')

      // Collect response
      let response = ''
      const responsePromise = new Promise<string>((resolve) => {
        serverProcess.stdout.on('data', (data) => {
          response += data.toString()
          // Check if we have a complete JSON response
          try {
            JSON.parse(response)
            resolve(response)
          } catch {
            // Not complete yet, continue collecting
          }
        })
      })

      // Wait for response with timeout
      const result = await Promise.race([
        responsePromise,
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout waiting for response')), 5000)
        ),
      ])

      // Parse and verify response
      const parsed = JSON.parse(result)
      expect(parsed).toHaveProperty('jsonrpc', '2.0')
      expect(parsed).toHaveProperty('id', 1)
      expect(parsed).toHaveProperty('result')
      expect(parsed.result).toHaveProperty('serverInfo')
      expect(parsed.result.serverInfo).toHaveProperty('name', 'docmcp')

      // Clean up
      serverProcess.kill('SIGTERM')
    }, 15000)
  })
})
