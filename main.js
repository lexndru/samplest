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
 * Read a file asynchrounously and return its content as string.
 *
 * @param {string} fp The absolute file path
 * @returns {Promise<string>} The content of the file
 */
function getFileContent (fp) {
    return new Promise((resolve, reject) => {
        const opts = { encoding: 'UTF-8' }
        fs.readFile(fp, opts, (err, data) => err ? reject(err) : resolve(data))
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
 * Generate a response with random dummy data or static content.
 *
 * @param {any} content The formated response data
 * @param {number} repeat How many times to repeat the content
 * @param {object} variables The parameters of the request
 * @returns {any} The formated response data (altered)
 */
function generateRequestResponse (content, repeat, variables) {
    if (Array.isArray(content)) {
        const contents = []
        while (repeat-- > 0) {
            for (let i = 0; i < content.length; i++) {
                content[i] = generateRequestResponse(content[i], repeat, variables)
            }
            contents.push(...content)
        }
        content = contents
    } else if (typeof content === 'object') {
        Object.keys(content).forEach(key => {
            content[key] = generateRequestResponse(content[key], 0, variables)
        })
    } else if (typeof content === 'string') {
        Object.entries(variables).forEach(([key, value]) => {
            content = content.replace(`:${key}`, value)
        })
        content = faker.fake(content)
    }
    return content
}

/**
 * Register new route to serve on development API with formatted response.
 *
 * @param {{ code: number, data: any, headers: object, repeat: number }} Response format options
 * @returns {CallableFunction}
 */
function registerHttpCall ({ code, data, headers, repeat = 1 }) {
    return async function (req, res) {
        const content = JSON.parse(JSON.stringify(data))
        if (headers && typeof headers === 'object') {
            res.set(headers)
        }
        res.status(code).json(generateRequestResponse(content, repeat, req.params))
    }
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
        const dirpath = path.join(__dirname, dir)
        for await (const [file, content] of scanDirectory(dirpath)) {
            try {
                const { request, response } = JSON.parse(content)
                if (['get', 'post', 'put', 'delete'].indexOf(request.method) > -1) {
                    const handler = registerHttpCall(response)
                    api[request.method](request.route, handler)
                    console.log(`Loaded samples from ${file}`)
                } else {
                    console.log(`Cannot load samples from ${file} because of unsupported HTTP method: ${request.method}`)
                }
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
    const port = process.env.PORT || 9003
    const dirs = args.slice(2)
    if (dirs.length > 0) {
        const api = await bootstrap(express(), dirs)
        api.listen(port, host, () => console.log(`Running @ http://${host}:${port}`))
    }
}

module.exports = main
