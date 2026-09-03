// Seed profile "commerce": Beacon as an e-commerce storefront platform whose
// customers run online shops. Selected with SEED_PROFILE=commerce.

export const product = 'Beacon Commerce';

// [name, email, _password (unused), role, title, color] — passwords come from
// ADMIN_PASSWORD / AGENT_PASSWORD (engine defaults: admin123 / agent123).
export const agents = [
  ['Lucía Herrera', 'admin@desk.test', null, 'admin', 'Head of Merchant Support', '#f59e0b'],
  ['Ben Carter', 'agent@desk.test', null, 'agent', 'Merchant Support', '#38bdf8'],
  ['Amara Nwosu', 'amara@desk.test', null, 'agent', 'Payments Specialist', '#a78bfa'],
  ['Kenji Watanabe', 'kenji@desk.test', null, 'agent', 'Integrations Engineer', '#34d399'],
  ['Sara Lindqvist', 'sara@desk.test', null, 'agent', 'Merchant Success', '#fb7185'],
];

// [name, email, company, plan, phone, notes]
export const customers = [
  ['Valentina Ruiz', 'valentina@casaverde.shop', 'Casa Verde Plants', 'pro', '+34 91 555 0142', 'Ships live plants; very sensitive to delivery delays.'],
  ['Omar Haddad', 'omar@dunegear.co', 'Dune Outdoor Gear', 'enterprise', '+971 4 555 0178', 'Multi-warehouse (Dubai + Rotterdam). Key account.'],
  ['Grace Mbeki', 'grace@thabofashion.com', 'Thabo Fashion', 'pro', null, 'Runs flash sales every Friday.'],
  ['Pieter de Vries', 'pieter@kaasexpress.nl', 'Kaas Express', 'free', null, 'Trial, evaluating Pro for the holiday season.'],
  ['Mei Lin', 'mei@teahouse.tw', 'Formosa Tea House', 'enterprise', '+886 2 5555 0190', 'Wholesale + retail. Uses the B2B price lists feature.'],
  ['Connor Walsh', 'connor@peakbikes.ie', 'Peak Bikes', 'pro', '+353 21 555 0123', null],
  ['Yara Costa', 'yara@sereia.com.br', 'Sereia Swimwear', 'pro', '+55 21 5555 0101', 'Instagram-first brand, most traffic from mobile.'],
  ['Daniel Kim', 'daniel@bytebox.io', 'ByteBox Electronics', 'enterprise', '+82 2 5555 0111', 'Technical contact. Custom checkout integration.'],
  ['Ingrid Solberg', 'ingrid@nordlys.no', 'Nordlys Candles', 'free', null, null],
  ['Ahmed Farouk', 'ahmed@pharaohprints.eg', 'Pharaoh Prints', 'pro', null, 'Print-on-demand; uses the Printful integration.'],
  ['Hannah Baker', 'hannah@littleoak.co.uk', 'Little Oak Toys', 'pro', '+44 20 5555 0155', 'Seasonal peaks Nov–Dec.'],
  ['Rafael Ortega', 'rafael@vinotinto.mx', 'Vino Tinto MX', 'enterprise', '+52 55 5555 0166', 'Age verification required at checkout.'],
];

// [name, color]
export const tags = [
  ['payments', '#f59e0b'], ['checkout', '#38bdf8'], ['shipping', '#34d399'], ['inventory', '#a78bfa'],
  ['bug', '#f43f5e'], ['refund', '#fb923c'], ['integration', '#818cf8'], ['theme', '#22d3ee'],
  ['escalated', '#ef4444'], ['fraud', '#e11d48'], ['vip', '#facc15'], ['feature-request', '#64748b'],
];

