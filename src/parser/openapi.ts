/**
 * OpenAPI/Swagger spec to Markdown converter
 * Converts OpenAPI 3.x and Swagger 2.x specs into searchable markdown
 */

interface OpenAPISpec {
  openapi?: string
  swagger?: string
  info?: {
    title?: string
    description?: string
    version?: string
  }
  servers?: Array<{ url: string; description?: string }>
  paths?: Record<string, PathItem>
  components?: {
    schemas?: Record<string, SchemaObject>
  }
  definitions?: Record<string, SchemaObject> // Swagger 2.x
}

interface PathItem {
  summary?: string
  description?: string
  get?: Operation
  post?: Operation
  put?: Operation
  patch?: Operation
  delete?: Operation
  options?: Operation
  head?: Operation
}

interface Operation {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  parameters?: Parameter[]
  requestBody?: RequestBody
  responses?: Record<string, Response>
  deprecated?: boolean
}

interface Parameter {
  name: string
  in: 'query' | 'path' | 'header' | 'cookie'
  description?: string
  required?: boolean
  schema?: SchemaObject
  type?: string // Swagger 2.x
}

interface RequestBody {
  description?: string
  required?: boolean
  content?: Record<string, { schema?: SchemaObject }>
}

interface Response {
  description?: string
  content?: Record<string, { schema?: SchemaObject }>
  schema?: SchemaObject // Swagger 2.x
}

interface SchemaObject {
  type?: string
  format?: string
  description?: string
  properties?: Record<string, SchemaObject>
  items?: SchemaObject
  required?: string[]
  enum?: string[]
  $ref?: string
}

/**
 * Check if content is an OpenAPI/Swagger spec
 */
export function isOpenAPISpec(content: string): boolean {
  try {
    const json = JSON.parse(content)
    return !!(json.openapi || json.swagger)
  } catch {
    return false
  }
}

/**
 * Parse OpenAPI spec and extract title
 */
export function extractOpenAPITitle(content: string): string {
  try {
    const spec: OpenAPISpec = JSON.parse(content)
    return spec.info?.title || 'API Documentation'
  } catch {
    return 'API Documentation'
  }
}

/**
 * Convert OpenAPI/Swagger spec to Markdown
 */
export function openAPIToMarkdown(content: string): string {
  let spec: OpenAPISpec

  try {
    spec = JSON.parse(content)
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }

  const lines: string[] = []
  const isSwagger = !!spec.swagger

  // Title and description
  const title = spec.info?.title || 'API Documentation'
  const version = spec.info?.version || ''

  lines.push(`# ${title}${version ? ` (v${version})` : ''}`)
  lines.push('')

  if (spec.info?.description) {
    lines.push(spec.info.description)
    lines.push('')
  }

  // Servers (OpenAPI 3.x)
  if (spec.servers && spec.servers.length > 0) {
    lines.push('## Base URLs')
    lines.push('')
    for (const server of spec.servers) {
      lines.push(`- \`${server.url}\`${server.description ? ` - ${server.description}` : ''}`)
    }
    lines.push('')
  }

  // Endpoints
  if (spec.paths) {
    lines.push('## Endpoints')
    lines.push('')

    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const method of methods) {
        const operation = pathItem[method]
        if (!operation) continue

        lines.push(...formatEndpoint(method.toUpperCase(), path, operation, spec, isSwagger))
        lines.push('')
      }
    }
  }

  // Schemas/Definitions
  const schemas = spec.components?.schemas || spec.definitions
  if (schemas && Object.keys(schemas).length > 0) {
    lines.push('## Schemas')
    lines.push('')

    for (const [name, schema] of Object.entries(schemas)) {
      lines.push(...formatSchema(name, schema))
      lines.push('')
    }
  }

  return lines.join('\n')
}

