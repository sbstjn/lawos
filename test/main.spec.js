/* For some reason Intellij Idea wasn't picking up the "envs" property in package.json */
/* eslint-env jest */
'use strict'

const Lawos = require('../')

it('is initialized with queue URL', () => {
  const Q = new Lawos('http://example.com')

  expect(Q.queueUrl).toBe('http://example.com')
})

it('fails without queue URL', () => {
  expect(() => new Lawos()).toThrow('')
})

it('can has default handler', () => {
  const Q = new Lawos('http://example.com')

  return Promise.all([
    Q.handler.item().then(data => expect(data).toBeUndefined()),
    Q.handler.list().then(data => expect(data).toBeUndefined())
  ])
})

it('can set item handler', () => {
  const Q = new Lawos('http://example.com')

  Q.item(
    item => new Promise(resolve => {
      resolve('test')
    })
  )

  return Q.handler.item().then(
    data => expect(data).toBe('test')
  )
})

it('can set list handler', () => {
  const Q = new Lawos('http://example.com')

  Q.list(
    list => new Promise(resolve => {
      resolve('test')
    })
  )

  return Q.handler.list().then(
    data => expect(data).toBe('test')
  )
})

it('can configure SQS handler', () => {
  const Q = new Lawos('http://example.com', {
    test: true
  })

  expect(Q.aws.sqs.test).toBeTruthy()
})

it('calls receiveMessage', () => {
  let counterReceive = 0

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(resolve => {
          counterReceive++
          resolve()
        })
      }
    }
  })

  return Q.load()
    .then(data => expect(counterReceive).toBe(1))
})

it('calls deleteMessage', () => {
  const Q = new Lawos('http://example.com', {
    deleteMessage: params => {
      return {
        promise: () => new Promise(resolve => {
          resolve('test')
        })
      }
    }
  })

  return Q.delete().then(
    data => expect(data).toBe('test')
  )
})

it('stops with condition resolve(true)', () => {
  let counterCalled = 0
  let counterDelete = 0
  let counterProcessed = 0

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(resolve => {
          counterCalled += 1
          resolve({Messages: [{}, {}]})
        })
      }
    },
    deleteMessage: params => {
      return {
        promise: () => new Promise(resolve => {
          counterDelete += 1
          resolve()
        })
      }
    }
  })

  Q.item(
    item => new Promise(resolve => {
      counterProcessed += 1
      resolve()
    })
  )

  return Q.work(
    () => Promise.resolve(true)
  )
    .then(() => {
      expect(Q.metrics.processed).toBe(0)
      expect(Q.metrics.iteration).toBe(0)
      expect(counterProcessed).toBe(0)
      expect(counterDelete).toBe(0)
      expect(counterCalled).toBe(0)
    })
})

it('stops with condition reject()', () => {
  let counterDelete = 0

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(resolve => resolve({Messages: [{}, {}]}))
      }
    },
    deleteMessage: params => {
      return {
        promise: () => new Promise(resolve => {
          counterDelete += 1

          resolve()
        })
      }
    }
  })

  Q.item(
    item => new Promise(resolve => {
      resolve()
    })
  )

  return Q.work(
    () => Promise.reject(new Error('Error'))
  )
    .then(() => {
      expect(Q.metrics.processed).toBe(0)
      expect(counterDelete).toBe(0)
    })
})

it('continues continues condition resolve(false)', () => {
  let data = [[{}, {}]]

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(resolve => resolve({ Messages: data.pop() }))
      }
    },
    deleteMessage: params => {
      return {
        promise: () => new Promise(resolve => resolve())
      }
    }
  })

  Q.item(item => Promise.resolve())

  return Q.work(
    () => Promise.resolve()
  ).then(
    () => expect(Q.metrics.processed).toBe(2)
  )
})

it('continues continues condition resolve()', () => {
  let counterDelete = 0

  let data = [[{}, {}]]

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(resolve => resolve({Messages: data.pop()}))
      }
    },
    deleteMessage: params => {
      return {
        promise: () => new Promise(resolve => {
          counterDelete += 1

          resolve()
        })
      }
    }
  })

  Q.item(
    item => new Promise(resolve => {
      resolve()
    })
  )

  return Q.work(
    () => Promise.resolve()
  )
    .then(() => {
      expect(Q.metrics.processed).toBe(2)
      expect(counterDelete).toBe(2)
    })
})

