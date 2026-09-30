# Printloom (working name): Product Plan and One-Shot Build Spec

A clickable, frontend-only prototype of a three-sided custom print marketplace.

- **Customers** pick a product, design it (their own art, a marketplace design, or a commissioned one), choose a vendor, pay, and track delivery.
- **Vendors** (print shops) open a shop, define exactly which products, colors, sizes, print methods and prices they offer, and fulfil orders.
- **Designers** publish designs that earn royalties and take paid custom design requests.

No authentication and no backend. A demo layer lets the viewer switch between every role and persona and watch an action in one panel appear in the others.

How to use this file: hand the whole document to the coding agent (Claude Code / Antigravity) with the instruction "Build this spec in one pass. Follow section 2 rules and finish with the section 17 checklist passing."

---

## Table of contents

1. Market context and positioning
2. Rules for the builder
3. Stack and project structure
4. Design system
5. App shell and demo layer
6. Data model
7. Vendor offering and pricing model (core of the product)
8. Other business logic
9. Customer journey
10. Vendor panel
11. Designer panel
12. Admin panel
13. Cross-role event map
14. Edge cases
15. Microcopy
16. Accessibility and responsive rules
17. Acceptance checklist
18. Build order
19. UI references (Mobbin)

---

## 1. Market context and positioning

### 1.1 Existing players and what they do

| Player | Model | Who customizes | Who picks the printer | Designers in the loop |
|---|---|---|---|---|
| Printify | B2B network of 100+ independent print providers; sellers pick a provider per product | Store owner | Store owner (hidden from buyer) | No |
| Printful | B2B, own production facilities, consistent quality, higher base cost | Store owner | Printful | No |
| Gelato | B2B, local production partners in 32 countries, routes to nearest partner | Store owner | Gelato (auto-routed) | No |
| Zazzle | B2C marketplace: Creators earn royalties on designs, Makers manufacture products, buyers personalize templates | Buyer | Zazzle / Maker | Yes (royalty, 5% to 50%) |
| Spreadshirt / Redbubble | B2C: design marketplace plus "create your own" | Buyer | Platform | Yes |
| Fiverr / Upwork | Custom work via requests and proposals | n/a | n/a | Yes (commissions) |
| Bangladesh locals (RabX, Dorji-e, Jersey Club BD, Diadye) | Single-vendor shops; many still work by "email us your design"; Fabrilife's self-design tool is currently paused | Buyer (basic) | Fixed (the shop itself) | In-house only |

### 1.2 The gap Printloom fills

Nobody combines all four of these in one consumer-facing product:

1. A real customizer the buyer uses directly (Zazzle level, not "email us your file").
2. **Open vendor competition visible to the buyer** on the buyer's exact configuration: price, speed, rating, distance (Printify's provider choice, but moved to the consumer and made transparent).
3. A designer marketplace with royalties (Zazzle / Redbubble).
4. Commissioned custom design inside the order flow (Fiverr, but tied to a product).

### 1.3 Positioning statement

"Design anything, printed by the best local shop for your exact order." Launch market: Bangladesh (BDT, bKash / Nagad / card / COD, division-based delivery zones). Currency is switchable to USD for demo purposes.

### 1.4 Design principles derived from the market

- **Price is always for the exact configuration.** Competitors show "from" prices that change at checkout. Printloom shows a live, itemized price that never surprises.
- **Recommend, then let them switch.** Most buyers do not want to evaluate vendors; show one recommended vendor with the reason, and a comparison sheet on demand.
- **Print quality is guarded before payment,** not after (DPI meter, print-area bounds, proof preview).
- **Bulk and group orders are first-class** (teams, events, offices are the biggest local demand): one design, a size breakdown grid, quantity tier pricing.

---

## 2. Rules for the builder (read first)

1. Build everything in one pass. Frontend only. All data mocked and stored client-side.
2. **No dead ends.** Every button navigates, changes state, or shows a toast. No `href="#"`, no "coming soon", no lorem ipsum in visible UI.
3. **One shared store** across roles. Section 13 lists every cross-role effect that must work.
4. **All prices come from one pricing engine** (`lib/pricing.ts`, section 7). No component computes price on its own.
5. Every list and panel has: empty state, loading skeleton (fake 300 to 500 ms delay on first mount), and error state where an action can fail.
6. Fully responsive from 375px to 1440px. Customer side is mobile-first; vendor, designer and admin panels are desktop-first but usable on mobile.
7. Never use em dashes in UI copy.
8. Type everything (TypeScript strict). No `any` in the domain layer.
9. Finish with every item in section 17 passing, and no console errors.

---

## 3. Stack and project structure

- Next.js 14+ App Router, TypeScript strict
- Tailwind CSS, shadcn/ui, lucide-react icons, Framer Motion
- Zustand with `persist` (localStorage, versioned key `printloom-demo-v1`) and `immer`
- react-konva for the customizer canvas and print-file export
- Recharts for dashboards
- `@tanstack/react-table` for vendor, designer and admin tables
- `canvas-confetti` for the order-placed moment
- Vitest for the pricing engine and state-machine unit tests

```
/app
  /(customer)            storefront, catalog, product, customize, cart, checkout, orders, requests, account, vendor storefronts, designer profiles
  /vendor                dashboard, onboarding, offerings, offerings/[id], orders, orders/[id], issues, reviews, payouts, settings
  /designer              dashboard, onboarding, designs, designs/new, designs/[id], requests, requests/[id], earnings, profile
  /admin                 overview, orders, moderation, disputes, settings
  /journeys              journey map
/components
  /ui                    shadcn primitives
  /shared                PriceBreakdown, StatusPill, Timeline, EmptyState, RoleBadge, MockupRenderer, ColorSwatch, SizeChip, Rating, MoneyText
  /customizer            CanvasStage, LayersPanel, TextTool, UploadTool, LibraryTool, DpiMeter, PrintAreaTabs, SizeBreakdownGrid
  /vendor                VariantMatrix, PriceRuleEditor, PrintPricingTable, QtyTierEditor, ZoneTable, PriceSimulator, OrderKanban
  /designer              DesignUploader, MockupPreviewStrip, ProposalForm, DeliveryUploader
  /demo                  DemoBar, PersonaSwitcher, SimulateMenu, NotificationCenter
/lib
  types.ts  seed.ts  store.ts  pricing.ts  vendorMatch.ts  stateMachines.ts  dpi.ts  money.ts  events.ts
/public/mockups          SVG blanks with recolorable fill layer
/public/designs          30 bundled designs (SVG and transparent PNG)
```