function formatEndpoint(
  method: string,
  path: string,
  operation: Operation,
  spec: OpenAPISpec,
  _isSwagger: boolean
): string[] {
  const lines: string[] = []

  // Heading with method and path
  const deprecated = operation.deprecated ? ' (DEPRECATED)' : ''
  lines.push(`### ${method} ${path}${deprecated}`)
  lines.push('')

  // Summary and description
  if (operation.summary) {
    lines.push(`**${operation.summary}**`)
    lines.push('')
  }

  if (operation.description) {
    lines.push(operation.description)
    lines.push('')
  }

  // Tags
  if (operation.tags && operation.tags.length > 0) {
    lines.push(`**Tags:** ${operation.tags.join(', ')}`)
    lines.push('')
  }

  // Parameters
  if (operation.parameters && operation.parameters.length > 0) {
    lines.push('**Parameters:**')
    lines.push('')

    for (const param of operation.parameters) {
      const required = param.required ? ' *(required)*' : ''
      const type = param.schema?.type || param.type || 'any'
      const desc = param.description ? ` - ${param.description}` : ''
      lines.push(`- \`${param.name}\` (${param.in}, ${type})${required}${desc}`)
    }
    lines.push('')
  }

  // Request Body (OpenAPI 3.x)
  if (operation.requestBody) {
    lines.push('**Request Body:**')
    lines.push('')

    if (operation.requestBody.description) {
      lines.push(operation.requestBody.description)
      lines.push('')
    }

    if (operation.requestBody.content) {
      for (const [contentType, media] of Object.entries(operation.requestBody.content)) {
        lines.push(`Content-Type: \`${contentType}\``)
        if (media.schema) {
          lines.push('')
          lines.push('```json')
          lines.push(formatSchemaExample(media.schema, spec))
          lines.push('```')
        }
        lines.push('')
      }
    }
  }

  // Responses
  if (operation.responses) {
    lines.push('**Responses:**')
    lines.push('')

    for (const [code, response] of Object.entries(operation.responses)) {
      const desc = response.description || ''
      lines.push(`- \`${code}\`: ${desc}`)

      // Show response schema if available
      const schema = response.content?.['application/json']?.schema || response.schema
      if (schema) {
        const schemaDesc = formatSchemaInline(schema, spec)
        if (schemaDesc) {
          lines.push(`  - Schema: ${schemaDesc}`)
        }
      }
    }
    lines.push('')
  }

  return lines
}

function formatSchema(name: string, schema: SchemaObject): string[] {
  const lines: string[] = []

  lines.push(`### ${name}`)
  lines.push('')

  if (schema.description) {
    lines.push(schema.description)
    lines.push('')
  }

  if (schema.type === 'object' && schema.properties) {
    lines.push('**Properties:**')
    lines.push('')

    const required = new Set(schema.required || [])

    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const isRequired = required.has(propName) ? ' *(required)*' : ''
      const type = getSchemaType(propSchema)
      const desc = propSchema.description ? ` - ${propSchema.description}` : ''
      lines.push(`- \`${propName}\` (${type})${isRequired}${desc}`)
    }
  } else if (schema.enum) {
    lines.push(`**Enum values:** ${schema.enum.map(v => `\`${v}\``).join(', ')}`)
  } else {
    lines.push(`**Type:** ${getSchemaType(schema)}`)
  }

  return lines
}

function getSchemaType(schema: SchemaObject): string {
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop() || 'object'
    return refName
  }

  if (schema.type === 'array' && schema.items) {
    return `array of ${getSchemaType(schema.items)}`
  }

  let type = schema.type || 'any'
  if (schema.format) {
    type += ` (${schema.format})`
  }

  return type
}

function formatSchemaInline(schema: SchemaObject, spec: OpenAPISpec): string {
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop() || 'object'
    return `[${refName}](#${refName.toLowerCase()})`
  }

  if (schema.type === 'array' && schema.items) {
    return `array of ${formatSchemaInline(schema.items, spec)}`
  }

  return schema.type || 'object'
}

function formatSchemaExample(schema: SchemaObject, spec: OpenAPISpec): string {
  const example = generateExample(schema, spec, new Set())
  return JSON.stringify(example, null, 2)
}

function generateExample(
  schema: SchemaObject,
  spec: OpenAPISpec,
  seen: Set<string>
): unknown {
  // Handle $ref
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/', '').split('/')
    let refSchema: SchemaObject | undefined

    if (refPath[0] === 'components' && refPath[1] === 'schemas' && refPath[2]) {
      refSchema = spec.components?.schemas?.[refPath[2]]
    } else if (refPath[0] === 'definitions' && refPath[1]) {
      refSchema = spec.definitions?.[refPath[1]]
    }

    if (refSchema && !seen.has(schema.$ref)) {
      seen.add(schema.$ref)
      return generateExample(refSchema, spec, seen)
    }
    return {}
  }

  switch (schema.type) {
    case 'string':
      if (schema.enum) return schema.enum[0]
      if (schema.format === 'date') return '2024-01-01'
      if (schema.format === 'date-time') return '2024-01-01T00:00:00Z'
      if (schema.format === 'email') return 'user@example.com'
      if (schema.format === 'uri') return 'https://example.com'
      if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000'
      return 'string'

    case 'integer':
    case 'number':
      return 0

    case 'boolean':
      return true

    case 'array':
      if (schema.items) {
        return [generateExample(schema.items, spec, seen)]
      }
      return []

    case 'object':
    default:
      if (schema.properties) {
        const obj: Record<string, unknown> = {}
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = generateExample(propSchema, spec, seen)
        }
        return obj
      }
      return {}
  }
}
