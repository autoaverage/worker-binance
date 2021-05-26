var q = 'tasks';
import * as amqpCm from 'amqp-connection-manager';
import * as amqp from 'amqplib';
import { log } from '../utils';

const QUEUE = 'orders';

export class Orders {
  private connection: amqp.Connection | undefined;
  private channel: amqp.Channel | undefined;

  constructor() {}

  async init() {
    return new Promise((resolve, reject) => {
      amqpCm.connect(['amqp://localhost:5672']);
      amqp.connect('amqp://localhost:5672').then((connection) => {
        this.connection = connection;
        connection
          .createChannel()
          .then((channel) => {
            this.channel = channel;
            channel
              .assertQueue(QUEUE, { durable: true })
              .then(() => {
                log(`${QUEUE} queue ready`);
                resolve(null);
              })
              .catch(reject);
          })
          .catch(reject);
      });
    });
  }

  create(order: any) {
    console.log('sending');
    this.channel?.sendToQueue(
      QUEUE,
      Buffer.from(
        JSON?.stringify({
          pattern: 'create',
          data: 'yolo',
        })
      )
    );
  }
}
