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

const { ContextManager } = require('../lib')

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
    },
    array1: ['samplest', 'api', 'mockup'],
    array2: [
      {
        id: 101
      },
      {
        id: 102
      },
      {
        id: 103
      }
    ]
  }

  it('should return null if field does not exist', async () => {
    const ctx = new ContextManager(testObject)
    const value = ctx.get('something.x')
    assert.strict.equal(value, null)
  })

  it('should return correct unicode value if field exist', async () => {
    const ctx = new ContextManager(testObject)
    assert.strict.deepEqual(ctx.get('something.a'), 'așteaptă')
    assert.strict.deepEqual(ctx.get('something.b'), 'bicicletă')
    assert.strict.deepEqual(ctx.get('something.c'), 'copyright ©')
  })

  it('should return appropriate representation of value only', async () => {
    const ctx = new ContextManager(testObject)
    assert.strict.deepEqual(ctx.get('x.list'), [1, 2, 3])
    assert.strict.deepEqual(ctx.get('x.bool'), true)
    assert.strict.deepEqual(ctx.get('x.year'), 2020)
    assert.strict.deepEqual(ctx.get('x.text'), 'samplest')
    assert.strict.deepEqual(ctx.get('array1.*'), ['samplest', 'api', 'mockup'])
    assert.strict.deepEqual(ctx.get('array2.*.id'), [101, 102, 103])
  })
})

describe('Change fields in objects and check new values', () => {
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
    },
    array1: ['samplest', 'api', 'mockup'],
    array2: [
      {
        id: 1
      },
      {
        id: 2
      },
      {
        id: 3
      }
    ]
  }

  it('should create a new field if it does not exist', () => {
    const copy = JSON.parse(JSON.stringify(testObject))
    const data = 'created a new field'
    copy.something.x = data

    const ctx = new ContextManager(testObject)
    ctx.set('something.x', () => data)

    assert.strict.equal(testObject.something.x, data)
    assert.strict.deepEqual(testObject, copy)
  })

  it('should update list and text values for existing fields', () => {
    const copy = JSON.parse(JSON.stringify(testObject))
    const list = [4, 5, 6, 7, 8, 9]
    const text = 'field has been updated'
    copy.x.list = copy.x.list.concat(list)
    copy.x.text = text

    const ctx = new ContextManager(testObject)
    ctx.set('x.list', (oldList) => oldList.concat(list))
    ctx.set('x.text', () => text)

    assert.strict.deepEqual(testObject.x.list, copy.x.list)
    assert.strict.deepEqual(testObject.x.text, text)
    assert.strict.deepEqual(testObject, copy)
  })

  it('should update all fields from an array', () => {
    const upperCaseText = ['SAMPLEST', 'API', 'MOCKUP']
    const newIds = [{ id: 101 }, { id: 202 }, { id: 303 }]

    const ctx = new ContextManager(testObject)
    ctx.set('array1.*', (each) => each.toUpperCase())
    ctx.set('array2.*.id', (each) => each * 100 + each)

    assert.strict.deepEqual(testObject.array1, upperCaseText)
    assert.strict.deepEqual(testObject.array2, newIds)
  })
})