---

## 4. Design system

### 4.1 Direction

Eye candy but usable: bold, saturated, character-driven. Clean neutral surfaces carry vivid accents, playful illustrated empty states, big rounded cards, soft layered shadows, and purposeful motion. Product imagery and designs are the hero; chrome stays quiet.

### 4.2 Tokens (CSS variables, light and dark)

- **Neutrals:** `--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-muted`
- **Role accents** (so the viewer always knows which panel they are in):
  - Customer: electric violet `#6D4AFF`
  - Vendor: tangerine `#FF7A1A`
  - Designer: hot pink `#FF3D8B`
  - Admin: teal `#0FB5A6`
- **Semantic:** success `#16A34A`, warning `#F59E0B`, danger `#EF4444`, info `#3B82F6`
- **Radius:** 12 (inputs), 16 (cards), 24 (sheets, hero cards), full (chips)
- **Shadow:** 3 levels, soft and slightly tinted with the role accent on hover
- **Spacing:** 4px base scale

### 4.3 Typography

- Display: Clash Display (fallback Space Grotesk) for headings and prices
- UI: Inter
- Numbers: tabular figures for every price and quantity

### 4.4 Motion

- Page transitions: 180 ms fade and 8px slide
- Price changes: number roll animation, 250 ms
- Add to cart: product thumbnail flies to the cart icon
- Order placed: confetti plus a success sheet
- Respect `prefers-reduced-motion`

### 4.5 Shared components

`StatusPill` (one color map for every status in section 8), `PriceBreakdown` (collapsible, itemized, used everywhere), `Timeline` (vertical, with timestamps and actor), `EmptyState` (illustration, one sentence, one action), `MoneyText` (formats BDT as `৳1,250` and USD as `$12.50`), `MockupRenderer` (recolors SVG blank, overlays design layers per print area).

---

## 5. App shell and demo layer

### 5.1 Demo Bar

A slim, dark, clearly "not part of the product" bar pinned to the top:

- **Role switcher:** Customer | Vendor | Designer | Admin (segmented control in role colors)
- **Persona switcher:** 3 customers (Dhaka, Chattogram, Sylhet), 4 vendors, 5 designers, 1 admin
- **Notifications bell** for the active persona (section 13 events)
- **Simulate menu:** shortcuts that trigger every edge case in section 14 (e.g. "Vendor runs out of Black / XL", "Designer delivers pending request", "Advance order to next status", "Price increase on Vendor 2", "Flag a design")
- **Journey map** link
- **Currency toggle** BDT / USD
- **Reset demo data** with confirm dialog

On mobile the Demo Bar collapses to a floating pill that opens a sheet.

### 5.2 Journey map (`/journeys`)

Three swimlanes (Customer, Vendor, Designer) plus Admin. Every screen is a card with a thumbnail, name and "Open as [persona]" button. Arrows show cross-role handoffs (order placed to vendor queue, request sent to designer inbox, design published to library).

---

## 6. Data model

```ts
// Catalog (platform-owned)
BaseProduct {
  id, name, category: 'tshirt'|'polo'|'hoodie'|'jersey'|'mug'|'tote'|'poster'|'phonecase'|'cap',
  mockupSvg, views: ('front'|'back'|'left_sleeve'|'right_sleeve'|'wrap')[],
  printAreas: PrintArea[],          // per view
  sizeSystem: 'apparel'|'none'|'poster'|'device',
  allowedMethods: PrintMethod[]
}
PrintArea { id, view, name, widthIn, heightIn, sizeTiers: ('small'|'medium'|'large'|'full')[] }
PrintMethod = 'DTG'|'DTF'|'screen'|'sublimation'|'embroidery'|'UV'

// Vendor
Vendor { id, shopName, logo, cover, location: {division, city}, about, rating, reviewCount,
         status: 'onboarding'|'active'|'paused', setupProgress, payoutBalance, joinedAt }
Offering { id, vendorId, productId, status: 'draft'|'active'|'paused',
           blank: {brand, fabric, gsm, fit, qualityTier: 'basic'|'standard'|'premium'},
           methods: PrintMethod[], colorGroups: ColorGroup[], variants: Variant[],
           pricing: PricingRules, production: ProductionRules, delivery: DeliveryRules,
           version, updatedAt }
ColorGroup { id, name: 'Light'|'Dark'|'Heather'|'Neon'|string, colors: {name, hex}[] }
Variant { id, color, size, enabled, stock: number|'unlimited', priceOverride?: number, sku }
// PricingRules, ProductionRules, DeliveryRules: see section 7

// Designs
Designer { id, name, avatar, cover, bio, tags, rating, acceptsRequests, startingPrice,
           turnaroundDays, revisionLimit, earnings }
Design { id, designerId, title, files: {src, widthPx, heightPx, transparent}, tags,
         compatibleCategories, royalty: {type:'fixed', amount}, status:
         'draft'|'published'|'unpublished'|'flagged'|'removed', uses, createdAt, isPrivate, ownerCustomerId? }

// Customization and cart
Customization { productId, color, view layers: Layer[], methodPreference?: PrintMethod }
Layer { id, kind: 'image'|'text'|'design', src?, designId?, text?, font?, fill?, x, y, scale,
        rotation, printAreaId, pxWidth?, pxHeight?, effectiveDpi?, outOfBounds: boolean }
CartLine { id, customization, offeringId, method, sizeBreakdown: {size: qty}, rush: boolean,
           priceSnapshot: PriceQuote, addedAt }

// Orders
Order { id, customerId, subOrders: SubOrder[], payment: {method, status}, address, createdAt }
SubOrder { id, vendorId, lines: CartLine[], shipping, status: OrderStatus, timeline: TimelineEvent[],
           split: {vendor, designers: {designerId, amount}[], platform}, issue?: Issue }
Issue { type: 'damaged'|'wrong_item'|'print_quality'|'late', photos, note,
        resolution?: 'refund'|'partial_refund'|'reprint'|'rejected', status }

// Requests
DesignRequest { id, customerId, designerId|null, brief, refs, productId, budget, deadline, status,
                proposals: Proposal[], messages: Message[], deliveries: Delivery[],
                revisionsUsed, revisionLimit, escrowAmount }
Proposal { id, designerId, price, days, note, status }

// Other
Review, Report, Notification { id, personaId, type, title, body, link, read, at }
```

