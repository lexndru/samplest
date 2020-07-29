// Copyright (c) 2020 Alexandru Catrina <alex@codeissues.net>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
'use strict'

/**
 * Wildcard char to lookup any item from a dataset.
 *
 * @type {string}
 */
const WILDCARD = '*'

/**
 * Cast given field(s) into a datatype of user choice from a source.
 *
 * @param {string} type The datatype to cast into
 * @param {any} value The raw value to cast
 * @returns {number|boolean|string}
 */
function cast (type, value) {
  if (typeof value === 'undefined' || value === null) {
    return `<can't cast "${value}" as ${type}>`
  } else if (type === 'number') {
    const num = parseInt(value.toString(), 10)
    if (isNaN(num)) {
      return `<"${value}" is not a number>`
    }
    return num
  } else if (type === 'boolean') {
    if (value.toString().toLowerCase() === 'true') {
      return true
    } else if (value.toString().toLowerCase() === 'false') {
      return false
    } else {
      return `<"${value}" is not a boolean>`
    }
  } else if (type === 'string') {
    return value.toString()
  }

  throw new Error(`Unsupported cast type "${type}"`)
}

/**
 * Lookup and return the value of a field from a heystack.
 *
 * @param {any} source Heystack source pool
 * @param {string[]} fieldpath Needle to lookup
 * @returns {any}
 */
function lookup (source, fieldpath) {
  const field = fieldpath.shift()
  if (field === undefined) {
    return source
  }

  if (field === WILDCARD && Array.isArray(source)) {
    const dataset = []
    for (const each of source) {
      const value = lookup(each, [...fieldpath])
      if (value !== null) {
        dataset.push(value)
      }
    }
    return dataset
  }

  const results = source[field] || null // NOTE: avoid undefined
  if (results === null) {
    return null
  } else if (results.constructor === Object || Array.isArray(results)) {
    return lookup(results, fieldpath)
  } else {
    return results
  }
}

/**
 * Capture all placeholders from content.
 *
 * @param {string} content The content to parse
 * @returns {Generator}
 */
function * capture (content) {
  let placeholder

  const regex = /\{{1}([a-z0-9\.\-_]+)\}{1}/ig
  while ((placeholder = regex.exec(content)) !== null) {
    yield placeholder[1]
  }
}

/**
 * Interpret a given string to generate content from context.
 *
 * @param {string} text The string to interpret
 * @param {RequestContextObject} ctx The available context
 * @param {boolean} lower Optional flag to lowercase variable
 * @returns {string}
 */
function interpret (text, ctx, lower = false) {
  for (const variable of capture(text)) {
    const needle = lower ? variable.toLowerCase() : variable
    const value = lookup(ctx, needle.split('.'))
    if (value !== null) {
      text = text.replace(`{${variable}}`, value)
    }
  }

  return text
}

/**
 * Generate random content and interpret placeholders.
 *
 * @param {string} data Serialized data
 * @param {CallableFunction?} tf Callback to format text
 * @returns {string|string[]|object|object[]}
 */
function generateContent (data, tf = null) {
  const content = JSON.parse(data)
  if (Array.isArray(content)) {
    for (let i = 0; i < content.length; i++) {
      content[i] = generateContent(JSON.stringify(content[i]), tf)
    }

    return content
  } else if (typeof content === 'object' && content.constructor === Object) {
    Object.entries(content).forEach(([k, v]) => {
      content[k] = generateContent(JSON.stringify(v), tf)
    })

    return content
  }

  const textContent = content.toString()

  return tf instanceof Function ? tf(textContent) : textContent
}

/**
 * Base handler class, with basic validation methods for common fields
 * on both requests and responses.
 */
class CommonHandler {
  /**
   * Check if the HTTP headers are correct.
   *
   * @param {object} headers The headers to validate
   * @throws {Error} Duplicated headers not allowed
   * @returns {object}
   */
  validateHeaders (headers) {
    const lowercaseHeaders = {}
    if (!headers) {
      return lowercaseHeaders
    }

    for (const [k, v] of Object.entries(headers)) {
      const key = k.toLowerCase()
      if (key in lowercaseHeaders) {
        throw new Error(`Duplicated headers not allowed: ${k}/${key}`)
      }
      lowercaseHeaders[key] = v // NOTE: Element implicitly is any type?
    }

    return lowercaseHeaders
  }
}

/**
 * Request Object Interface.
 *
 * @type {{
 *  route: string,
 *  method: string,
 *  query: object,
 *  payload: object,
 *  headers: object,
 * }}
 */
