'use strict'

class Lawos {
  constructor (queueUrlOrOptions, sqs, lambda, messagesPerIteration) {
    if (!queueUrlOrOptions) {
      throw new Error('No SQS Queue URL or options object')
    }

    this.maxMessages = 10

    if (typeof queueUrlOrOptions === 'object') {
      this.messagesPerIteration(queueUrlOrOptions.messagesPerIteration)
      this.queueUrl = queueUrlOrOptions.queueUrl
      this.sqs = queueUrlOrOptions.sqs
      this.lambda = queueUrlOrOptions.lambda
    } else {
      this.messagesPerIteration(messagesPerIteration)
      this.queueUrl = queueUrlOrOptions
    }

    this.aws = {
      sqs: sqs,
      lambda: lambda
    }

    this.handler = {
      item: () => Promise.resolve(),
      list: () => Promise.resolve()
    }

    this.metrics = {
      processed: 0,
      iteration: 0
    }

    if (!this.queueUrl) {
      throw new Error('Missing URL for SQS Queue')
    }
  }

  messagesPerIteration (numberOfMessages) {
    if (numberOfMessages >= 1 && numberOfMessages <= 10) {
      this.maxMessages = numberOfMessages
    }
    return this
  }

  invokeLambda (arn, data) {
    return new Promise(resolve => {
      this.aws.lambda.invoke(
        {
          FunctionName: arn,
          InvocationType: 'Event',
          LogType: 'None',
          Payload: JSON.stringify(data)
        },
        (err, res) => {
          resolve(err || res)
        }
      )
    })
  }

  handleKey (key, data) {
    if (typeof this.handler[key] === 'string') {
      return this.invokeLambda(this.handler[key], data)
    }

    return this.handler[key](data)
  }

  handleItem (item) {
    return this.handleKey('item', item)
  }

  handleList (list) {
    return this.handleKey('list', list)
  }

  delete (id) {
    return this.aws.sqs.deleteMessage(
      {
        QueueUrl: this.queueUrl,
        ReceiptHandle: id
      }
    ).promise()
  }

  load () {
    return this.aws.sqs.receiveMessage(
      {
        MaxNumberOfMessages: this.maxMessages,
        MessageAttributeNames: ['All'],
        QueueUrl: this.queueUrl
      }
    ).promise().then(
      data => {
        this.metrics.iteration += 1

        return data
      }
    ).then(
      list => {
        if (list && list.Messages) {
          return list.Messages
        }

        this.quit()
      }
    )
  }

  list (func) {
    this.handler.list = func

    return this
  }

  item (func) {
    this.handler.item = func

    return this
  }

  process (list) {
    return Promise.all(
      list.map(
        item => {
          this.metrics.processed += 1

          return this.handleItem(item)
        }
      )
    ).then(
      () => list
    ).then(
      data => this.handleList(data)
    ).then(
      Promise.all(
        list.map(
          item => this.delete(item.ReceiptHandle)
        )
      )
    ).then(
      () => list
    )
  }

  quit () {
    return Promise.resolve(this.metrics)
  }

  work (condition) {
    return condition().then(
      stop => {
        if (stop) {
          return this.quit()
        }

        return this.load().then(
          list => this.process(list)
        ).then(
          () => this.work(condition)
        )
      }
    ).catch(
      () => this.quit()
    )
  }
}

module.exports = Lawos
