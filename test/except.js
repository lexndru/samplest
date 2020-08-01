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

const { ExceptHandler } = require('../lib')

describe('Validate request-response exception cases', () => {
  it('should throw errors for non-objects except cases', () => {
    assert.throws(() => {
      new ExceptHandler({
        '#': {}
      })
    })

    assert.throws(() => {
      new ExceptHandler({
        '#': {
          validate: []
        }
      })
    })

    assert.throws(() => {
      new ExceptHandler({
        '#': {
          validate: [],
          response: {}
        }
      })
    })

    assert.throws(() => {
      new ExceptHandler({
        '#': {
          validate: [],
          response: { code: 200, data: 'ok' }
        }
      })
    })
  })

  it('should pass for properly formatted except cases', () => {
    const testObject = {
      'assertion message': {
        validate: [
          'something to validate'
        ],
        response: {
          code: 201,
          data: 'test'
        }
      }
    }

    assert.doesNotThrow(() => {
      new ExceptHandler(testObject)
    })
  })
})
