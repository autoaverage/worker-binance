import dotenv from 'dotenv';
import { Binance } from './binance';
import { averageFillPrice } from './utils';

dotenv.config();

const log = (...args: any[]) =>
  console.log(`${new Date().toISOString()}:`, ...args);

const binance = new Binance(
  process.env.BINANCE_API_KEY!,
  process.env.BINANCE_SECRET_KEY!
);

const asset = process.env.DCA_SYMBOL!.split('/')[0].trim();
const quoteAsset = process.env.DCA_SYMBOL!.split('/').pop()?.trim();
const purchaseAmount = parseFloat(process.env.DCA_QUOTE_PURCHASE_AMOUNT || '0');

const retrieveQuoteBalance = async () => {
  const { balances } = await binance.retrieveAccount();
  return balances.find(({ asset }: any) => asset === quoteAsset).free;
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
    const { orderId, cummulativeQuoteQty, fills } =
      await binance.createPurchase(process.env.DCA_SYMBOL!, purchaseAmount);
    log(
      `(${orderId}) Purchased ${cummulativeQuoteQty} ${quoteAsset} worth of ${asset} at an average price of ${averageFillPrice(
        fills
      )} ${quoteAsset}`
    );
    // const b = await binance.retrieveBalances();
    // console.log(b);
  } catch (e) {
    log(e);
  }
};

setInterval(() => {
  execute();
}, parseInt(process.env.DCA_INTERVAL_SECONDS || '4') * 1000);
