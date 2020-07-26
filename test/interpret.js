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

const { interpret } = require('../samplest')

describe('Interpret a given string to generate content from context', () => {
  const context = {
    dictionary: {
      ro: {
        wait: 'așteaptă'
      }
    },
    question: 'park my car',
    math: {
      point: [11.08, 9.99]
    }
  }

  it('should replace values from context in 3 messages', () => {
    const messages = [
      'The word wait is translated as {dictionary.ro.wait}',
      'Where can I {question}?',
      'This point has the following coordinates: {math.point}'
    ]
    const expected = [
      `The word wait is translated as ${context.dictionary.ro.wait}`,
      `Where can I ${context.question}?`,
      `This point has the following coordinates: ${context.math.point}`
    ]

    let i = 0
    for (; i < messages.length; i++) {
      assert.strict.equal(interpret(messages[i], context), expected[i])
    }

    if (i !== messages.length) {
      assert.fail(`Expected ${messages.length} tests but got ${i}`)
    }
  })

  it('should return text unchanged if placeholders are not in context', () => {
    const message = 'How long do I have to {dictionary.en.wait}?'
    assert.strict.equal(interpret(message, context), message)
  })

  it('should return text unchanged if placeholders are used wrong', () => {
    const message = 'Is this a { question }?'
    assert.strict.equal(interpret(message, context), message)
  })
})
