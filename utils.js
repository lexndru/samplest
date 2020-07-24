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

const { probe, generateContent } = require('./samplest')

const express = require('express')
const bodyParser = require('body-parser')

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
 * Bootstrap development API with samples from directory list.
 *
 * @param {string} dir The path to directory
 * @param {string} host The hostname to bind
 * @param {string} port The port to listen
 * @returns {Promise<void>}
 */
async function bootstrap (dir, host, port) {
    const api = express()
    api.use(bodyParser.json())
    api.use(bodyParser.urlencoded({ extended: true }))

    for await (const [file, content] of scanDirectory(dir)) {
        const { request, response } = probe(content)
        const cb = new ContentBuilder(request, response)
        api[request.method](request.route, (req, res) => {
            const { code, headers, content } = cb.refresh(req)
            res.set(headers).status(code).json(content)
        })
        console.log(`${file} - ${request.method} ${request.route}`)
    }

    api.listen(port, host, () => {
        console.log(`Up and running @ http://${host}:${port}`)
    })
}

/**
 * Helper class to generate response based on incoming requests.
 * Each new call regenerates the content. 
 */
class ContentBuilder {

    /**
     * Initialize content builder.
     *
     * @param {{ query: object, headers: object, payload: object }} request
     * @param {{ code: string, headers: object, data: any }} response
     */
    constructor (request, response) {
        this.request = request
        this.response = response
        this.headers = JSON.stringify(response.headers)
        this.content = JSON.stringify(response.data)
    }

    /**
     * Refresh the response content and response headers.  
     *
     * @param {{ 
     *  params: object,
     *  query: object,
     *  headers: object,
     *  body: any
     * }} req The incoming HTTP request
     * @returns {{
     *  code: string,
     *  headers: any,
     *  content: any,
     * }}
     */
    refresh (req) {
        const ctx = {
            route: Object.assign({}, req.params),
            query: Object.assign({}, this.request.query, req.query),
            headers: Object.assign({}, this.request.headers, req.headers),
            payload: Object.assign({}, this.request.payload, req.body),
        }

        return {
            code: this.response.code,
            headers: this.headers ? generateContent(this.headers, ctx) : null,
            content: this.content ? generateContent(this.content, ctx) : null,
        }
    }
}

module.exports = { bootstrap }
