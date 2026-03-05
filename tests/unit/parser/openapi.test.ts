import { describe, it, expect } from 'vitest'
import { isOpenAPISpec, extractOpenAPITitle, openAPIToMarkdown } from '../../../src/parser/openapi.js'

describe('isOpenAPISpec', () => {
  it('should detect OpenAPI 3.x spec', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
    })
    expect(isOpenAPISpec(spec)).toBe(true)
  })

  it('should detect Swagger 2.x spec', () => {
    const spec = JSON.stringify({
      swagger: '2.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
    })
    expect(isOpenAPISpec(spec)).toBe(true)
  })

  it('should return false for non-OpenAPI JSON', () => {
    const json = JSON.stringify({ name: 'test', value: 123 })
    expect(isOpenAPISpec(json)).toBe(false)
  })

  it('should return false for invalid JSON', () => {
    expect(isOpenAPISpec('not json')).toBe(false)
    expect(isOpenAPISpec('{invalid}')).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(isOpenAPISpec('')).toBe(false)
  })
})

describe('extractOpenAPITitle', () => {
  it('should extract title from info.title', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'My Cool API', version: '1.0.0' },
    })
    expect(extractOpenAPITitle(spec)).toBe('My Cool API')
  })

  it('should return default title when info.title is missing', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { version: '1.0.0' },
    })
    expect(extractOpenAPITitle(spec)).toBe('API Documentation')
  })

  it('should return default title for invalid JSON', () => {
    expect(extractOpenAPITitle('invalid')).toBe('API Documentation')
  })
})

describe('openAPIToMarkdown', () => {
  it('should convert basic OpenAPI spec to markdown', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: {
        title: 'Pet Store API',
        description: 'A sample API for pets',
        version: '1.0.0',
      },
      paths: {},
    })

    const markdown = openAPIToMarkdown(spec)

    expect(markdown).toContain('# Pet Store API (v1.0.0)')
    expect(markdown).toContain('A sample API for pets')
  })

  it('should include servers section', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      servers: [
        { url: 'https://api.example.com', description: 'Production' },
        { url: 'https://staging.example.com' },
      ],
    })

    const markdown = openAPIToMarkdown(spec)

    expect(markdown).toContain('## Base URLs')
    expect(markdown).toContain('`https://api.example.com`')
    expect(markdown).toContain('Production')
    expect(markdown).toContain('`https://staging.example.com`')
  })

  it('should convert endpoints to markdown', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {
        '/users': {
          get: {
            summary: 'Get all users',
            description: 'Returns a list of users',
            tags: ['Users'],
            responses: {
              '200': { description: 'Success' },
            },
          },
          post: {
            summary: 'Create user',
            responses: {
              '201': { description: 'Created' },
            },
          },
        },
      },
    })

    const markdown = openAPIToMarkdown(spec)

    expect(markdown).toContain('## Endpoints')
    expect(markdown).toContain('### GET /users')
    expect(markdown).toContain('**Get all users**')
    expect(markdown).toContain('Returns a list of users')
    expect(markdown).toContain('**Tags:** Users')
    expect(markdown).toContain('### POST /users')
    expect(markdown).toContain('**Create user**')
    expect(markdown).toContain('`200`: Success')
    expect(markdown).toContain('`201`: Created')
  })

  it('should handle parameters', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {
        '/users/{id}': {
          get: {
            summary: 'Get user by ID',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
                description: 'User ID',
              },
              {
                name: 'fields',
                in: 'query',
                schema: { type: 'string' },
              },
            ],
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    })

    const markdown = openAPIToMarkdown(spec)

    expect(markdown).toContain('**Parameters:**')
    expect(markdown).toContain('`id` (path, string)')
    expect(markdown).toContain('*(required)*')
    expect(markdown).toContain('User ID')
    expect(markdown).toContain('`fields` (query, string)')
  })

  it('should handle deprecated endpoints', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {
        '/old': {
          get: {
            deprecated: true,
            summary: 'Old endpoint',
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    })

    const markdown = openAPIToMarkdown(spec)

    expect(markdown).toContain('### GET /old (DEPRECATED)')
  })

  it('should convert schemas to markdown', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {},
      components: {
        schemas: {
          User: {
            type: 'object',
            description: 'A user in the system',
            required: ['id', 'email'],
            properties: {
              id: { type: 'string', description: 'Unique identifier' },
              email: { type: 'string', format: 'email' },
              name: { type: 'string' },
            },
          },
        },
      },
    })

    const markdown = openAPIToMarkdown(spec)

    expect(markdown).toContain('## Schemas')
    expect(markdown).toContain('### User')
    expect(markdown).toContain('A user in the system')
    expect(markdown).toContain('`id` (string)')
    expect(markdown).toContain('*(required)*')
    expect(markdown).toContain('Unique identifier')
    expect(markdown).toContain('`email` (string (email))')
  })

  it('should handle Swagger 2.x definitions', () => {
    const spec = JSON.stringify({
      swagger: '2.0',
      info: { title: 'Test', version: '1.0' },
      paths: {},
      definitions: {
        Pet: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
    })

    const markdown = openAPIToMarkdown(spec)

    expect(markdown).toContain('## Schemas')
    expect(markdown).toContain('### Pet')
    expect(markdown).toContain('`name` (string)')
  })

  it('should handle request body (OpenAPI 3.x)', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {
        '/users': {
          post: {
            summary: 'Create user',
            requestBody: {
              description: 'User to create',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: { '201': { description: 'Created' } },
          },
        },
      },
    })

    const markdown = openAPIToMarkdown(spec)

    expect(markdown).toContain('**Request Body:**')
    expect(markdown).toContain('User to create')
    expect(markdown).toContain('`application/json`')
  })

  it('should throw error for invalid JSON', () => {
    expect(() => openAPIToMarkdown('not json')).toThrow('Invalid JSON')
  })

  it('should handle enum types', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {},
      components: {
        schemas: {
          Status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending'],
          },
        },
      },
    })

    const markdown = openAPIToMarkdown(spec)

    expect(markdown).toContain('### Status')
    expect(markdown).toContain('`active`')
    expect(markdown).toContain('`inactive`')
    expect(markdown).toContain('`pending`')
  })

  it('should handle array types in schemas', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {},
      components: {
        schemas: {
          UserList: {
            type: 'object',
            properties: {
              users: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
    })

    const markdown = openAPIToMarkdown(spec)

    expect(markdown).toContain('`users` (array of string)')
  })
})
