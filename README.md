# lawos - Lambda Worker SQS

[![npm](https://img.shields.io/npm/v/lawos.svg)](https://www.npmjs.com/package/lawos)
[![license](https://img.shields.io/github/license/sbstjn/lawos.svg)](https://github.com/sbstjn/lawos/blob/master/LICENSE.md)
[![CircleCI](https://img.shields.io/circleci/project/github/sbstjn/lawos/master.svg)](https://circleci.com/gh/sbstjn/lawos)

Simple library to use an AWS Lambda function to process entries in an SQS queue. No tests available due to missing SQS mock, and lousy dependency handling of this library.

## Usage

```js
module.exports.handler = function(event, context, callback) {
  require('lawos').work(
    'https://sqs.eu-west-1.amazonaws.com/12345678900/lawos-queue', {
      step: 10
    }
  ).action(
    message => new Promise(done => {
      console.log('processing', message.MessageId);

      done(message);
    })
  ).continue(
    () => context.getRemainingTimeInMillis() > 500
  ).then(
    count => {
      console.log("Processed", count, "messages.");
    }
  );
};
```

## License

Feel free to use the code, it's released using the [MIT license](https://github.com/sbstjn/lawos/blob/master/LICENSE.md).

## Contributors

- [Sebastian Müller](https://sbstjn.com)
