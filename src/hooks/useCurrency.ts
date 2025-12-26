import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrencySettings {
  currency: string;
  symbol: string;
  exchangeRate: number;
}

export function useCurrency() {
  const [settings, setSettings] = useState<CurrencySettings>({
    currency: 'USD',
    symbol: '$',
    exchangeRate: 1,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['default_currency', 'currency_symbol', 'currency_exchange_rate']);

      if (data) {
        const currencyData = data.find(s => s.key === 'default_currency');
        const symbolData = data.find(s => s.key === 'currency_symbol');
        const rateData = data.find(s => s.key === 'currency_exchange_rate');

        setSettings({
          currency: currencyData?.value || 'USD',
          symbol: symbolData?.value || '$',
          exchangeRate: parseFloat(rateData?.value || '1') || 1,
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const formatPrice = (priceUSD: number): string => {
    const convertedPrice = priceUSD * settings.exchangeRate;
    
    // Format based on currency
    if (settings.currency === 'IQD') {
      // Iraqi Dinar typically shown without decimals
      return `${settings.symbol}${Math.round(convertedPrice).toLocaleString()}`;
    }
    
    return `${settings.symbol}${convertedPrice.toFixed(2)}`;
  };

  const convertPrice = (priceUSD: number): number => {
    return priceUSD * settings.exchangeRate;
  };

  return {
    ...settings,
    loading,
    formatPrice,
    convertPrice,
  };
}
