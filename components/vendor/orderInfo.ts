import { isLate } from '@/lib/selectors';
import { METHOD_LABEL } from '@/lib/pricing';
import type { AppData, SubOrder } from '@/lib/types';

export interface OrderInfo {
  number: string;
  city: string;
  customerName: string;
  qty: number;
  items: string;
  methods: string;
  late: boolean;
  dueSoon: boolean;
  due: string; // ship-by date for open orders, delivery estimate otherwise
}

const OPEN = ['placed', 'accepted', 'in_production', 'quality_check', 'reprint'];

export function orderInfo(data: AppData, sub: SubOrder, now = new Date()): OrderInfo {
  const order = data.orders[sub.orderId];
  const qty = sub.lines.reduce((t, l) => t + l.quote.qty, 0);
  const names = [...new Set(sub.lines.map((l) => data.products[l.customization.productId]?.name ?? 'Item'))];
  const due = OPEN.includes(sub.status) ? sub.estShip : sub.estDelivery;
  const late = isLate(sub, now);
  const dueSoon = (OPEN.includes(sub.status) || sub.status === 'shipped') && new Date(due).getTime() - now.getTime() < 86400000;
  return {
    number: order?.number ?? sub.id,
    city: order?.address.city ?? '',
    customerName: data.customers[sub.customerId]?.name ?? 'Customer',
    qty,
    items: `${qty} x ${names.join(', ')}`,
    methods: [...new Set(sub.lines.map((l) => METHOD_LABEL[l.method]))].join(', '),
    late,
    dueSoon,
    due,
  };
}