const RequestObject = {
  route: 'endpoint with optional {placeholder(s)}',
  method: 'head | get | post | put | patch | delete',
  query: {
    param1: 'value or {placeholder}',
    param2: ['value', '{placeholder}']
  },
  payload: {
    field1: 'value or {placeholder}',
    field2: {
      subfield: 'value or {placeholder}'
    }
  },
  headers: {
    'X-Some-Header1': 'value or {placeholder}',
    'X-Some-Header2': 'value or {placeholder}'
  }
}

/**
 * Request object handler performs first-level validations for user errors
 * and extracts required fields to launch the API server (e.g. routes). It
 * also encapsulates all request-related content for later use by the REST
 * API generator.
 */
class RequestHandler extends CommonHandler {
  /**
   * Initialize request handler.
   *
   * @param {RequestObject} r The request object to handle
   */
  constructor ({ route, method, headers, query, payload }) {
    super()
    this.route = this.validateHttpRoute(route)
    this.method = this.validateHttpRouteMethod(method)
    this.query = this.validateQueryString(query)
    this.headers = this.validateHeaders(headers)
    this.payload = this.validatePayload(payload)
  }

  /**
     * Check if the query string is valid.
     *
     * @param {object} query The query string to validate
     * @throws {Error} Query string must be string or string[]
     * @returns {object}
     */
  validateQueryString (query) {
    if (query && typeof query === 'object' && query.constructor === Object) {
      Object.entries(query).forEach(([key, value]) => {
        if (!Array.isArray(value)) {
          value = [value]
        }
        for (const each of value) {
          if (each.toString() !== each) {
            throw new Error(`Query string "${key}" must be string or string[]`)
          }
        }
      })
    } else {
      throw new Error(`Request query must be object, got ${typeof query}`)
    }

    return query
  }

  /**
   * Check if the request payload has a correct format. It can either an
   * object with key-value pairs of information submitted as JSON object
   * or URL encoded equivalents; or a buffer submitted as string (base64
   * preferred, but limited to).
   *
   * @param {object|string} payload The payload to validate
   * @throws {Error} Request payload must be an object or a string
   * @returns {object|string}
   */
  validatePayload (payload) {
    if (typeof payload === 'object' && payload.constructor === Object) {
      return payload
    } else if (payload && payload.toString() === payload) {
      return payload
    }

    throw new Error('Request payload must be an object or a string')
  }

  /**
   * Check if the request endpoint is set.
   *
   * @param {string} route The route to validate
   * @throws {Error} Request route must be a non-empty string
   * @returns {string}
   */
  validateHttpRoute (route) {
    if (!route || route.trim().length === 0) {
      throw new Error('Request route must be a non-empty string')
    }

    return route
  }

  /**
   * Check if the request method is set to a supported RESTful verb.
   *
   * @param {string} method The HTTP method to validate
   * @throws {Error} Unsupported HTTP method
   * @returns {string}
   */
  validateHttpRouteMethod (method) {
    if (RequestHandler.HTTP_VERBS.indexOf(method.toLowerCase()) === -1) {
      throw new Error(`Unsupported request HTTP method: ${method}`)
    }

    return method.toLowerCase()
  }

  /**
   * Supported HTTP verbs.
   *
   * @type {string[]}
   */
  static get HTTP_VERBS () {
    return ['head', 'get', 'post', 'put', 'patch', 'delete']
  }
}

/**
 * Response Metadata Object Interface.
 *
 * @type {{
 *  cast: Record<string, string>,
 *  repeat: string
 * }}
 */
const ResponseMetadataObject = {
  cast: {
    id: 'number',
    'books.*': 'number'
  },
  repeat: '..20'
}

/**
 * Response Object Interface.
 *
 * @type {{
 *  code: string,
 *  headers: object,
 *  data: object|object[]|string|string[],
 *  $data: ResponseMetadataObject
 * }}
 */
const ResponseObject = {
  code: 'valid HTTP status code',
  headers: {
    'Powered-By': 'Samplest'
  },
  data: {
    id: 'generated value or {placeholder}',
    username: 'generated value or {placeholder}',
    books: [
      'generated value 1',
      'generated value 2'
    ]
  },
  $data: {
    cast: {
      'key from data': 'number | boolean | string (default)'
    },
    repeat: 'any positive number or [min..max]'
  }
}

/**
 * Response object handler performs first-level validations for user errors
 * and evaluates placeholders used in "headers" or "data", according to the
 * metafield configuration ($data).
 */
class ResponseHandler extends CommonHandler {
  /**
   * Initialize response handler.
   *
   * @param {ResponseObject} r The response object to handle
   */
  constructor ({ code, headers, data, $data }) {
    super()
    this.code = this.validateStatusCode(code)
    this.headers = this.validateHeaders(headers)
    this.data = data || null // NOTE: avoid undefined
    this.$data = this.validateMetadata($data)
  }

