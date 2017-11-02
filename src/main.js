'use strict'

class Lawos {
  constructor (queueUrl, sqs, lambda) {
    this.maxMessages = 10
    this.queueUrl = queueUrl
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
      iteration: 0,
      failed: 0
    }

    if (!this.queueUrl) {
      throw new Error('Missing URL for SQS Queue')
    }
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
      list => {
        this.metrics.iteration += 1
        if (list && list.Messages) {
          return list.Messages
        }

        return this.quit()
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
    let results = []
    return Promise.all(
      list.map(
        item => {
          this.metrics.processed += 1

          return this.handleItem(item).then(result => {
            return {
              item,
              result,
              success: true
            }
          }).catch(error => {
            this.metrics.failed += 1

            return {
              item,
              error,
              success: false
            }
          })
        }
      )
    ).then(
      itemResults => {
        results = itemResults
      }
    ).then(
      // I'm unclear about the use case of handling the whole list vs item by item
      () => this.handleList(results.map(r => r.item))
    ).then(
      () => Promise.all(
        results.map(
          // only delete successful items
          result => result.success ? this.delete(result.item.ReceiptHandle) : null
        )
      )
    ).then(
      () => results
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
          .catch(e => {
            // make it bubble up
            throw e
          })
      }
    ).catch(
      err => {
        this.metrics.queueError = err
        this.quit()
      }
    )
  }
}

module.exports = Lawos
