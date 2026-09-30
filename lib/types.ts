// Domain types for Printloom. All money values are stored in BDT (number, taka).

export type Role = 'customer' | 'vendor' | 'designer' | 'admin';
export type Currency = 'BDT' | 'USD';

export type Category =
  | 'tshirt'
  | 'polo'
  | 'hoodie'
  | 'jersey'
  | 'mug'
  | 'tote'
  | 'poster'
  | 'phonecase'
  | 'cap';

export type View = 'front' | 'back' | 'left_sleeve' | 'right_sleeve' | 'wrap';
export type SizeTier = 'small' | 'medium' | 'large' | 'full';
export type PrintMethod = 'DTG' | 'DTF' | 'screen' | 'sublimation' | 'embroidery' | 'UV';
export type QualityTier = 'basic' | 'standard' | 'premium';
export type SizeSystem = 'apparel' | 'none' | 'poster' | 'device' | 'mug';

export type Division =
  | 'Dhaka'
  | 'Chattogram'
  | 'Sylhet'
  | 'Rajshahi'
  | 'Khulna'
  | 'Barishal'
  | 'Rangpur'
  | 'Mymensingh';

export interface Location {
  division: Division;
  city: string;
}

// ---------- Catalog ----------

export interface PrintArea {
  id: string;
  view: View;
  name: string;
  widthIn: number;
  heightIn: number;
  sizeTiers: SizeTier[];
}

export interface BaseProduct {
  id: string;
  name: string;
  category: Category;
  description: string;
  mockupSvg: Category; // key for MockupRenderer
  views: View[];
  printAreas: PrintArea[];
  sizeSystem: SizeSystem;
  sizes: string[];
  allowedMethods: PrintMethod[];
  popularity: number;
}

// ---------- Vendor ----------

export type VendorStatus = 'onboarding' | 'active' | 'paused';

export interface VendorSetup {
  profile: boolean;
  location: boolean;
  payout: boolean;
  firstOffering: boolean;
  deliveryZones: boolean;
  live: boolean;
}

export interface Vendor {
  id: string;
  shopName: string;
  logo: string; // emoji or short monogram
  logoColor: string;
  cover: string;
  location: Location;
  about: string;
  rating: number;
  reviewCount: number;
  status: VendorStatus;
  setup: VendorSetup;
  setupProgress: number; // 0..100
  payoutBalance: number;
  payoutMethod: string | null;
  pausedMessage: string;
  weeklyOffDay: number; // 0 = Sunday .. 6 = Saturday; Friday = 5
  badges: string[];
  joinedAt: string;
  onTimeRate: number;
  notificationPrefs: { email: boolean; sms: boolean; push: boolean };
  internalNotes?: Record<string, string>;
}

export interface NamedColor {
  name: string;
  hex: string;
}

export interface ColorGroup {
  id: string;
  name: string; // 'Light' | 'Dark' | 'Heather' | 'Neon' | custom
  colors: NamedColor[];
}

export interface Variant {
  id: string;
  color: string;
  size: string;
  enabled: boolean;
  stock: number | 'unlimited';
  priceOverride?: number;
  sku: string;
}

export interface QtyTier {
  minQty: number;
  discountPct: number;
}