// [title, shortcut, body]
export const macros = [
  ['Greeting', '/hi', 'Hi {{customer}},\n\nThanks for contacting Beacon Commerce support — I\'m on it and will get back to you shortly.\n\n{{agent}}'],
  ['Ask for order number', '/order', 'Hi {{customer}},\n\nCould you share the order number(s) affected (e.g. #10452) and roughly when the issue started? That lets me pull the exact logs.\n\nThanks,\n{{agent}}'],
  ['Payout timing', '/payout', 'Hi {{customer}},\n\nPayouts are sent every business day for orders captured 2 days earlier (T+2). Bank processing can add 1–3 business days. You can see each payout and the orders it includes under Finance → Payouts.\n\n{{agent}}'],
  ['Refund processed', '/refund', 'Hi {{customer}},\n\nI\'ve processed the refund. The customer will see it on their statement within 5–10 business days depending on their bank, and the order now shows as Refunded in your admin.\n\n{{agent}}'],
  ['Escalated to engineering', '/esc', 'Hi {{customer}},\n\nI\'ve reproduced this and escalated it to our engineering team as a priority. I\'ll keep the ticket open and update you as soon as a fix ships.\n\n{{agent}}'],
  ['Chargeback guidance', '/cb', 'Hi {{customer}},\n\nA chargeback has been opened by the cardholder\'s bank. To dispute it, go to Finance → Disputes and upload proof of delivery, the customer\'s communication, and your refund policy. You have 7 days to respond.\n\n{{agent}}'],
  ['Clear cache / theme', '/theme', 'Hi {{customer}},\n\nTheme changes can take up to 5 minutes to appear because of the CDN cache. You can force it from Online Store → Themes → "Purge cache". If it still looks wrong after that, send me a screenshot and the page URL.\n\n{{agent}}'],
  ['Resolved – closing', '/close', 'Hi {{customer}},\n\nGreat, glad that\'s sorted! I\'m marking this ticket as resolved. Reply here any time and it will reopen automatically.\n\nHappy selling,\n{{agent}}'],
];

// [title, slug, category, body, published, views, authorIndex]
export const articles = [
  ['Launching your store checklist', 'launch-checklist', 'getting_started', `Ready to go live? Run through this list first.\n\n## Before launch\n- Add at least one shipping zone and rate\n- Connect a payment provider and place a test order\n- Set your tax settings per region\n- Add a refund and privacy policy (Settings → Policies)\n\n## Launch day\n1. Remove the password from your storefront\n2. Connect your custom domain\n3. Submit your sitemap to Google\n\n> Tip: enable abandoned-cart emails before your first campaign.`, 1, 2210, 0],
  ['Understanding payouts and fees', 'payouts-and-fees', 'billing', `Beacon Payments sends payouts every business day on a **T+2** schedule.\n\n- Card fee: 2.5% + $0.30 per transaction (Pro), 2.2% + $0.30 (Enterprise)\n- Refunds return the transaction amount; the fee is not refunded\n- Chargebacks carry a $15 fee, refunded if you win the dispute\n\nEach payout lists the orders it includes under Finance → Payouts → Details.`, 1, 1730, 2],
  ['Setting up shipping zones and rates', 'shipping-zones', 'how_to', `Shipping zones group countries that share rates.\n\n1. Go to Settings → Shipping\n2. Create a zone and add countries\n3. Add rates: flat, weight-based, or carrier-calculated\n\nCarrier-calculated rates need a UPS, DHL or FedEx account connected under Integrations.\n\n> Live rates are cached for 10 minutes to keep checkout fast.`, 1, 1412, 4],
  ['Handling chargebacks and disputes', 'chargebacks', 'billing', `When a cardholder disputes a charge you have **7 days** to respond.\n\n## What to upload\n- Proof of delivery with signature or tracking\n- Customer correspondence\n- Your refund policy as shown at checkout\n\nAVS and 3-D Secure results are attached automatically. Orders flagged high-risk before fulfilment are best cancelled and refunded.`, 1, 980, 2],
  ['Inventory sync with warehouses and POS', 'inventory-sync', 'troubleshooting', `Stock levels sync from connected locations every 5 minutes.\n\nIf quantities look wrong:\n1. Check Integrations → the location's last sync time\n2. Make sure SKUs match exactly (case sensitive)\n3. Look for "unmapped SKU" warnings in the sync log\n\nOversells can happen when two channels sell the last unit within the same sync window; enable "Hold stock at checkout" to prevent it.`, 1, 865, 3],
  ['Storefront API and webhooks', 'storefront-api', 'api', `The Storefront API is GraphQL and rate-limited to 1,000 points per minute per store.\n\n**Webhooks** are available for orders/create, orders/paid, orders/fulfilled, refunds/create and inventory/update.\n\n- Deliveries retry 5 times with exponential backoff\n- Verify the X-Beacon-Hmac header on every request\n- Respond within 5 seconds or the delivery is marked failed`, 1, 640, 3],
  ['Customizing your theme safely', 'theme-customization', 'how_to', `Always duplicate the live theme before editing code.\n\n- Use the visual editor for sections and settings\n- Edit Liquid templates under Themes → Edit code\n- Preview on mobile before publishing\n\nChanges go through the CDN and can take up to 5 minutes to show. Use "Purge cache" to force it.`, 1, 512, 4],
  ['Age verification for restricted products', 'age-verification', 'account', `Draft. Outline for the compliance article: enabling the age gate, per-country thresholds, and ID verification partners.`, 0, 0, 0],
];

