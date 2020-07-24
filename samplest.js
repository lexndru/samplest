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

const { fake } = require('faker')

/**
 * Probe the request & response and the rules of validation between them.
 *
 * @param {{ 
 *  request: RequestObject, 
 *  response: ResponseObject, 
 *  rules: RulesObject 
 * }} fileContent Key components of a samplest
 * @returns {{
 *  request: RequestHandler,
 *  response: ResponseHandler,
 *  rules: RulesHandler?
 * }}
 */
function probe ({ request, response, rules }) {
    return {
        request: new RequestHandler(request),
        response: new ResponseHandler(response),
        rules: rules ? new RulesHandler(rules) : null
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
 *  $query: object,
 *  $payload: object,
 *  $headers: object
 * }}
 */
const RequestObject = {
    "route": "endpoint with optional {placeholder(s)}",
    "method": "get | post | put | delete",
    "query": {
        "param1": "value or {placeholder}",
        "param2": ["value", "{placeholder}"],
    },
    "$query": {
        "param1": "string | array | required",
        "param2": "string | array | required",
    },
    "payload": {
        "field1": "value or {placeholder}",
        "field2": "value or {placeholder}",
    },
    "$payload": {
        "field1": "string | number | boolean | array | object | required",
        "field2": "string | number | boolean | array | object | required",
    },
    "headers": {
        "X-Some-Header1": "value or {placeholder}",
        "X-Some-Header2": "value or {placeholder}",
    },
    "$headers": {
        "X-Some-Header1": "required",
    }
}

/**
 * Request object handler performs first-level validations for user errors
 * and extracts required fields to launch the API server (e.g. routes). It
 * also encapsulates all request-related content for later use by the REST
 * API generator.
 */
class RequestHandler {

    /**
     * Initialize request handler.
     *
     * @param {RequestObject} r The request object to handle
     */
    constructor ({
        route, method, headers, query, payload, $headers, $query, $payload
    }) {
        this.route = this.validateHttpRoute(route)
        this.method = this.validateHttpRouteMethod(method)
        this.query = query
        this.$query = $query
        this.headers = this.validateHeaders(headers)
        this.$headers = $headers
        this.payload = this.validatePayload(payload)
        this.$payload = $payload
    }

    /**
     * Check if the request headers are correct.
     *
     * @param {object} headers The headers to validate
     * @throws {Error} Duplicated headers not allowed
     * @returns {object}
     */
    validateHeaders (headers) {
        const lowercaseHeaders = {}
        if ( ! headers) {
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

    /**
     * Check if the request payload has a correct format.
     *
     * @param {object} payload The payload to validate
     * @throws {Error} Unsupported request payload as array
     * @returns {object}
     */
    validatePayload (payload) {
        if (payload && Array.isArray(payload)) {
            throw new Error('Unsupported request payload as array')
        }

        return payload
    }

    /**
     * Check if the request endpoint is set.
     *
     * @param {string} route The route to validate
     * @throws {Error} Request route must be a non-empty string
     * @returns {string}
     */
    validateHttpRoute (route) {
        if ( ! route || route.trim().length === 0) {
            throw new Error(`Request route must be a non-empty string`)
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
        if (RequestHandler.HTTP_VERBS.indexOf(method.toUpperCase()) === -1) {
            throw new Error(`Unsupported request HTTP method: ${method}`)
        }

        return method
    }

    /**
     * Supported HTTP verbs.
     *
     * @type {string[]}
     */
    static get HTTP_VERBS () {
        return ['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    }
}

/**
 * Response Object Interface.
 *
 * @type {{
 *  code: string,
 *  headers: object,
 *  data: object|object[]|string,
 *  $data: object
 * }}
 */
const ResponseObject = {
    "code": "valid HTTP status code",
    "headers": {
        "Powered-By": "Samplest"
    },
    "data": {
        "id": "generated value or {placeholder}",
        "username": "generated value or {placeholder}",
        "books": [
            "generated value 1",
            "generated value 2"
        ]
    },
    "$data": {
        "id": "number",
        "books": "array repeat:20"
    }
}

/**
 * Response object handler performs first-level validations for user errors
 * and evaluates placeholders used in "headers" or "data", according to the
 * metafield configuration ($data).
 */
class ResponseHandler {

    /**
     * Initialize response handler.
     *
     * @param {ResponseObject} r The response object to handle
     */
    constructor ({ code, headers, data, $data }) {
        this.code = this.validateStatusCode(code)
        this.headers = headers
        this.data = data
        this.$data = $data
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
    "Assert message goes here": [
        "first function body to test",
        "second function body to test"
    ],
    "Client must implement samplest request!": [
        "route.length > 0",
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
const RequestContext = {
    "route": {
        "username": "lexndru",
    },
    "query": {
        "per_page": "10",
        "limit": "50", 
    },
    "headers": {
        "X-Header1": "abc",
        "X-Header2": "def",
    },
    "payload": {
        "projectName": "samplest",
        "projectDesc": "mockup api from cli",
    }
}

/**
 * Lookup and return the value of a field from an object.
 *
 * @param {any} heystack The object as heystack
 * @param {string[]} fields The needle to lookup
 * @returns {string|null}
 */
function lookup (heystack, ...fields) {
    if (fields.length > 0) {
        const key = (fields.shift() || '').toLowerCase()
        if (heystack.hasOwnProperty(key)) {
            const value = heystack[key]
            if (typeof value === 'object' && value.constructor === Object) {
                return lookup(value, ...fields)
            } else {
                return value.toString()
            }
        }
    }

    return null
}

/**
 * Capture all placeholders from content.
 *
 * @param {string} content The content to parse
 * @returns {Generator}
 */
function * capture (content) {
    let placeholder

    const regex = /\{{1}([a-z0-9\.\-]+)\}{1}/ig
    while ((placeholder = regex.exec(content)) !== null) {
        yield placeholder[1]
    }
}

/**
 * Interpret a given string to generate content from context.
 *
 * @param {string} text The string to interpret
 * @param {RequestContext} ctx The available context
 * @returns {string}
 */
function interpret (text, ctx) {
    for (const variable of capture(text)) {
        const value = lookup(ctx, ...variable.split('.'))
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
 * @param {RequestContext} ctx Context
 * @returns {string|string[]|object|object[]}
 */
function generateContent (data, ctx) {
    const content = JSON.parse(data)
    if (Array.isArray(content)) {
        for (let i = 0; i < content.length; i++) {
            content[i] = generateContent(JSON.stringify(content[i]), ctx)
        }

        return content
    } else if (typeof content === 'object' && content.constructor === Object) {
        Object.entries(content).forEach(([k, v]) => {
            content[k] = generateContent(JSON.stringify(v), ctx)
        })

        return content
    }

    return interpret(fake(content.toString()), ctx)
}

module.exports = { probe, generateContent }