export interface Promotion {
  id: string;
  name: string;
  type: 'percent' | 'flat';
  value: number; // percent, or BDT per unit
  appliesTo: string[] | 'all';
  minQty?: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export type PrintTable = Partial<Record<PrintMethod, Partial<Record<View, Partial<Record<SizeTier, number>>>>>>;

export interface PricingRules {
  basePrice: number;
  sizeUpcharge: Record<string, number>;
  colorGroupUpcharge: Record<string, number>;
  printTable: PrintTable;
  darkGarmentPrintUpcharge: number;
  extraAreaFee: number;
  screen: { perInkColor: number; setupFeePerScreen: number };
  embroidery: { upTo5k: number; upTo10k: number; upTo15k: number; digitizingFee: number };
  qtyTiers: QtyTier[];
  moq: number;
  promotions: Promotion[];
}

export interface ProductionRules {
  standardDays: Partial<Record<PrintMethod, number>>;
  rush: { available: boolean; days: number; feePct: number };
  dailyCapacity: number;
  bookedToday: number;
  cutoffTime: string; // 'HH:mm'
  weeklyOffDay: number;
}

export type ZoneKey = 'same_city' | 'same_division' | 'other';

export interface DeliveryZone {
  zone: ZoneKey;
  label: string;
  fee: number;
  days: number;
  served: boolean;
}

export interface DeliveryRules {
  zones: DeliveryZone[];
  perExtraItemFee: number;
  freeShippingThreshold: number | null;
  codAvailable: boolean;
  pickupAvailable: boolean;
}

export interface BlankSpec {
  brand: string;
  fabric: string;
  gsm: number;
  fit: string;
  qualityTier: QualityTier;
}

export type OfferingStatus = 'draft' | 'active' | 'paused';

export interface Offering {
  id: string;
  vendorId: string;
  productId: string;
  status: OfferingStatus;
  blank: BlankSpec;
  methods: PrintMethod[];
  colorGroups: ColorGroup[];
  variants: Variant[];
  pricing: PricingRules;
  production: ProductionRules;
  delivery: DeliveryRules;
  version: number;
  updatedAt: string;
}

// ---------- Designers and designs ----------

export interface Designer {
  id: string;
  name: string;
  avatar: string;
  cover: string;
  bio: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  acceptsRequests: boolean;
  startingPrice: number;
  turnaroundDays: number;
  revisionLimit: number;
  extraRevisionFee: number;
  earnings: number; // historical paid out earnings (seed)
  onboarded: boolean;
  followers: number;
  location: Location;
}

export type DesignStatus = 'draft' | 'published' | 'unpublished' | 'flagged' | 'removed';

export interface DesignFile {
  src: string;
  widthPx: number;
  heightPx: number;
  transparent: boolean;
  kind: 'svg' | 'png' | 'jpg';
}

export interface Design {
  id: string;
  designerId: string | null; // null for customer uploads saved as design
  title: string;
  description: string;
  files: DesignFile;
  tags: string[];
  compatibleCategories: Category[];
  royalty: { type: 'fixed'; amount: number };
  status: DesignStatus;
  uses: number;
  createdAt: string;
  isPrivate: boolean;
  ownerCustomerId?: string;
  palette: string[]; // for ink count estimate
}

// ---------- Customers ----------

export interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  division: Division;
  city: string;
  area: string;
  line: string;
}

export type PaymentMethod = 'bkash' | 'nagad' | 'card' | 'cod';

export interface Customer {
  id: string;
  name: string;
  avatar: string;
  email: string;
  addresses: Address[];
  defaultAddressId: string;
  favorites: string[]; // design ids
  savedPayments: { id: string; method: PaymentMethod; label: string }[];
}

// ---------- Customization and cart ----------

export interface Layer {
  id: string;
  kind: 'image' | 'text' | 'design';
  printAreaId: string;
  // geometry in inches, relative to the print area's top-left corner
  x: number;
  y: number;
  widthIn: number;
  heightIn: number;
  rotation: number;
  src?: string;
  designId?: string;
  text?: string;
  font?: string;
  fill?: string;
  fontSize?: number; // points relative to inch height, used by text tool
  align?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  outline?: string | null;
  pxWidth?: number;
  pxHeight?: number;
  transparent?: boolean;
  effectiveDpi?: number;
  outOfBounds: boolean;
  locked?: boolean;
  hidden?: boolean;
}

export interface Customization {
  productId: string;
  color: string;
  layers: Layer[];
  methodPreference?: PrintMethod;
  inkColors?: number; // screen print, confirmed by customer
}

export interface PriceSnapshot {
  unitAvg: number;
  lineTotal: number;
  offeringVersion: number;
  quotedAt: string;
}

export interface CartLine {
  id: string;
  customization: Customization;
  offeringId: string;
  method: PrintMethod;
  sizeBreakdown: Record<string, number>;
  rush: boolean;
  priceSnapshot: PriceSnapshot;
  acceptedLowQuality: boolean;
  thumbnail?: string;
  addedAt: string;
}

// ---------- Quotes ----------

