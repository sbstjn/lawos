# lawos - Lambda Worker SQS

[![npm](https://img.shields.io/npm/v/lawos.svg)](https://www.npmjs.com/package/lawos)
[![license](https://img.shields.io/github/license/sbstjn/lawos.svg)](https://github.com/sbstjn/lawos/blob/master/LICENSE.md)
[![CircleCI](https://img.shields.io/circleci/project/github/sbstjn/lawos/master.svg)](https://circleci.com/gh/sbstjn/lawos)
[![Coveralls](https://img.shields.io/coveralls/sbstjn/lawos.svg)](https://coveralls.io/github/sbstjn/lawos)

Library to process messages from an Amazon SQS queue with an AWS Lambda worker function or your favorite other JavaScript environment. Works fine with [Serverless](https://github.com/sbstjn/lawos-serverless) …

## Examples

- [Serverless Amazon SQS Worker with AWS Lambda](https://sbstjn.com/serverless-sqs-worker-with-aws-lambda.html)
- [Basic usage with AWS Lambda and Serverless](https://github.com/sbstjn/lawos-serverless)

## Install

```bash
$ > npm install lawos
```

## Usage

### Promise for every message

```js
const AWS = require('aws-sdk');
const SQS = new AWS.SQS({apiVersion: '2012-11-05'});

const Lawos = require('lawos');
const Q = new Lawos('https://sqs.eu-west-1.amazonaws.com …', SQS);

Q.item(
  item => new Promise(done => {
    done();
  })
);

module.exports.handler = function(event, context, callback) {
  Q.work(
    () => Promise.resolve(context.getRemainingTimeInMillis() < 500)
  ).then(
    data => {
      callback(null, data);
    }
  );
};
```

### Promise for a batch of messages

```js
const AWS = require('aws-sdk');
const SQS = new AWS.SQS({apiVersion: '2012-11-05'});

const Lawos = require('lawos');
const Q = new Lawos('https://sqs.eu-west-1.amazonaws.com …', SQS);

Q.list(
  list => new Promise(done => {
    done();
  })
);

module.exports.handler = function(event, context, callback) {
  Q.work(
    () = Promise.resolve(context.getRemainingTimeInMillis() < 500)
  ).then(
    data => {
      callback(null, data);
    }
  );
};
```

### Use AWS Lambda instead of Promise

```js
const AWS = require('aws-sdk');
const Lawos = require('lawos');

const Lambda = new AWS.Lambda({apiVersion: '2015-03-31'});
const SQS = new AWS.SQS({apiVersion: '2012-11-05'});

const Q = new Lawos('https://sqs.eu-west-1.amazonaws.com …', SQS, Lambda);

Q.item('fake-function-name');
// Q.list('fake-function-name');

module.exports.handler = function(event, context, callback) {
  Q.work(
    () = Promise.resolve(context.getRemainingTimeInMillis() < 500)
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
