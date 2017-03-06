'use strict';

const AWS = require('aws-sdk');
const SQS = new AWS.SQS({apiVersion: '2012-11-05'});

class Lawos {
  constructor(queueName, options) {
    this.queueName = queueName;
    this.options = options || {};
    this.counter = 0;

    if (!this.options.step || this.options.step > 10 || this.options.step < 1) {
      this.options.step = 10;
    }
  }

  action(handler) {
    this.action = handler;

    return this;
  }

  continue(handler) {
    this.continue = handler;

    return this.done();
  }

  done() {
    return new Promise(done => {
      this.exit = done;

      this.run();
    });
  }

  delete(message) {
    return SQS.deleteMessage(
      {
        QueueUrl: this.queueName,
        ReceiptHandle: message.ReceiptHandle
      }
    ).promise();
  }

  run() {
    if (this.continue() == false) {
      return this.exit(this.counter);
    }

    SQS.receiveMessage(
      {
        MaxNumberOfMessages: this.options.step,
        MessageAttributeNames: [ "All" ],
        QueueUrl: this.queueName
      }
    ).promise().then(
      list => list.Messages
    ).then(
      list => new Promise(done => {
        const next = () => this.action(
          list.pop()
        ).then(
          this.delete.bind(this)
        ).then(
          message => this.counter += 1
        ).then(
          message => list.length === 0 ? done() : next()
        );

        next();
      })
    ).then(
      list => this.run()
    );
  }
}

module.exports.work = queueName => new Lawos(queueName);