export interface AreaSpec {
  areaId: string;
  view: View;
  name: string;
  tier: SizeTier;
  widthIn: number;
  heightIn: number;
}

export interface RoyaltyItem {
  designId: string;
  designerId: string;
  title: string;
  amount: number;
}

export interface QuoteInput {
  productId: string;
  offeringId: string;
  color: string;
  method: PrintMethod;
  sizeBreakdown: Record<string, number>;
  rush: boolean;
  areas: AreaSpec[];
  royalties: RoyaltyItem[];
  inkColors: number;
}

export interface AreaCost {
  areaId: string;
  view: View;
  name: string;
  tier: SizeTier;
  base: number;
  darkUpcharge: number;
  inkCost: number;
  stitchCost: number;
  stitchBand?: 'upTo5k' | 'upTo10k' | 'upTo15k';
  extraAreaFee: number;
  total: number;
}

export interface SizeQuote {
  size: string;
  qty: number;
  garment: number;
  garmentOverridden: boolean;
  sizeUpcharge: number;
  colorUpcharge: number;
  print: number;
  unitBeforeDiscount: number;
  tierDiscount: number;
  promoDiscount: number;
  rushFee: number;
  royalty: number;
  unitRaw: number;
  unit: number;
  total: number;
}

export interface OneTimeFee {
  label: string;
  amount: number;
}

export interface AvailableQuote {
  available: true;
  offeringId: string;
  vendorId: string;
  method: PrintMethod;
  color: string;
  colorGroup: string;
  qty: number;
  basePrice: number;
  sizes: SizeQuote[];
  areas: AreaCost[];
  printPerUnit: number;
  tier: QtyTier | null;
  nextTier: (QtyTier & { needed: number }) | null;
  promotion: { id: string; name: string; perUnit: number } | null;
  rushPct: number;
  royaltyPerUnit: number;
  royalties: RoyaltyItem[];
  royaltyTotal: number;
  oneTimeFees: OneTimeFee[];
  oneTimeTotal: number;
  lineTotal: number;
  unitAvg: number;
  commissionBase: number; // garment + print after discounts, promo, rush (per line, excl. royalties and one-time fees)
  productionDays: number;
  offeringVersion: number;
  warnings: string[];
}

export interface UnavailableQuote {
  available: false;
  offeringId: string;
  vendorId: string;
  reasons: string[];
}

export type PriceQuote = AvailableQuote | UnavailableQuote;

export interface Split {
  vendor: number;
  designers: { designerId: string; amount: number }[];
  platform: number;
}

export interface ShippingQuote {
  mode: 'delivery' | 'pickup';
  zone: ZoneKey | null;
  zoneLabel: string;
  served: boolean;
  baseFee: number;
  extraItemsFee: number;
  freeApplied: boolean;
  fee: number;
  remainingForFree: number | null;
  days: number;
}

export interface SubOrderQuote {
  vendorId: string;
  lines: AvailableQuote[];
  itemsTotal: number;
  qty: number;
  shipping: ShippingQuote;
  total: number;
  split: Split;
  royaltyTotal: number;
  commissionBase: number;
  oneTimeTotal: number;
}

// ---------- Orders ----------

export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'in_production'
  | 'quality_check'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'rejected_by_vendor'
  | 'reassigned'
  | 'refunded'
  | 'cancelled_by_customer'
  | 'issue_reported'
  | 'reprint'
  | 'partial_refund'
  | 'issue_rejected'
  | 'escalated';

export interface TimelineEvent {
  id: string;
  at: string;
  actor: Role | 'system';
  actorName: string;
  label: string;
  status?: OrderStatus | RequestStatus;
  note?: string;
}

export type IssueType = 'damaged' | 'wrong_item' | 'print_quality' | 'late';
export type IssueResolution = 'refund' | 'partial_refund' | 'reprint' | 'rejected';

export interface Issue {
  type: IssueType;
  photos: string[];
  note: string;
  desired: 'refund' | 'reprint';
  resolution?: IssueResolution;
  refundAmount?: number;
  rejectReason?: string;
  status: 'open' | 'resolved' | 'rejected' | 'escalated' | 'closed';
  adminDecision?: IssueResolution;
  reportedAt: string;
}

