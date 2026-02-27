export const formatCurrency = (amount: number | string) => {
  const number = Number(amount) || 0;
  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};