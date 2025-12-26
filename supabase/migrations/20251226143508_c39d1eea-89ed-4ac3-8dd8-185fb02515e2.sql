-- Add exclusion options to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS exclude_bibliographic boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS exclude_quoted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS exclude_small_sources boolean DEFAULT false;

-- Add currency setting (admin can change default currency)
INSERT INTO public.settings (key, value)
VALUES ('default_currency', 'USD')
ON CONFLICT (key) DO NOTHING;

-- Add currency symbol setting
INSERT INTO public.settings (key, value)
VALUES ('currency_symbol', '$')
ON CONFLICT (key) DO NOTHING;

-- Add currency exchange rate (for display purposes, admin can update)
INSERT INTO public.settings (key, value)
VALUES ('currency_exchange_rate', '1')
ON CONFLICT (key) DO NOTHING;