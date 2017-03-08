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

  expect(Q.sqs.test).toBeTruthy();
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

it('work runs condition check and stops', () => {
  const Q = new Lawos('http://example.com');

  return Q.work(
    () => Promise.reject()
  ).then(
    data => expect(data.processed).toBe(0)
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

      if (counter >= 0) {
        return Promise.resolve();
      }

      return Promise.reject();
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

/*
it('process real queue', () => {
  const AWS = require('aws-sdk');
  const SQS = new AWS.SQS({apiVersion: '2012-11-05'});

  const Q = new Lawos('https://sqs.eu-west-1.amazonaws.com/xYz/test');
  Q.data(SQS);

  Q.item(item => new Promise(done => {
    console.log(item.MessageId);

    done();
  }));

  Q.list(list => new Promise(done => {
    console.log(list.length);

    done();
  }));

  Q.work(() => Promise.resolve()).then(
    console.log
  );
}); */
