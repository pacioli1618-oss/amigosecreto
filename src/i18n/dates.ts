import {useFormatter} from 'next-intl';

/**
 * The exchange date is a wall-clock date (groups.exchange_date): the 24th is the 24th for
 * everyone. It is formatted in UTC so no time-zone shift moves it a day; only the language
 * changes: "qui., 24 de dez.", "jue, 24 dic", "Thu, Dec 24".
 */
export function useFormatExchangeDate() {
  const format = useFormatter();
  return (date: string | null, style: 'short' | 'long' = 'short') => {
    if (!date) return '';
    return format.dateTime(new Date(`${date}T12:00:00Z`), {weekday: style, day: 'numeric', month: style, timeZone: 'UTC'});
  };
}

/** Money in the currency stored on the group (groups.currency). */
export function useFormatMoney() {
  const format = useFormatter();
  return (value: number, currency: string) =>
    format.number(value, {style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: value % 1 === 0 ? 0 : 2});
}
