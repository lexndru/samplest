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

const { capture } = require('../samplest')

describe('Capture placeholders from a string', () => {
  it('should extract all words between curly brackets', async () => {
    const string = 'This is a {test} for {placeholders}. Does it {work}?'
    const expectedWords = ['test', 'placeholders', 'work']
    const totalWords = expectedWords.length

    let counter = 0
    for await (const field of capture(string)) {
      assert.strict.equal(expectedWords.shift(), field)
      counter++
    }

    if (counter !== totalWords) {
      assert.fail(`Didn't count up to ${totalWords}`)
    }
  })

  it('should ignore words delimited by spaces and not dots', async () => {
    const string = 'This is a {failure test} for {bad placeholders}...'

    let counter = 0
    for await (const _ of capture(string)) {
      counter++
    }

    if (counter !== 0) {
      assert.fail(`Expected 0 words, but got ${counter}`)
    }
  })

  it('should capture words delimited by multiple dots', async () => {
    const string = 'This should {be.valid} as well as {this.3-level.one}'
    const expectedWords = ['be.valid', 'this.3-level.one']
    const totalWords = expectedWords.length

    let counter = 0
    for await (const field of capture(string)) {
      assert.strict.equal(field, expectedWords.shift())
      counter++
    }

    if (counter !== totalWords) {
      assert.fail(`Didn't count up to ${totalWords}`)
    }
  })
})
