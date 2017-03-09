'use strict';

const Lawos = require('../');

it('is initialized with queue URL', () => {
  const Q = new Lawos('http://example.com');

  expect(Q.queueUrl).toBe('http://example.com');
});

it('fails without queue URL', () => {
  expect(() => new Lawos()).toThrow('')
})

it('can has default handler', () => {
  const Q = new Lawos('http://example.com');

  return Promise.all([
    Q.handler.item().then(data => expect(data).toBeUndefined()),
    Q.handler.list().then(data => expect(data).toBeUndefined()),
  ])
});

it('can set item handler', () => {
  const Q = new Lawos('http://example.com');

  Q.item(
    item => new Promise(done => {
      done('test');
    })
  );

  return Q.handler.item().then(
    data => expect(data).toBe('test')
  );
});

it('can set list handler', () => {
  const Q = new Lawos('http://example.com');

  Q.list(
    list => new Promise(done => {
      done('test');
    })
  );

  return Q.handler.list().then(
    data => expect(data).toBe('test')
  );
});

it('can configure SQS handler', () => {
  const Q = new Lawos('http://example.com', {
    test: true
  });

  expect(Q.aws.sqs.test).toBeTruthy();
});

it('calls receiveMessage', () => {
  var counterReceive = 0;

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(done => {
          counterReceive++;

          done();
        })
      }
    }
  });

  return Q.load().then(
    data => expect(counterReceive).toBe(1)
  );
});

it('calls deleteMessage', () => {
  const Q = new Lawos('http://example.com', {
    deleteMessage: params => {
      return {
        promise: () => new Promise(done => {
          done('test');
        })
      }
    }
  });

  return Q.delete().then(
    data => expect(data).toBe('test')
  );
});

it('stops with condition resolve(true)', () => {
  let counterCalled = 0;
  let counterDelete = 0;
  let counterProcessed = 0;

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(done => {
          counterCalled += 1;

          done({Messages: [{}, {}]});
        })
      }
    },
    deleteMessage: params => {
      return {
        promise: () => new Promise(done => {
          counterDelete += 1;

          done();
        })
      }
    }
  });

  Q.item(
    item => new Promise(done => {
      counterProcessed += 1;

      done();
    })
  );

  return Q.work(
    () => Promise.resolve(true)
  ).then(
    () => expect(Q.metrics.processed).toBe(0)
  ).then(
    () => expect(Q.metrics.iteration).toBe(0)
  ).then(
    () => expect(counterProcessed).toBe(0)
  ).then(
    () => expect(counterDelete).toBe(0)
  ).then(
    () => expect(counterCalled).toBe(0)
  );
});

it('stops with condition reject()', () => {
  let counterCalled = 0;
  let counterDelete = 0;

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(done => {
          counterCalled += 1;

          done({Messages: [{}, {}]});
        })
      }
    },
    deleteMessage: params => {
      return {
        promise: () => new Promise(done => {
          counterDelete += 1;

          done();
        })
      }
    }
  });

  Q.item(
    item => new Promise(done => {
      counterProcessed += 1;

      done();
    })
  );

  return Q.work(
    () => Promise.reject()
  ).then(
    () => expect(Q.metrics.processed).toBe(0)
  ).then(
    () => expect(counterDelete).toBe(0)
  );
});

it('continues continues condition resolve(false)', () => {
  let counterCalled = 0;
  let counterDelete = 0;
  let counterProcessed = 0;

  let data = [[{}, {}]];

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(done => {
          counterCalled += 1;

          done({Messages: data.pop()});
        })
      }
    },
    deleteMessage: params => {
      return {
        promise: () => new Promise(done => {
          counterDelete += 1;

          done();
        })
      }
    }
  });

  Q.item(
    item => new Promise(done => {
      counterProcessed += 1;

      done();
    })
  );

  return Q.work(
    () => Promise.resolve()
  ).then(
    () => expect(Q.metrics.processed).toBe(2)
  );
});

it('continues continues condition resolve()', () => {
  let counterCalled = 0;
  let counterDelete = 0;

  let data = [[{}, {}]];

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(done => {
          counterCalled += 1;

          done({Messages: data.pop()});
        })
      }
    },
    deleteMessage: params => {
      return {
        promise: () => new Promise(done => {
          counterDelete += 1;

          done();
        })
      }
    }
  });

  Q.item(
    item => new Promise(done => {
      counterProcessed += 1;

      done();
    })
  );

  return Q.work(
    () => Promise.resolve()
  ).then(
    () => expect(Q.metrics.processed).toBe(2)
  ).then(
    () => expect(counterDelete).toBe(2)
  );
});

it('work runs condition check and loads data', () => {
  let counter = 5;
  let counterCalled = 0;
  let counterProcessed = 0;
  let counterProcessedList = 0;
  let counterDelete = 0;

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(done => {
          counterCalled += 1;

          done({Messages: [{}, {}]});
        })
      }
    },
    deleteMessage: params => {
      return {
        promise: () => new Promise(done => {
          counterDelete += 1;

          done();
        })
      }
    }
  });

  Q.item(
    item => new Promise(done => {
      counterProcessed += 1;

      done();
    })
  );

  Q.list(
    list => new Promise(done => {
      counterProcessedList += 1;

      done();
    })
  );

  return Q.work(
    () => {
      counter -= 1;
      return Promise.resolve(counter < 0)
    }
  ).then(
    () => expect(Q.metrics.iteration).toBe(5)
  ).then(
    () => expect(Q.metrics.processed).toBe(10)
  ).then(
    () => expect(counterCalled).toBe(5)
  ).then(
    () => expect(counterProcessed).toBe(10)
  ).then(
    () => expect(counterDelete).toBe(10)
  ).then(
    () => expect(counterProcessedList).toBe(5)
  );
});

it('trigger Lambda task to process message', () => {
  let counterCalled = 0;
  let counterDelete = 0;
  let counterProcessed = 0;
  let counterLambda = 0;

  let data = [[{}, {}, {}]];

  const Q = new Lawos('http://example.com', {
    receiveMessage: params => {
      return {
        promise: () => new Promise(done => {
          counterCalled += 1;

          done({Messages: data.pop()});
        })
      }
    },
    deleteMessage: params => {
      return {
        promise: () => new Promise(done => {
          counterDelete += 1;

          done();
        })
      }
    }
  }, {
    invoke: (params, callback) => {
      counterLambda += 1;

      expect(params.FunctionName).toBe('fake-function-name');

      callback(null, {done: true});
    }
  });

  Q.item('fake-function-name');

  return Q.work(
    () => Promise.resolve()
  ).then(
    () => expect(Q.metrics.processed).toBe(3)
  ).then(
    () => expect(Q.metrics.iteration).toBe(2)
  ).then(
    () => expect(counterLambda).toBe(3)
  ).then(
    () => expect(counterDelete).toBe(3)
  ).then(
    () => expect(counterCalled).toBe(2)
  );
});

/*
it('process real queue', () => {
  const AWS = require('aws-sdk');

  const Lambda = new AWS.Lambda({apiVersion: '2015-03-31'});
  const SQS = new AWS.SQS({apiVersion: '2012-11-05'});

  const Q = new Lawos('https://sqs.eu-west-1.amazonaws.com/xYz/lawos-test', SQS, Lambda);

  Q.item('dev-lawos-serverless-task');

  return Q.work(() => Promise.resolve()).then(
    console.log
  );
}); */
