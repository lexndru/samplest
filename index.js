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

const { readFileSync } = require('fs')
const { join } = require('path')

const { bootstrap } = require('./utils')

const { ArgumentParser } = require('argparse')

// Allow the user to change the default host and port for the API
// TODO: Test if the port is available?
const host = process.env.HOST || '127.0.0.1'
const port = process.env.PORT || 8080

// Avoid multiple versioning statements. Instead, get the version
// from the project's manifest and pass it to the application.
const projectPath = join(__dirname, 'package.json')
const packageJson = readFileSync(projectPath, 'utf8')
const { version } = JSON.parse(packageJson)
const cmd = new ArgumentParser({
    version,
    addHelp: true, 
    description: `Sample REST API for development`
})

// 
cmd.addArgument('dir', {
    help: 'The directory to scan for samplests'
})

//
cmd.addArgument(['-s', '--support'], {
    help: 'List supported content generators'
})

//
cmd.addArgument(['-d', '--dump'], {
    help: 'Dump a samplest in JSON format'
})

// Application entrypoint. Parse the command line arguments and
// launch a sample REST API for rapid development. It may crash
// if unexpected or unsupported content is found in "samplests"
// Please open a ticket on github if you want to contribute.
!(async (args) => {
    if (args.dir !== null) {
        await bootstrap(args.dir, host, port)
    } else if (args.support !== null) {
        // TODO: display a list of supported generators?
    } else if (args.dump !== null) {
        // TODO: dump a sample samplest 
    }
})(cmd.parseArgs())