  static get CAST_OPTIONS () {
    return ['number', 'boolean', 'string']
  }

  /**
   * Check if the metadata fields are supported.
   *
   * @param {ResponseMetadataObject} $data The metadata to validate
   * @returns {object?}
   */
  validateMetadata ($data) {
    if ($data && typeof $data === 'object' && $data.constructor === Object) {
      const { cast, repeat } = $data
      if (cast && typeof cast === 'object') {
        this.validateMetadataCastTypes(cast)
      } else if (typeof cast !== 'undefined') {
        throw new Error('Cast must be a key-value object')
      }
      if (repeat && repeat.toString() === repeat) {
        this.validateMetadataRepeatOptions(repeat)
      } else if (typeof repeat !== 'undefined') {
        throw new Error('Repeat must be a string')
      }
    }

    return $data
  }

  /**
   * Helper method to validate metadata repeat options.
   *
   * @param {string} repeat The repeat formula as string
   * @throws {Error} Cannot use meta repeat on a non-array data
   * @throws {Error} Invalid repeat options: min(MIN) max(MAX)
   * @returns void
   */
  validateMetadataRepeatOptions (repeat) {
    if (!Array.isArray(this.data)) {
      throw new Error('Cannot use meta repeat on a non-array data')
    }

    let [min, max] = repeat.split('..', 2)
    min = min || this.data.length.toString()
    max = max || this.data.length.toString()

    const minValue = parseInt(min, 10)
    const maxValue = parseInt(max, 10)

    if (isNaN(minValue) || isNaN(maxValue)) {
      throw new Error(`Invalid repeat options: min(${min}) max(${max})`)
    }
  }

  /**
   * Helper method to validate metadata cast types.
   *
   * @param {Record<string, string>} cast Key-value pairs of properties
   * @throws {Error} Nothing to cast
   * @throws {Error} Unsupported cast type
   * @returns void
   */
  validateMetadataCastTypes (cast) {
    Object.keys(cast).forEach(key => {
      const value = lookup(this.data, key.split('.'))
      if (value === null) {
        throw new Error(`Nothing to cast on ${key}`)
      }
      if (ResponseHandler.CAST_OPTIONS.indexOf(cast[key]) === -1) {
        throw new Error(`Unsupported cast type: ${cast[key]}`)
      }
    })
  }

  /**
   * Check if the response code is an HTTP status code.
   *
   * @param {string} code The status code to validate
   * @throws {Error} Response HTTP status code invalid
   * @throws {Error} Unsupported response HTTP status code
   * @returns void
   */
  validateStatusCode (code) {
    const statusCode = parseInt(code.toString())
    if (isNaN(statusCode)) {
      throw new Error(`Response HTTP status code invalid: ${code}`)
    } else if (statusCode < 100 || statusCode > 599) {
      throw new Error(`Unsupported response HTTP status: ${statusCode}`)
    }

    return code
  }
}

/**
 * Rules Object Interface.
 *
 * @type {Record<string, string[]>}
 */
const RulesObject = {
  'Assert message goes here': [
    'first function body to test',
    'second function body to test'
  ],
  'Client must implement samplest request!': [
    'route.length > 0',
    "typeof payload.id !== 'undefined'",
    "headers['X-Custom-Field'] === 'encoded.secret'"
  ]
}

/**
 * Rules object handler (optional middleware) performs custom validation rules
 * as provided by the user. Upon failure, the API always returns a Bad Request
 * response with the assertion message.
 */
class RulesHandler {
  /**
   * Initialize rules handler.
   *
   * @param {RulesObject} rules The rules object to handle
   */
  constructor (rules) {
    this.rules = rules
  }

  // TODO: Implement Function() evaluator to assert validation rules...
}

/**
 * Incoming request context interface.
 *
 * @type {{
 *  route: object,
 *  query: object,
 *  headers: object,
 *  payload: object,
 * }}
 */
const RequestContextObject = {
  route: {
    username: 'lexndru'
  },
  query: {
    per_page: '10',
    limit: '50'
  },
  headers: {
    'X-Header1': 'abc',
    'X-Header2': 'def'
  },
  payload: {
    projectName: 'samplest',
    projectDesc: 'mockup api from cli'
  }
}

module.exports = {
  cast,
  generateContent,
  capture,
  interpret,
  lookup,
  RequestObject,
  RequestHandler,
  RequestContextObject,
  ResponseObject,
  ResponseMetadataObject,
  ResponseHandler,
  RulesObject,
  RulesHandler
}
