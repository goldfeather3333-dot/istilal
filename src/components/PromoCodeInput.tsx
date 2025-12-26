import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Tag, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PromoCodeInputProps {
  onApply: (discount: { percentage: number; credits: number; code: string }) => void;
  onRemove: () => void;
  appliedCode: string | null;
  baseTotal: number;
}

export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
  onApply,
  onRemove,
  appliedCode,
  baseTotal,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const validateAndApply = async () => {
    if (!code.trim() || !user) return;

    setLoading(true);
    try {
      // Check if promo code exists and is valid
      const { data: promoCode, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!promoCode) {
        toast.error(t('checkout.invalidPromoCode'));
        return;
      }

      // Check if expired
      if (promoCode.valid_until && new Date(promoCode.valid_until) < new Date()) {
        toast.error(t('checkout.promoCodeExpired'));
        return;
      }

      // Check if not yet valid
      if (promoCode.valid_from && new Date(promoCode.valid_from) > new Date()) {
        toast.error(t('checkout.invalidPromoCode'));
        return;
      }

      // Check max uses
      if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
        toast.error(t('checkout.invalidPromoCode'));
        return;
      }

      // Check if user already used this code
      const { data: existingUse } = await supabase
        .from('promo_code_uses')
        .select('id')
        .eq('promo_code_id', promoCode.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingUse) {
        toast.error(t('checkout.promoCodeUsed'));
        return;
      }

      // Apply the promo code
      onApply({
        percentage: promoCode.discount_percentage || 0,
        credits: promoCode.credits_bonus || 0,
        code: promoCode.code,
      });

      toast.success(t('checkout.promoCodeApplied'));
    } catch (error) {
      console.error('Promo code validation error:', error);
      toast.error(t('checkout.invalidPromoCode'));
    } finally {
      setLoading(false);
    }
  };

  if (appliedCode) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
        <Check className="h-4 w-4 text-green-500" />
        <span className="flex-1 text-sm font-medium text-green-600 dark:text-green-400">
          {appliedCode}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onRemove();
            setCode('');
          }}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm">{t('checkout.promoCode')}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('checkout.enterPromoCode')}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="pl-10"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                validateAndApply();
              }
            }}
          />
        </div>
        <Button
          onClick={validateAndApply}
          disabled={!code.trim() || loading}
          variant="outline"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t('checkout.apply')
          )}
        </Button>
      </div>
    </div>
  );
};
