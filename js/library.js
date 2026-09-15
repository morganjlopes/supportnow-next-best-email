// Candidate library: what each app offers the orchestrator. Rules are data so the
// editor, the simulator, and the "who matches today" preview all share one evaluator.
window.NBE = window.NBE || {};

NBE.APPS = [
  { key: 'sp', name: 'Support Page',       color: '#188aec' },
  { key: 'gr', name: 'Grants',             color: '#d97706' },
  { key: 'ec', name: 'Emergency Contact',  color: '#dc3545' },
  { key: 'fc', name: 'Funding Coach',      color: '#6f42c1' },
  { key: 'ad', name: 'Advocacy',           color: '#198754' },
  { key: 'cl', name: 'Clicklists',         color: '#0dcaf0' },
  { key: 'pc', name: 'Podcast',            color: '#6c757d' },
  { key: 'la', name: 'Support Languages',  color: '#d63384' },
];
NBE.app = (k) => NBE.APPS.find((a) => a.key === k);

NBE.RUNGS = [
  { key: 'S0', name: 'Touched an app',   short: 'No registry' },
  { key: 'S1', name: 'Registry created', short: 'Created' },
  { key: 'S2', name: 'Shared',           short: 'Shared' },
  { key: 'S3', name: '5+ people',        short: 'Audience' },
  { key: 'S4', name: 'First gift',       short: 'First gift' },
  { key: 'S5', name: '$500+ raised',     short: 'Funded' },
];
NBE.rungIndex = (k) => NBE.RUNGS.findIndex((r) => r.key === k);

NBE.TIERS = {
  T1: { name: 'Transactional',     budget: false, cls: 't1' },
  T2: { name: 'Time critical',     budget: false, cls: 't2' },
  T3: { name: 'Rung nudge',        budget: true,  cls: 't3' },
  T4: { name: 'App engagement',    budget: true,  cls: 't4' },
  T5: { name: 'Cross-app upsell',  budget: true,  cls: 't5' },
  T6: { name: 'Broadcast',         budget: true,  cls: 't6' },
  DRIP: { name: 'Per-app drip (holdout)', budget: false, cls: 'drip' },
};

// Fields a rule can test. Kept small on purpose: each one is a column we already
// have or a single aggregate over activity_signals.
NBE.FIELDS = {
  rung:               { label: 'Current rung',          type: 'rung' },
  has_registry:       { label: 'Has a registry',        type: 'bool' },
  has_photo:          { label: 'Registry has a photo',  type: 'bool' },
  shared:             { label: 'Has shared',            type: 'bool' },
  followers:          { label: 'People on registry',    type: 'number' },
  donations:          { label: 'Charged gifts',         type: 'number' },
  days_quiet:         { label: 'Days since any activity', type: 'number' },
  apps:               { label: 'Apps touched',          type: 'app' },
  diagnosis:          { label: 'Situation',             type: 'enum', options: ['disability', 'pediatric', 'cancer', 'other'] },
};
NBE.OPS = {
  '=':        (a, b) => String(a) === String(b),
  '!=':       (a, b) => String(a) !== String(b),
  '<':        (a, b) => Number(a) < Number(b),
  '>=':       (a, b) => Number(a) >= Number(b),
  'includes': (a, b) => Array.isArray(a) && a.includes(b),
  'excludes': (a, b) => Array.isArray(a) && !a.includes(b),
};

NBE.matches = (rules, state) =>
  rules.every(([field, op, value]) => {
    const v = field === 'apps' ? [...state.apps] : state[field];
    const cast = value === 'yes' ? true : value === 'no' ? false : value;
    return NBE.OPS[op](v, cast);
  });

NBE.ruleText = ([field, op, value]) => {
  const f = NBE.FIELDS[field];
  if (f.type === 'bool') return `${f.label}: ${value}`;
  const val = f.type === 'app' ? NBE.app(value).name : value;
  const opText = { '=': 'is', '!=': 'is not', '<': 'under', '>=': 'at least', includes: 'includes', excludes: 'excludes' }[op];
  return `${f.label} ${opText} ${val}`;
};

