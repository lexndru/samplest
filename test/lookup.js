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

const { lookup } = require('../samplest')

describe('Lookup fields in objects and return associated values', () => {
  const testObject = {
    something: {
      a: 'așteaptă',
      b: 'bicicletă',
      c: 'copyright ©'
    },
    x: {
      list: [1, 2, 3],
      bool: true,
      year: 2020,
      text: 'samplest'
    }
  }

  it('should return null if field does not exist', async () => {
    const value = lookup(testObject, 'something', 'x')
    assert.strict.equal(value, null)
  })

  it('should return correct unicode value if field exist', async () => {
    assert.strict.equal(lookup(testObject, 'something', 'a'), 'așteaptă')
    assert.strict.equal(lookup(testObject, 'something', 'b'), 'bicicletă')
    assert.strict.equal(lookup(testObject, 'something', 'c'), 'copyright ©')
  })

  it('should return string representation of a value only', async () => {
    assert.strict.equal(lookup(testObject, 'x', 'list'), '1,2,3')
    assert.strict.equal(lookup(testObject, 'x', 'bool'), 'true')
    assert.strict.equal(lookup(testObject, 'x', 'year'), '2020')
    assert.strict.equal(lookup(testObject, 'x', 'text'), 'samplest')
  })
})
