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

const { RequestHandler } = require('../lib')

describe('Validate request rules', () => {
  const requestObject = {
    method: '',
    route: '',
    query: {},
    headers: {},
    payload: {}
  }

  it('should fail if method or route is not defined', () => {
    assert.throws(() => {
      new RequestHandler(requestObject)
    })
  })

  it('should pass if only route and method are defined', () => {
    requestObject.method = 'get'
    requestObject.route = '/'

    assert.doesNotThrow(() => {
      const req = new RequestHandler(requestObject)
      if (req.route !== requestObject.route) {
        assert.fail('Different route')
      } else if (req.method !== requestObject.method) {
        assert.fail('Different method')
      }
    })
  })

  it('should fail if payload is an array (not supported)', () => {
    requestObject.method = 'get'
    requestObject.route = '/'
    requestObject.payload = ['test']

    assert.throws(() => {
      new RequestHandler(requestObject)
    })
  })

  it('should fail if method is not supported', () => {
    requestObject.method = 'options'
    requestObject.route = '/'

    assert.throws(() => {
      new RequestHandler(requestObject)
    })
  })

  it('should work if payload is an object', () => {
    requestObject.method = 'post'
    requestObject.route = '/'
    requestObject.payload = {
      title: 'The lord of the rings',
      ebook: true
    }

    assert.doesNotThrow(() => {
      const req = new RequestHandler(requestObject)
      assert.strict.deepEqual(req.payload, requestObject.payload)
    })
  })

  it('should fail if headers are duplicated (case insensitive)', () => {
    requestObject.method = 'get'
    requestObject.route = '/'
    requestObject.headers = {
      'X-Header': 'test'
    }

    assert.doesNotThrow(() => {
      new RequestHandler(requestObject)
    })

    requestObject.headers = { ...requestObject.headers, 'x-header': 'test' }
    assert.throws(() => {
      new RequestHandler(requestObject)
    })
  })

  it('should fail if query string is not string or string[]', () => {
    requestObject.method = 'get'
    requestObject.route = '/'
    requestObject.headers = {}
    requestObject.query = {
      param1: 'test',
      param2: ['test 2']
    }

    assert.doesNotThrow(() => {
      new RequestHandler(requestObject)
    })

    requestObject.query = {
      param1: true,
      param2: {
        x: 1
      }
    }

    assert.throws(() => {
      new RequestHandler(requestObject)
    })
  })
})
