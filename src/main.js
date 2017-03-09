'use strict';

class Lawos {
  constructor(queueUrl, sqs, lambda) {
    this.maxMessages = 10;
    this.queueUrl = queueUrl;
    this.aws = {sqs: sqs, lambda: lambda};

    this.handler = {
      item: () => Promise.resolve(),
      list: () => Promise.resolve(),
    };

    this.metrics = {
      processed: 0,
      iteration: 0,
    };

    if (!this.queueUrl) {
      throw new Error('Missing URL for SQS Queue');
    }
  }

  __invoke(arn, data) {
    return new Promise(done => {
      this.aws.lambda.invoke(
        {
          FunctionName: arn,
          InvocationType: 'Event',
          LogType: 'None'
        },
        (err, res) => {
          done(res);
        }
      );
    })
  }

  __item(item) {
    if (typeof this.handler.item === 'string') {
      return this.__invoke(this.handler.item, item);
    }

    return this.handler.item(item);
  }

  __list(list) {
    if (typeof this.handler.list === 'string') {
      return this.__invoke(this.handler.list, list);
    }

    return this.handler.list(list);
  }

  delete(id) {
    return this.aws.sqs.deleteMessage(
      {
        QueueUrl: this.queueUrl,
        ReceiptHandle: id,
      }
    ).promise();
  }

  load() {
    return this.aws.sqs.receiveMessage(
      {
        MaxNumberOfMessages: this.maxMessages,
        MessageAttributeNames: ['All'],
        QueueUrl: this.queueUrl,
      }
    ).promise().then(
      data => {
        this.metrics.iteration += 1;

        return data;
      }
    ).then(
      list => list && list.Messages || this.quit()
    );
  }

  list(func) {
    this.handler.list = func;

    return this;
  }

  item(func) {
    this.handler.item = func;

    return this;
  }

  process(list) {
    return Promise.all(
      list.map(
        item => {
          this.metrics.processed += 1;

          return this.__item(item);
        }
      )
    ).then(
      () => list
    ).then(
      list => this.__list(list)
    ).then(
      Promise.all(
        list.map(
          item => this.delete(item.ReceiptHandle)
        )
      )
    ).then(
      () => list
    );
  }

  quit() {
    return Promise.resolve(this.metrics);
  }

  work(condition) {
    return condition().then(
      stop => {
        if (stop) {
          return this.quit();
        }

        return this.load().then(
          list => this.process(list)
        ).then(
          () => this.work(condition)
        );
      }
    ).catch(
      () => this.quit()
    );
  }
}

module.exports = Lawos;
