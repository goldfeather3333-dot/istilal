import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, DollarSign, Save } from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'IQD', symbol: 'د.ع', name: 'Iraqi Dinar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'JOD', symbol: 'د.أ', name: 'Jordanian Dinar' },
  { code: 'EGP', symbol: 'ج.م', name: 'Egyptian Pound' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
];

export const AdminCurrencySettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [symbol, setSymbol] = useState('$');
  const [exchangeRate, setExchangeRate] = useState('1');

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

        if (currencyData) setCurrency(currencyData.value);
        if (symbolData) setSymbol(symbolData.value);
        if (rateData) setExchangeRate(rateData.value);
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    const currencyInfo = CURRENCIES.find(c => c.code === newCurrency);
    if (currencyInfo) {
      setSymbol(currencyInfo.symbol);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert all settings
      const updates = [
        { key: 'default_currency', value: currency },
        { key: 'currency_symbol', value: symbol },
        { key: 'currency_exchange_rate', value: exchangeRate },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert(update, { onConflict: 'key' });
        
        if (error) throw error;
      }

      toast.success('Currency settings saved successfully');
    } catch (error) {
      console.error('Error saving currency settings:', error);
      toast.error('Failed to save currency settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Currency Settings
        </CardTitle>
        <CardDescription>
          Configure the default currency and exchange rate for pricing display
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default Currency</Label>
            <Select value={currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} - {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Currency Symbol</Label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="$"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Exchange Rate (1 USD = X {currency})</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            placeholder="1"
          />
          <p className="text-sm text-muted-foreground">
            {currency === 'USD' 
              ? 'Set to 1 for USD pricing' 
              : `Example: If 1 USD = 1,480 ${currency}, enter 1480`}
          </p>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium">Preview</p>
          <p className="text-lg">
            $10 USD = {symbol}{(10 * parseFloat(exchangeRate || '1')).toLocaleString()} {currency}
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Currency Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
