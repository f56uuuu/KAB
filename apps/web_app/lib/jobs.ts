export type JobKind = 'ride' | 'delivery' | 'order';

export const TABLE: Record<JobKind, 'rides' | 'deliveries' | 'orders'> = {
  ride: 'rides',
  delivery: 'deliveries',
  order: 'orders',
};

export const ACTIVE: Record<JobKind, string[]> = {
  ride: ['REQUESTED', 'SEARCHING', 'ASSIGNED', 'ARRIVING', 'ARRIVED', 'STARTED'],
  delivery: ['CREATED', 'ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'],
  order: ['PLACED', 'PREPARING', 'DRIVER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'],
};

export const DONE: Record<JobKind, string> = { ride: 'COMPLETED', delivery: 'DELIVERED', order: 'DELIVERED' };

/** Customer-facing progress steps (for the timeline) */
export const STEPS: Record<JobKind, string[]> = {
  ride: ['SEARCHING', 'ASSIGNED', 'ARRIVED', 'STARTED', 'COMPLETED'],
  delivery: ['CREATED', 'ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'],
  order: ['PLACED', 'PREPARING', 'DRIVER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'],
};

export const CANCELLABLE: Record<JobKind, string[]> = {
  ride: ['REQUESTED', 'SEARCHING', 'ASSIGNED', 'ARRIVING'],
  delivery: ['CREATED', 'ASSIGNED'],
  order: ['PLACED', 'PREPARING'],
};

export function stepIndex(kind: JobKind, status: string) {
  const s = status === 'ARRIVING' ? 'ASSIGNED' : status === 'REQUESTED' ? 'SEARCHING' : status;
  return STEPS[kind].indexOf(s);
}

export function jobHref(kind: JobKind, id: number | string) {
  return kind === 'ride' ? `/ride/${id}` : kind === 'delivery' ? `/delivery/${id}` : `/order/${id}`;
}

export function isActive(kind: JobKind, status: string) {
  return ACTIVE[kind].includes(status);
}

export const STORE_EMOJI: Record<string, string> = {
  restaurant: 'plate',
  cafe: 'coffee',
  sweets: 'cake',
  grocery: 'cart',
  pharmacy: 'pharmacy',
  flowers: 'bouquet',
};

export const FOOD_CATS = ['restaurant', 'cafe', 'sweets'] as const;
export const MARKET_CATS = ['grocery', 'pharmacy', 'flowers'] as const;
