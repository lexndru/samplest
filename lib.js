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
  const cm = new ContextManager(ctx)
  for (const variable of capture(text)) {
    const needle = lower ? variable.toLowerCase() : variable
    const value = cm.get(needle)
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
 * Repeat the elements of a list by a fixed or random number from a range.
 *
 * @param {any[]} list Anything iterable
 * @param {string} formula Repeat formula to apply
 * @return {any[]}
 */
function repeatContent (list, formula) {
  let total

  if (formula.indexOf('..') > -1) {
    const [min, max] = formula.split('..', 2)
    const minValue = parseInt(min, 10) || list.length
    const maxValue = parseInt(max, 10) || list.length
    total = Math.floor(Math.random() * (maxValue - minValue + 1) + minValue)
  } else {
    total = parseInt(formula.toString(), 10)
  }

  const stack = new Array()
  for (let i = 0; i < total; i++) {
    stack.push(list)
  }

  return [].concat(...stack)
}

/**
 * Cast given field(s) into a datatype of user choice from a source.
 *
 * @param {string} type The datatype to cast into
 * @param {any} value The raw value to cast
 * @returns {number|boolean|string}
 */
function castContent (type, value) {
  if (typeof value === 'undefined' || value === null) {
    return `<cannot cast "${value}" as ${type}>`
  } else if (type === 'number') {
    const num = Number(value.toString())
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
 * The context manager is responsable to retrieve and change any existing or
 * non-existing information from a source of the user's choice. It is mostly
 * used by the content generator/interpretor.
 */
class ContextManager {
  /**
   * Initialize context manager.
   *
   * @param {object} src Source as context to manage
   */
  constructor (src) {
    this.ctx = src
  }

  /**
   * Shorthand method to get the content of a field.
   *
   * @param {string} field
   * @returns {any}
   */
  get (field) {
    return ContextManager.read(this.ctx, field.split('.'))
  }

  /**
   * Shorthand method to set the content for a field.
   *
   * @param {string} field
   * @param {any} data
   * @returns void
   */
  set (field, data) {
    ContextManager.write(this.ctx, field.split('.'), data)
  }

  /**
   * Lookup and retrieve the value of a field from a heystack.
   *
   * NOTE: *this* in static methods is not the reference variable,
   *       but instead it's the class itself...
   *
   * @param {any} source Heystack source pool
   * @param {string[]} fieldpath Needle to lookup
   * @returns {any}
   */
  static read (source, fieldpath) {
    const field = fieldpath.shift()
    if (field === undefined) {
      return source
    }

    if (field === WILDCARD && Array.isArray(source)) {
      const dataset = []
      for (const each of source) {
        const value = this.read(each, [...fieldpath])
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
      return this.read(results, fieldpath)
    } else {
      return results
    }
  }

  /**
   * Lookup and store the value of a field on a heystack.
   *
   * NOTE: *this* in static methods is not the reference variable,
   *       but instead it's the class itself...
   *
   * @param {any} source Heystack source
   * @param {string[]} fieldpath Needle to lookup
   * @param {CallableFunction} content Content callback
   * @returns any
   */
  static write (source, fieldpath, content) {
    const field = fieldpath.shift()
    if (field === undefined) {
      return content(source)
    } else {
      if (field === WILDCARD && Array.isArray(source)) {
        for (let i = 0; i < source.length; i++) {
          source[i] = this.write(source[i], [...fieldpath], content)
        }
      } else if (field in source) {
        source[field] = this.write(source[field], fieldpath, content)
      } else {
        source[field] = content(undefined)
      }
    }

    return source
  }
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
   * @returns {object?}
   */
  _validateHeaders (headers) {
    if (headers === undefined) {
      return {}
    }

    const lowercaseHeaders = {}
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
  constructor ({ method, route, headers, query, payload }) {
    super()
    this.method = this._validateHttpRouteMethod(method)
    this.route = this._validateHttpRoute(route)
    this.query = this._validateQueryString(query)
    this.headers = this._validateHeaders(headers)
    this.payload = this._validatePayload(payload)
  }

  /**
   * Check if the query string is valid.
   *
   * @param {object} query The query string to validate
   * @throws {Error} Query string must be string or string[]
   * @returns {object?}
   */
  _validateQueryString (query) {
    if (query === undefined) {
      return {}
    }

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
   * @returns {object|string|null}
   */
  _validatePayload (payload) {
    if (payload === undefined) {
      return null
    }

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
  _validateHttpRoute (route) {
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
  _validateHttpRouteMethod (method) {
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

  /**
   * String representation of RequestHandler instance.
   *
   * @returns {string}
   */
  toString () {
    return `${this.method.toUpperCase()} ${this.route}`
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
 *  $data: ResponseMetadataObject?
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
    this.code = this._validateStatusCode(code)
    this.headers = this._validateHeaders(headers)
    this.data = data || null // NOTE: avoid undefined
    this.$data = $data && this._validateMetadata($data)
  }

  /**
   * Supported cast options.
   *
   * @type {string[]}
   */
  static get CAST_OPTIONS () {
    return ['number', 'boolean', 'string']
  }

  /**
   * Check if the metadata fields are supported.
   *
   * @param {ResponseMetadataObject} $data The metadata to validate
   * @returns {ResponseMetadataObject?}
   */
  _validateMetadata ($data) {
    if ($data && typeof $data === 'object' && $data.constructor === Object) {
      const { cast, repeat } = $data
      if (cast && typeof cast === 'object') {
        this._validateMetadataCastTypes(cast)
      } else if (typeof cast !== 'undefined') {
        throw new Error('Cast must be a key-value object')
      }
      if (repeat && repeat.toString() === repeat) {
        this._validateMetadataRepeatOptions(repeat)
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
  _validateMetadataRepeatOptions (repeat) {
    if (!Array.isArray(this.data)) {
      throw new Error('Cannot use meta repeat on a non-array data')
    }

    if (repeat.indexOf('..') === -1) {
      const nth = parseInt(repeat, 10)
      if (isNaN(nth)) {
        throw new Error(`Invalid repeat number: ${repeat}`)
      }
    } else {
      let [min, max] = repeat.split('..', 2)
      min = min || this.data.length.toString()
      max = max || this.data.length.toString()

      const minValue = parseInt(min, 10)
      const maxValue = parseInt(max, 10)

      if (isNaN(minValue) || isNaN(maxValue)) {
        throw new Error(`Invalid repeat options: min(${min}) max(${max})`)
      }
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
  _validateMetadataCastTypes (cast) {
    if (this.data === null || typeof this.data !== 'object') {
      throw new Error('Casting works only with response data objects')
    }
    const ctx = new ContextManager(this.data)
    Object.keys(cast).forEach(key => {
      const value = ctx.get(key)
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
  _validateStatusCode (code) {
    const statusCode = parseInt(code.toString())
    if (isNaN(statusCode)) {
      throw new Error(`Response HTTP status code invalid: ${code}`)
    } else if (statusCode < 100 || statusCode > 599) {
      throw new Error(`Unsupported response HTTP status: ${statusCode}`)
    }

    return code
  }

  /**
   * String representation of ResponseHandler instance.
   *
   * @return {string}
   */
  toString () {
    return `${this.code}`
  }
}

/**
 * Except Case Object Interface.
 *
 * @type {{
 *  validate: string[],
 *  response: ResponseObject
 * }}
 */
const ExceptCaseObject = {
  validate: [
    'js code as one line of string',
    'js code as one line of string'
  ],
  response: {
    code: 'number',
    headers: {
      'X-Header': 'string'
    },
    data: 'string | string[] | object | object[]',
    $data: null
  }
}

/**
 * Except Object Interface.
 *
 * @type {Record<string, ExceptCaseObject>}
 */
const ExceptObject = {
  'Assert message goes here': {
    validate: [
      'first function body to test',
      'second function body to test'
    ],
    response: {
      code: '400',
      headers: {
        'X-Reject-Reason': 'Exception rule failure'
      },
      data: 'feedback message',
      $data: null
    }
  }
}

/**
 * Except object handler (optional middleware) performs custom tests as one
 * lines of JavaScript code, isolated from the rest of the application with
 * only the current context available to use as parameters. Upon failure it
 * overrides the response with the current exception's case.
 */
class ExceptHandler {
  /**
   * Initialize rules handler.
   *
   * @param {ExceptObject} except The exceptions to handle
   */
  constructor (except) {
    this.cases = this._validate(except)
  }

  /**
   * Check if the except cases object is properly formatted.
   *
   * @param {Record<string, ExceptCaseObject>} cases Except cases object to validate
   * @retusns {Record<string, ExceptCaseObject>}
   */
  _validate (cases) {
    if (cases && typeof cases === 'object' && cases.constructor === Object) {
      for (const [assertion, { validate, response }] of Object.entries(cases)) {
        if (!Array.isArray(validate) || validate.length === 0) {
          throw new Error(`Except case "${assertion}" field "validate" ` +
                `must be string[], got ${typeof validate}`)
        }
        for (let i = 0; i < validate.length; i++) {
          const test = validate[i]
          if (test.toString() !== test) {
            throw new Error(`Except case "${assertion}" field "validate" ` +
                `must be string on position ${i}, got ${typeof test} instead`)
          }
        }
        try {
          const rh = new ResponseHandler(response)
          if (!rh) {
            throw new Error('Failed to create response handler from except')
          }
        } catch (e) {
          throw new Error(`Except case "${assertion}" field "response" ` +
            `incompatible with Response Object Interface: ${e.message}`)
        }
      }
    }

    return cases
  }
}

/**
 * Incoming request context interface.
 *
 * @type {{
 *  time: string,
 *  route: object,
 *  query: object,
 *  headers: object,
 *  payload: object,
 * }}
 */
const RequestContextObject = {
  time: '0000000000',
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
  castContent,
  repeatContent,
  generateContent,
  capture,
  interpret,
  ContextManager,
  RequestObject,
  RequestHandler,
  RequestContextObject,
  ResponseObject,
  ResponseMetadataObject,
  ResponseHandler,
  ExceptObject,
  ExceptCaseObject,
  ExceptHandler
}