### 6.1 Seed data

- 9 base products (tee, polo, hoodie, jersey, mug, tote, poster, phone case, cap)
- 4 vendors, deliberately different so comparison is interesting:

| Vendor | Location | Strength | Weakness |
|---|---|---|---|
| Dhaka Ink Lab | Dhaka | Cheapest, DTF + DTG, big color range | Rating 4.2, 4-day lead time |
| Ctg Thread Works | Chattogram | Premium 200 GSM blanks, embroidery, rating 4.8 | Most expensive, no neon colors |
| Sylhet Print House | Sylhet | Fastest (2 days), rush available | Sizes only S to XL, limited colors |
| Bulk Bros | Gazipur | Screen print, huge quantity discounts, MOQ 20 | Not worth it for single items; currently paused on mugs |

- 18 offerings with full variant matrices and pricing rules (section 7.9 gives one fully worked example)
- 5 designers, 30 designs (2 flagged, 2 unpublished, 3 private commissioned)
- 3 customers, 10 orders covering every status, 6 design requests covering every status, reviews for every vendor and designer, 12 notifications

---

## 7. Vendor offering and pricing model (core of the product)

Vendors do not sell "a t-shirt for ৳450". They sell a matrix of **blank quality x color x size x print method x print areas x print size x quantity x speed x delivery zone**, and each of these can change the price. This section defines exactly how an offering is configured and how every price is computed, so the customer always sees the true price for their exact configuration.

### 7.1 Layer 1: Blank and variants (what physically exists)

- **Blank spec:** brand, fabric, GSM, fit, quality tier. Shown to customers as badges ("200 GSM, combed cotton, Premium").
- **Colors** are organized into **color groups** (Light, Dark, Heather, Neon, custom). Groups exist because printing on dark garments costs more (white underbase for DTG/DTF, extra screen for screen print).
- **Sizes** follow the product's size system (XS to 5XL for apparel, 11oz / 15oz for mugs, A4 / A3 / A2 for posters, device models for phone cases).
- **Variant matrix:** every color x size combination is a `Variant` with `enabled`, `stock` (number or unlimited), optional `priceOverride`, and SKU.
- A vendor can offer a color in some sizes only (e.g. Neon Green only S to L).

### 7.2 Layer 2: Base garment price

For a variant:

```
garmentPrice(variant) =
  variant.priceOverride
  ?? pricing.basePrice
     + pricing.sizeUpcharge[variant.size]         // e.g. 2XL +40, 3XL +80, 4XL +120
     + pricing.colorGroupUpcharge[group(color)]   // e.g. Dark +30, Heather +20, Neon +50
```

`priceOverride` always wins, so a vendor can hand-price any single cell.

### 7.3 Layer 3: Print cost (per decorated area)

Each decorated print area is priced by **method** and **size tier** of the artwork's bounding box on that area:

| Size tier | Rule (artwork bounding box) |
|---|---|
| small | up to 4 x 4 in (logo, pocket) |
| medium | up to 8 x 10 in (A4-ish) |
| large | up to 12 x 16 in (A3-ish) |
| full | beyond large, or sublimation all-over |

`pricing.printTable[method][view][sizeTier] = amount`. The size tier is computed automatically from the layers in the customizer, so the price updates live as the customer resizes the artwork.

Method-specific extras:

- **DTG / DTF:** `darkGarmentPrintUpcharge` per area when the color is in a Dark group (white underbase).
- **Screen print:** price per ink color per area (`perInkColor`), plus a one-time `setupFeePerScreen` charged once per sub-order line, not per unit. The customizer asks the customer to confirm ink color count (auto-estimated from the design palette, editable).
- **Embroidery:** priced by stitch band (`upTo5k`, `upTo10k`, `upTo15k`), estimated from artwork area, plus one-time `digitizingFee`.
- **Sublimation:** only on Light group polyester blanks; if the customer picks a dark color, sublimation is unavailable with a reason.
- **UV (mugs, phone cases):** flat per area.

First decorated area is included in "main print"; each **additional area** also adds `pricing.extraAreaFee` (covers handling).

### 7.4 Layer 4: Design royalties

Each marketplace design used on a line adds its `royalty.amount` per unit (fixed amount set by designer, min ৳20, max ৳500). Customer-uploaded art and privately commissioned designs add no royalty.

### 7.5 Layer 5: Quantity tiers

```
pricing.qtyTiers = [ {minQty: 1, discountPct: 0}, {minQty: 10, discountPct: 8},
                     {minQty: 25, discountPct: 15}, {minQty: 50, discountPct: 22} ]
```

- Quantity counts **all sizes of the same design on the same product from the same vendor** in one sub-order (a team order of 6 M + 8 L + 6 XL counts as 20).
- Discount applies to garment + print cost, **not** to royalties, setup fees or shipping.
- `pricing.moq` (minimum order quantity) can be set per offering (Bulk Bros: 20). Below MOQ the vendor is shown as unavailable with "Minimum 20 pieces".
- Tier nudges in UI: "Add 4 more to unlock 15% off".

### 7.6 Layer 6: Speed

- `production.standardDays` per method (e.g. DTF 3, screen 5, embroidery 6).
- `production.rush`: `{available, days, feePct}` (e.g. 1 day, +25% of garment + print).
- `production.dailyCapacity` units; if the cart pushes a vendor over capacity for the day, the estimate shifts by a day with a notice.
- `production.cutoffTime` (e.g. 14:00); orders after cutoff start next working day. Weekly off day (Friday) respected.

### 7.7 Layer 7: Delivery

```
delivery.zones = [
  { zone: 'Same city', fee: 70, days: 1 },
  { zone: 'Same division', fee: 100, days: 2 },
  { zone: 'Other divisions', fee: 130, days: 3 }
]
delivery.perExtraItemFee = 10
delivery.freeShippingThreshold = 3000     // optional
delivery.codAvailable = true
delivery.pickupAvailable = true           // pickup from shop, fee 0
```

Zone is resolved by comparing the customer's address division/city with the vendor's location. A vendor can switch any zone off (not served).

### 7.8 Layer 8: Promotions

`pricing.promotions = [{ id, name, type: 'percent'|'flat', value, appliesTo: offeringIds|'all', minQty?, startsAt, endsAt, active }]`

