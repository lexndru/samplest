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
    const { code, headers, content } = cb.refreshContent(incomingRequest)

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
    const { code, headers, content } = cb.refreshContent({
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
})
