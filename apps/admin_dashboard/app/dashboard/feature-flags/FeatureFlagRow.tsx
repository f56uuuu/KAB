'use client';

import { useTransition } from 'react';
import { setFlagStatus } from './actions';

const STATUSES: Array<'ON' | 'BETA' | 'OFF'> = ['ON', 'BETA', 'OFF'];

const STATUS_STYLE: Record<string, string> = {
  ON: 'bg-success text-white',
  BETA: 'bg-warning text-white',
  OFF: 'bg-gray-200 text-gray-600',
};

export function FeatureFlagRow({ flag }: { flag: any }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between border border-border rounded-xl p-4 bg-surface">
      <div>
        <p className="font-semibold text-secondary">{flag.key}</p>
        <p className="text-xs text-gray-500">
          {flag.country_code ? `Scoped to ${flag.country_code}` : 'Global (all countries)'}
        </p>
      </div>
      <div className="flex gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s}
            disabled={isPending}
            onClick={() => startTransition(() => setFlagStatus(flag.key, s))}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity ${
              flag.status === s ? STATUS_STYLE[s] : 'bg-gray-100 text-gray-400 hover:opacity-70'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
