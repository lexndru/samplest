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

const { ResponseHandler } = require('../lib')

describe('Validate response rules', () => {
  it('should fail if status code is invalid', () => {
    const responseObject = {
      code: 0,
      headers: {},
      data: null
    }

    assert.throws(() => {
      new ResponseHandler(responseObject)
    })

    responseObject.code = 200
    assert.doesNotThrow(() => {
      const res = new ResponseHandler(responseObject)
      if (res.code !== responseObject.code) {
        assert.fail('Status code mismatch')
      }
    })
  })

  it('should fail if metadata has options invalid for data', () => {
    const responseObject = {
      code: 200,
      data: 'this is a string',
      $data: {
        cast: {
          '*': 'number'
        }
      }
    }

    assert.throws(() => {
      new ResponseHandler(responseObject)
    })

    const responseObject2 = {
      code: 200,
      data: ['1', '2', '3'],
      $data: {
        cast: {
          '*': 'number'
        },
        repeat: '10..20'
      }
    }

    assert.doesNotThrow(() => {
      new ResponseHandler(responseObject2)
    })
  })
})
