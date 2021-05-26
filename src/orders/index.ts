import * as amqp from 'amqp-connection-manager';

const QUEUE = 'orders';

export interface OrderCreatePayload {
  symbol: string;
  clientOrderId: string;
  timestamp: number;
  quantity: string;
  quoteQuantity: string;
  status: string;
  user: string;
}
export class Orders {
  private connection: amqp.AmqpConnectionManager | undefined;
  private channelWrapper: amqp.ChannelWrapper | undefined;

  constructor() {
    this.connection = amqp.connect(
      (process.env.RMQ_URLS || 'amqp://localhost:5672')
        .split(',')
        .map((it) => it.trim())
    );
    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: function (channel: any) {
        return channel.assertQueue(QUEUE, { durable: true });
      },
    });
  }

  create(order: OrderCreatePayload) {
    this.channelWrapper?.sendToQueue(QUEUE, {
      pattern: 'create',
      data: order,
    });
  }
}
