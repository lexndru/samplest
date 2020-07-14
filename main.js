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

const fs = require('fs')
const path = require('path')
const faker = require('faker')
const express = require('express')

/**
 * Supported HTTP verbs
 *
 * @type {string[]}
 */
const HTTP_VERBS = ['get', 'post', 'put', 'delete']

/**
 * Request interface.
 *
 * @type {{
 *  route: string,
 *  method: string,
 *  query_string: object,
 *  payload: any,
 *  headers: object,
 *  validators: { test: string, assert: string }[],
 *  $query_string: object,
 *  $payload: object,
 *  $headers: object
 * }}
 */
const Request = {
    "route": "endpoint with optional :placeholder(s)",
    "method": "get | post | put | delete",
    "query_string": {
        "param1": "value or :placeholder",
        "param2": ["value", ":placeholder"],
    },
    "$query_string": {
        "param1": "string | array | required",
        "param2": "string | array | required",
    },
    "payload": {
        "field1": "value or :placeholder",
        "field2": "value or :placeholder",
    },
    "$payload": {
        "field1": "string | numer | boolean | array | object | nullable | required",
        "field2": "string | numer | boolean | array | object | nullable | required",
    },
    "headers": {
        "X-Some-Header1": "value or :placeholder",
        "X-Some-Header2": "value or :placeholder",
    },
    "$headers": {
        "X-Some-Header1": "required",
    },
    "validators": [
        {
            "test": "any JS code that can run as a lambda function with the request as input",
            "assert": "The error message returned in a human readable format"
        },
        {
            "test": "headers['X-Some-Header3'] !== undefined",
            "assert": "Missing header X-Some-Header3"
        }
    ]
}

/**
 * Response interface.
 *
 * @type {{
 *  code: string|number,
 *  headers: object,
 *  data: any,
 *  $data: any
 * }}
 */
const Response = {
    "code": "valid HTTP status code",
    "headers": {
        "Powered-By": "Samplest"
    },
    "data": {
        "id": "generated value or :placeholder",
        "username": "generated value or :placeholder",
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
 * Read a file asynchrounously and return its content as string.
 *
 * @param {string} fp The absolute file path
 * @returns {Promise<string>} The content of the file
 */
function getFileContent (fp) {
    return new Promise((resolve, reject) => {
        fs.readFile(fp, 'utf8', (err, data) => err ? reject(err) : resolve(data))
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
        fs.readdir(dir, (err, data) => err ? reject(err) : resolve(data))
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
            const content = await getFileContent(path.join(dirpath, file))
            yield [file, content]
        }
    }
}

/**
 * Probe incoming request configuration.
 *
 * @param {{
 *  route: string,
 *  method: string,
 *  query_string: object|undefined,
 *  payload: any|undefined,
 *  headers: object|undefined,
 *  validators: { test: string, assert: string }[]|undefined
 * }} request The incoming request
 * @throws {Error} Unsupported HTTP method
 * @throws {Error} Endpoint must be a non-empty string
 * @throws {Error} Validator test and assert must be strings
 * @returns void
 */
function probeRequestSample (request) {
    if (HTTP_VERBS.indexOf(request.method.toLowerCase()) === -1) {
        throw new Error(`Unsupported HTTP method: ${request.method}`)
    } else if ( ! request.route || request.route.length === 0) {
        throw new Error('Endpoint must be a non-empty string')
    } else if (typeof request.validators === 'object') {
        for (const { test, assert } of request.validators) {
            if (typeof test !== 'string' || typeof assert !== 'string') {
                throw new Error('Validator test and assert must be strings')
            }
        }
    }
}

/**
 * Probe outgoing response configuration.
 *
 * @param {{
 *  code: string|number,
 *  headers: object,
 *  data: any
 * }} response The outgoing response
 * @throws {Error} Response status code must be a number
 * @throws {Error} Unsupported HTTP status code
 * @returns void
 */
function probeResponseSample(response) {
    const statusCode = parseInt(response.code.toString())
    if (isNaN(statusCode)) {
        throw new Error('Response status code must be a number')
    } else if (statusCode < 100 || statusCode > 599) {
        // NOTE: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
        throw new Error(`Unsupported HTTP status code: ${statusCode}`)
    }
}

/**
 * Replace placeholders in a given content.
 *
 * @param {string} content The content to process
 * @param {object[]} placeholders Available placeholders to use
 * @returns {string}
 */
function replacePlaceholders (content, ...placeholders) {
    for (const each of placeholders) {
        Object.entries(each).forEach(([key, value]) => {
            content = content.replace(`:${key}`, value)
        })
    }

    return content
}

/**
 * Generate a response with random dummy data or static content.
 *
 * @param {string} content Response template as unserialized JSON
 * @param {object[]} variables Available placeholders from request
 * @returns {any} The formated response data (altered)
 */
function generateContent (content, variables) {
    const data = JSON.parse(content)
    if (Array.isArray(data)) {
        const dataset = []
        for (const item of data) {
            dataset.push(generateContent(JSON.stringify(item), variables))
        }
        return dataset
    } else if (typeof data === 'object') {
        Object.entries(data).forEach(([key, value]) => {
            data[key] = generateContent(JSON.stringify(value), variables)
        })
        return data
    } else if (typeof data === 'string') {
        return faker.fake(replacePlaceholders(data, ...variables))
    }

    return data
}

/**
 * Bootstrap development API with samples from directory list.
 *
 * @param {express} api Application instance
 * @param {string[]} dirs List of directories
 * @returns {Promise<express>}
 */
async function bootstrap (api, dirs) {
    for (const dir of dirs) {
        for await (const [file, content] of scanDirectory(dir)) {
            try {
                const { request, response } = JSON.parse(content)
                probeRequestSample(request)
                probeResponseSample(response)
                const responseContent = JSON.stringify(response.data)
                api[request.method](request.route, async (req, res) => {
                    const content = generateContent(responseContent, [req.params])
                    if (response.headers && typeof response.headers === 'object') {
                        res.set(replacePlaceholders(response.headers, req.headers))
                    }
                    res.status(response.code).json(content)
                })
                console.log(`${request.method.toUpperCase()} ${request.route} (from ${file})`)
            } catch (e) {
                console.log(`Error parsing file ${file}: ${e.meesage}`)
            }
        }
    }

    return api
}

/**
 * Samplest (Sample REST development API) entrypoint
 *
 * @param {string[]} args Command line arguments
 * @returns {Promise<void>}
 */
async function main (args) {
    const host = process.env.HOST || '127.0.0.1'
    const port = process.env.PORT || 8080
    const dirs = args.slice(2)
    if (dirs.length > 0) {
        const api = await bootstrap(express(), dirs)
        api.listen(port, host, () => console.log(`Running @ http://${host}:${port}`))
    }
}

module.exports = main
