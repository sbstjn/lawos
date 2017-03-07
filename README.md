# lawos - Lambda Worker SQS

[![npm](https://img.shields.io/npm/v/lawos.svg)](https://www.npmjs.com/package/lawos)
[![license](https://img.shields.io/github/license/sbstjn/lawos.svg)](https://github.com/sbstjn/lawos/blob/master/LICENSE.md)
[![CircleCI](https://img.shields.io/circleci/project/github/sbstjn/lawos/master.svg)](https://circleci.com/gh/sbstjn/lawos)
[![Coveralls](https://img.shields.io/coveralls/sbstjn/lawos.svg)](https://coveralls.io/github/sbstjn/lawos)

Wrapper library to process messages from an Amazon SQS queue with an AWS Lambda worker function or just using your favorite other Node.js environment.

## Install

```bash
$ > npm install lawos
```

## Usage

```js
const Lawos = require('lawos');
const AWS = require('aws-sdk');
const SQS = new AWS.SQS({apiVersion: '2012-11-05'});

const Q = new Lawos('https://sqs.eu-west-1.amazonaws.com/xYz/test');
Q.data(SQS);

Q.item(item => new Promise(done => {
  console.log('Processed message', item.MessageId);

  done();
}));

Q.list(list => new Promise(done => {
  console.log('Processed list of', list.length, 'messages');

  done();
}));

module.exports.handler = function(event, context, callback) {
  Q.work(
    () => {
      if (context.getRemainingTimeInMillis() > 500) {
        return Promise.resolve();
      } else {
        return Promise.reject();
      }
    }
  ).then(
    data => {
      callback(null, data);
    }
  );
};
```

## License

Feel free to use the code, it's released using the [MIT license](https://github.com/sbstjn/lawos/blob/master/LICENSE.md).

## Contributors

- [Sebastian Müller](https://sbstjn.com)