Rule: the **single best** active promotion applies per line (no stacking), applied after quantity tier. Shown as a separate line in the breakdown.

### 7.9 The quote function (single source of truth)

```ts
quote(line: CartLine, offering: Offering, customer: Customer, now: Date): PriceQuote
```

Order of operations, per line:

1. Validate availability: every size in `sizeBreakdown` has an enabled variant for the color with enough stock; method is offered and compatible with the color; total qty >= MOQ; zone served. If not, return `{ available: false, reasons: [...] }`.
2. For each size: `garment = garmentPrice(variant)`.
3. `print = sum over decorated areas of printTable[method][view][tier] + darkUpcharge + perInkColor * inks + stitch band` plus `extraAreaFee` for areas after the first.
4. `unitBeforeDiscount = garment + print`.
5. Apply quantity tier discount to `unitBeforeDiscount`.
6. Apply best promotion.
7. Apply rush fee % if selected.
8. Add royalties per unit.
9. Round each unit price to the nearest ৳5 (or $0.05).
10. Line total = sum over sizes of `unit x qty` + one-time fees (screen setup, digitizing).

Per sub-order: add shipping (zone fee + per extra item, free above threshold). Per order: payment method fee (COD +1% example, configurable).

**Split per sub-order:**

- Designers: sum of royalties.
- Platform commission: `commissionPct` (default 12%) of garment + print after discounts, promotions and rush (not of royalties or shipping).
- Vendor: garment + print + one-time fees + shipping minus platform commission.

`PriceQuote` returns every intermediate value so `PriceBreakdown` can show it, and the three panels show the same numbers.

**Worked example (seed data must reproduce this exactly, and a unit test asserts it):**

Dhaka Ink Lab, standard tee, DTF. Customer in Dhaka, color Black (Dark group), 6 x M, 4 x 2XL, front large print + back small print, one marketplace design with ৳60 royalty on the front, back is customer text.

| Item | Value |
|---|---|
| basePrice | ৳320 |
| Dark group upcharge | +৳30 |
| 2XL upcharge | +৳40 |
| DTF front large | ৳180 |
| DTF back small | ৳70 |
| Dark print upcharge | ৳20 per area |
| extraAreaFee | ৳30 |
| Qty tier (10 pcs) | 8% off |

- M unit: garment 350 + print (180 + 70 + 40 + 30 = 320) = 670, minus 8% = 616.4, plus royalty 60 = 676.4, rounds to **৳675**
- 2XL unit: garment 390 + print 320 = 710, minus 8% = 653.2, plus 60 = 713.2, rounds to **৳715**
- Line: 6 x 675 + 4 x 715 = **৳6,910**
- Shipping same city: 70 + 9 x 10 = 160, but free above ৳3,000, so **৳0**
- Split: royalties 10 x 60 = ৳600 to designer; product portion 6,910 minus 600 = 6,310; platform 12% = ৳757.20; vendor ৳5,552.80

### 7.10 How customers see this

- **Catalog cards:** "from ৳350" = lowest single-unit price across active vendors for a Light color, size M, one medium front print, standard speed. Label it "from" and keep the rule consistent.
- **Customizer:** live exact price for the current configuration with the recommended vendor; changes animate.
- **Vendor chooser:** each vendor's exact quote for the current configuration (not their base price), sorted by recommendation score, with delta badges ("৳40 cheaper", "1 day faster").
- **Unavailable vendors** are listed below, greyed, with the specific reason ("No Neon Green in 2XL", "Minimum 20 pieces", "Doesn't deliver to Sylhet", "No embroidery").
- **Color swatches:** show the union of colors across active vendors. Selecting a color that only some vendors have shows "Available from 2 of 4 shops".
- **Size chips:** disabled sizes show a tooltip with the reason for the current vendor.
- **Vendor storefront entry:** if the customer starts from a vendor's shop page, the customizer is **locked to that vendor** (only their colors, sizes and methods), with a "Compare other shops" link that unlocks it.

### 7.11 Vendor recommendation score

Only vendors with `available: true` are scored.

```
score = 0.35 * priceScore      // cheapest = 1, most expensive = 0 (min-max across available vendors)
      + 0.25 * speedScore      // production + delivery days, fastest = 1
      + 0.30 * ratingScore     // (rating - 3) / 2, clamped 0..1, damped if reviewCount < 10
      + 0.10 * proximityScore  // same city 1, same division 0.5, other 0
```

The top vendor gets a "Recommended" badge with a one-line reason built from its strongest factor ("Best mix of price and rating", "Fastest to your address"). Also label "Cheapest" and "Fastest" when they differ from Recommended.

### 7.12 Vendor-side editing (offering editor)

`/vendor/offerings/[id]` has these tabs:

1. **Basics:** product, blank brand, fabric, GSM, fit, quality tier, methods offered, status.
2. **Colors and sizes:** add colors with hex and group; **variant matrix grid** (rows = colors, columns = sizes). Each cell toggles enabled, shows stock, and accepts a price override (cell turns accent colored when overridden). Bulk actions: enable row / column, set stock for selection, clear overrides.
3. **Pricing:** base price; size upcharge table; color group upcharge table; print pricing table per method x view x size tier; dark print upcharge; extra area fee; screen print ink and setup fees; embroidery stitch bands and digitizing fee; quantity tiers editor (add / remove tiers, must be strictly increasing); MOQ.
4. **Production:** standard days per method, rush toggle with days and fee %, daily capacity, cutoff time, weekly off day.
5. **Delivery:** zones table (fee, days, served toggle), per extra item fee, free shipping threshold, COD, pickup.
6. **Promotions:** list with active toggle, dates and min qty.
7. **Price simulator (always visible as a side panel on desktop, bottom sheet on mobile):** pick color, sizes and qty, method, print areas and tiers, zone, rush. Shows the full `PriceQuote` breakdown, vendor payout after commission, and a **market position bar** comparing this quote to other vendors' quotes for the same configuration (lowest, median, highest, with this vendor's marker).

Validation rules: base price > 0; no negative upcharges; qty tiers strictly increasing with discount between 0 and 60%; rush days < standard days; at least one enabled variant and one method before publishing; warn (not block) if the simulated price is more than 40% above the market median or below cost floor.

**Versioning:** each save bumps `offering.version`. Cart lines store `priceSnapshot` and offering version; if the version changed, the cart re-quotes (section 14).

