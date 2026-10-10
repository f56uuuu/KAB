'use client';

import { Bike, Clock, Star } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { money } from '@/lib/format';

export function StoreMeta({ store, currency, className = '' }: { store: any; currency: string; className?: string }) {
  const { t, locale } = useI18n();
  const free = Number(store.delivery_fee) === 0;
  return (
    <p className={`text-xs text-muted flex items-center gap-2.5 flex-wrap ${className}`}>
      <span className="flex items-center gap-1 text-fg font-bold">
        <Star className="w-3.5 h-3.5 fill-accent text-accent" />
        {Number(store.rating).toLocaleString(locale)}
      </span>
      <span className="flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        {t('common.min', { n: store.delivery_minutes })}
      </span>
      <span className={`flex items-center gap-1 ${free ? 'text-success font-bold' : ''}`}>
        <Bike className="w-3.5 h-3.5" />
        {free ? t('food.free_delivery') : money(store.delivery_fee, currency, locale)}
      </span>
    </p>
  );
}
