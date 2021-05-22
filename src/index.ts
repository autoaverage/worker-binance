import dotenv from 'dotenv';
import { Binance } from './binance';

dotenv.config();

const binance = new Binance(
  process.env.BINANCE_API_KEY!,
  process.env.BINANCE_SECRET_KEY!
);

const checkPrices = async () => {
  const res = await binance.retrievePrice(process.env.DCA_SYMBOL!);
};

setInterval(() => {
  checkPrices();
}, parseInt(process.env.DCA_INTERVAL_SECONDS || '4') * 1000);
