'use client';
import { useStore, type StoreState } from '@/lib/store';
import type { Vendor } from '@/lib/types';

/** Whole store (AppData + actions) plus the active vendor persona. */
export function useVendor(): { data: StoreState; vendorId: string; vendor: Vendor | undefined } {
  const data = useStore();
  const vendorId = data.personas.vendor;
  return { data, vendorId, vendor: data.vendors[vendorId] };
}