NBE.DEFAULT_CANDIDATES = [
  // Support Page: the rung nudges live here because the registry is the goal.
  { id: 'sp-welcome',  app: 'sp', tier: 'T4', advances: 'S0', cooldown: 4, status: 'live',
    name: 'What a support page does', subject: 'One link for everyone who wants to help',
    rules: [['rung', '=', 'S0'], ['apps', 'includes', 'sp']] },
  { id: 'sp-photo',    app: 'sp', tier: 'T3', advances: 'S1', cooldown: 4, status: 'live',
    name: 'Add a photo and two sentences', subject: 'Two minutes that make people say yes',
    rules: [['rung', '=', 'S1'], ['has_photo', '=', 'no']] },
  { id: 'sp-ready',    app: 'sp', tier: 'T3', advances: 'S1', cooldown: 3, status: 'live',
    name: 'Your page is ready to share', subject: 'Your page is ready. Send it to one person.',
    rules: [['rung', '=', 'S1'], ['has_photo', '=', 'yes']] },
  { id: 'sp-four',     app: 'sp', tier: 'T3', advances: 'S2', cooldown: 5, status: 'live',
    name: 'Text these four people', subject: 'Four people who would want to know',
    rules: [['rung', '=', 'S2'], ['followers', '<', '5']] },
  { id: 'sp-rescue',   app: 'sp', tier: 'T3', advances: 'S1', cooldown: 10, status: 'live',
    name: 'We saved your spot', subject: 'Your page is still here when you are ready',
    rules: [['rung', '=', 'S1'], ['days_quiet', '>=', '7']] },
  { id: 'sp-thanks',   app: 'sp', tier: 'T3', advances: 'S4', cooldown: 30, status: 'live',
    name: 'Thank your first supporter', subject: 'Someone gave. Here is how to say thanks.',
    rules: [['rung', '=', 'S4']] },

  { id: 'gr-match',    app: 'gr', tier: 'T4', advances: null, cooldown: 7, status: 'live',
    name: 'Grants you may qualify for', subject: '3 grants that match your situation',
    rules: [['apps', 'includes', 'gr']] },
  { id: 'gr-bridge',   app: 'gr', tier: 'T3', advances: 'S0', cooldown: 6, status: 'live',
    name: 'Grants plus a support page', subject: 'Most families pair a grant with their community',
    rules: [['apps', 'includes', 'gr'], ['has_registry', '=', 'no']] },
  { id: 'ec-finish',   app: 'ec', tier: 'T4', advances: null, cooldown: 7, status: 'live',
    name: 'Finish your emergency card', subject: 'Two fields left on your fridge sheet',
    rules: [['apps', 'includes', 'ec']] },
  { id: 'ec-bridge',   app: 'ec', tier: 'T3', advances: 'S0', cooldown: 6, status: 'live',
    name: 'Turn your card into a support page', subject: 'The people on your card can help with more',
    rules: [['apps', 'includes', 'ec'], ['has_registry', '=', 'no']] },
  { id: 'fc-recap',    app: 'fc', tier: 'T4', advances: null, cooldown: 7, status: 'live',
    name: 'Your coaching recap', subject: 'Your three next steps from coaching',
    rules: [['apps', 'includes', 'fc']] },
  { id: 'cl-share',    app: 'cl', tier: 'T4', advances: null, cooldown: 7, status: 'live',
    name: 'Your clicklist, one tap to share', subject: 'Share your list with the people helping',
    rules: [['apps', 'includes', 'cl']] },

  { id: 'up-grants',   app: 'gr', tier: 'T5', advances: null, cooldown: 14, status: 'live',
    name: 'Grants for families with a disability', subject: 'Funding set aside for families like yours',
    rules: [['diagnosis', '=', 'disability'], ['apps', 'excludes', 'gr']] },
  { id: 'up-advocacy', app: 'ad', tier: 'T5', advances: null, cooldown: 14, status: 'live',
    name: 'Find a pediatric advocate', subject: 'Someone who knows the hospital system',
    rules: [['diagnosis', '=', 'pediatric'], ['apps', 'excludes', 'ad']] },
  { id: 'up-coach',    app: 'fc', tier: 'T5', advances: null, cooldown: 14, status: 'live',
    name: 'Book a free funding coach', subject: 'A free hour to map out the costs',
    rules: [['rung', '=', 'S2'], ['apps', 'excludes', 'fc']] },

  { id: 'pc-episode',  app: 'pc', tier: 'T6', advances: null, cooldown: 14, status: 'live',
    name: 'This week on the podcast', subject: 'A family who has been where you are',
    rules: [] },
  { id: 'la-spanish',  app: 'la', tier: 'T4', advances: null, cooldown: 14, status: 'draft',
    name: 'Your page, in Spanish', subject: 'Tu página, en español',
    rules: [['apps', 'includes', 'la']] },
];

// Editor saves persist per browser so the library feels real across page loads.
NBE.loadCandidates = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('nbe.candidates') || 'null');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (e) {}
  return NBE.DEFAULT_CANDIDATES.map((c) => ({ ...c }));
};
NBE.saveCandidates = (list) => {
  try { localStorage.setItem('nbe.candidates', JSON.stringify(list)); } catch (e) {}
};
