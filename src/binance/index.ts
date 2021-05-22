import Axios from 'axios';
import * as crypto from 'crypto';
import qs from 'qs';

export enum BinanceSecurity {
  NONE,
  TRADE,
  USER_DATA,
  USER_STREAM,
  MARKET_DATA,
}

const cleanSymbol = (str: string) => (str || '').replace('/', '');

export class Binance {
  constructor(
    private readonly apiKey: string,
    private readonly secretKey: string
  ) {}

  public retrievePrice(symbol: string) {
    return this.query(
      '/api/v3/ticker/price',
      {
        symbol: cleanSymbol(symbol),
      },
      BinanceSecurity.NONE
    );
  }

  public retrieveAccount() {
    return this.query('/api/v3/account');
  }

  public retrieveTrades(symbol: string) {
    return this.query(
      '/api/v3/myTrades',
      { symbol: cleanSymbol(symbol) },
      BinanceSecurity.USER_DATA,
      'get'
    );
  }

  public async createPurchase(symbol: string, amount: number) {
    const payload: any = {
      symbol: cleanSymbol(symbol),
      quoteOrderQty: amount,
      side: 'BUY',
      type: 'MARKET',
      recvWindow: 50000,
    };
    return this.query('/api/v3/order', payload, BinanceSecurity.TRADE, 'post');
  }

  private sign(params: any) {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(qs.stringify(params))
      .digest('hex');
  }

  private async query(
    endpoint: string,
    params?: any,
    security: BinanceSecurity = BinanceSecurity.USER_DATA,
    method: 'get' | 'post' | 'delete' = 'get'
  ) {
    const fullParams = {
      ...params,
    };
    if ([BinanceSecurity.TRADE, BinanceSecurity.USER_DATA].includes(security)) {
      fullParams.timestamp = new Date().getTime();
      fullParams.signature = this.sign(fullParams);
    }
    const headers =
      BinanceSecurity.NONE === security
        ? undefined
        : { 'X-MBX-APIKEY': this.apiKey };

    const options = {
      headers: {
        'Content-Type': 'application/application/x-www-form-urlencoded',
        Accept: 'application/application/x-www-form-urlencoded',
        ...headers,
      },
      params: fullParams,
    };
    const res = await Axios[method](
      process.env.BINANCE_BASE_URL + endpoint,
      method === 'post' ? undefined : options,
      method === 'get' ? undefined : options
    );
    return res.data;
  }
}
