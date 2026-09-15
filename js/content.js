// Email content: blocks, preloaded templates, sample collections, and a renderer that
// mirrors layouts/platform_email and the platform_emails/* partials.
(function () {
  const T = {
    BLUE: '#198aec', BLUE_INK: '#2f7fd8', CREAM: '#f6f2ea', WHITE: '#ffffff', INK: '#1c1c1c',
    MUTED: '#6b7280', RULE: '#e3ded4', ALERT_BG: '#fdecea', ALERT_IN: '#842029',
    SERIF: "Georgia, 'Times New Roman', Times, serif",
    SANS: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  };
  NBE.THEME = T;
  const esc = (s) => NBE.esc(s);
  const P = `margin:0 0 18px 0;font-family:${T.SERIF};font-size:16px;line-height:26px;color:${T.INK};`;
  const SMALL = `margin:0 0 18px 0;font-family:${T.SANS};font-size:13.5px;line-height:20px;color:${T.MUTED};`;
  const H = {
    h2: `margin:0 0 12px 0;font-family:${T.SANS};font-size:24px;line-height:31px;font-weight:bold;color:${T.INK};`,
    h3: `margin:0 0 8px 0;font-family:${T.SANS};font-size:19px;line-height:26px;font-weight:bold;color:${T.INK};`,
  };
  const A = `color:${T.BLUE_INK};text-decoration:underline;`;

  NBE.MERGE_TAGS = [
    { tag: 'first_name',       label: 'First name' },
    { tag: 'registry_name',    label: 'Registry name' },
    { tag: 'registry_url',     label: 'Registry link' },
    { tag: 'organizer_name',   label: 'Organizer' },
    { tag: 'beneficiary_name', label: 'Beneficiary' },
    { tag: 'needs_count',      label: 'Open needs' },
  ];

  const KIDS = ['Ellie', 'Jordan', 'Sam', 'Ray', 'Nia', 'Theo'];
  NBE.mergeContext = (p) => {
    const first = p ? p.name.split(' ')[0] : 'Maria';
    const registry = `Support for ${first}'s family`;
    const seed = p ? parseInt(p.id.slice(1), 10) : 0;
    return {
      first_name: first,
      registry_name: registry,
      registry_url: 'supportnow.org/' + registry.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
      organizer_name: first,
      beneficiary_name: KIDS[seed % KIDS.length],
      needs_count: p ? 2 + (seed % 4) : 4,
      followers: p ? p.state.followers : 3,
      raised: p ? p.state.raised : 350,
      goal: 2500,
      hasRegistry: p ? p.state.has_registry : true,
    };
  };

  // Mirrors PlatformEmail::ContentValidator: an undeclared tag is flagged, never blanked.
  NBE.fillTags = (str, ctx) => esc(str).replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, tag) => {
    if (!NBE.MERGE_TAGS.some((t) => t.tag === tag)) return `<span class="mt mt-bad" title="Not a merge tag this email can use">{{${tag}}}</span>`;
    return ctx.showTags ? `<span class="mt">${tag}</span>` : esc(ctx[tag]);
  });
  const rich = (str, ctx) => NBE.fillTags(str, ctx)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => `<a href="#" title="${url}" style="${A}">${label}</a>`);
  const paragraphs = (body, ctx, style) => String(body || '').split(/\n\s*\n/).filter((s) => s.trim())
    .map((para) => `<p style="${style}">${rich(para.trim(), ctx).replace(/\n/g, '<br>')}</p>`).join('');
  const hiddenNotice = (ctx, meta) => (meta.editable
    ? `<div style="border:1px dashed #c7ccd3;border-radius:6px;padding:12px 16px;margin:16px 0;font-family:${T.SANS};font-size:13px;color:${T.MUTED};">Hidden for ${esc(ctx.first_name)}: no registry yet. The real email leaves this block out.</div>`
    : '');

  NBE.DESTINATIONS = {
    registry: { label: 'Their registry',        url: '{{registry_url}}' },
    share:    { label: 'Share screen',          url: '/share' },
    photo:    { label: 'Add a photo',           url: '/edit#photo' },
    grants:   { label: 'Grants search',         url: '/grants' },
    coach:    { label: 'Book a funding coach',  url: '/funding-coach' },
    advocacy: { label: 'Advocacy marketplace',  url: '/advocacy' },
    emergency:{ label: 'Emergency card',        url: '/emergency' },
    custom:   { label: 'Custom link',           url: '' },
  };

  NBE.NEEDS = [
    { name: 'Dinner drop-off', when: 'Tue, Sep 16 · 6:00 PM', note: 'No nuts, please. Leave it in the cooler by the door.' },
    { name: 'Rides to treatment', when: 'Thu, Sep 18 · 8:30 AM', note: '' },
    { name: 'Grocery run', when: 'Any day this week', note: 'The list is on the registry page.' },
    { name: 'Mow the lawn', when: 'Saturday morning', note: '' },
  ];

  // Sample items. The real collection block would query live posts, registries, grants and advocates.
  NBE.COLLECTIONS = {
    blog: { label: 'Blog posts', icon: 'fa-newspaper', defaultHeading: 'From the blog', defaultLayout: 'list', defaultCount: 3, linkLabel: 'More on the blog', items: [
      { title: 'How to ask for help without feeling like a burden', meta: '5 min read', blurb: 'Three short scripts families use, and why people say yes.' },
      { title: 'The first 48 hours after a hard diagnosis', meta: '6 min read', blurb: 'What to do now, what can wait, and who to tell first.' },
      { title: 'What to put on a meal schedule', meta: '4 min read', blurb: 'Allergies, drop-off windows, and the note that saves everyone a text.' },
      { title: 'Grants most families never hear about', meta: '7 min read', blurb: 'Where to look, what they cover, and how long they take.' },
    ] },
    registries: { label: 'Registries', icon: 'fa-hand-holding-heart', defaultHeading: 'Families like yours', defaultLayout: 'grid', defaultCount: 2, linkLabel: 'See more families', items: [
      { title: 'Help the Alvarez family through treatment', raised: 4820, goal: 8000, people: 61, tint: 'linear-gradient(135deg,#cfe2fb,#f6f2ea)' },
      { title: "Meals for Jordan's recovery", raised: 1310, goal: 2000, people: 24, tint: 'linear-gradient(135deg,#f6f2ea,#fde2c8)' },
      { title: 'Get Ellie a wheelchair van', raised: 12650, goal: 30000, people: 143, tint: 'linear-gradient(135deg,#d6f0e6,#cfe2fb)' },
      { title: 'Caring for Grandpa Ray at home', raised: 2240, goal: 5000, people: 38, tint: 'linear-gradient(135deg,#e8e0f7,#f6f2ea)' },
    ] },
    grants: { label: 'Grants', icon: 'fa-hand-holding-dollar', defaultHeading: 'Grants you may qualify for', defaultLayout: 'list', defaultCount: 3, linkLabel: 'Search all grants', items: [
      { title: 'Family Relief Fund', meta: 'Up to $1,500 · rolling deadline', blurb: 'Rent, utilities, and travel for families in active treatment.' },
      { title: 'Pediatric Care Travel Grant', meta: 'Up to $800 · closes Oct 1', blurb: 'Gas, lodging, and parking for hospital stays far from home.' },
      { title: 'Adaptive Equipment Grant', meta: 'Up to $5,000 · closes Nov 15', blurb: 'Wheelchairs, lifts, and home modifications.' },
      { title: 'Caregiver Respite Grant', meta: 'Up to $600 · rolling', blurb: 'A few days of paid care so the caregiver can rest.' },
    ] },
    advocates: { label: 'Advocates', icon: 'fa-user-shield', defaultHeading: 'Advocates who can help', defaultLayout: 'grid', defaultCount: 2, linkLabel: 'Browse the marketplace', items: [
      { title: 'Hospital billing advocate', meta: 'Billing', blurb: 'Reviews every bill and disputes the ones that are wrong.' },
      { title: 'IEP and school advocate', meta: 'Education', blurb: 'Comes to school meetings with you, prepared.' },
      { title: 'Insurance appeals advocate', meta: 'Insurance', blurb: 'Turns a denial into a written appeal.' },
      { title: 'Pediatric care navigator', meta: 'Hospital', blurb: 'One person who knows who to call and when.' },
    ] },
  };

  function collectionItem(source, item, grid) {
    if (source === 'registries') {
      const pct = Math.round((100 * item.raised) / item.goal);
      return `<div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff;">
        <div style="height:${grid ? 84 : 110}px;background:${item.tint};"></div>
        <div style="padding:12px 14px;font-family:${T.SANS};">
          <p style="margin:0 0 8px 0;font-size:15px;line-height:20px;font-weight:bold;color:#1e3a5f;">${esc(item.title)}</p>
          <div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;"><div style="width:${pct}%;height:6px;background:${T.BLUE};"></div></div>
          <p style="margin:6px 0 0 0;font-size:12.5px;line-height:17px;color:${T.MUTED};">$${item.raised.toLocaleString()} raised · ${item.people} people</p>
        </div></div>`;
    }
    const box = grid ? 'border:1px solid #e5e7eb;border-radius:8px;padding:14px;' : `padding:14px 0;border-bottom:1px solid ${T.RULE};`;
    return `<div style="${box}font-family:${T.SANS};">
      <p style="margin:0 0 4px 0;font-size:16px;line-height:22px;font-weight:bold;color:${T.INK};">${esc(item.title)}</p>
      <p style="margin:0 0 6px 0;font-size:13px;line-height:18px;color:${T.MUTED};">${esc(item.meta)}</p>
      <p style="margin:0;font-family:${T.SERIF};font-size:15px;line-height:23px;color:${T.INK};">${esc(item.blurb)}</p></div>`;
  }

  const clampCount = (n) => Math.max(1, Math.min(4, +n || 1));
  const collectionOptions = () => Object.entries(NBE.COLLECTIONS).map(([k, v]) => [k, v.label]);

  // shortcode: the real [tag] this renders through today; null means a new shortcode is needed.
  NBE.BLOCKS = {
    hero: {
      label: 'Hero', icon: 'fa-heading', shortcode: 'hero',
      defaults: () => ({ title: 'A headline for this email', subtitle: 'One line that says why it matters.' }),
      fields: [{ key: 'title', label: 'Headline', type: 'text', tags: true }, { key: 'subtitle', label: 'Subheadline', type: 'text', tags: true }],
      render: (b, ctx) => `<div style="background:${T.CREAM};padding:28px 32px 36px 32px;">
        ${b.title ? `<h1 style="margin:0 0 10px 0;font-family:${T.SANS};font-size:36px;line-height:42px;font-weight:bold;letter-spacing:-0.5px;color:${T.INK};">${rich(b.title, ctx)}</h1>` : ''}
        ${b.subtitle ? `<p style="margin:0;font-family:${T.SERIF};font-style:italic;font-size:21px;line-height:28px;color:${T.INK};">${rich(b.subtitle, ctx)}</p>` : ''}</div>`,
    },
    heading: {
      label: 'Heading', icon: 'fa-font', shortcode: 'markdown',
      defaults: () => ({ text: 'A section heading', level: 'h2' }),
      fields: [{ key: 'text', label: 'Heading', type: 'text', tags: true }, { key: 'level', label: 'Size', type: 'select', options: [['h2', 'Large'], ['h3', 'Small']] }],
      render: (b, ctx) => `<${b.level} style="${H[b.level] || H.h2}">${rich(b.text, ctx)}</${b.level}>`,
    },
    text: {
      label: 'Text', icon: 'fa-align-left', shortcode: 'markdown',
      defaults: () => ({ body: 'Write something here. Use {{first_name}} to greet them by name.', size: 'normal' }),
      fields: [
        { key: 'body', label: 'Text', type: 'textarea', tags: true, hint: 'A blank line starts a new paragraph. **bold** and [link text](url) work.' },
        { key: 'size', label: 'Style', type: 'select', options: [['normal', 'Body text'], ['small', 'Small print']] },
      ],
      render: (b, ctx) => paragraphs(b.body, ctx, b.size === 'small' ? SMALL : P),
    },
    button: {
      label: 'Button', icon: 'fa-hand-pointer', shortcode: 'btn',
      defaults: () => ({ title: 'Open my page', dest: 'registry', url: '', magic: false }),
      fields: [
        { key: 'title', label: 'Button label', type: 'text' },
        { key: 'dest', label: 'Goes to', type: 'select', options: () => Object.entries(NBE.DESTINATIONS).map(([k, v]) => [k, v.label]) },
        { key: 'url', label: 'Link', type: 'text', showIf: (b) => b.dest === 'custom' },
        { key: 'magic', label: 'Sign them in automatically', type: 'toggle', hint: 'Uses a magic link, like [btn magic_link=true].' },
      ],
      render: (b, ctx) => {
        const url = b.dest === 'custom' ? b.url : (NBE.DESTINATIONS[b.dest] || {}).url;
        return `<div style="margin:8px 0 ${b.magic ? 8 : 24}px 0;"><a href="#" title="${esc(url)}" style="display:block;text-align:center;background:${T.BLUE};border-radius:30px;padding:16px 28px;font-family:${T.SANS};font-size:15px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;line-height:20px;color:#ffffff;text-decoration:none;">${rich(b.title || 'Button', ctx)}</a></div>
          ${b.magic ? `<p style="margin:0 0 24px 0;font-family:${T.SANS};font-size:13px;line-height:19px;font-style:italic;color:${T.MUTED};text-align:center;">This button signs you in automatically.</p>` : ''}`;
      },
    },
    callout: {
      label: 'Callout', icon: 'fa-bullhorn', shortcode: 'callout',
      defaults: () => ({ title: 'A number or a point that matters', subtitle: '', style: 'neutral' }),
      fields: [
        { key: 'title', label: 'Title', type: 'text', tags: true },
        { key: 'subtitle', label: 'Subtitle', type: 'text', tags: true },
        { key: 'style', label: 'Style', type: 'select', options: [['neutral', 'Highlight'], ['alert', 'Alert']] },
      ],
      render: (b, ctx) => {
        const alert = b.style === 'alert';
        return `<div style="margin:8px 0 24px 0;background:${alert ? T.ALERT_BG : '#f6f8fa'};border-radius:8px;padding:20px 24px;font-family:${T.SANS};text-align:${alert ? 'left' : 'center'};">
          <p style="margin:0;font-size:${alert ? 15 : 26}px;line-height:${alert ? 22 : 32}px;font-weight:bold;color:${alert ? T.ALERT_IN : T.INK};">${rich(b.title, ctx)}</p>
          ${b.subtitle ? `<p style="margin:6px 0 0 0;font-size:14px;line-height:20px;color:${T.MUTED};">${rich(b.subtitle, ctx)}</p>` : ''}</div>`;
      },
    },
    quote: {
      label: 'Quote', icon: 'fa-quote-left', shortcode: null, newName: 'quote',
      defaults: () => ({ quote: 'I almost did not send it. By that night, twenty people had signed up for meals.', attribution: "Replace with a real organizer's words" }),
      fields: [{ key: 'quote', label: 'Quote', type: 'textarea', rows: 3 }, { key: 'attribution', label: 'Who said it', type: 'text' }],
      render: (b, ctx) => `<div style="margin:8px 0 24px 0;border-left:3px solid ${T.RULE};padding:4px 0 4px 18px;">
        <p style="margin:0 0 6px 0;font-family:${T.SERIF};font-style:italic;font-size:18px;line-height:28px;color:${T.INK};">${rich(b.quote, ctx)}</p>
        ${b.attribution ? `<p style="margin:0;font-family:${T.SANS};font-size:13px;line-height:18px;color:${T.MUTED};">${esc(b.attribution)}</p>` : ''}</div>`,
    },
    divider: {
      label: 'Divider', icon: 'fa-minus', shortcode: 'divider',
      defaults: () => ({}), fields: [],
      render: () => `<hr style="border:0;border-top:1px solid ${T.RULE};margin:28px 0;">`,
    },
    registry_card: {
      label: 'Registry card', icon: 'fa-id-card', shortcode: 'registry_card',
      defaults: () => ({}), fields: [],
      render: (b, ctx, meta) => (!ctx.hasRegistry ? hiddenNotice(ctx, meta) : `<div style="margin:16px 0;background:#f6f8fa;border:1px solid #e5e7eb;border-radius:6px;padding:16px;font-family:Helvetica,Arial,sans-serif;">
        <p style="margin:0 0 4px 0;font-size:12px;line-height:16px;color:#8a94a6;text-transform:uppercase;letter-spacing:0.5px;">Fundraiser</p>
        <p style="margin:0;font-size:16px;line-height:22px;font-weight:bold;color:#1e3a5f;">${NBE.fillTags('{{registry_name}}', ctx)}</p></div>`),
    },
    registry_preview: {
      label: 'Registry preview', icon: 'fa-image', shortcode: null, newName: 'registry_preview',
      defaults: () => ({ show_progress: true, show_people: true }),
      fields: [{ key: 'show_progress', label: 'Show progress bar', type: 'toggle' }, { key: 'show_people', label: 'Show how many people follow it', type: 'toggle' }],
      render: (b, ctx, meta) => {
        if (!ctx.hasRegistry) return hiddenNotice(ctx, meta);
        const pct = Math.min(100, Math.round((100 * ctx.raised) / ctx.goal));
        const people = `${ctx.followers} ${ctx.followers === 1 ? 'person' : 'people'} following`;
        return `<div style="margin:16px 0 24px 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-family:${T.SANS};">
          <div style="height:150px;background:linear-gradient(135deg,#cfe2fb 0%,#f6f2ea 100%);display:flex;align-items:flex-end;padding:14px 16px;"><span style="background:rgba(255,255,255,.9);border-radius:999px;padding:3px 10px;font-size:12px;color:#1e3a5f;font-weight:bold;">Registry photo</span></div>
          <div style="padding:14px 16px;">
            <p style="margin:0 0 10px 0;font-size:18px;line-height:24px;font-weight:bold;color:#1e3a5f;">${NBE.fillTags('{{registry_name}}', ctx)}</p>
            ${b.show_progress ? `<div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;"><div style="width:${pct}%;height:8px;background:${T.BLUE};"></div></div>` : ''}
            <p style="margin:8px 0 0 0;font-size:13.5px;line-height:19px;color:${T.MUTED};">${b.show_progress ? `<b style="color:${T.INK};">$${ctx.raised.toLocaleString()}</b> raised of $${ctx.goal.toLocaleString()}` : ''}${b.show_progress && b.show_people ? ' · ' : ''}${b.show_people ? people : ''}</p>
          </div></div>`;
      },
    },
    needs_list: {
      label: 'Needs list', icon: 'fa-list-check', shortcode: 'needs_list',
      defaults: () => ({ count: 3 }),
      fields: [{ key: 'count', label: 'How many needs', type: 'number', min: 1, max: 4 }],
      render: (b) => `<div style="margin:0 0 24px 0;">${NBE.NEEDS.slice(0, clampCount(b.count)).map((n) => `
        <div style="padding:14px 0;border-bottom:1px solid ${T.RULE};font-family:${T.SANS};">
          <p style="margin:0 0 4px 0;font-size:16px;line-height:22px;font-weight:bold;color:${T.INK};">${esc(n.name)}</p>
          <p style="margin:0;font-size:14px;line-height:20px;color:${T.MUTED};">${esc(n.when)}</p>
          ${n.note ? `<p style="margin:8px 0 0 0;font-family:${T.SERIF};font-size:15px;line-height:23px;color:${T.INK};">${esc(n.note)}</p>` : ''}</div>`).join('')}</div>`,
    },
    collection: {
      label: 'Collection', icon: 'fa-table-cells-large', shortcode: null, newName: 'collection',
      defaults: () => ({ source: 'blog', heading: 'From the blog', count: 3, layout: 'list', link_label: 'More on the blog' }),
      fields: [
        { key: 'heading', label: 'Heading', type: 'text', tags: true },
        { key: 'source', label: 'Pull items from', type: 'select', options: collectionOptions },
        { key: 'count', label: 'How many', type: 'number', min: 1, max: 4 },
        { key: 'layout', label: 'Layout', type: 'select', options: [['list', 'List'], ['grid', 'Two across']] },
        { key: 'link_label', label: 'Link below the items', type: 'text' },
      ],
      render: (b, ctx, meta) => {
        const src = NBE.COLLECTIONS[b.source] || NBE.COLLECTIONS.blog;
        const grid = b.layout === 'grid' && !meta.mobile;
        const gap = grid || b.source === 'registries' ? 12 : 0;
        return `${b.heading ? `<h3 style="${H.h3}">${rich(b.heading, ctx)}</h3>` : ''}
          <div style="display:grid;grid-template-columns:${grid ? '1fr 1fr' : '1fr'};gap:${gap}px;margin:0 0 18px 0;">${src.items.slice(0, clampCount(b.count)).map((i) => collectionItem(b.source, i, grid)).join('')}</div>
          ${b.link_label ? `<p style="margin:0 0 24px 0;font-family:${T.SANS};font-size:14px;line-height:20px;"><a href="#" style="${A}">${esc(b.link_label)}</a></p>` : ''}`;
      },
    },
  };

  NBE.renderNote = (def) => {
    if (def.shortcode === null) return `<b>New.</b> Needs a <code>[${def.newName}]</code> shortcode added to PlatformEmail::Shortcodes before it can send.`;
    if (def.shortcode === 'markdown') return '<b>Works today.</b> Plain Markdown in the email body.';
    if (def.shortcode === 'hero') return "<b>Works today.</b> The email's hero title and subtitle on the cream band.";
    return `<b>Works today.</b> Renders through the existing <code>[${def.shortcode}]</code> shortcode.`;
  };

  NBE.newBlock = (type, over = {}) => ({ ...NBE.BLOCKS[type].defaults(), ...over, id: 'b' + Math.random().toString(36).slice(2, 9), type });
  const B = NBE.newBlock;
  const destFor = (c) => ({ sp: 'registry', gr: 'grants', fc: 'coach', ad: 'advocacy', ec: 'emergency' })[c.app] || 'registry';
  const appName = (c) => (NBE.app(c.app) || { name: 'SupportNow' }).name;

  NBE.TEMPLATES = [
    { id: 'note', name: 'Simple note', preview: 'A quick note from the SupportNow team.',
      desc: 'A short, personal message and one button. Reads like it came from a person.',
      build: (c) => [
        B('text', { body: `Hi {{first_name}},\n\n${c.subject}. It usually takes a couple of minutes.` }),
        B('button', { title: 'Take me there', dest: destFor(c) }),
        B('text', { body: 'Reply any time. A real person reads every reply.', size: 'small' }),
      ] },
    { id: 'nudge', name: 'Rung nudge', preview: 'It takes about two minutes.',
      desc: 'Headline, why it matters, their own registry, and one clear ask.',
      build: (c) => [
        B('hero', { title: c.subject, subtitle: 'A two-minute step, {{first_name}}.' }),
        B('text', { body: 'Families who send their page to a few people in the first week are far more likely to get the help they need. It does not have to be perfect to start.\n\nHere is yours:' }),
        B('registry_card'),
        B('button', { title: 'Open my page', dest: destFor(c), magic: true }),
        B('text', { body: 'Reply to this email if something is in the way. A real person reads every reply.', size: 'small' }),
      ] },
    { id: 'spotlight', name: 'Feature spotlight', preview: 'Another way SupportNow can help, {{first_name}}.',
      desc: 'Introduce another app with a highlight box and a button.',
      build: (c) => [
        B('hero', { title: c.subject, subtitle: 'Something that pairs well with {{registry_name}}.' }),
        B('text', { body: `Most families lean on more than one kind of help. ${appName(c)} sits right alongside your page, and you can start in a few minutes.` }),
        B('callout', { title: appName(c), subtitle: 'Part of SupportNow' }),
        B('button', { title: `Try ${appName(c)}`, dest: destFor(c) }),
      ] },
    { id: 'digest', name: 'Digest', preview: 'Reads, stories, and families to follow.',
      desc: 'Reads and families to follow, pulled in automatically. Nothing to rewrite each week.',
      build: (c) => [
        B('hero', { title: c.subject, subtitle: 'A few things worth your time this week.' }),
        B('collection', { source: 'blog', heading: 'From the blog', count: 3, layout: 'list', link_label: 'More on the blog' }),
        B('divider'),
        B('collection', { source: 'registries', heading: 'Families like yours', count: 2, layout: 'grid', link_label: 'See more families' }),
        B('button', { title: c.app === 'pc' ? 'Listen now' : 'Read more', dest: 'custom', url: c.app === 'pc' ? '/podcast' : '/blog' }),
      ] },
    { id: 'milestone', name: 'Milestone', preview: 'Your first gift just came in.',
      desc: 'Celebrate progress, show the registry, and suggest the next step.',
      build: () => [
        B('hero', { title: 'Someone gave to {{registry_name}}', subtitle: 'Your first gift just came in, {{first_name}}.' }),
        B('registry_preview', { show_progress: true, show_people: true }),
        B('text', { body: 'A quick thank-you in your own words is what supporters remember. It also reminds them to pass your page along.' }),
        B('button', { title: 'Say thank you', dest: 'registry', magic: true }),
      ] },
  ];

  const defaultTemplateId = (c) => (c.id === 'sp-thanks' ? 'milestone'
    : { T3: 'nudge', T5: 'spotlight', T6: 'digest' }[c.tier] || 'note');
  const KEY = (id) => `nbe.content.${id}`;

  NBE.defaultContent = (c) => {
    const t = NBE.TEMPLATES.find((x) => x.id === defaultTemplateId(c));
    return { template: t.id, subject: c.subject, preview: t.preview, blocks: t.build(c) };
  };
  NBE.hasSavedContent = (id) => { try { return !!localStorage.getItem(KEY(id)); } catch (e) { return false; } };
  NBE.loadContent = (c) => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY(c.id)) || 'null');
      if (s && Array.isArray(s.blocks)) return s;
    } catch (e) {}
    return NBE.defaultContent(c);
  };
  NBE.saveContent = (c, content) => { try { localStorage.setItem(KEY(c.id), JSON.stringify(content)); } catch (e) {} };

  NBE.renderEmail = (content, ctx, meta = {}) => {
    const blocks = content.blocks || [];
    const band = blocks[0] && blocks[0].type === 'hero' ? T.CREAM : T.WHITE;
    const body = blocks.map((b, i) => {
      const def = NBE.BLOCKS[b.type];
      if (!def) return '';
      const prev = blocks[i - 1];
      const top = !prev || prev.type === 'hero' ? 32 : 0;
      const bottom = i === blocks.length - 1 ? 16 : 0;
      const pad = b.type === 'hero' ? 'padding:0;' : `padding:${top}px 32px ${bottom}px 32px;`;
      const inner = def.render(b, ctx, meta);
      if (!meta.editable) return `<div style="${pad}">${inner}</div>`;
      return `<div class="blk ${meta.selectedId === b.id ? 'is-sel' : ''}" data-id="${b.id}" style="${pad}">
        <div class="blk-tools" role="toolbar" aria-label="${esc(def.label)} block">
          <span class="blk-name">${esc(def.label)}</span>
          <button type="button" class="blk-handle" title="Drag to move" aria-label="Drag to move"><i class="fa-solid fa-grip-vertical"></i></button>
          <button type="button" data-act="up" title="Move up" aria-label="Move up"><i class="fa-solid fa-arrow-up"></i></button>
          <button type="button" data-act="down" title="Move down" aria-label="Move down"><i class="fa-solid fa-arrow-down"></i></button>
          <button type="button" data-act="dup" title="Duplicate" aria-label="Duplicate"><i class="fa-solid fa-clone"></i></button>
          <button type="button" data-act="del" title="Delete" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>${inner}</div>`;
    }).join('');
    return `<div class="em-card">
      <div style="background:${band};line-height:0;"><img src="img/email-header.png" alt="SupportNow" style="display:block;width:100%;height:auto;border:0;"></div>
      <div class="em-blocks"${meta.editable ? ' id="em-blocks"' : ''}>${body}</div></div>
      <div class="em-foot"><p>SupportNow.org</p><p>You received this because you started a registry on SupportNow.</p><p><a href="#">Unsubscribe from these emails</a></p></div>`;
  };
})();
