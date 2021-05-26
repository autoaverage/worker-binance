import * as amqp from 'amqp-connection-manager';

const QUEUE = 'orders';

export class Orders {
  private connection: amqp.AmqpConnectionManager | undefined;
  private channelWrapper: amqp.ChannelWrapper | undefined;

  constructor() {
    this.connection = amqp.connect(['amqp://localhost:5672']);
    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: function (channel: any) {
        return channel.assertQueue(QUEUE, { durable: true });
      },
    });
  }

  create(order: any) {
    this.channelWrapper?.sendToQueue(QUEUE, {
      pattern: 'create',
      data: 'yoltwice',
    });
  }
}