it('handles a response with no Messages', () => {
  let counterDelete = 0

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(resolve => resolve({}))
      }
    },
    deleteMessage: params => {
      return {
        promise: () => new Promise(resolve => {
          counterDelete += 1
          resolve()
        })
      }
    }
  })

  Q.item(
    item => new Promise(resolve => {
      resolve()
    })
  )

  return Q.work(
    () => Promise.resolve()
  ).then(
    () => {
      expect(Q.metrics.processed).toBe(0)
      expect(Q.metrics.iteration).toBe(1)
      expect(counterDelete).toBe(0)
      expect(Q.done).toBe(true)
    }
  )
})

it('work runs condition check and loads data', () => {
  let counter = 5
  let counterCalled = 0
  let counterProcessed = 0
  let counterProcessedList = 0
  let counterDelete = 0

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(resolve => {
          counterCalled += 1

          resolve({Messages: [{}, {}]})
        })
      }
    },
    deleteMessage: params => {
      return {
        promise: () => new Promise(resolve => {
          counterDelete += 1

          resolve()
        })
      }
    }
  })

  Q.item(
    item => new Promise(resolve => {
      counterProcessed += 1

      resolve()
    })
  )

  Q.list(
    list => new Promise(resolve => {
      counterProcessedList += 1

      resolve()
    })
  )

  return Q.work(
    () => {
      counter -= 1
      return Promise.resolve(counter < 0)
    }
  )
    .then(() => {
      expect(Q.metrics.iteration).toBe(5)
      expect(Q.metrics.processed).toBe(10)
      expect(counterCalled).toBe(5)
      expect(counterProcessed).toBe(10)
      expect(counterDelete).toBe(10)
      expect(counterProcessedList).toBe(5)
    })
})

it('trigger Lambda task to process message', () => {
  let counterCalled = 0
  let counterDelete = 0
  let counterLambda = 0

  let data = [[{}, {}, {}]]

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(resolve => {
          counterCalled += 1

          resolve({Messages: data.pop()})
        })
      }
    },
    deleteMessage: params => {
      return {
        promise: () => new Promise(resolve => {
          counterDelete += 1

          resolve()
        })
      }
    }
  }, {
    invoke: (params, callback) => {
      counterLambda += 1

      expect(params.FunctionName).toBe('fake-function-name')

      callback(null, {done: true})
    }
  })

  Q.item('fake-function-name')

  return Q.work(
    () => Promise.resolve()
  )
    .then(() => {
      expect(Q.metrics.processed).toBe(3)
      expect(Q.metrics.iteration).toBe(2)
      expect(counterLambda).toBe(3)
      expect(counterDelete).toBe(3)
      expect(counterCalled).toBe(2)
    })
})

/*
it('process real queue', () => {
  const AWS = require('aws-sdk');

  const Lambda = new AWS.Lambda({apiVersion: '2015-03-31'});
  const SQS = new AWS.SQS({apiVersion: '2012-11-05'});

  const Q = new Lawos('https://sqs.eu-west-1.amazonaws.com/AccountID/queueName', SQS, Lambda);

  Q.item('dev-lawos-serverless-task');

  return Q.work(() => Promise.resolve()).then(
    console.log
  );
}); */

it('only deletes resolved items', () => {
  const msgs = {
    Messages: [
      { ReceiptHandle: 'a' },
      { ReceiptHandle: 'b' },
      { ReceiptHandle: 'c' }
    ]
  }

  const Q = new Lawos('http://example.com', {})
  Q.delete = jest.fn().mockReturnValue(Promise.resolve())
  Q.handleList = jest.fn().mockReturnValue(Promise.resolve())

  // mocking this in order to verify the `this.metrics.process += 1`
  Q.aws.sqs.receiveMessage = jest.fn().mockReturnValue({
    promise: jest.fn().mockReturnValueOnce(Promise.resolve(msgs))
  })

  Q.item(item => {
    if (item.ReceiptHandle === 'b') {
      return Promise.reject(new Error('some error'))
    }
    return Promise.resolve()
  })

  const work = jest.fn()
    .mockReturnValueOnce(Promise.resolve(false))
    .mockReturnValue(Promise.resolve(true))

  return Q.work(work).then((stats) => {
    expect(stats.processed).toBe(3)
    expect(stats.failed).toBe(1)
    expect(stats.iteration).toBe(1)
    expect(Q.delete).toHaveBeenCalledTimes(2)
    expect(Q.delete).toHaveBeenCalledWith('a')
    expect(Q.delete).not.toHaveBeenCalledWith('b')
    expect(Q.delete).toHaveBeenCalledWith('c')
  })
})
