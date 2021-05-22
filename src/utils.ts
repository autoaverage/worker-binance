export const averageFillPrice = (fills: any[]) =>
  fills.reduce((sum, it) => parseFloat(it.price) * parseFloat(it.qty), 0) /
  fills.reduce((sum, it) => parseFloat(it.qty), 0);

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
