import cron from 'cron';
import dotenv from 'dotenv';
import { v4 } from 'uuid';
import { Binance } from './binance';
import { Orders } from './orders';
import { averageFillPrice, delay, log } from './utils';

dotenv.config();

const binance = new Binance(
  process.env.BINANCE_API_KEY!,
  process.env.BINANCE_SECRET_KEY!
);

const ordersService = new Orders();

const asset = process.env.DCA_SYMBOL!.split('/')[0].trim();
const quoteAsset = process.env.DCA_SYMBOL!.split('/').pop()?.trim();
const amount = parseFloat(process.env.DCA_AMOUNT || '0');
const side = process.env.DCA_SIDE || 'BUY';
const minVariationPercent = parseFloat(
  process.env.DCA_MIN_VARIATION_PERCENT || '0'
);

const retrieveBalance = async () => {
  const { balances } = await binance.retrieveAccount();
  return balances.find(
    ({ asset: myAsset }: any) =>
      myAsset === (side === 'BUY' ? quoteAsset : asset)
  ).free;
};

const isPriceAveraged = async (price: number) => {
  const orders = await binance.retrieveTrades(process.env.DCA_SYMBOL!);
  if (minVariationPercent > 0) {
    const min = price - (minVariationPercent / 100) * price,
      max = price + (minVariationPercent / 100) * price;
    const matches = orders
      .filter((it: any) =>
        side === 'BUY' ? it.isBuyer === true : it.isBuyer === false
      )
      .filter((it: any) => it.price > min && it.price < max);
    if (matches.length > 0) {
      const m = matches[0];
      const changePercent =
        ((price - parseFloat(m.price)) / parseFloat(m.price)) * 100;
      log(
        `Already averaged at (${m.price}) for an amount of ${
          m.quoteQty
        } ${m.symbol.replace(asset, '')} (${changePercent.toFixed(4)}% change)`
      );
      return true;
    }
  }
  return false;
};

const execute = async () => {
  try {
    const { price } = await binance.retrievePrice(process.env.DCA_SYMBOL!);
    const balance = await retrieveBalance();
    log(`Current ${side === 'BUY' ? quoteAsset : asset} balance: ${balance}`);
    log(`Current price of ${process.env.DCA_SYMBOL}: ${price}`);
    if (!(await isPriceAveraged(parseFloat(price)))) {
      await executeOrder();
    }
  } catch (e) {
    log(e);
  }
};

const executeOrder = async () => {
  try {
    const purchase = await binance.createPurchase(
      process.env.DCA_SYMBOL!,
      amount,
      side
    );

    if (purchase) {
      const { orderId, cummulativeQuoteQty, fills } = purchase;
      ordersService.create({
        clientOrderId: purchase.clientOrderId,
        quantity: purchase.executedQty,
        quoteQuantity: purchase.cummulativeQuoteQty,
        averageFillQuoteAmount: averageFillPrice(fills),
        status: purchase.status,
        timestamp: purchase.transactTime,
        symbol: purchase.symbol,
        user: process.env.USER_ID || '',
        worker: process.env.WORKER_ID || '',
        side,
        errorCode: '0',
      });
      log(
        `(${orderId}) Executed ${side} order for ${cummulativeQuoteQty} ${quoteAsset} worth of ${asset} at an average price of ${averageFillPrice(
          fills
        )} ${quoteAsset}`
      );
    }
  } catch (e) {
    ordersService.create({
      clientOrderId: v4(),
      quantity: '0',
      quoteQuantity: '' + amount,
      status: 'ERROR',
      errorCode: e.response.data.code,
      timestamp: new Date().getTime(),
      symbol: asset + quoteAsset,
      user: process.env.USER_ID || '',
      worker: process.env.WORKER_ID || '',
      side,
      averageFillQuoteAmount: 0,
    });

    log(
      `Failed to execute ${side} order for ${amount} ${quoteAsset} worth of ${asset}. (${e.response.data.code}) ${e.response.data.msg}`
    );
  }
};

let isExecuting = false;
const cronjob = new cron.CronJob(process.env.DCA_CRON!, async () => {
  isExecuting = true;
  await execute();
  isExecuting = false;
});
cronjob.start();
log(
  `Started. Will execute a ${side} order for ${amount} ${quoteAsset} worth of ${asset} on the schedule defined by ${process
    .env.DCA_CRON!}`
);

process.on('SIGTERM', async () => {
  log('SIGTERM signal received. Stopping job and exiting.');
  cronjob.stop();
  while (isExecuting) {
    await delay(200);
  }
  process.exit(0);
});
