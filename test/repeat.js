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

const { repeatContent } = require('../lib')

describe('Repeat existing elements from a list', () => {
  it('should return exactly N elements', () => {
    const testList = [
      {
        a: 1
      },
      {
        b: 2
      },
      {
        c: 3
      }
    ]
    const totalElements = testList.length
    const repeatTimes = 10
    const expectedElements = repeatTimes * totalElements

    const newList = repeatContent(testList, repeatTimes.toString())

    assert.strict.equal(newList.length, expectedElements)
  })

  it('should return random number of elements from a range', () => {
    const testList = [1]
    const repeatFormula = '5..10'

    const newList = repeatContent(testList, repeatFormula)

    if (newList.length < 5 || newList.length > 10) {
      assert.fail(`Expected length between 5 and 10, but got ${newList.length}`)
    }
  })
})
