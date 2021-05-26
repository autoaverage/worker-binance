import cron from 'cron';
import dotenv from 'dotenv';
import { Binance } from './binance';
import { Orders } from './orders';
import { averageFillPrice, delay, log } from './utils';

dotenv.config();

const binance = new Binance(
  process.env.BINANCE_API_KEY!,
  process.env.BINANCE_SECRET_KEY!
);

const ordersService = new Orders();
ordersService.init().then(() => {
  ordersService.create({});
});

const asset = process.env.DCA_SYMBOL!.split('/')[0].trim();
const quoteAsset = process.env.DCA_SYMBOL!.split('/').pop()?.trim();
const purchaseAmount = parseFloat(process.env.DCA_QUOTE_PURCHASE_AMOUNT || '0');
const minVariationPercent = parseFloat(
  process.env.DCA_MIN_VARIATION_PERCENT || '0'
);

const retrieveQuoteBalance = async () => {
  const { balances } = await binance.retrieveAccount();
  return balances.find(({ asset }: any) => asset === quoteAsset).free;
};

const isPriceAveraged = async (price: number) => {
  const orders = await binance.retrieveTrades(process.env.DCA_SYMBOL!);
  if (minVariationPercent > 0) {
    const min = price - (minVariationPercent / 100) * price,
      max = price + (minVariationPercent / 100) * price;
    const matches = orders.filter(
      (it: any) => it.price > min && it.price < max
    );
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
    const quoteAssetBalance = await retrieveQuoteBalance();
    if (quoteAssetBalance < purchaseAmount) {
      log(`Insufficient balance. Skipping.`);
      return;
    }
    log(`Current ${quoteAsset} balance: ${quoteAssetBalance}`);
    log(`Current price of ${process.env.DCA_SYMBOL}: ${price}`);
    if (!(await isPriceAveraged(parseFloat(price)))) {
      const purchase = await binance.createPurchase(
        process.env.DCA_SYMBOL!,
        purchaseAmount
      );
      if (purchase) {
        const { orderId, cummulativeQuoteQty, fills } = purchase;
        log(
          `(${orderId}) Purchased ${cummulativeQuoteQty} ${quoteAsset} worth of ${asset} at an average price of ${averageFillPrice(
            fills
          )} ${quoteAsset}`
        );
      }
    }

    // const b = await binance.retrieveBalances();
    // console.log(b);
  } catch (e) {
    log(e);
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
  `Started. Will purchase ${purchaseAmount} ${quoteAsset} worth of ${asset} on the schedule defined by ${process
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
