import bcrypt from 'bcryptjs';
import db, { initSchema } from './index.js';
import { migrate } from './migrate.js';
import { slaDueDates, sqlDate, ticketRef } from '../services/tickets.js';

/**
 * Seed the database with agents, customers, a knowledge base, macros and a
 * realistic backlog of tickets spread over the last ~30 days. Timestamps are
 * relative to "now" so SLA timers look alive in the demo.
 * Safe to run multiple times: it only seeds when the database is empty.
 */
export function seed({ force = false } = {}) {
  initSchema();
  migrate();

  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0 && !force) return { seeded: false };

  if (force) {
    for (const t of ['activities', 'ticket_tags', 'ticket_events', 'ticket_messages', 'tickets', 'tags', 'macros', 'articles', 'customers', 'users']) {
      db.prepare(`DELETE FROM ${t}`).run();
    }
  }

  const now = Date.now();
  const ago = (hours) => sqlDate(new Date(now - hours * 3600 * 1000));

  const tx = db.transaction(() => {
    // --- Agents -----------------------------------------------------------
    const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role, title, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const agents = [
      ['Maya Okafor', 'admin@desk.test', 'admin123', 'admin', 'Support Lead', '#f59e0b'],
      ['Diego Ferreira', 'agent@desk.test', 'agent123', 'agent', 'Support Engineer', '#38bdf8'],
      ['Priya Raman', 'priya@desk.test', 'agent123', 'agent', 'Support Engineer', '#a78bfa'],
      ['Tomasz Nowak', 'tomasz@desk.test', 'agent123', 'agent', 'Billing Specialist', '#34d399'],
      ['Hannah Lee', 'hannah@desk.test', 'agent123', 'agent', 'Technical Support', '#fb7185'],
    ];
    const A = agents.map((a) => insertUser.run(a[0], a[1], bcrypt.hashSync(a[2], 10), a[3], a[4], a[5], ago(24 * 90)).lastInsertRowid);

    // --- Customers --------------------------------------------------------
    const insertCustomer = db.prepare('INSERT INTO customers (name, email, company, plan, phone, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const customers = [
      ['Elena Vasquez', 'elena@northwind.io', 'Northwind Analytics', 'enterprise', '+1 415 555 0142', 'Key account. Prefers email. Renewal in Q4.'],
      ['Marcus Chen', 'marcus.chen@fjordlabs.com', 'Fjord Labs', 'pro', '+1 206 555 0178', null],
      ['Sofia Rossi', 'sofia@rossi.design', 'Rossi Design Studio', 'pro', null, 'Designer, mostly asks about exports.'],
      ['Jamal Whitaker', 'jamal@brightpath.org', 'BrightPath Nonprofit', 'free', null, 'Nonprofit discount applied.'],
      ['Aiko Tanaka', 'aiko.tanaka@kumo.co.jp', 'Kumo Logistics', 'enterprise', '+81 3 5555 0190', 'JST timezone. SSO via Okta.'],
      ['Liam O\'Brien', 'liam@greenharbor.ie', 'Green Harbor Foods', 'pro', '+353 1 555 0123', null],
      ['Fatima Al-Sayed', 'fatima@quantaedge.ai', 'Quanta Edge', 'enterprise', null, 'Technical contact, very detailed reports.'],
      ['Noah Petersen', 'noah.p@gmail.com', null, 'free', null, null],
      ['Isabela Moreira', 'isabela@lumeo.app', 'Lumeo', 'pro', '+55 11 5555 0101', null],
      ['Oliver Grant', 'oliver@grantandsons.co.uk', 'Grant & Sons', 'free', null, 'Trialing, evaluating pro plan.'],
      ['Chloé Dubois', 'chloe@atelier-dubois.fr', 'Atelier Dubois', 'pro', null, null],
      ['Ravi Subramanian', 'ravi@stackforge.dev', 'StackForge', 'enterprise', '+91 80 5555 0111', 'Runs self-hosted instance.'],
    ];
    const C = customers.map((c, i) => insertCustomer.run(...c, ago(24 * (60 - i * 3))).lastInsertRowid);

    // --- Tags -------------------------------------------------------------
    const insertTag = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)');
    const tagDefs = [
      ['bug', '#f43f5e'], ['billing', '#f59e0b'], ['regression', '#e11d48'], ['api', '#38bdf8'],
      ['sso', '#a78bfa'], ['export', '#34d399'], ['mobile', '#fb923c'], ['escalated', '#ef4444'],
      ['feature-request', '#22d3ee'], ['docs', '#64748b'], ['vip', '#facc15'], ['integration', '#818cf8'],
    ];
    const T = {};
    for (const [name, color] of tagDefs) T[name] = insertTag.run(name, color).lastInsertRowid;

    // --- Macros -----------------------------------------------------------
    const insertMacro = db.prepare('INSERT INTO macros (title, shortcut, body) VALUES (?, ?, ?)');
    const macros = [
      ['Greeting & acknowledgement', '/hi', 'Hi {{customer}},\n\nThanks for reaching out — I\'m looking into this now and will get back to you shortly with an update.\n\nBest,\n{{agent}}'],
      ['Request more details', '/details', 'Hi {{customer}},\n\nTo dig into this I\'ll need a bit more information:\n\n1. Which browser and version are you using?\n2. Roughly when did you first notice the issue?\n3. Do you have a screenshot or the exact error text?\n\nThanks!\n{{agent}}'],
      ['Refund processed', '/refund', 'Hi {{customer}},\n\nI\'ve processed the refund on your account. It can take 5–10 business days to appear on your statement depending on your bank.\n\nSorry for the trouble, and thanks for your patience.\n\n{{agent}}'],
      ['Escalated to engineering', '/esc', 'Hi {{customer}},\n\nI\'ve reproduced the issue and escalated it to our engineering team as a priority bug. I\'ll keep this ticket open and update you as soon as a fix ships.\n\n{{agent}}'],
      ['Resolved – closing', '/close', 'Hi {{customer}},\n\nGlad to hear that\'s working now! I\'m marking this ticket as resolved. If anything else comes up, just reply here and it will reopen automatically.\n\nHave a great day,\n{{agent}}'],
      ['Feature request logged', '/feature', 'Hi {{customer}},\n\nThanks for the suggestion! I\'ve logged this as a feature request with our product team and linked your account so you\'ll be notified if it ships.\n\n{{agent}}'],
      ['Password reset steps', '/pwreset', 'Hi {{customer}},\n\nYou can reset your password from the login page via "Forgot password?". The link expires after 30 minutes. If it doesn\'t arrive, please check your spam folder or let me know and I\'ll trigger it manually.\n\n{{agent}}'],
      ['Known issue – workaround', '/known', 'Hi {{customer}},\n\nThis is a known issue that our team is actively working on. In the meantime, the workaround is to clear your browser cache and reload the page. I\'ll update this ticket once the fix is released.\n\n{{agent}}'],
    ];
    for (const m of macros) insertMacro.run(...m);

    // --- Knowledge base ---------------------------------------------------
    const insertArticle = db.prepare('INSERT INTO articles (title, slug, category, body, published, views, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const articles = [
      ['Getting started with Beacon', 'getting-started', 'getting_started', `Welcome to Beacon! This guide walks you through the first 15 minutes.\n\n## Create your workspace\nSign up, pick a workspace name, and invite your teammates from Settings → Team.\n\n## Connect a data source\nGo to Integrations and connect Postgres, BigQuery or a CSV upload. Syncs run every 15 minutes on Pro plans.\n\n## Build your first dashboard\nClick "New dashboard", drag a chart onto the canvas and pick a dataset. Dashboards auto-save.`, 1, 1284, A[0]],
      ['Exporting dashboards to PDF and PNG', 'exporting-dashboards', 'how_to', `You can export any dashboard from the "…" menu in the top-right corner.\n\n- **PDF** keeps vector charts and includes a cover page.\n- **PNG** renders at 2x for retina displays.\n\nExports over 20 pages are generated asynchronously and emailed to you.\n\n> Note: scheduled exports are available on Pro and Enterprise plans.`, 1, 863, A[2]],
      ['Setting up SSO with Okta or Azure AD', 'sso-setup', 'account', `Enterprise workspaces can enforce SAML single sign-on.\n\n1. In Settings → Security, click "Configure SSO".\n2. Copy the ACS URL and Entity ID into your identity provider.\n3. Paste the IdP metadata URL back into Beacon.\n4. Test with one user before enabling "Require SSO".\n\nJust-in-time provisioning creates users on first login with the Viewer role.`, 1, 512, A[4]],
      ['Understanding your invoice', 'understanding-invoice', 'billing', `Invoices are issued on the 1st of each month for the previous period.\n\n- Seats are prorated to the day.\n- Overages on API calls are listed as a separate line.\n- Taxes are applied based on the billing address on file.\n\nYou can download past invoices from Settings → Billing → History.`, 1, 947, A[3]],
      ['API rate limits and best practices', 'api-rate-limits', 'api', `The public API allows 600 requests per minute per workspace (Enterprise: 3,000).\n\nWhen you exceed the limit you receive a 429 with a Retry-After header.\n\n**Tips**\n- Batch writes with the /bulk endpoints.\n- Use webhooks instead of polling for changes.\n- Cache dataset metadata; it rarely changes.`, 1, 421, A[1]],
      ['Troubleshooting failed data syncs', 'troubleshooting-syncs', 'troubleshooting', `If a sync shows "Failed" in Integrations:\n\n1. Open the sync log and check the last error.\n2. Verify credentials haven\'t rotated.\n3. For Postgres, make sure our IP range is allow-listed.\n4. Retry once; if it fails again, contact support with the sync ID.`, 1, 378, A[1]],
      ['Mobile app: known limitations', 'mobile-limitations', 'troubleshooting', `The iOS and Android apps are read-only today. Editing dashboards, managing team members and billing must be done on the web.\n\nOffline mode caches the last 10 dashboards you opened.`, 1, 204, A[4]],
      ['Migrating from self-hosted to cloud', 'migrating-self-hosted', 'account', `Draft: outline of the migration steps for self-hosted customers.\n\n- Export workspace bundle\n- Contact support to schedule import window\n- DNS cutover`, 0, 0, A[0]],
    ];
    articles.forEach((a, i) => insertArticle.run(...a, ago(24 * (45 - i * 4)), ago(24 * (20 - i * 2))));

    // --- Tickets ----------------------------------------------------------
    const insertTicket = db.prepare(
      `INSERT INTO tickets (number, subject, status, priority, channel, category, customer_id, assignee_id, first_response_at, resolved_at, closed_at, sla_response_due, sla_resolution_due, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertMessage = db.prepare('INSERT INTO ticket_messages (ticket_id, author_type, author_id, body, is_internal, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    const insertEvent = db.prepare('INSERT INTO ticket_events (ticket_id, actor_id, type, from_value, to_value, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    const insertTicketTag = db.prepare('INSERT OR IGNORE INTO ticket_tags (ticket_id, tag_id) VALUES (?, ?)');
    const insertActivity = db.prepare('INSERT INTO activities (type, message, entity_type, entity_id, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)');

    let number = 1000;

    /**
     * Create a ticket with a conversation. `thread` entries are
     * { c: 'customer' | agentIndex, at: hoursAfterCreation, body, note?: true }.
     */
    function ticket({ subject, customer, priority = 'normal', channel = 'email', category = 'other', status = 'open', assignee = null, createdAgo, tags = [], thread, resolvedAgo = null, closedAgo = null }) {
      number += 1;
      const createdAt = ago(createdAgo);
      const sla = slaDueDates(priority, createdAt);
      const customerId = C[customer];
      const assigneeId = assignee == null ? null : A[assignee];
      const opener = thread[0];
      const replies = thread.slice(1);

      const firstAgentReply = replies.find((m) => m.c !== 'customer' && !m.note);
      const firstResponseAt = firstAgentReply ? ago(createdAgo - firstAgentReply.at) : null;
      const resolvedAt = resolvedAgo != null ? ago(resolvedAgo) : closedAgo != null ? ago(closedAgo) : null;
      const closedAt = closedAgo != null ? ago(closedAgo) : null;
      const lastAt = replies.length ? ago(createdAgo - replies[replies.length - 1].at) : createdAt;
      const updatedAt = resolvedAt && resolvedAt > lastAt ? resolvedAt : lastAt;

      const id = insertTicket.run(number, subject, status, priority, channel, category, customerId, assigneeId, firstResponseAt, resolvedAt, closedAt, sla.sla_response_due, sla.sla_resolution_due, createdAt, updatedAt).lastInsertRowid;

      insertMessage.run(id, 'customer', customerId, opener.body, 0, createdAt);
      insertEvent.run(id, null, 'created', null, null, createdAt);
      insertActivity.run('ticket.created', `${ticketRef(number)} "${subject}" opened for ${customers[customer][0]}`, 'ticket', id, null, createdAt);
      if (assigneeId) {
        const at = ago(createdAgo - 0.2);
        insertEvent.run(id, A[0], 'assignee', null, agents[assignee][0], at);
      }
      for (const t of tags) insertTicketTag.run(id, T[t]);

      let currentStatus = 'open';
      for (const m of replies) {
        const at = ago(createdAgo - m.at);
        const isAgent = m.c !== 'customer';
        insertMessage.run(id, isAgent ? 'agent' : 'customer', isAgent ? A[m.c] : customerId, m.body, m.note ? 1 : 0, at);
        if (isAgent && !m.note) {
          insertActivity.run('ticket.replied', `${ticketRef(number)} replied by ${agents[m.c][0]}`, 'ticket', id, A[m.c], at);
          if (m.status && m.status !== currentStatus) {
            insertEvent.run(id, A[m.c], 'status', currentStatus, m.status, at);
            currentStatus = m.status;
          }
        } else if (!isAgent) {
          insertActivity.run('ticket.customer_replied', `${customers[customer][0]} replied on ${ticketRef(number)}`, 'ticket', id, null, at);
          if (currentStatus === 'pending') {
            insertEvent.run(id, null, 'status', 'pending', 'open', at);
            currentStatus = 'open';
          }
        }
      }
      if (status !== currentStatus) {
        const at = resolvedAt || updatedAt;
        insertEvent.run(id, assigneeId || A[0], 'status', currentStatus, status, at);
        if (status === 'resolved' || status === 'closed') {
          insertActivity.run('ticket.status', `${ticketRef(number)} moved to ${status}`, 'ticket', id, assigneeId || A[0], at);
        }
      }
      return id;
    }

    // Live, urgent, breaching ------------------------------------------------
    ticket({
      subject: 'Production dashboards returning 500 errors since this morning',
      customer: 0, priority: 'urgent', channel: 'phone', category: 'bug', status: 'in_progress', assignee: 1, createdAgo: 5.5,
      tags: ['bug', 'escalated', 'vip'],
      thread: [
        { c: 'customer', body: 'All of our executive dashboards are throwing "Internal Server Error" since about 8am PT. This is blocking our Monday leadership review. Workspace: northwind-prod.' },
        { c: 1, at: 0.4, body: 'Hi Elena, thanks for calling this in. I can see elevated error rates on your workspace\'s query cluster. I\'ve paged the on-call engineer and we\'re investigating right now. I\'ll update you every 30 minutes until this is resolved.' },
        { c: 1, at: 0.6, note: true, body: 'Root cause looks like the 2.14 deploy — query planner regression on materialized views. Rolling back on their cluster only. Incident #INC-231.' },
        { c: 'customer', at: 1.2, body: 'Thanks Diego. Still seeing errors on the "Revenue by Region" board. Others load slowly but do load.' },
        { c: 1, at: 1.8, body: 'Rollback is in progress; "Revenue by Region" depends on the largest materialized view so it will be the last to recover. ETA ~45 minutes.' },
      ],
    });

    ticket({
      subject: 'Charged twice for March invoice',
      customer: 5, priority: 'high', channel: 'email', category: 'billing', status: 'open', assignee: null, createdAgo: 9,
      tags: ['billing'],
      thread: [
        { c: 'customer', body: 'Hi, our card was charged twice on March 1st for invoice #INV-20931 (€1,240.00 each). Can you please refund the duplicate? Our finance team needs this sorted before month-end close.' },
      ],
    });

    ticket({
      subject: 'SSO login loops back to sign-in page',
      customer: 4, priority: 'high', channel: 'web', category: 'account', status: 'open', assignee: 4, createdAgo: 26,
      tags: ['sso', 'bug'],
      thread: [
        { c: 'customer', body: 'Since yesterday, several of our users in Tokyo get redirected back to the login page after authenticating via Okta. Clearing cookies helps once, then it happens again. About 40 users affected.' },
        { c: 4, at: 2.5, body: 'Hi Aiko, sorry about this. Could you confirm whether the affected users are on Chrome 124+? We\'ve seen a SameSite cookie change cause similar loops. Also, does the Okta session timeout match the value in Beacon → Security?' },
        { c: 'customer', at: 20, body: 'Yes, all on Chrome 124 or 125 (managed devices). Okta session is 8h, Beacon is set to 12h. Should they match?' },
      ],
    });

    ticket({
      subject: 'API returns 429 far below documented limit',
      customer: 6, priority: 'high', channel: 'email', category: 'bug', status: 'in_progress', assignee: 1, createdAgo: 50,
      tags: ['api', 'bug'],
      thread: [
        { c: 'customer', body: 'We are hitting 429 Too Many Requests at roughly 180 req/min, though the docs say 3,000/min for Enterprise. Attached a log with request IDs and timestamps. Endpoint: POST /v2/datasets/{id}/rows.' },
        { c: 1, at: 1.5, body: 'Thanks Fatima, the request IDs are very helpful. I can confirm the /rows endpoint has a separate write limit that isn\'t documented. Checking with the API team whether that\'s intentional and what the actual value is.' },
        { c: 1, at: 3, note: true, body: 'API team confirms write limit is 200/min per dataset (not workspace). Docs are wrong. Asking whether we can raise it for Enterprise.' },
        { c: 1, at: 30, body: 'Update: the write endpoint is limited to 200 requests/min *per dataset*. The API team has agreed to raise this to 1,000/min for Enterprise workspaces — rolling out next week. I\'ll also get the docs fixed. Would batching via /bulk help in the meantime?' },
        { c: 'customer', at: 44, body: 'That explains it. /bulk works for us as a stopgap. Please keep the ticket open until the new limit is live.' },
      ],
    });

    ticket({
      subject: 'Cannot export dashboard to PDF – spinner never ends',
      customer: 2, priority: 'normal', channel: 'chat', category: 'bug', status: 'pending', assignee: 2, createdAgo: 30,
      tags: ['export'],
      thread: [
        { c: 'customer', body: 'When I click Export → PDF on my "Q2 Brand Review" dashboard, the spinner just runs forever. PNG export works fine. Safari 17.4 on macOS.' },
        { c: 2, at: 0.7, body: 'Hi Sofia! That dashboard has 26 pages, so the export is generated in the background and emailed rather than downloaded directly — the spinner should say so, and I\'ve flagged that it doesn\'t. Could you check your inbox (and spam) for an email from exports@beacon.app?', status: 'pending' },
      ],
    });

    ticket({
      subject: 'Request: dark mode for embedded dashboards',
      customer: 8, priority: 'low', channel: 'web', category: 'feature', status: 'open', assignee: null, createdAgo: 70,
      tags: ['feature-request'],
      thread: [
        { c: 'customer', body: 'We embed dashboards in our app which is dark-themed. The embed iframe is always white and looks out of place. Could you add a theme=dark parameter to the embed URL?' },
      ],
    });

    ticket({
      subject: 'Mobile app crashes on opening any dashboard (Android 14)',
      customer: 1, priority: 'high', channel: 'email', category: 'bug', status: 'open', assignee: 4, createdAgo: 14,
      tags: ['mobile', 'bug', 'regression'],
      thread: [
        { c: 'customer', body: 'After updating to app version 3.8.0 the Android app crashes immediately when I tap any dashboard. Pixel 8, Android 14. Version 3.7.2 worked fine.' },
        { c: 4, at: 3, body: 'Hi Marcus, sorry about the crash. We\'ve had two similar reports on Pixel devices and engineering is looking at it. Could you share the crash report from Settings → Apps → Beacon → "Send diagnostics"? In the meantime, 3.7.2 is still available via the Play Store beta channel.' },
        { c: 4, at: 3.1, note: true, body: 'Third Pixel/Android 14 report today. Linked to BEA-4471.' },
      ],
    });

    ticket({
      subject: 'Downgrade to Free plan – how do we keep our data?',
      customer: 9, priority: 'normal', channel: 'email', category: 'billing', status: 'open', assignee: 3, createdAgo: 20,
      tags: ['billing'],
      thread: [
        { c: 'customer', body: 'Our trial ends on Friday and we haven\'t decided yet. If we drop to Free, do we lose the dashboards we built? And can we come back to Pro later without rebuilding?' },
      ],
    });

    ticket({
      subject: 'Webhook deliveries delayed by ~10 minutes',
      customer: 11, priority: 'normal', channel: 'email', category: 'bug', status: 'in_progress', assignee: 1, createdAgo: 40,
      tags: ['api', 'integration'],
      thread: [
        { c: 'customer', body: 'Our dataset.updated webhooks are arriving 8–12 minutes late since Tuesday. Before that it was near-instant. Self-hosted instance v2.13.1, but the webhook dispatcher is on your side per the docs.' },
        { c: 1, at: 5, body: 'Hi Ravi, confirmed — there\'s a backlog on one of the webhook queues after a burst from a large customer. We\'ve scaled up workers and the delay is dropping. I\'ll confirm once it\'s back to normal.' },
      ],
    });

    ticket({
      subject: 'How do I share a dashboard with someone outside my company?',
      customer: 3, priority: 'low', channel: 'chat', category: 'how_to', status: 'pending', assignee: 2, createdAgo: 8,
      tags: ['docs'],
      thread: [
        { c: 'customer', body: 'I want to share our impact report with a donor who doesn\'t have a Beacon account. Is that possible on the Free plan?' },
        { c: 2, at: 0.3, body: 'Hi Jamal! Yes — open the dashboard, click Share → "Public link". Anyone with the link can view (read-only). On Free the link never expires; on Pro you can add a password and expiry. Let me know if that works for you!', status: 'pending' },
      ],
    });

    ticket({
      subject: 'Invoice missing VAT number',
      customer: 10, priority: 'normal', channel: 'email', category: 'billing', status: 'open', assignee: 3, createdAgo: 3,
      tags: ['billing'],
      thread: [
        { c: 'customer', body: 'Bonjour, our accountant needs our VAT number (FR 12 345 678 901) printed on invoices. The last two invoices don\'t show it although I added it in Billing settings.' },
      ],
    });

    ticket({
      subject: 'Slack integration stopped posting alerts',
      customer: 1, priority: 'normal', channel: 'web', category: 'bug', status: 'open', assignee: null, createdAgo: 1.5,
      tags: ['integration'],
      thread: [
        { c: 'customer', body: 'Our #metrics channel hasn\'t received any threshold alerts for 2 days. The integration shows as "Connected" in settings. Alerts are still visible in-app.' },
      ],
    });

    ticket({
      subject: 'Scheduled report sent to wrong timezone',
      customer: 4, priority: 'low', channel: 'email', category: 'bug', status: 'open', assignee: 2, createdAgo: 60,
      tags: [],
      thread: [
        { c: 'customer', body: 'Our weekly report is scheduled for Monday 9:00 JST but arrives at 9:00 UTC (18:00 JST). The schedule UI shows JST correctly.' },
        { c: 2, at: 6, body: 'Hi Aiko, thanks — I reproduced this. Schedules created before we added timezone support default to UTC internally even though the UI displays your local zone. Engineering has a fix in review; as a workaround, deleting and re-creating the schedule will store it correctly.' },
        { c: 'customer', at: 30, body: 'Re-created it and this week it arrived on time. Please still fix the old ones for other customers.' },
      ],
    });

    // Resolved / closed --------------------------------------------------------
    ticket({
      subject: 'Password reset email never arrives',
      customer: 7, priority: 'normal', channel: 'web', category: 'account', status: 'resolved', assignee: 2, createdAgo: 36, resolvedAgo: 33,
      thread: [
        { c: 'customer', body: 'I requested a password reset three times and nothing shows up, not even in spam. Email is noah.p@gmail.com.' },
        { c: 2, at: 1, body: 'Hi Noah, I found the issue — your address was on our suppression list after a bounce back in January. I\'ve removed it and triggered a fresh reset email. Could you check now?' },
        { c: 'customer', at: 2.5, body: 'Got it, thanks! I\'m back in.' },
        { c: 2, at: 3, body: 'Glad to hear that\'s working now! Marking this as resolved — just reply here if anything else comes up.', status: 'resolved' },
      ],
    });

    ticket({
      subject: 'Refund for unused seats',
      customer: 8, priority: 'normal', channel: 'email', category: 'billing', status: 'closed', assignee: 3, createdAgo: 120, resolvedAgo: 100, closedAgo: 72,
      tags: ['billing'],
      thread: [
        { c: 'customer', body: 'We removed 4 users on the 3rd but were billed for 12 seats for the whole month. Can we get the difference refunded?' },
        { c: 3, at: 4, body: 'Hi Isabela, seats are prorated to the day, so you should have received a credit automatically. Looking at your account, the credit was applied to the *next* invoice rather than refunded. I\'ve issued a refund of $96.00 instead — it should show up within 5–10 business days.' },
        { c: 'customer', at: 18, body: 'Perfect, thank you Tomasz.' },
        { c: 3, at: 20, body: 'You\'re welcome! Closing this one out.', status: 'resolved' },
      ],
    });

    ticket({
      subject: 'Wrong totals in "Sales by Rep" after adding a filter',
      customer: 0, priority: 'high', channel: 'email', category: 'bug', status: 'resolved', assignee: 1, createdAgo: 200, resolvedAgo: 150,
      tags: ['bug', 'vip'],
      thread: [
        { c: 'customer', body: 'After adding a "Region = EMEA" filter, the grand total row still shows the global figure. The per-rep rows are filtered correctly.' },
        { c: 1, at: 2, body: 'Thanks Elena, I can reproduce this with table totals + a dashboard-level filter. Escalating to engineering as a priority bug; I\'ll keep you posted.', status: 'in_progress' },
        { c: 1, at: 40, body: 'A fix shipped in release 2.12.3 this morning. Could you confirm the totals now respect the filter on your side?' },
        { c: 'customer', at: 46, body: 'Confirmed, totals are correct now. Thanks for the quick turnaround.' },
        { c: 1, at: 50, body: 'Great — resolving this ticket. Thanks for the detailed report!', status: 'resolved' },
      ],
    });

    ticket({
      subject: 'How to connect Google Sheets as a data source',
      customer: 9, priority: 'low', channel: 'chat', category: 'how_to', status: 'closed', assignee: 2, createdAgo: 90, resolvedAgo: 89, closedAgo: 60,
      tags: ['docs', 'integration'],
      thread: [
        { c: 'customer', body: 'Is there a way to pull data from a Google Sheet? I only see Postgres and CSV in Integrations.' },
        { c: 2, at: 0.2, body: 'Hi Oliver! Google Sheets is under Integrations → "More sources" → Google Sheets. It needs a one-time OAuth connection, then you pick the spreadsheet and tab. Syncs hourly. Here\'s the guide: /kb/google-sheets', status: 'resolved' },
        { c: 'customer', at: 1, body: 'Found it, thanks!' },
      ],
    });

    ticket({
      subject: 'Data sync failing: "permission denied for schema public"',
      customer: 6, priority: 'high', channel: 'email', category: 'bug', status: 'resolved', assignee: 1, createdAgo: 160, resolvedAgo: 140,
      tags: ['integration'],
      thread: [
        { c: 'customer', body: 'Our nightly Postgres sync has failed 3 nights in a row with "permission denied for schema public". Nothing changed on our side as far as I know. Sync ID: sync_8f3a1c.' },
        { c: 1, at: 3, body: 'Hi Fatima, the log shows the connection now authenticates as role "beacon_ro" which lacks USAGE on schema public — most likely a role change on your database. Granting `GRANT USAGE ON SCHEMA public TO beacon_ro;` should fix it. Want me to retry the sync once that\'s done?' },
        { c: 'customer', at: 15, body: 'You were right — our DBA rotated roles last week. Granted, please retry.' },
        { c: 1, at: 16, body: 'Retried and it completed successfully (412k rows). Resolving!', status: 'resolved' },
      ],
    });

    ticket({
      subject: 'Add me to the Beacon newsletter',
      customer: 7, priority: 'low', channel: 'web', category: 'other', status: 'closed', assignee: 0, createdAgo: 300, resolvedAgo: 299, closedAgo: 250,
      thread: [
        { c: 'customer', body: 'I unsubscribed by accident, could you add me back to the product newsletter?' },
        { c: 0, at: 1, body: 'Done, Noah — you\'re back on the list. The next issue goes out on the 15th.', status: 'resolved' },
      ],
    });

    ticket({
      subject: 'Embedded dashboard shows "Unauthorized" for some viewers',
      customer: 8, priority: 'high', channel: 'email', category: 'bug', status: 'resolved', assignee: 4, createdAgo: 110, resolvedAgo: 96,
      tags: ['bug', 'api'],
      thread: [
        { c: 'customer', body: 'About 10% of our users see "Unauthorized" in the embedded dashboard. The signed embed token is generated the same way for everyone.' },
        { c: 4, at: 2, body: 'Hi Isabela, the 10% pattern usually means tokens are being generated with a clock that\'s slightly off — tokens have a 60s leeway. Could you check the `exp` claim vs. your server time? Alternatively bump the token TTL to 10 minutes.' },
        { c: 'customer', at: 10, body: 'Bumping the TTL fixed it. One of our app servers was 3 minutes behind — NTP was disabled. Thanks!' },
        { c: 4, at: 14, body: 'Great catch. Resolving this one.', status: 'resolved' },
      ],
    });

    ticket({
      subject: 'Feature: CSV export with custom delimiter',
      customer: 10, priority: 'low', channel: 'web', category: 'feature', status: 'closed', assignee: 2, createdAgo: 400, resolvedAgo: 398, closedAgo: 350,
      tags: ['feature-request', 'export'],
      thread: [
        { c: 'customer', body: 'French Excel expects semicolons as delimiters. Could CSV exports let us pick the delimiter?' },
        { c: 2, at: 2, body: 'Bonjour Chloé, thanks for the suggestion! I\'ve logged this with our product team and linked your account so you\'ll be notified if it ships. In the meantime, "Export → Excel (.xlsx)" avoids the delimiter problem entirely.', status: 'resolved' },
      ],
    });

    ticket({
      subject: 'Two-factor codes rejected after phone change',
      customer: 5, priority: 'urgent', channel: 'phone', category: 'account', status: 'resolved', assignee: 0, createdAgo: 48, resolvedAgo: 46.5,
      tags: ['escalated'],
      thread: [
        { c: 'customer', body: 'I got a new phone and my authenticator app didn\'t migrate. I\'m locked out of the account that owns our workspace and payroll dashboards run tomorrow.' },
        { c: 0, at: 0.3, body: 'Hi Liam, I\'ve verified your identity over the phone with the billing details on file. I\'ve reset 2FA on your account — you\'ll get an email to set it up again. Please save the recovery codes this time!' },
        { c: 'customer', at: 1.2, body: 'Back in, and codes saved. Thank you so much.' },
        { c: 0, at: 1.5, body: 'Glad it worked out. Resolving.', status: 'resolved' },
      ],
    });

    ticket({
      subject: 'Dashboard loads slowly with 50+ charts',
      customer: 11, priority: 'normal', channel: 'email', category: 'bug', status: 'resolved', assignee: 1, createdAgo: 260, resolvedAgo: 220,
      thread: [
        { c: 'customer', body: 'Our ops dashboard has 58 charts and takes ~25s to load. Any way to speed this up on self-hosted?' },
        { c: 1, at: 6, body: 'Hi Ravi, 58 charts means 58 concurrent queries. Two things help a lot: enable the query cache in beacon.toml (`[cache] enabled = true`), and split the dashboard into tabs — only the active tab\'s charts load. Happy to review your config if you paste it here.' },
        { c: 'customer', at: 36, body: 'Cache + tabs got it down to ~4s. Good enough. Thanks.' },
        { c: 1, at: 40, body: 'Excellent. Resolving!', status: 'resolved' },
      ],
    });

    ticket({
      subject: 'Duplicate rows after CSV re-upload',
      customer: 3, priority: 'normal', channel: 'chat', category: 'how_to', status: 'closed', assignee: 2, createdAgo: 500, resolvedAgo: 495, closedAgo: 450,
      thread: [
        { c: 'customer', body: 'I uploaded an updated CSV and now every row appears twice.' },
        { c: 2, at: 0.5, body: 'Hi Jamal — uploads append by default. Use "Replace data" in the upload dialog (or set a unique key column so rows are upserted). I\'ve deduplicated the dataset for you this time.', status: 'resolved' },
        { c: 'customer', at: 2, body: 'Ah, thank you!' },
      ],
    });

    // Extra volume to make the charts interesting -------------------------------
    const filler = [
      ['Chart legend overlaps axis on small screens', 'bug', 'low', 'web', ['bug', 'mobile']],
      ['Question about annual billing discount', 'billing', 'normal', 'email', ['billing']],
      ['Can I change my workspace URL?', 'account', 'low', 'chat', ['docs']],
      ['Alert emails going to spam', 'bug', 'normal', 'email', []],
      ['Add Portuguese language support', 'feature', 'low', 'web', ['feature-request']],
      ['Sync stuck at 99% for 2 hours', 'bug', 'high', 'email', ['integration']],
      ['Need a W-9 form for our records', 'billing', 'normal', 'email', ['billing']],
      ['Row-level permissions per team', 'feature', 'normal', 'web', ['feature-request']],
      ['Export includes hidden columns', 'bug', 'normal', 'chat', ['export', 'bug']],
      ['Cannot remove a former employee from workspace', 'account', 'high', 'email', []],
      ['Tooltip values rounded incorrectly', 'bug', 'low', 'web', ['bug']],
      ['API key rotation best practice?', 'api', 'low', 'email', ['api', 'docs']],
      ['Chart colors differ between PDF and screen', 'bug', 'low', 'email', ['export']],
      ['Trial extension request', 'billing', 'normal', 'chat', ['billing']],
      ['Public link stopped working after rename', 'bug', 'normal', 'web', ['bug']],
      ['SAML assertion "audience mismatch" error', 'account', 'high', 'email', ['sso']],
      ['Request onboarding session for new team', 'other', 'low', 'email', []],
      ['Custom SQL editor loses unsaved changes', 'bug', 'high', 'web', ['bug', 'regression']],
      ['Zapier trigger fires twice', 'bug', 'normal', 'email', ['integration', 'bug']],
      ['Where do I find audit logs?', 'how_to', 'low', 'chat', ['docs']],
      ['Bar chart sorting ignores "descending"', 'bug', 'low', 'web', ['bug']],
      ['Upgrade to Enterprise: procurement questions', 'billing', 'normal', 'email', ['billing', 'vip']],
    ];
    const openers = {
      bug: 'We noticed the following problem and it is affecting our team: ',
      billing: 'Hello, I have a billing question: ',
      account: 'Hi, I need help with our account: ',
      feature: 'It would be great if Beacon supported this: ',
      how_to: 'Quick question — ',
      api: 'Developer question: ',
      other: 'Hi there, ',
    };
    const resolvedReplies = [
      'Thanks for the details — this is fixed on our side now. Could you give it another try?',
      'I\'ve taken care of this for you. Let me know if you need anything else!',
      'This was caused by a configuration issue; I\'ve corrected it and verified it works.',
    ];
    filler.forEach((f, i) => {
      const [subject, category, priority, channel, tags] = f;
      const isResolved = i % 3 !== 0;
      // Resolved tickets are spread over ~28 days; still-open ones are recent
      // so only a handful of them are past their SLA.
      const createdAgo = isResolved ? 12 + i * 31 + (i % 3) * 7 : 2 + i * 2.5;
      const isClosed = isResolved && i % 2 === 0;
      const assignee = i % 5;
      const responseAt = priority === 'high' ? 1 + (i % 3) : 3 + (i % 6);
      const resolveAt = responseAt + 4 + (i % 5) * 9;
      const thread = [{ c: 'customer', body: `${openers[category] || ''}${subject.toLowerCase()}. Please advise.` }];
      if (isResolved || i % 2 === 0) {
        thread.push({ c: assignee, at: responseAt, body: `Hi, thanks for reaching out — I'm looking into "${subject.toLowerCase()}" now and will get back to you shortly.` });
      }
      if (isResolved) {
        thread.push({ c: 'customer', at: resolveAt - 1, body: 'Any update on this?' });
        thread.push({ c: assignee, at: resolveAt, body: resolvedReplies[i % resolvedReplies.length], status: 'resolved' });
      }
      ticket({
        subject, customer: (i * 5) % C.length, priority, channel, category,
        status: isClosed ? 'closed' : isResolved ? 'resolved' : i % 2 === 0 ? 'in_progress' : 'open',
        assignee: isResolved || i % 2 === 0 ? assignee : null,
        createdAgo, tags, thread,
        resolvedAgo: isResolved ? Math.max(createdAgo - resolveAt, 0.5) : null,
        closedAgo: isClosed ? Math.max(createdAgo - resolveAt - 24, 0.25) : null,
      });
    });
  });

  tx();
  console.log('Seeded demo data.');
  return { seeded: true };
}

// Allow running directly: `node src/db/seed.js [--force]`
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  const force = process.argv.includes('--force');
  const result = seed({ force });
  console.log(result.seeded ? 'Database seeded.' : 'Database already has data. Use --force to re-seed.');
}
