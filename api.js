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

const { readFile, readdir } = require('fs')
const { join } = require('path')

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
  ResponseObject
} = require('./lib')

const { fake } = require('faker')
const Express = require('express')
const Body = require('body-parser')

/**
 * Read a file asynchrounously and return its content as string.
 *
 * @param {string} fp The absolute file path
 * @returns {Promise<string>} The content of the file
 */
function getFileContent (fp) {
  return new Promise((resolve, reject) => {
    readFile(fp, 'utf8', (err, data) => err ? reject(err) : resolve(data))
  })
}

/**
 * Iterate over a directory and retrieve a list of files.
 *
 * @param {string} dir The directory to scan
 * @returns {Promise<string[]>} List of files
 */
function getFilesFromDirectory (dir) {
  return new Promise((resolve, reject) => {
    readdir(dir, (err, data) => err ? reject(err) : resolve(data))
  })
}

/**
 * Scan a directory for JSON files and pair each file with its content.
 *
 * @param {string} dirpath The directory path
 * @returns {AsyncGenerator}
 */
async function * scanDirectory (dirpath) {
  const files = await getFilesFromDirectory(dirpath)
  for (const file of files) {
    if (file.endsWith('.json')) {
      const content = await getFileContent(join(dirpath, file))
      yield [file, JSON.parse(content)]
    }
  }
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
 *  code: string,
 *  headers: Record<string, string>,
 *  content: any
 * }}
 */
const OutgoingResponseObject = {
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
   * }} content
   */
  constructor ({ request, response }) {
    this.startTime = new Date().getTime()
    this.request = new RequestHandler(request)
    this.response = new ResponseHandler(response)
    this.responseHeadersCopy = JSON.stringify(this.response.headers)
    this.responseContentCopy = JSON.stringify(this.response.data)
    this.responseMetaOptions = { ...this.response.$data }
  }

  /**
   * Refresh the response content and response headers.
   *
   * @param {IncomingRequestObject} req The incoming HTTP request
   * @returns {OutgoingResponseObject}
   */
  refreshContent (req) {
    const ctx = this.buildRequestContext(req)

    const code = this.response.code
    const headers = this.processHeaders(this.responseHeadersCopy, ctx)
    const content = this.processContent(this.responseContentCopy, ctx)

    return {
      code,
      headers,
      content: this.postprocessContent(content)
    }
  }

  /**
   * Build current context for incoming HTTP request.
   *
   * @param {IncomingRequestObject} req The incoming HTTP request
   * @returns {RequestContextObject}
   */
  buildRequestContext (req) {
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
  processHeaders (rawHeaders, ctx) {
    const headers = {
      'X-Powered-By': 'samplest',
      'X-Uptime': `${new Date().getTime() - this.startTime} seconds`
    }

    /**
     * @param {string} text
     */
    const fn = (text) => interpret(fake(text), ctx, true)
    if (rawHeaders) {
      Object.assign(headers, generateContent(rawHeaders, fn))
    }

    return headers
  }

  /**
   * Process response content with given context.
   *
   * @param {string} rawContent The raw content to process
   * @param {RequestContextObject} ctx The current context
   * @returns {any}
   */
  processContent (rawContent, ctx) {
    /**
     * @param {string} text
     */
    const fn = (text) => interpret(fake(text), ctx)

    return generateContent(rawContent, fn)
  }

  /**
   * Get new response data after all metadata have been processed.
   *
   * @param {any} content
   * @returns {any}
   */
  postprocessContent (content) {
    const { cast, repeat } = this.responseMetaOptions

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

/**
 * Start a development API from samplests.
 *
 * @param {string} dir The path to directory
 * @param {string} host The hostname to bind
 * @param {string} port The port to listen
 * @returns {Promise<void>}
 */
async function serve (dir, host, port) {
  const api = Express()
  api.use(Body.json())
  api.use(Body.urlencoded({ extended: true }))
  api.use(Body.text())

  for await (const [file, content] of scanDirectory(dir)) {
    const cb = new ContentBuilder(content)
    api[cb.request.method](cb.request.route, (req, res) => {
      const { code, headers, content } = cb.refreshContent(req)
      console.log(`${new Date()}\n${req.method} ${req.originalUrl} ${code}`)
      res.set(headers).status(code).json(content)
    })
    console.log(`${cb.request.method} ${cb.request.route} (file: ${file})`)
  }

  api.listen(port, host, () => {
    console.log(`\n(up and running @ http://${host}:${port})\n`)
  })
}

module.exports = { serve, ContentBuilder }
