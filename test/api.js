// Copyright (c) 2020 Alexandru Catrina <alex@codeissues.net>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const assert = require('assert')
const express = require('express')
const bodyParser = require('body-parser')
const request = require('supertest')

const { ContentBuilder, registerHttpCall } = require('../api')

describe('Test response for a known sample and a mockup request', () => {
  it('should throw error if request or response are invalid', () => {
    const input = {
      request: null,
      response: null
    }

    assert.throws(() => {
      new ContentBuilder(input)
    })
  })

  it('should merge the request parameters on each new call', () => {
    const request = {
      route: '/',
      method: 'get',
      payload: {
        a: 1
      }
    }
    const response = {
      code: 201,
      data: 'A={payload.a} B={payload.b}'
    }
    const incomingRequest = {
      body: {
        b: 2
      }
    }

    const cb = new ContentBuilder({ request, response })
    const { code, headers, content } = cb.generate(incomingRequest)

    assert.strict.equal(code, 201)
    assert.strict.deepEqual(headers, {})
    assert.strict.equal(content, 'A=1 B=2')
  })

  it('should generate response according to meta', () => {
    const request = {
      route: '/:id',
      method: 'get',
      headers: {
        authorization: 'Basic XXXXXXXX',
        'content-type': 'application/json',
        'x-friendly-name': 'samplest'
      },
      payload: {
        title: 'The lord of the rings',
        author: 'J. R. R. Tolkien',
        ebook: true
      }
    }

    const response = {
      code: 200,
      headers: {
        'x-powered-by': 'samplest',
        'x-feedback': '{headers.x-friendly-name}',
        'content-type': 'application/json'
      },
      data: {
        saved: true,
        id: '{route.id}',
        related: ['1', '2', '3', '4', '5']
      },
      $data: {
        cast: {
          'related.*': 'number',
          id: 'number',
          saved: 'boolean'
        }
      }
    }

    const cb = new ContentBuilder({ request, response })
    const { code, headers, content } = cb.generate({
      params: { id: 2020 }
    })

    assert.strict.equal(code, response.code)
    assert.strict.deepEqual(headers, {
      'x-powered-by': response.headers['x-powered-by'],
      'x-feedback': request.headers['x-friendly-name'],
      'content-type': request.headers['content-type']
    })
    assert.strict.deepEqual(content, {
      saved: true,
      id: 2020,
      related: [1, 2, 3, 4, 5]
    })
  })

  it('should follow an exception response if validations are not ok', () => {
    const request = {
      route: '/',
      method: 'get',
      payload: {
        a: 1,
        b: 2
      }
    }
    const response = {
      code: 200,
      data: 'A={payload.a} B={payload.b} C={payload.c}'
    }
    const except = {
      'Payload must contain three fields': {
        validate: [
          'Object.keys(payload).length === 3'
        ],
        response: {
          code: 400,
          data: 'Must submit exactly 3 fields in payload'
        }
      }
    }
    const incomingRequest = {
      body: {
        b: 2
      }
    }

    const cb = new ContentBuilder({ request, response, except })
    const { flow, code, headers, content } = cb.generate(incomingRequest)

    assert.strict.equal(code, 400)
    assert.strict.equal(flow, 'Payload must contain three fields')
    assert.strict.deepEqual(headers, { 'X-Assertion': 'Payload must contain three fields' })
    assert.strict.equal(content, 'Must submit exactly 3 fields in payload')
  })

  it('should follow happy path if except validations are ok', () => {
    const request = {
      route: '/',
      method: 'get',
      payload: {
        a: 1,
        b: 2
      }
    }
    const response = {
      code: 200,
      data: 'A={payload.a} B={payload.b} C={payload.c}'
    }
    const except = {
      'Payload must contain three fields': {
        validate: [
          'Object.keys(payload).length === 3'
        ],
        response: {
          code: 400,
          data: 'Must submit exactly 3 fields in payload'
        }
      }
    }
    const incomingRequest = {
      body: {
        b: 200,
        c: 300
      }
    }

    const cb = new ContentBuilder({ request, response, except })
    const { flow, code, headers, content } = cb.generate(incomingRequest)

    assert.strict.equal(code, 200)
    assert.strict.equal(flow, null)
    assert.strict.deepEqual(headers, {})
    assert.strict.equal(content, 'A=1 B=200 C=300')
  })
})

describe('Test an API instance with actual http calls', () => {
  const cb = new ContentBuilder({
    request: {
      route: '/:username/post/:id',
      method: 'post',
      headers: {
        'x-domain': 'samplest.localhost'
      },
      payload: {
        bookTitle: 'The hobbit',
        popularity: [0.778, 0.821]
      }
    },
    response: {
      code: 200,
      headers: {
        'x-domain-confirm': '{headers.x-domain} enabled'
      },
      data: 'added {payload.bookTitle} with popularity range {payload.popularity}'
    },
    except: {
      'API token must be valid (if set)': {
        validate: [
          'headers["x-secret"] && Buffer.from(headers["x-secret"], "base64").toString("ascii") === "samplest"'
        ],
        response: {
          code: 403,
          data: {
            error: 'access denied',
            params: {
              username: '{route.username}',
              postNumber: '{route.id}'
            }
          },
          $data: {
            cast: {
              'params.postNumber': 'number'
            }
          }
        }
      },
      'Username must match github': {
        validate: [
          'route.username === `lexndru`'
        ],
        response: {
          code: 400,
          data: {
            error: 'incorrect username'
          }
        }
      }
    }
  })

  it('should return 200 and an array of text messages', () => {
    const api = express()
    api.use(bodyParser.json())
    registerHttpCall(cb, api)

    request(api)
      .post('/lexndru/post/2020')
      .send({
        bookTitle: 'The return of the king',
        popularity: [0.8, 0.9]
      })
      .expect(200, JSON.stringify('added The return of the king with popularity range 0.8,0.9'))
      .end(err => err ? assert.fail(err) : null)
  })

  it('should return 400 and a header with assertion message', () => {
    const api = express()
    api.use(bodyParser.json())
    registerHttpCall(cb, api)

    request(api)
      .post('/alexandru/post/2020')
      .send({
        bookTitle: 'The return of the king',
        popularity: [0.8, 0.9]
      })
      .expect('X-Assertion', 'Username must match github')
      .expect(400, JSON.stringify({ error: 'incorrect username' }))
      .end(err => err ? assert.fail(err) : null)
  })

  it('should return 403 and the payload with assertion message', () => {
    const api = express()
    api.use(bodyParser.json())
    registerHttpCall(cb, api)

    request(api)
      .post('/lexndru/post/2020')
      .set('x-secret', 'samplest is the secret')
      .send({
        bookTitle: 'The return of the king',
        popularity: [0.8, 0.9]
      })
      .expect('X-Assertion', 'API token must be valid (if set)')
      .expect(403, JSON.stringify(({
        error: 'access denied',
        params: {
          username: 'lexndru',
          postNumber: 2020
        }
      })))
      .end(err => err ? assert.fail(err) : null)
  })
})
