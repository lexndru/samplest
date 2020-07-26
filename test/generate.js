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

const { generateContent } = require('../samplest')

describe('Generate content as string, string[], object, object[]', () => {
  const testObject = {
    context: {
      string: 'one line of text'
    },
    lines: {
      1: 'First',
      2: 'Second',
      3: 'Third'
    },
    available: {
      yes: 'available',
      no: 'not available'
    }
  }

  it('should return string from a JSON string', () => {
    const data = JSON.stringify('Testing content generator with {context.string}')
    const expect = `Testing content generator with ${testObject.context.string}`
    const result = generateContent(data, testObject)
    assert.strict.equal(result, expect)
  })

  it('should return string[] from a JSON string[]', () => {
    const data = JSON.stringify([
      '{lines.1} line generated',
      '{lines.2} line generated',
      '{lines.3} line generated'
    ])
    const expect = [
        `${testObject.lines['1']} line generated`,
        `${testObject.lines['2']} line generated`,
        `${testObject.lines['3']} line generated`
    ]

    const results = generateContent(data, testObject)

    let i = 0
    for (; i < expect.length; i++) {
      assert.strict.equal(results[i], expect[i])
    }

    if (i !== expect.length) {
      assert.fail(`Expected ${expect.length} lines, but got ${i}`)
    }
  })

  it('should return object from a JSON object', () => {
    const data = JSON.stringify({
      title: 'The lord of the rings',
      author: 'J. R. R. Tolkien',
      books: [
        'The Fellowship of the Ring is the {lines.1} book',
        'The Two Towers is the {lines.2} book',
        'The return of the King is the {lines.3} book'
      ]
    })

    const expected = {
      title: 'The lord of the rings',
      author: 'J. R. R. Tolkien',
      books: [
          `The Fellowship of the Ring is the ${testObject.lines['1']} book`,
          `The Two Towers is the ${testObject.lines['2']} book`,
          `The return of the King is the ${testObject.lines['3']} book`
      ]
    }

    const result = generateContent(data, testObject)
    assert.strict.equal(JSON.stringify(result), JSON.stringify(expected))
  })

  it('should return object[] from a JSON object[]', () => {
    const data = JSON.stringify([
      {
        title: 'The lord of the rings',
        books: [
          'The Fellowship of the Ring is the {lines.1} book',
          'The Two Towers is the {lines.2} book',
          'The return of the King is the {lines.3} book'
        ],
        store: 'print is {available.yes}; ebook is {available.yes}'
      },
      {
        title: 'The Hobbit',
        store: 'print is {available.yes}; ebook is {available.no}'
      },
      {
        title: 'The Silmarillion',
        store: 'ebook is {available.yes}'
      }
    ])

    const expected = [
      {
        title: 'The lord of the rings',
        books: [
          `The Fellowship of the Ring is the ${testObject.lines['1']} book`,
          `The Two Towers is the ${testObject.lines['2']} book`,
          `The return of the King is the ${testObject.lines['3']} book`
        ],
        store: `print is ${testObject.available.yes}; ebook is ${testObject.available.yes}`
      },
      {
        title: 'The Hobbit',
        store: `print is ${testObject.available.yes}; ebook is ${testObject.available.no}`
      },
      {
        title: 'The Silmarillion',
        store: `ebook is ${testObject.available.yes}`
      }
    ]

    const results = generateContent(data, testObject)

    assert.strict.equal(JSON.stringify(results), JSON.stringify(expected))
  })
})

describe('Generate random content and interpret placeholders', () => {
  const testObject = {
    username: 'lexndru',
    profile: {
      firstName: 'Alex',
      'e-mail': 'a@a.x'
    }
  }

  it('should generate fake content and correctly replace placeholder', () => {
    const data = JSON.stringify([
      'Hello, {profile.firstName}!',
      'I am {{name.firstName}}, the new {{name.jobTitle}}.',
      'Is your email still {profile.e-mail}?'
    ])

    const expected = [
      `Hello, ${testObject.profile.firstName}!`,
      'I am ([\\w]+), the new ([\\w\\s]+).',
      `Is your email still ${testObject.profile['e-mail']}?`
    ]

    const results = generateContent(data, testObject)

    let i = 0
    for (; i < expected.length; i++) {
      const pattern = new RegExp(expected[i], 'ig')
      assert.strict.equal(!!pattern.test(results[i]), true)
    }

    if (i !== expected.length) {
      assert.fail(`Expected ${expected.length} but got ${i}`)
    }
  })
})
