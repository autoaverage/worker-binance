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
  worker: string;
  side: string;
  errorCode: string;
  errorMessage: string;
  averageFillQuoteAmount: number;
}
export class Orders {
  private connection: amqp.AmqpConnectionManager | undefined;
  private channelWrapper: amqp.ChannelWrapper | undefined;

  constructor() {
    if (!process.env.RMQ_URLS) {
      throw new Error('process.env.RMQ_URLS not defined');
    }
    this.connection = amqp.connect(
      process.env.RMQ_URLS.split(',')
        .map((it) => it.trim())
        .filter((it) => it),
      {
        connectionOptions: {
          clientProperties: {
            connection_name: process.env.WORKER_ID,
          },
        },
      }
    );
    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: function (channel: any) {
        return channel.assertQueue(QUEUE, { durable: true });
      },
    });
  }

  create(order: OrderCreatePayload) {
    this.channelWrapper
      ?.sendToQueue(
        QUEUE,
        {
          pattern: 'create',
          data: order,
        },
        {
          persistent: true,
        }
      )
      .catch((e) => console.log('failed to send message to queue', e));
  }
}
