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

const { castContent } = require('../lib')

describe('Cast from string to other numbers and booleans', () => {
  const testObject = {
    id: '100',
    success: 'true'
  }

  it('should return the appropriate values after casting', () => {
    const num = castContent('number', testObject.id)
    assert.strict.equal(num, 100)

    const bool = castContent('boolean', testObject.success)
    assert.strict.equal(bool, true)
  })

  it('should return failure reason in text format', () => {
    const num = castContent('boolean', testObject.id)
    assert.strict.equal(num, '<"100" is not a boolean>')

    const bool = castContent('number', testObject.success)
    assert.strict.equal(bool, '<"true" is not a number>')
  })

  it('should throw an error if cast type is unsupported', () => {
    assert.throws(() => {
      castContent('xxxxxxx', {})
    })

    assert.strict.equal(castContent('string', null), '<cannot cast "null" as string>')
  })
})