---

## 8. Other business logic

### 8.1 Order state machine (per sub-order)

```
placed → accepted → in_production → quality_check → shipped → delivered → completed (auto after 3 days, or on review)
placed → rejected_by_vendor → reassigned (new sub-order) | refunded
placed | accepted → cancelled_by_customer (refund)
delivered → issue_reported → reprint | refunded | partial_refund | issue_rejected → (escalated to admin)
```

Who can move what:

| Transition | Actor |
|---|---|
| placed → accepted / rejected | Vendor |
| accepted → in_production → quality_check → shipped | Vendor |
| shipped → delivered | Vendor or Simulate |
| cancel | Customer, only before `in_production` |
| report issue | Customer, within 7 days of delivery |
| resolve issue | Vendor; escalation resolved by Admin |

Every transition writes a timeline event with actor and time and fires notifications (section 13).

### 8.2 Design request state machine

```
draft → open (public) | sent (direct to a designer)
open → proposals_received → accepted (escrow held) → in_progress → delivered
delivered → revision_requested → delivered (loop, counted) → approved → completed
sent → declined | accepted
open/sent → expired (deadline passed with no accepted proposal)
any pre-accept → cancelled_by_customer
```

- Accepting a proposal "charges" the proposal price into escrow (fake payment sheet).
- Revisions beyond `revisionLimit` need a paid extra revision (fixed fee the designer sets).
- On approve: escrow released (designer gets price minus 10% platform fee), the design becomes a private design in the customer's "My designs", usable in the customizer with no royalty.

### 8.3 Design lifecycle

`draft → published → unpublished` (hidden from library, existing orders unaffected), `published → flagged` (by report, hidden pending review) `→ published | removed`. Deleting is blocked while the design is in any open cart line or non-completed order.

### 8.4 DPI rules

`effectiveDpi = min(pxWidth / printedWidthIn, pxHeight / printedHeightIn)`. Green >= 150 ("Good"), amber 100 to 149 ("May look soft"), red < 100 ("Will look blurry"). SVG and text layers are always green.

---

## 9. Customer journey

Mobile-first. Bottom tab bar on mobile (Home, Designs, Create, Orders, Account); top nav on desktop.

### C1. Home

Hero with a rotating live mockup (design morphing across products), primary CTA "Start designing", secondary "Request a custom design". Rows: categories, trending designs, featured designers (avatar, rating, starting price), top shops near you (based on persona city), "Team and event orders" banner leading to size breakdown mode.

### C2. Catalog

Grid of base products with "from" price, available methods badges, color dots (union across vendors), "N shops" count. Filters: category, method, price range, delivery speed, "ships to my area". Sort: popular, price, fastest.

### C3. Design library and design detail

Masonry grid, search, tag chips, filters by category compatibility and designer. Design detail: large preview, mockups on 3 compatible products, designer card, royalty-inclusive "adds ৳60" note, "Use on product" (opens product picker filtered to compatible categories), save to favorites.

### C4. Vendor storefront (`/shop/[vendorId]`)

Cover, logo, rating, location, badges (Fast, Premium blanks, Bulk friendly), their offerings with their own prices, reviews, "Design with this shop" (opens customizer locked to vendor, section 7.10).

### C5. Designer profile (`/designer-profile/[id]`)

Portfolio grid, rating, turnaround, starting price, "Request a design from [name]".

### C6. Product page and customizer (hero screen)

Desktop layout: three panes (tools left, canvas center, config and price right). Mobile: canvas top, tools as a bottom tab strip, config in a sheet.

Left tools:
- Upload (drag and drop, shows DPI immediately)
- Text (font list preview in the font itself, color, alignment, size, letter spacing, outline)
- Designs (library search plus "My designs" tab)
- Layers (reorder by drag, lock, hide, duplicate, delete)

Canvas:
- Recolorable mockup, view tabs (Front, Back, Left sleeve, Right sleeve)
- Dashed print area; out-of-bounds parts rendered at 30% opacity with a red outline
- Transform handles, snap to center lines, keyboard nudge, undo / redo (Ctrl+Z / Ctrl+Shift+Z)
- DPI meter chip on each image layer
- Size tier label under the print area ("Large print") so the customer understands why price changed

Right config:
- Blank quality filter (Basic / Standard / Premium) if multiple vendors offer different tiers
- Color swatches (with "available from N shops" hint)
- Print method (only methods valid for color and vendors; with one-line explanation of each)
- **Quantity mode:** "Single" (size chips + qty stepper) or "Size breakdown" (grid of sizes with qty inputs, running total, tier nudge)
- Speed: Standard / Rush (shows date for each)
- **Recommended vendor card:** name, rating, delivery date, exact price, reason, "Compare shops" (opens vendor chooser sheet)
- Live `PriceBreakdown` (collapsed shows unit and total; expanded shows every layer from section 7.9)
- Primary CTA "Add to cart", secondary "Preview"

Preview modal: all views side by side, a realistic "on model" style variant for apparel, print-area zoom at 100% to check sharpness, and a warnings summary that must be acknowledged if any amber or red issue exists.

### C7. Vendor chooser sheet

List of available vendors with exact quote, delivery date, rating, distance, blank badges, and "Recommended", "Cheapest", "Fastest" badges. Sort control. Tap to expand a vendor's breakdown. Unavailable vendors section at the bottom with reasons. Selecting a vendor updates the customizer (and may disable colors / sizes that vendor lacks, with a toast explaining what changed).

### C8. Cart

Grouped by vendor (each group = future sub-order) with its own shipping line, delivery estimate, and free-shipping progress bar. Each line: thumbnail, product, color, size breakdown summary, method, qty, unit and line price, edit (reopens customizer with state), duplicate, remove. Flags from section 14 appear inline on the affected line with a fix action.

### C9. Checkout

Steps on one page with collapsible sections: Address (division / city / area selector that resolves zone; saved addresses), Delivery (per vendor: delivery vs pickup, shows date), Payment (bKash, Nagad, card, COD where every vendor in the cart supports it), Review (full breakdown, "Where your money goes" expandable showing vendor / designer / platform split). Place order button shows the exact total. Fake processing 1.5 s, then success.

### C10. Order success and tracking

Success sheet with confetti, order number, per-vendor delivery dates, "Track order". Order list: cards with horizontal mini stepper per sub-order. Order detail: vertical timeline per sub-order, mockup thumbnails, shipping details, "Cancel" (when allowed), "Report a problem" (after delivery), "Review shop", "Reorder" (re-quotes current prices).