// Handcrafted tickets. `customer` / `assignee` are indexes into the arrays
// above; thread entries are { c: 'customer' | agentIndex, at: hoursAfterCreation, body, note?, status? }.
export const tickets = [
  {
    subject: 'Checkout failing with "payment could not be processed" for all cards',
    customer: 1, priority: 'urgent', channel: 'phone', category: 'bug', status: 'in_progress', assignee: 2, createdAgo: 4,
    tags: ['payments', 'checkout', 'escalated', 'vip'],
    thread: [
      { c: 'customer', body: 'Since roughly 09:00 GST every single card payment fails at checkout with "Your payment could not be processed". PayPal works. We are mid-campaign and losing about €2k an hour. Store: dunegear.' },
      { c: 2, at: 0.3, body: 'Hi Omar, thanks for calling. I can see a spike of declined authorisations on your store starting 08:52 GST — all with the same gateway error code. This looks like an issue on the acquiring side rather than your configuration. I\'ve opened an incident and will update you every 30 minutes.' },
      { c: 2, at: 0.5, note: true, body: 'Gateway returning 05 "do not honour" for every card on merchant account MID-77120. Acquirer confirms a rule was misapplied on their end. INC-402.' },
      { c: 'customer', at: 1.1, body: 'Understood. Can you at least tell customers something? Our chat is flooded.' },
      { c: 2, at: 1.4, body: 'Yes — I\'ve enabled a checkout banner on your store that says card payments are temporarily unavailable and suggests PayPal. The acquirer says the fix is rolling out now; I expect card payments back within the hour.' },
    ],
  },
  {
    subject: 'Payout of €4,820 missing since Tuesday',
    customer: 6, priority: 'high', channel: 'email', category: 'billing', status: 'open', assignee: null, createdAgo: 7,
    tags: ['payments'],
    thread: [
      { c: 'customer', body: 'Our payout scheduled for Tuesday (€4,820.14, payout #PO-88213) never arrived in our bank. Wednesday\'s did. Our accountant says nothing is pending on the bank side. Can you check?' },
    ],
  },
  {
    subject: 'Orders oversold: sold 14 units of a SKU with 6 in stock',
    customer: 4, priority: 'high', channel: 'web', category: 'bug', status: 'open', assignee: 3, createdAgo: 22,
    tags: ['inventory', 'bug'],
    thread: [
      { c: 'customer', body: 'During yesterday\'s launch we sold 14 units of SKU TEA-OOLONG-250 although the warehouse only had 6. Now we have 8 customers we cannot ship to. Both our POS and the online store were selling at the same time.' },
      { c: 3, at: 2, body: 'Hi Mei, I\'m sorry about that. Selling from two channels within the same 5-minute sync window is the classic oversell scenario. Could you confirm whether "Hold stock at checkout" is enabled on the online store? If not, I\'d recommend enabling it — it reserves inventory the moment a checkout starts. I\'m also checking whether the POS sync was delayed.' },
      { c: 'customer', at: 18, body: 'It was NOT enabled — I turned it on now. But the POS sync log shows a 40-minute gap yesterday between 10:10 and 10:50, that seems to be your side.' },
    ],
  },
  {
    subject: 'Chargeback received on a delivered order',
    customer: 2, priority: 'normal', channel: 'email', category: 'billing', status: 'pending', assignee: 2, createdAgo: 30,
    tags: ['payments', 'fraud'],
    thread: [
      { c: 'customer', body: 'A customer opened a chargeback for order #20931 ($240) claiming "item not received", but tracking shows it was delivered and signed for. What do I do?' },
      { c: 2, at: 1, body: 'Hi Grace, you\'re in a strong position here. Go to Finance → Disputes → #20931 and upload the tracking page with the signature, plus any messages with the customer. I\'ve pre-attached the AVS/3-D Secure results. You have until the 18th to respond — let me know once it\'s submitted and I\'ll keep an eye on it.', status: 'pending' },
    ],
  },
  {
    subject: 'Mobile checkout button hidden behind cookie banner',
    customer: 6, priority: 'normal', channel: 'chat', category: 'bug', status: 'in_progress', assignee: 4, createdAgo: 45,
    tags: ['checkout', 'theme', 'bug'],
    thread: [
      { c: 'customer', body: 'On iPhone the "Pay now" button is covered by the cookie consent banner and customers can\'t tap it. Desktop is fine. We got 3 complaints on Instagram today.' },
      { c: 4, at: 0.5, body: 'Hi Yara, thanks for the screenshots. I can reproduce it on the Aurora theme when the banner is set to "bottom sheet". As a quick fix I switched your banner position to "top" — the button is tappable again. I\'ve reported the overlap to the theme team so the default gets fixed properly.' },
      { c: 4, at: 0.6, note: true, body: 'Theme bug THM-1187, Aurora 2.3. Fix planned for 2.4.' },
      { c: 'customer', at: 20, body: 'Top banner works, thank you. Please let me know when the real fix is out so I can move it back.' },
    ],
  },
  {
    subject: 'Request: buy-now-pay-later option at checkout',
    customer: 10, priority: 'low', channel: 'web', category: 'feature', status: 'open', assignee: null, createdAgo: 65,
    tags: ['feature-request', 'checkout'],
    thread: [
      { c: 'customer', body: 'Our average order is £85 and customers keep asking for Klarna or Clearpay. Is BNPL on the roadmap?' },
    ],
  },
  {
    subject: 'Printful orders not syncing tracking numbers',
    customer: 9, priority: 'normal', channel: 'email', category: 'bug', status: 'open', assignee: 3, createdAgo: 12,
    tags: ['integration', 'shipping'],
    thread: [
      { c: 'customer', body: 'Since Sunday, orders fulfilled by Printful are marked shipped on their side but Beacon still shows them as unfulfilled, so customers get no tracking email. About 60 orders affected.' },
      { c: 3, at: 3, body: 'Hi Ahmed, I see the fulfilment webhooks from Printful are arriving but failing signature validation since their API key was rotated on Sunday. Could you reconnect the integration under Integrations → Printful → Reconnect? That regenerates the shared secret. I\'ll replay the missed 60 events once it\'s done.' },
    ],
  },
  {
    subject: 'How do I offer free shipping over a threshold?',
    customer: 8, priority: 'low', channel: 'chat', category: 'how_to', status: 'pending', assignee: 4, createdAgo: 9,
    tags: ['shipping'],
    thread: [
      { c: 'customer', body: 'I want free shipping for orders over 800 NOK within Norway but keep the flat rate below that. Where do I set it?' },
      { c: 4, at: 0.2, body: 'Hi Ingrid! Settings → Shipping → your Norway zone → "Add rate" → choose "Free shipping" and set the condition "Order price ≥ 800 NOK". Keep your flat rate as a separate rate; checkout automatically shows the free one when the threshold is met. Let me know if that works!', status: 'pending' },
    ],
  },
  {
    subject: 'VAT not applied to EU orders after moving warehouse',
    customer: 3, priority: 'high', channel: 'email', category: 'account', status: 'open', assignee: null, createdAgo: 2,
    tags: ['payments'],
    thread: [
      { c: 'customer', body: 'We moved our shipping origin from Amsterdam to Antwerp last week and since then orders to Germany and France show 0% VAT. Our accountant is alarmed. Tax settings still list the NL VAT number.' },
    ],
  },
  {
    subject: 'Age verification popup shows in wrong language',
    customer: 11, priority: 'normal', channel: 'web', category: 'bug', status: 'open', assignee: 4, createdAgo: 55,
    tags: ['theme', 'bug'],
    thread: [
      { c: 'customer', body: 'Our store is in Spanish but the age verification popup ("Are you over 18?") appears in English for visitors from Mexico. The rest of the checkout is translated.' },
      { c: 4, at: 5, body: 'Hola Rafael, thanks for the report. The age gate uses the browser language rather than the store language — I\'ve raised that as a bug. Meanwhile you can override the text under Settings → Age verification → "Custom message", which will show in Spanish for everyone.' },
      { c: 'customer', at: 30, body: 'Custom message works. Still, please fix it — it looks unprofessional.' },
    ],
  },
  {
    subject: 'Discount code applied twice on the same order',
    customer: 2, priority: 'normal', channel: 'email', category: 'bug', status: 'open', assignee: null, createdAgo: 1,
    tags: ['checkout', 'bug'],
    thread: [
      { c: 'customer', body: 'Order #21107 shows FRIDAY20 applied twice — the customer paid 36% less instead of 20%. Only happened on one order so far but we run these codes every Friday.' },
    ],
  },
  {
    subject: 'Custom checkout script blocked after update',
    customer: 7, priority: 'high', channel: 'email', category: 'bug', status: 'in_progress', assignee: 3, createdAgo: 38,
    tags: ['checkout', 'integration', 'vip'],
    thread: [
      { c: 'customer', body: 'After yesterday\'s platform update our custom checkout script (warranty upsell) is blocked by CSP and no longer renders. Console shows "Refused to load script from cdn.bytebox.io". This was working for 8 months.' },
      { c: 3, at: 1, body: 'Hi Daniel, you\'re right — the update tightened the checkout Content Security Policy and third-party script hosts now need to be allow-listed. I\'ve added cdn.bytebox.io to your store\'s allow-list; please hard-refresh checkout and confirm. Apologies that this wasn\'t communicated ahead of time.' },
      { c: 'customer', at: 6, body: 'Renders again. But we also load from static.bytebox.io for images — can you add that too? And please send the release notes next time.' },
      { c: 3, at: 7, body: 'Added static.bytebox.io as well. And agreed — I\'ve passed the feedback on to the release team.' },
    ],
  },
  {
    subject: 'Abandoned cart emails going out twice',
    customer: 0, priority: 'low', channel: 'chat', category: 'bug', status: 'open', assignee: 1, createdAgo: 70,
    tags: ['bug'],
    thread: [
      { c: 'customer', body: 'Customers are receiving our abandoned-cart reminder twice, 10 minutes apart. We only have one automation configured.' },
      { c: 1, at: 4, body: 'Hi Valentina, I found it: you have the built-in abandoned-cart email enabled *and* the Klaviyo flow sending the same trigger. Disabling one of them will stop the duplicates — I\'d keep Klaviyo since it\'s more customisable. Want me to switch off the built-in one?' },
      { c: 'customer', at: 26, body: 'Yes please, turn off the built-in one.' },
    ],
  },
  {
    subject: 'Refund stuck in "processing" for 9 days',
    customer: 5, priority: 'normal', channel: 'web', category: 'billing', status: 'resolved', assignee: 2, createdAgo: 40, resolvedAgo: 36,
    tags: ['refund', 'payments'],
    thread: [
      { c: 'customer', body: 'I refunded order #10877 (€312) on the 2nd and it still shows "processing". The customer is getting impatient.' },
      { c: 2, at: 1.5, body: 'Hi Connor, that refund got stuck because the original card had expired between purchase and refund. I\'ve reissued it as a bank transfer to the customer\'s account on file — it will land within 3 business days and the order now shows Refunded.' },
      { c: 'customer', at: 3, body: 'Perfect, thanks Amara.' },
      { c: 2, at: 4, body: 'You\'re welcome — resolving this one.', status: 'resolved' },
    ],
  },
  {
    subject: 'Store password page still showing after launch',
    customer: 3, priority: 'high', channel: 'phone', category: 'account', status: 'closed', assignee: 1, createdAgo: 130, resolvedAgo: 129, closedAgo: 100,
    thread: [
      { c: 'customer', body: 'We announced our launch on social media and the store still asks for a password! I removed it in settings an hour ago.' },
      { c: 1, at: 0.3, body: 'Hi Pieter, the password page was removed but the CDN cached the old response. I\'ve purged the cache — your storefront is live now. In future, "Purge cache" under Online Store → Themes forces it immediately.', status: 'resolved' },
      { c: 'customer', at: 0.6, body: 'Live now, phew. Thank you!' },
    ],
  },
  {
    subject: 'Suspected fraud: 40 orders from the same IP in 10 minutes',
    customer: 7, priority: 'urgent', channel: 'email', category: 'account', status: 'resolved', assignee: 0, createdAgo: 96, resolvedAgo: 93,
    tags: ['fraud', 'escalated'],
    thread: [
      { c: 'customer', body: 'We just received 40 orders for the same GPU model from the same IP with 40 different cards, all shipping to one address. Auto-fulfilment already sent 12 to the warehouse. Help.' },
      { c: 0, at: 0.4, body: 'Hi Daniel, I\'ve paused auto-fulfilment on your store and put a hold on all 40 orders. Our risk team confirms card testing — every authorisation used a different stolen card. I\'m cancelling and refunding all of them now, which also avoids chargebacks later. I also enabled velocity rules (max 3 orders per IP per hour) on your store.' },
      { c: 'customer', at: 2, body: 'Thank you. The warehouse stopped the 12 in time. Please keep the velocity rule on.' },
      { c: 0, at: 3, body: 'Done, the rule stays on. Resolving — reach out anytime.', status: 'resolved' },
    ],
  },
  {
    subject: 'Can we import products from Shopify?',
    customer: 8, priority: 'low', channel: 'chat', category: 'how_to', status: 'closed', assignee: 4, createdAgo: 200, resolvedAgo: 199, closedAgo: 170,
    tags: ['integration'],
    thread: [
      { c: 'customer', body: 'We are moving from Shopify. Is there an importer or do I need to rebuild 300 products by hand?' },
      { c: 4, at: 0.3, body: 'Hi Ingrid, there\'s a one-click importer under Settings → Import → Shopify. It brings products, variants, images, customers and order history. Takes about 10 minutes for 300 products. Guide: /kb/shopify-import', status: 'resolved' },
      { c: 'customer', at: 5, body: 'Worked perfectly.' },
    ],
  },
  {
    subject: 'DHL live rates showing €0.00 at checkout',
    customer: 1, priority: 'high', channel: 'email', category: 'bug', status: 'resolved', assignee: 3, createdAgo: 180, resolvedAgo: 160,
    tags: ['shipping', 'integration', 'vip'],
    thread: [
      { c: 'customer', body: 'Customers in the EU see DHL Express at €0.00 at checkout since this morning. We\'re shipping for free by accident — 30 orders already.' },
      { c: 3, at: 1, body: 'Hi Omar, DHL\'s rating API returned errors for ~2 hours and our fallback showed €0.00 instead of hiding the option — that\'s a bug on our side, sorry. I\'ve set your zone to "hide carrier rates on error" and DHL is rating normally again. I\'ll follow up on the 30 orders.' },
      { c: 3, at: 10, body: 'Update: we\'ve credited your account €412 to cover the shipping cost of the 30 affected orders. The fallback behaviour has been fixed platform-wide.' },
      { c: 'customer', at: 15, body: 'Appreciated. Thanks for handling it quickly.' },
      { c: 3, at: 20, body: 'Resolving this one. Thanks for your patience.', status: 'resolved' },
    ],
  },
  {
    subject: 'Change store currency from USD to MXN',
    customer: 11, priority: 'normal', channel: 'email', category: 'account', status: 'closed', assignee: 2, createdAgo: 260, resolvedAgo: 250, closedAgo: 220,
    thread: [
      { c: 'customer', body: 'We set the store up in USD by mistake. Can we switch to MXN without losing orders?' },
      { c: 2, at: 4, body: 'Hi Rafael, yes — Settings → General → Store currency. Past orders keep their original currency; new orders and payouts switch to MXN. Prices are not converted automatically, so use the bulk editor to update them first.' },
      { c: 'customer', at: 10, body: 'Done, all good.' },
      { c: 2, at: 12, body: 'Great, closing this out.', status: 'resolved' },
    ],
  },
  {
    subject: 'Theme update broke the product image zoom',
    customer: 10, priority: 'normal', channel: 'web', category: 'bug', status: 'resolved', assignee: 4, createdAgo: 300, resolvedAgo: 280,
    tags: ['theme', 'bug'],
    thread: [
      { c: 'customer', body: 'After updating Aurora to 2.2, hovering over product images no longer zooms. We rely on this for toy details.' },
      { c: 4, at: 2, body: 'Hi Hannah, 2.2 moved zoom into a section setting that is off by default. Theme → Customize → Product page → "Image zoom" → on. I\'ve enabled it on your live theme already.' },
      { c: 'customer', at: 18, body: 'Back to normal, thanks!' },
      { c: 4, at: 20, body: 'Resolving!', status: 'resolved' },
    ],
  },
  {
    subject: 'Wholesale price list not applying to logged-in B2B customers',
    customer: 4, priority: 'high', channel: 'email', category: 'bug', status: 'resolved', assignee: 3, createdAgo: 400, resolvedAgo: 380,
    tags: ['bug', 'vip'],
    thread: [
      { c: 'customer', body: 'Our wholesale customers see retail prices after logging in. The "Wholesale" price list is assigned to the B2B customer group.' },
      { c: 3, at: 3, body: 'Hi Mei, the price list was assigned but its start date was set to next month. I\'ve changed it to today — wholesale prices are showing now for the B2B group.' },
      { c: 'customer', at: 16, body: 'Confirmed on our side. Thanks.' },
      { c: 3, at: 20, body: 'Resolving.', status: 'resolved' },
    ],
  },
  {
    subject: 'Need invoice with company VAT number',
    customer: 9, priority: 'low', channel: 'email', category: 'billing', status: 'closed', assignee: 2, createdAgo: 500, resolvedAgo: 498, closedAgo: 450,
    thread: [
      { c: 'customer', body: 'Our monthly Beacon invoice needs our VAT number printed for the accountant.' },
      { c: 2, at: 1, body: 'Hi Ahmed, add it under Settings → Billing → Tax details and I\'ve regenerated last month\'s invoice with it included — it\'s in your billing history now.', status: 'resolved' },
      { c: 'customer', at: 4, body: 'Thank you!' },
    ],
  },
];

