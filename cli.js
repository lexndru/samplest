#!/usr/bin/env node
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
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
'use strict'

const { readFileSync, writeFileSync, readdirSync, statSync } = require('fs')
const { join } = require('path')

const { ArgumentParser } = require('argparse')
const Express = require('express')
const BodyParser = require('body-parser')
const Table = require('cli-table')
const Faker = require('faker')

const { registerHttpCall, ContentBuilder } = require('./api')
const { RequestObject, ResponseObject } = require('./lib')

/**
 * Security warning for unsafe except cases.
 *
 * @param {string} file Unsafe filename
 * @returns {string}
 */
function securityWarning (file) {
  return `***
Security warning! ExceptObject found in file "${file}"

The ExceptObject allows deviation from the happy path, by allowing the user to
have CUSTOM validation conditions. This feature require EXPLICIT permission to
run JavaScript code!

Restart samplest with the --allow-js flag, ONLY IF YOU KNOW WHAT YOU'RE DOING!
***`
}

/**
 * General available style for CLI output.
 *
 * @type {object}
 */
const CLI_STYLE = {
  style: {
    head: ['reset']
  }
}

/**
 * Iterate over a directory and retrieve a list of files.
 *
 * @param {string} dir The directory to scan
 * @param {string[]} files Accumulated files
 * @returns {string[]} List of files
 */
function getFilesFromDirectory (dir, files = []) {
  for (const fname of readdirSync(dir)) {
    const fp = join(dir, fname)
    if (statSync(fp).isDirectory()) {
      files = getFilesFromDirectory(fp, files)
    } else {
      files.push(fp)
    }
  }

  return files
}

/**
 * Scan a directory for JSON files and pair each file with its content.
 *
 * @param {string} dirpath The directory path
 * @returns {AsyncGenerator}
 */
async function * scanDirectory (dirpath) {
  const files = getFilesFromDirectory(dirpath)
  for (const file of files) {
    if (file.endsWith('.json')) {
      const content = readFileSync(file, 'utf8')
      yield [file, JSON.parse(content)]
    }
  }
}

// Allow the user to change the default host and port for the API
// TODO: Test if the port is available?
const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT) || 8080

// Avoid multiple versioning statements. Instead, get the version
// from the project's manifest and pass it to the application.
const projectPath = join(__dirname, 'package.json')
const packageJson = readFileSync(projectPath, 'utf8')
const { version, homepage } = JSON.parse(packageJson)
const cmd = new ArgumentParser({
  version,
  addHelp: true,
  description: 'Design and use RESTful API from sample specs'
})

// Ask the user permission to run custom JS validation code from ExceptObject
// By default, this feature is disabled because of potential security risks.
//
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function
cmd.addArgument(['--allow-js'], {
  help: 'Give permission to run CUSTOM JS validation code',
  action: 'storeTrue',
  defaultValue: false
})

// There can be only one parent directory with any number of JSON
// files as samplests.
cmd.addArgument(['-s', '--scan'], {
  help: 'The directory to scan for samplests'
})

/**
 * Start a development API from samplests.
 *
 * @param {string} dir The path to directory
 * @param {boolean} allowJs Permission to run JS code
 * @param {string} host The hostname to bind
 * @param {number} port The port to listen
 * @returns {Promise<void>}
 */
async function serve (dir, allowJs, host, port) {
  const api = Express()
  api.disable('x-powered-by')
  api.use(BodyParser.json())
  api.use(BodyParser.urlencoded({ extended: true }))
  api.use(BodyParser.text())

  const overviewTable = new Table(CLI_STYLE)
  try {
    for await (const [file, content] of scanDirectory(dir)) {
      const cb = new ContentBuilder(content)
      if (cb.except !== null && allowJs !== true) {
        throw new Error(`User permission required!\n${securityWarning(file)}`)
      }
      registerHttpCall(cb, api, (date, { flow, code }, req) => {
        const entry = date.toISOString()
        const { method, originalUrl } = req
        flow = flow || 'Happy path'
        console.log(`${entry} - ${method} ${originalUrl} (${code}; ${flow})`)
      })
      overviewTable.push({ [file]: `${cb.request}` })
    }
  } catch (e) {
    console.log(`Failure: ${e.message}`)
    process.exit(1)
  }

  if (overviewTable.length === 0) {
    console.log(`No samplests found! Is ${dir} the correct directory?`)
    process.exit(2)
  }

  api.listen(port, host, () => {
    console.log(`Samplest v${version} is up and running`)
    console.log(` Address: http://${host}:${port}`)
    console.log(`  Launch: ${new Date()}`)
    console.log(`Homepage: ${homepage}`)
    console.log(`Overview: ${overviewTable.length} file(s) imported`)
    console.log(`\n${overviewTable}\n`)
  })
}

// The list is generated by inspecting faker's components.
cmd.addArgument(['-l', '--list'], {
  help: 'List supported content generators'
})

/**
 * List current supported placeholders to generate mockup data.
 *
 * @param {string} lookup Item to lookup for support
 * @returns void
 */
function listSupportedPlaceholders (lookup) {
  let supported = [
    'name',
    'address',
    'company',
    'finance',
    'image',
    'lorem',
    'hacker',
    'internet',
    'database',
    'phone',
    'date',
    'commerce',
    'system'
  ]

  if (lookup !== 'all') {
    supported = supported.filter(value => value === lookup)
  }

  const supportTable = new Table(CLI_STYLE)
  for (const item of supported) {
    const mockup = Faker[item]
    for (const option of Object.keys(mockup)) {
      const field = `${item}.${option}`
      const value = `${mockup[option]()}`
      supportTable.push({
        [field]: value.length >= 64 ? value.substr(0, 60) + ' ...' : value
      })
    }
  }

  console.log(`Samplest v${version} is using faker.js`)
  console.log(`Documentation: ${homepage}`)
  console.log(`\n${supportTable}\n`)
}

// The content of the dump is not functional out of the box. The
// user should consult the examples directory for resources.
cmd.addArgument(['-d', '--dump'], {
  help: 'Dump a samplest in JSON format'
})

/**
 * Dump object interfaces from lib as getting started samplest.
 *
 * @param {string} filepath The file path to use
 * @return void
 */
function dumpSamplest (filepath) {
  if (!filepath.startsWith('/')) {
    filepath = join(process.cwd(), filepath)
  }
  if (!filepath.endsWith('.json')) {
    filepath += '.json'
  }
  writeFileSync(filepath, JSON.stringify({
    request: RequestObject,
    response: ResponseObject
  }, null, 2))
}

// Application entrypoint. Parse the command line arguments and
// launch a sample REST API for rapid development. It may crash
// if unexpected or unsupported content is found in "samplests"
// Please open a ticket on github if you want to contribute.
!(async (args, cmd) => {
  if (args.scan !== null) {
    await serve(args.scan, args.allow_js, host, port)
  } else if (args.dump !== null) {
    dumpSamplest(args.dump)
  } else if (args.list !== null) {
    listSupportedPlaceholders(args.list)
  } else {
    cmd.printHelp()
  }
})(cmd.parseArgs(), cmd)
