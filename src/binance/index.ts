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

export class Binance {
  constructor(
    private readonly apiKey: string,
    private readonly secretKey: string
  ) {}

  public retrievePrice(symbol: string) {
    return this.query(
      '/api/v3/ticker/price',
      {
        symbol,
      },
      BinanceSecurity.NONE
    );
  }

  private sign(params: any) {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(qs.stringify(params))
      .digest('hex');
  }

  private async query(
    endpoint: string,
    params: any,
    security: BinanceSecurity
  ) {
    console.log('>', endpoint, ' :', JSON.stringify(params));
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

    return (
      await Axios.get(process.env.BINANCE_BASE_URL + endpoint, {
        headers,
        params: fullParams,
      })
    ).data.price;
  }
}
