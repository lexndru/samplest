# Samplest
[![Build Status](https://travis-ci.org/lexndru/samplest.svg?branch=master)](https://travis-ci.org/lexndru/samplest)

Samplest is a CLI development tool to design and mockup RESTful API. The purpose of this project is to focus on designing the communication interface, while also having the posibility to quickly bootstrap a mockup API based on the same documentation. These are called "samplests" and must respect the SAMPLEST.md specification.

## Install from npm
```
$ npm install -g samplest
```

## How to use?
```
$ samplest -s examples --allow-js
Samplest v1.3.0 is up and running
 Address: http://127.0.0.1:8080
  Launch: Sun Aug 02 2020 17:17:56 GMT+0300 (Eastern European Summer Time)
Homepage: https://github.com/lexndru/samplest
Overview: 7 file(s) imported

┌──────────────────────────────────────┬───────────────────────────────┐
│ examples/safe/create.json            │ POST /api/v1/book             │
├──────────────────────────────────────┼───────────────────────────────┤
│ examples/safe/read-all-objects.json  │ GET /api/v1/products          │
├──────────────────────────────────────┼───────────────────────────────┤
│ examples/safe/read-all-strings.json  │ GET /api/v1/persons           │
├──────────────────────────────────────┼───────────────────────────────┤
│ examples/safe/read-one-object.json   │ GET /api/v1/products/:product │
├──────────────────────────────────────┼───────────────────────────────┤
│ examples/unsafe/delete.json          │ DELETE /api/v1/book/:book     │
├──────────────────────────────────────┼───────────────────────────────┤
│ examples/unsafe/read-one-string.json │ GET /api/v1/person/:person    │
├──────────────────────────────────────┼───────────────────────────────┤
│ examples/unsafe/update.json          │ PUT /api/v1/book/:book        │
└──────────────────────────────────────┴───────────────────────────────┘
```

## Features
- [x] User-defined request route, query string, headers and payload 
- [x] User-defined response status code, headers and content
- [x] User-defined exceptions to contrast the default request-response happy path
- [x] Cast the response content as text, number, boolean
- [x] Repeat the response content items of a collection
- [x] Use context placeholders from request to build the response with submitted information
- [x] Use mockup placeholders to generate random content on each new request (through faker.js)
- [x] Fast and powerful HTTP server powered by express
- [x] Lookup available mockup placeholders from CLI
- [x] Easy to share between teammates

## Quick start
Consult the `examples` directory or *dump* a sample JSON file on your machine with the following line:
```
$ samplest -d nameYourFile
$ ls # lookup nameYourFile.json
```

## Samplest is for development only
Samplest is NOT a production tool! It is ment to be a temporary solution (not an "replacement") for missing or work-in-progress services in your software architecture. Samplest is a CLI development tool that can provide API validation for the input/output communication schema and use the exactly same document to launch a real web service capable of generating mockup data. These features allow the development to continue in parallel, on one hand for applications that rely on API services; on the other hand on the API services themselves.

Samplest provides a set of validation rules to perform on a given API endpoint specification. These API endpoint specifications are stored in JSON format files. A directory of such files can result in a working RESTful API. Start Samplest with the `--scan` flag to validate and launch a real HTTP server to serve the API. To provide alternative responses to a request, the user can implement a set of assertions in the form of except cases via the *ExceptCaseObject* (view SAMPLEST.md). Doing so, Samplest aknowledges custom validation conditions to be tested by executing code on the machine it's running. If the validation conditions are evaluated different than TRUE, a different response is returned; only conditions that evaluate to "undefined" are skipped.

## Security
By default, Samplest does not allow code execution from JSON files (samplests). The user MUST explicitly provide the `--allow-js` flag, otherwise a security warning message is printed and the application closes. The execution of code from JSON files is considered a potential security risk due to the incapacity of the application to recognize malicious code from good-intentioned and harmless code. Although the application restricts some usages of JS functionalities (e.g. eval), there's no guarantee what the end-user might do. Therefore, the USER MUST ACKNOWLEDG THE POTENTIAL SECURITY RISK TO RUN UNTRUSTED JSON FILES AND IT IS RESPONSIBLE FOR ITS OWN ACTIONS.

## Tests
```
$ npm install # install deps
$ npm test
```

## License
Copyright 2020 Alexandru Catrina

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
