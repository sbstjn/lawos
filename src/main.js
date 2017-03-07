'use strict';

class Lawos {
  constructor(queueUrl) {
    this.maxMessages = 10;
    this.queueUrl = queueUrl;

    this.handler = {
      item: data => Promise.resolve(),
      list: data => Promise.resolve()
    };

    this.metrics = {
      processed: 0,
      iteration: 0
    };

    if (!this.queueUrl) {
      throw new Error('Missing URL for SQS Queue')
    }
  }

  delete(id) {
    return this.sqs.deleteMessage(
      {
        QueueUrl: this.queueUrl,
        ReceiptHandle: id
      }
    ).promise();
  }

  load() {
    return this.sqs.receiveMessage(
      {
        MaxNumberOfMessages: this.maxMessages,
        MessageAttributeNames: [ 'All' ],
        QueueUrl: this.queueUrl
      }
    ).promise().then(
      data => {
        this.metrics.iteration += 1;

        return data;
      }
    ).then(
      list => list && list.Messages || this.quit()
    )
  }

  data(sqs) {
    this.sqs = sqs;

    return this;
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

          return this.handler.item(item)
        }
      )
    ).then(
      data => list
    ).then(
      this.handler.list
    ).then(
      Promise.all(
        list.map(
          item => this.delete(item.ReceiptHandle)
        )
      )
    ).then(
      data => list
    );
  }

  quit() {
    return Promise.resolve(this.metrics)
  }

  work(condition) {
    return condition().then(
      () => this.load().then(
        list => this.process(list)
      ).then(
        () => this.work(condition)
      )
    ).catch(
      () => this.quit()
    );
  }
}

module.exports = Lawos;