### C11. Report a problem

Choose issue type, upload photos, note, pick desired resolution (refund / reprint). Shows status afterwards on the order timeline.

### C12. Design requests

- **New request wizard:** product and use, brief (with prompt hints), references upload, style tags, budget range, deadline, direct to a designer or post publicly.
- **Request detail:** status header, proposals list (price, days, designer rating, note, Accept), chat thread in a side sheet, deliveries gallery with version labels (v1, v2), "Request revision" (shows remaining count), "Approve", then "Use on a product".

### C13. Account

My orders, My designs (private + favorites), My requests, Addresses, Payment methods (fake), Notifications.

---

## 10. Vendor panel

Desktop sidebar layout; sidebar shows shop avatar and a **setup progress bar** until onboarding is complete.

### V1. Onboarding checklist

Steps: shop profile (name, logo, cover, about), location, payout method, first offering, delivery zones, go live. Each step opens its form; progress bar updates; "Go live" only enabled when required steps are done.

### V2. Dashboard

KPI strip with sparklines (today's orders, revenue this week, avg rating, on-time rate), "Needs action" list (new orders to accept, issues, low stock), revenue chart, top offerings, capacity meter for today.

### V3. Offerings list

Table: product, blank, methods, colors count, sizes range, starting price, status toggle, stock warnings, last updated, "Edit", "Duplicate", "Simulate price". Empty state CTA "Add your first product".

### V4. Offering editor

Full detail in section 7.12, including the variant matrix, pricing tables, production, delivery, promotions and the price simulator with market position bar.

### V5. Orders

Tabs (New, In production, Ready to ship, Shipped, Completed, Issues) plus a Kanban toggle. Table columns: order ID, customer city, items, method, due date (red if at risk), total, payout, status pill. Batch actions: accept selected, move to next status, print packing slips (toast). Accept / reject inline for New orders; reject opens a reason dialog.

### V6. Order detail

Mockup previews per view, per-size quantities, method, ink count or stitch band, **print files** (export each decorated area as PNG at 300 DPI from Konva, plus a "Download all" zip-like sequence of downloads), DPI warnings carried from customer, customer address and delivery date, full price breakdown with vendor payout, timeline, internal notes, status action buttons.

### V7. Issues

List of customer-reported issues with photos; actions: Approve reprint, Refund (full / partial with amount), Reject with reason (customer can escalate to admin).

### V8. Reviews, Payouts, Settings

Reviews with reply. Payouts: balance, pending (in-flight orders), history table. Settings: shop profile, pause shop (with auto-reply message), weekly off day, notification preferences.

---

## 11. Designer panel

### D1. Onboarding

Profile, bio, specialties (tags), portfolio import (pick from seed images), request settings (accepts requests, starting price, turnaround, revision limit, extra revision fee).

### D2. Dashboard

KPIs (earnings this month, design uses, request win rate, rating), earnings chart, top designs, open requests matching your tags.

### D3. Upload design (stepper)

1. **Upload:** drag and drop PNG / SVG; shows resolution, transparency check, and max printable size at 150 DPI ("Prints sharp up to 11 x 14 in").
2. **Preview on products:** mockup strip across compatible products and colors (light and dark) so the designer catches designs that vanish on dark shirts.
3. **Details:** title, description, tags, compatible categories.
4. **Royalty:** fixed amount with an earnings estimator ("At 50 uses a month you earn ৳3,000").
5. **Rights:** checkbox confirming ownership or rights to the artwork.
6. **Publish or save draft.** Publish shows a success modal with share link and "View in library".

### D4. My designs

Grid with status pill, uses, earnings; filters by status; row actions: edit, unpublish, delete (blocked with reason if in use), view reports.

### D5. Requests

Tabs: Direct (sent to me), Open board (public requests matching my tags, list and detail split view), Active, Completed. Proposal form: price, days, note, sample from portfolio. Active request detail: brief, references, chat side sheet, upload delivery (versioned), revision counter, status.

### D6. Earnings and profile

Earnings split by royalties and commissions, payout history. Public profile preview exactly as customers see it.

---

## 12. Admin panel

- **Overview:** GMV, orders by status, commission earned, active vendors / designers, issue rate.
- **Orders:** all sub-orders with filters and full split view.
- **Moderation:** flagged designs and copyright reports; actions: restore, remove (notifies designer, flags affected cart lines).
- **Disputes:** escalated issues; decide refund / reprint / reject, visible to both parties.
- **Settings:** commission %, request platform fee %, COD fee, "from" price rule values.

---

## 13. Cross-role event map

Every event creates timeline entries and notifications for the right personas.

| Event (actor) | Effect in other panels | Notified |
|---|---|---|
| Order placed (customer) | New sub-orders in each vendor's New tab; royalties pending in designer earnings; admin GMV updates | Each vendor, each designer used |
| Vendor accepts / advances | Customer timeline updates | Customer |
| Vendor rejects | Customer sees "Choose another shop" with pre-quoted alternatives, or refund | Customer, admin |
| Customer cancels | Vendor order moves to Cancelled; royalties voided | Vendor, designers |
| Delivered | Royalties move to available in designer earnings; vendor payout available after completion | Customer (review prompt), designers |
| Issue reported | Appears in vendor Issues | Vendor |
| Issue escalated | Appears in admin Disputes | Admin, vendor |
| Offering price change (vendor) | Carts containing that offering re-quote and flag | Affected customers |
| Variant out of stock (vendor / simulate) | Affected cart lines flag; vendor chooser reasons update | Affected customers |
| Vendor paused | Removed from recommendations; storefront shows "Temporarily closed" | Customers with that vendor in cart |
| Design published (designer) | Appears in library and designer profile | Followers (seed) |
| Design unpublished / flagged / removed | Hidden from library; affected cart lines flag | Customers with it in cart, designer |
| Request sent / posted (customer) | Direct inbox or open board | Target designer or tag-matched designers |
| Proposal sent (designer) | Customer request detail | Customer |
| Proposal accepted | Request moves to Active | Designer |
| Delivery uploaded | Customer reviews delivery | Customer |
| Approved | Design appears in customer's My designs; escrow to designer earnings | Designer |

---

## 14. Edge cases

Each must be reachable (directly or via the Simulate menu) and show the described behavior.

### 14.1 Configuration and pricing

| Case | Behavior |
|---|---|
| Color offered by some vendors only | Swatch hint "Available from 2 of 4 shops"; vendor chooser lists others as unavailable with reason |
| Size missing for chosen color at recommended vendor | Size chip disabled with tooltip; if the size is in the breakdown, auto-suggest the best vendor that has it |
| Size breakdown mixes sizes that no single vendor has all of | Show "No single shop has all these sizes", offer to split the line across two vendors (two sub-orders) or remove sizes |
| Method incompatible with color (sublimation on dark) | Method disabled with reason |
| Qty below vendor MOQ | Vendor unavailable "Minimum 20 pieces"; if it would be the cheapest, show nudge "Order 20+ to get ৳X each from Bulk Bros" |
| Qty crosses a tier while editing | Price animates down; toast "15% bulk discount applied" |
| Resizing artwork changes size tier | Tier label and price update live; tooltip explains |
| Stock lower than requested qty | Show "Only 7 left in Black / L at this shop"; qty capped or suggest vendor switch |
| Vendor price changed after add to cart (version bump) | Cart line shows old price struck through and new price; checkout blocked until "Accept new price" |
| Promotion expires while item in cart | Same as price change |
| Rush unavailable at chosen vendor | Rush option disabled with reason, or suggest the vendor offering rush |
| Daily capacity exceeded | Delivery date shifts by a day with notice |
| Order placed after cutoff or on off day | Dates reflect next working day |
| Rounding | Always per unit at the end, never on intermediate steps; totals equal the sum of displayed units |
| Currency toggle | All displays convert through one rate constant; stored values stay in BDT |

### 14.2 Design and print quality

| Case | Behavior |
|---|---|
| Low-DPI upload | Red DPI chip; add to cart requires "I accept lower print quality" checkbox |
| Layer outside print area | Clipped preview, warning chip; must fix or confirm before cart |
| Empty design | "Add to cart" disabled, tooltip "Add a design, image or text first" |
| Non-transparent PNG on colored garment | Info tip "Your image has a background; it will print as a rectangle" with "Remove white background" demo action |
| Screen print with many colors | Ink count estimate shown; if > 6, suggest DTF as cheaper |
| Unsupported file type or > 25 MB | Inline error, nothing added |
| Design unpublished / flagged while in cart | Line flagged "This design is no longer available"; replace or remove |
| Designer tries to delete design in use | Blocked with "Used in 3 open orders. Unpublish instead." |

### 14.3 Cart, checkout and delivery

| Case | Behavior |
|---|---|
| Items from multiple vendors | Split into sub-orders with separate shipping, dates and tracking |
| Zone not served by any vendor | Clear message at address step, offer pickup where available |
| Zone not served by one vendor in cart | That group flagged with "Switch shop" action |
| COD not supported by one vendor | COD hidden with explanation |
| Free shipping threshold nearly reached | Progress bar "Add ৳350 for free delivery" |
| Payment failure (simulate) | Error state, order not created, cart intact |
| Vendor paused with items in cart | Flag and switch action |

### 14.4 After order

| Case | Behavior |
|---|---|
| Cancel after production started | Cancel disabled with explanation |
| Vendor rejects | Customer gets pre-quoted alternatives (one click reassign) or refund |
| Damaged / wrong / poor print | Issue flow with photos; vendor resolves; escalation to admin |
| Late delivery (past estimate) | Order shows "Delayed" pill; customer can report "Late" |
| Review before delivery | Not possible; review CTA appears only after delivery |
| Reorder after prices changed | Reorder re-quotes and shows the difference |

### 14.5 Requests

| Case | Behavior |
|---|---|
| No proposals before deadline | Status expired; customer can extend or repost |
| Budget below designer's starting price | Warning before sending; designer can still counter-propose |
| Revision limit reached | "Request extra revision for ৳X" |
| Designer declines direct request | Customer offered "Post publicly" |
| Customer cancels after accept | Not allowed without dispute (admin) |

### 14.6 Content and layout

Very long names and titles truncate with tooltip; 0 results states on every search; 100+ rows use pagination; images fail to load show a branded placeholder; all dates in local time (Asia/Dhaka) with relative labels ("Tomorrow, 2 Oct").

---

## 15. Microcopy (samples, tone: friendly, direct, no jargon)

- Recommended reason: "Best mix of price and rating", "Fastest to Dhaka", "Cheapest for 20+ pieces"
- DPI: "Looks sharp", "May look a bit soft at this size", "Will look blurry. Try a larger image or make it smaller"
- Unavailable: "No 3XL in Black", "Doesn't deliver to Sylhet yet", "Minimum 20 pieces", "No embroidery"
- Tier nudge: "Add 4 more to save 15% on every piece"
- Price changed: "Dhaka Ink Lab updated their price. New total: ৳1,340 (was ৳1,290)"
- Empty cart: "Nothing here yet. Your next favorite tee is one design away."
- Vendor empty orders: "No new orders. Share your shop link to get the first one."
- Designer empty designs: "Upload your first design and start earning on every print."

---

## 16. Accessibility and responsive rules

- WCAG AA contrast in both themes; role accent colors have accessible text variants
- All interactive elements keyboard reachable; visible focus ring in role color
- Customizer: every canvas action also possible from the layers panel (move with number inputs, delete button) so it is usable without drag
- Color swatches have names (tooltip and aria-label), not color alone
- Touch targets at least 44px on mobile
- Breakpoints: 375, 768, 1024, 1440; tables become cards below 768

---

## 17. Acceptance checklist

- [ ] Role and persona switch instantly; state persists on reload; reset re-seeds
- [ ] The worked example in 7.9 reproduces exactly in the UI and in a passing unit test
- [ ] Changing any of color, size, qty, method, print area, artwork size, zone, rush or vendor updates the price live and the breakdown explains why
- [ ] Vendor chooser shows exact quotes, correct badges, and correct reasons for unavailable vendors
- [ ] Vendor edits a price, variant or stock in the offering editor; the customer's cart and chooser reflect it immediately
- [ ] Price simulator in the vendor editor matches the customer-side quote for the same configuration
- [ ] Full customer path works end to end, including size breakdown mode and a multi-vendor cart
- [ ] Customer order appears in vendor orders; vendor status changes update the customer timeline and notifications
- [ ] Design request full loop: request, proposal, accept, deliver, revise, approve, use in customizer
- [ ] Published design appears in the library; unpublished / flagged designs flag cart lines
- [ ] Print file export downloads PNGs
- [ ] Split numbers are identical across customer, vendor, designer and admin views
- [ ] Every edge case in section 14 can be triggered and behaves as described
- [ ] `/journeys` links to every screen
- [ ] No console errors, no dead buttons, responsive at 375, 768, 1024, 1440, light and dark mode

---

## 18. Build order

1. `types.ts`, `money.ts`, `pricing.ts`, `vendorMatch.ts`, `stateMachines.ts`, `dpi.ts` with Vitest tests (including 7.9)
2. `seed.ts` and `store.ts` (with event bus that writes notifications and timeline entries)
3. Design tokens, shared components, app shell, Demo Bar, `/journeys`
4. Customer: home, catalog, library, storefronts, profiles
5. Customer: customizer, vendor chooser, preview (largest single piece of work)
6. Customer: cart, checkout, orders, issues, requests, account
7. Vendor panel (offering editor and simulator first, then orders)
8. Designer panel
9. Admin panel
10. Edge-case pass against section 14 using the Simulate menu, then section 17 checklist

---

## 19. UI references (Mobbin)

Use these for layout and interaction patterns, not for visual style or copy.

| Screen in this spec | Pattern to borrow | Reference |
|---|---|---|
| C6 Customizer (desktop) | Three-pane editor: settings left, live canvas center, top bar with undo / redo and device toggle | [Shopify theme editor](https://mobbin.com/screens/54ef0cf0-0e74-450f-ac6f-3b33244f43dc), [Klaviyo email editor](https://mobbin.com/screens/b4634e4e-9cc9-4af0-99f9-f3c490d67701) |
| C6 Text tool | Side panel with color picker, alignment, size slider, fonts previewed in their own face | [Telegram image editor](https://mobbin.com/screens/27f12475-04e5-47ec-8029-bab2d008302d) |
| C6 Layers | Collapsible layer tree beside canvas | [v0 visual editor](https://mobbin.com/screens/1ff6cdce-b714-4e59-84f5-684006dd6b5b), [MagicPath](https://mobbin.com/screens/5485ae30-ed88-48a5-be51-718ae263fb0a) |
| D3 Upload preview | Crop / adjust on the left, "how it appears to customers" previews on the right | [DoorDash Merchant photo preview](https://mobbin.com/screens/814941fd-3dca-4dca-8008-33b9c1b2ad45) |
| D3 Designer upload flow | Pick products with cost, upload with DPI quality label ("Good / 1521 DPI"), ownership consent, Fill / Fit placement, earnings estimate, "live" share modal | [Patreon: Creating merch](https://mobbin.com/flows/4dcb40ee-4416-4160-835c-31d85a87c225), [Patreon: Publishing a product](https://mobbin.com/flows/30c04571-5a15-4dd9-9ce2-1b82a89be4cf) |
| D3 Publish success | Toast "Published" with "View your creation", then public profile | [Magnific: Publishing an image](https://mobbin.com/flows/a60b232a-6840-4cf8-9557-6aa8c447f59b) |
| C7 Vendor chooser | Same product from multiple sellers with price and badges ("Best offer", "Promoted") | [Klarna seller comparison](https://mobbin.com/screens/59d801e4-226c-4c2c-b5a0-cae4b19ce509) |
| C6 Speed / C9 Delivery | Option cards with icon, ETA line and price | [Grab delivery options](https://mobbin.com/screens/60950166-7694-4435-8dcc-904dc852052a), [Yami delivery method](https://mobbin.com/screens/e2156946-8c61-4fc4-80b7-2fb1b520338d) |
| C9 Checkout summary | Delivery speed choice above an itemized summary with struck-through savings | [Instacart checkout](https://mobbin.com/screens/a58b6f44-933b-48a8-98b8-f25388694a97) |
| V5 Orders | KPI strip with sparklines, status pills, batch actions, progress toast for bulk updates | [Shopify orders](https://mobbin.com/screens/6855d77e-590d-4702-b306-b790e3357b85), [DoorDash Merchant orders](https://mobbin.com/screens/e2ce13bf-de50-4506-9283-e0f70c48f372) |
| V1 Onboarding | Setup progress bar in the sidebar | [Square orders with setup progress](https://mobbin.com/screens/14618499-6730-4721-9822-bad566504229) |
| C12 / D5 Chat | Messaging as a right side sheet over the record | [Square project messages](https://mobbin.com/screens/7141ee50-92bd-4f5c-8f1b-081715a4eb9b) |
| D5 Open requests board | List on the left, full brief on the right, sticky primary action | [Mercor opportunities](https://mobbin.com/screens/bbc8fbd1-1ee3-491e-94db-aa8d454c807b) |
| C10 Order list | Order card with horizontal mini stepper and "Track order" | [Blue Apron orders](https://mobbin.com/screens/27b81a1c-c5ff-4ec1-ac5b-b6770c87c3dc) |
| C10 Order detail | Vertical activity timeline plus shipping details and support actions | [Ro order activity](https://mobbin.com/screens/a4d63257-4ce5-404a-8d75-dda5f782f452), [Shop delivery progress with "Report incorrect information"](https://mobbin.com/screens/27c5e0ea-7d24-4133-b6e6-93de3b08868d) |
| Empty states | Illustration, one sentence, filter reset | [Klaviyo empty results](https://mobbin.com/screens/50e067de-73e5-4a75-9d94-6a0b5a94cbc6) |

### Market sources

- [Printify vs Printful vs Gelato 2026 (Blogrecode)](https://blogrecode.com/printify-vs-printful-vs-gelato-my-honest-comparison/)
- [Printful vs Printify vs Gelato (Merch Titans)](https://merchtitans.com/blog/printful-vs-printify-vs-gelato-comparison)
- [Zazzle Help Centre FAQ](https://help.zazzle.com/hc/en-gb/articles/115000209913-Frequently-Asked-Questions)
- [Zazzle on POD Sellers](https://podsellers.com/pod-marketplaces/zazzle/)
- [Custom t-shirt printing shops in Bangladesh 2026 (Deshiz)](https://deshiz.com/customized-t-shirt-printing-companies-bangladesh/)
- [Spread Group (Wikipedia)](https://en.wikipedia.org/wiki/Spread_Group)