// Extra volume: [subject, category, priority, channel, tags]
export const filler = [
  ['Order confirmation emails delayed by an hour', 'bug', 'normal', 'email', ['bug']],
  ['How to set up a pre-order product', 'how_to', 'low', 'chat', []],
  ['Apple Pay not showing on Safari', 'bug', 'high', 'web', ['payments', 'checkout']],
  ['Request: gift wrapping option at checkout', 'feature', 'low', 'web', ['feature-request', 'checkout']],
  ['Payout report CSV has wrong column order', 'billing', 'low', 'email', ['payments']],
  ['Customer cannot reset account password', 'account', 'normal', 'chat', []],
  ['Inventory count off by one after return', 'bug', 'normal', 'email', ['inventory']],
  ['Bulk product import fails on row 213', 'bug', 'normal', 'web', ['bug']],
  ['Add UPS Access Point pickup option', 'feature', 'low', 'email', ['feature-request', 'shipping']],
  ['Cancel subscription for a closed store', 'billing', 'normal', 'email', ['refund']],
  ['Search returns out-of-stock items first', 'bug', 'low', 'web', ['bug']],
  ['Google Shopping feed rejected: missing GTIN', 'account', 'normal', 'email', ['integration']],
  ['Klaviyo integration not syncing new customers', 'bug', 'normal', 'email', ['integration']],
  ['Increase API rate limit for Black Friday', 'other', 'high', 'email', ['vip']],
  ['Tax exempt customers still charged tax', 'bug', 'high', 'email', ['payments', 'bug']],
  ['Change domain from .co to .com', 'account', 'low', 'chat', []],
  ['Gift card balance not deducting', 'bug', 'high', 'web', ['payments', 'bug']],
  ['Add Portuguese storefront translation', 'feature', 'low', 'web', ['feature-request', 'theme']],
  ['Duplicate customer accounts after migration', 'bug', 'normal', 'email', ['bug']],
  ['Where is the refund fee shown?', 'billing', 'low', 'chat', ['refund']],
  ['Collection page images blurry on retina', 'bug', 'low', 'web', ['theme']],
  ['Enterprise contract renewal questions', 'billing', 'normal', 'email', ['vip']],
];

export const openers = {
  bug: 'We noticed the following problem on our store and it is affecting sales: ',
  billing: 'Hello, I have a question about billing or payouts: ',
  account: 'Hi, I need help with our store account: ',
  feature: 'It would be great if Beacon Commerce supported this: ',
  how_to: 'Quick question — ',
  other: 'Hi there, ',
};

export const resolvedReplies = [
  'Thanks for the details — this is fixed on our side now. Could you check your store again?',
  'I\'ve taken care of this for you. Let me know if anything else comes up!',
  'This was caused by a configuration issue; I\'ve corrected it and placed a test order to confirm.',
];
