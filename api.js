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

const {
  castContent,
  repeatContent,
  generateContent,
  interpret,
  ContextManager,
  RequestHandler,
  RequestObject,
  RequestContextObject,
  ResponseHandler,
  ResponseObject,
  ResponseMetadataObject,
  ExceptObject,
  ExceptHandler
} = require('./lib')

/**
 * Register an HTTP call to an HTTP handler.
 *
 * @param {ContentBuilder} builder Instance of content builder
 * @param {any} api Instance of initialized API
 * @param {CallableFunction?} callback Optional callback
 * @return void
 */
function registerHttpCall (builder, api, callback) {
  api[builder.request.method](builder.request.route, (req, res) => {
    const freshContent = builder.generate(req)
    if (callback instanceof Function) {
      callback(new Date(), freshContent, req, res)
    }
    const { code, headers, content } = freshContent
    res.set(headers).status(code).json(content)
  })
}

/**
 * Incoming Request Object Interface.
 *
 * @type {{
 *  params: Record<string, string>,
 *  query: Record<string, string|string[]>,
 *  headers: Record<string, string>,
 *  body: any
 * }}
 */
const IncomingRequestObject = {
  params: {
    string: 'string'
  },
  query: {
    string: 'string | string[]'
  },
  headers: {
    string: 'string'
  },
  body: 'string | object'
}

/**
 * Outgoing Response Object Interface.
 *
 * @type {{
 *  flow: string?,
 *  code: string,
 *  headers: Record<string, string>,
 *  content: any
 * }}
 */
const OutgoingResponseObject = {
  flow: 'string | null',
  code: 'string',
  headers: {
    string: 'string'
  },
  content: 'string | object | string[] | object[]'
}

/**
 * Content builder is a helper class to manage the API response based on
 * incoming requests while respecting the samplests provided by the user
 * as contracts.
 */
class ContentBuilder {
  /**
   * Initialize content builder.
   *
   * @param {{
   *  request: RequestObject,
   *  response: ResponseObject
   *  except: ExceptObject?
   * }} content
   */
  constructor ({ request, response, except = null }) {
    this.request = new RequestHandler(request)
    this.response = new ResponseHandler(response)
    this.except = except && new ExceptHandler(except)
  }

  /**
   * Refresh the response content and response headers.
   *
   * @param {IncomingRequestObject} req The incoming HTTP request
   * @returns {OutgoingResponseObject}
   */
  generate (req) {
    const ctx = this._buildRequestContext(req)

    if (this.except instanceof ExceptHandler) {
      const except = this._validateExceptions(ctx)
      if (except !== null) {
        return this._generateResponse(ctx, except.response, except.assertion)
      }
    }

    return this._generateResponse(ctx, this.response, null)
  }

  /**
   * Generate OutgoingResponseObject from context and response object.
   *
   * @param {RequestContextObject} ctx Current request context
   * @param {ResponseObject} res The response object to process
   * @param {string?} flow Optional text to annouce a scenario
   * @returns {OutgoingResponseObject}
   */
  _generateResponse (ctx, res, flow) {
    const content = this._processContent(JSON.stringify(res.data), ctx)

    return {
      code: res.code,
      headers: this._processHeaders(JSON.stringify(res.headers), ctx),
      content: this._postprocessContent(content, { ...res.$data }),
      flow
    }
  }

  /**
   * Validate current incoming request against exception cases.
   *
   * @param {RequestContextObject} ctx The request context
   * @returns {ResponseObject?}
   */
  _validateExceptions (ctx) {
    for (const [assertion, caseObject] of Object.entries(this.except.cases)) {
      const { validate, response } = caseObject
      for (const T of validate) {
        const fn = Function('process', 'require', // mockup JS functionalities
            `"use strict"; return ({ route, query, headers, payload }) => ${T}`)
        const rs = fn()(ctx)
        if (rs === undefined) {
          continue // NOTE: Allow the user to skip optional validations...
        } else if (rs !== true) {
          if (!response.headers) {
            response.headers = {}
          }
          Object.assign(response.headers, { 'X-Assertion': assertion })
          return { assertion, response }
        }
      }
    }

    return null
  }

  /**
   * Build current context for incoming HTTP request.
   *
   * @param {IncomingRequestObject} req The incoming HTTP request
   * @returns {RequestContextObject}
   */
  _buildRequestContext (req) {
    return {

      // Inherit from request spec
      route: Object.assign({}, req.params),
      query: Object.assign({}, this.request.query, req.query),
      headers: Object.assign({}, this.request.headers, req.headers),
      payload: Object.assign({}, this.request.payload, req.body),

      // Internals
      time: new Date().getTime().toFixed(0)
    }
  }

  /**
   * Process response headers with given context.
   *
   * @param {string} rawHeaders The raw headers to process
   * @param {RequestContextObject} ctx The current context
   * @returns {Record<string, string>}
   */
  _processHeaders (rawHeaders, ctx) {
    /**
     * @param {string} text
     */
    const fn = (text) => interpret(fake(text), ctx, true)
    if (rawHeaders) {
      return generateContent(rawHeaders, fn)
    }

    return {}
  }

  /**
   * Process response content with given context.
   *
   * @param {string} rawContent The raw content to process
   * @param {RequestContextObject} ctx The current context
   * @returns {any}
   */
  _processContent (rawContent, ctx) {
    /**
     * @param {string} text
     */
    const fn = (text) => interpret(fake(text), ctx)

    return generateContent(rawContent, fn)
  }

  /**
   * Get new response data after all metadata have been processed.
   *
   * @param {any} content Content after it has been generated
   * @param {ResponseMetadataObject} _ Options to apply on content
   * @returns {any}
   */
  _postprocessContent (content, { cast, repeat }) {
    if (repeat && Array.isArray(content)) {
      content = repeatContent(content, repeat)
    }

    if (cast) {
      const cm = new ContextManager(content)
      for (const [field, type] of Object.entries(cast)) {
        cm.set(field, (data) => castContent(type, data))
      }
    }

    return content
  }
}

module.exports = { registerHttpCall, ContentBuilder }