export interface OrderLine extends CartLine {
  quote: AvailableQuote;
}

export interface SubOrder {
  id: string;
  orderId: string;
  customerId: string;
  vendorId: string;
  lines: OrderLine[];
  shipping: ShippingQuote;
  itemsTotal: number;
  total: number;
  status: OrderStatus;
  timeline: TimelineEvent[];
  split: Split;
  issue?: Issue;
  rejectReason?: string;
  estDelivery: string;
  estShip: string;
  deliveredAt?: string;
  reviewed: boolean;
  reassignedTo?: string;
  refundAmount?: number;
  createdAt: string;
}

export interface Order {
  id: string;
  number: string;
  customerId: string;
  subOrderIds: string[];
  payment: { method: PaymentMethod; status: 'paid' | 'cod_pending' | 'refunded' | 'partially_refunded'; fee: number };
  address: Address;
  itemsTotal: number;
  shippingTotal: number;
  total: number;
  createdAt: string;
}

// ---------- Requests ----------

export type RequestStatus =
  | 'draft'
  | 'open'
  | 'sent'
  | 'proposals_received'
  | 'accepted'
  | 'in_progress'
  | 'delivered'
  | 'revision_requested'
  | 'approved'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'cancelled_by_customer';

export interface Proposal {
  id: string;
  designerId: string;
  price: number;
  days: number;
  note: string;
  sampleDesignId?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  at: string;
}

export interface Message {
  id: string;
  from: 'customer' | 'designer';
  authorId: string;
  text: string;
  at: string;
}

export interface Delivery {
  id: string;
  version: number;
  src: string;
  note: string;
  at: string;
}

export interface DesignRequest {
  id: string;
  customerId: string;
  designerId: string | null;
  title: string;
  brief: string;
  refs: string[];
  styleTags: string[];
  productId: string;
  use: string;
  budget: { min: number; max: number };
  deadline: string;
  status: RequestStatus;
  proposals: Proposal[];
  messages: Message[];
  deliveries: Delivery[];
  revisionsUsed: number;
  revisionLimit: number;
  extraRevisionFee: number;
  extraRevisionsPaid: number;
  escrowAmount: number;
  acceptedProposalId?: string;
  resultDesignId?: string;
  timeline: TimelineEvent[];
  createdAt: string;
}

// ---------- Other ----------

export interface Review {
  id: string;
  target: 'vendor' | 'designer';
  targetId: string;
  customerId: string;
  subOrderId?: string;
  requestId?: string;
  rating: number;
  text: string;
  reply?: string;
  at: string;
}

export interface Report {
  id: string;
  designId: string;
  reporterId: string;
  reason: 'copyright' | 'offensive' | 'other';
  note: string;
  status: 'open' | 'restored' | 'removed';
  at: string;
}

export interface Notification {
  id: string;
  personaId: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  at: string;
}

export interface PayoutRecord {
  id: string;
  ownerId: string; // vendor or designer id
  amount: number;
  method: string;
  status: 'paid' | 'processing';
  at: string;
}

export interface PlatformSettings {
  commissionPct: number;
  requestFeePct: number;
  codFeePct: number;
  usdRate: number; // BDT per USD
  fromPrice: { colorGroup: string; size: string; tier: SizeTier; view: View };
}

export interface Admin {
  id: string;
  name: string;
  avatar: string;
}

export interface Persona {
  id: string;
  role: Role;
  name: string;
  subtitle: string;
  avatar: string;
}

// ---------- App data (everything persisted in the demo store) ----------

export interface AppData {
  products: Record<string, BaseProduct>;
  vendors: Record<string, Vendor>;
  offerings: Record<string, Offering>;
  designers: Record<string, Designer>;
  designs: Record<string, Design>;
  customers: Record<string, Customer>;
  admins: Record<string, Admin>;
  orders: Record<string, Order>;
  subOrders: Record<string, SubOrder>;
  requests: Record<string, DesignRequest>;
  carts: Record<string, CartLine[]>; // by customer id
  reviews: Review[];
  reports: Report[];
  notifications: Notification[];
  payouts: PayoutRecord[];
  settings: PlatformSettings;
  seq: number; // running counter for ids and order numbers
}
