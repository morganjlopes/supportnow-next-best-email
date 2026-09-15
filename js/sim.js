// Seeded 60-day simulation: one orchestrator decision per person per day, plus a
// 10% holdout that gets the uncoordinated per-app drips instead.
(function () {
  const DAYS = 60;
  const CAP_WEEK = 3;
  const SCORE_FLOOR = 0.16;
  const TIER_BASE = { T3: 1.0, T4: 0.62, T5: 0.5, T6: 0.3 };
  const RUNG_VALUE = { S0: 0.7, S1: 0.95, S2: 1.0, S3: 0.8, S4: 0.55, S5: 0.3 };
  const DRIP_OFFSETS = [0, 1, 2, 3, 4, 7, 10];
  const DRIP_CONTENT = { sp: 'sp-welcome', gr: 'gr-match', ec: 'ec-finish', fc: 'fc-recap', ad: 'up-advocacy', cl: 'cl-share', pc: 'pc-episode', la: 'la-spanish' };

  const FIRST = ['Maria', 'Dana', 'Keisha', 'Priya', 'Lauren', 'Tomas', 'Grace', 'Jasmine', 'Rachel', 'Ana',
    'Bethany', 'Nicole', 'Carmen', 'Hannah', 'Leah', 'Monique', 'Sofia', 'Erin', 'Tara', 'Whitney',
    'Olivia', 'Deja', 'Kristen', 'Rosa', 'Amanda', 'Latoya', 'Megan', 'Isabel', 'Brooke', 'Chloe',
    'Marcus', 'Jordan', 'Elena', 'Tiffany', 'Kara', 'Yesenia', 'Holly', 'Naomi', 'Courtney', 'Vanessa',
    'Andrea', 'Lindsey', 'Camila', 'Jenna', 'Alicia', 'Stephanie', 'Renee', 'Paige'];
  const LAST = 'ABCDEFGHJKLMNPRSTVW';

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  function rungOf(s) {
    if (s.raised >= 500) return 'S5';
    if (s.donations > 0) return 'S4';
    if (s.followers >= 5) return 'S3';
    if (s.shared) return 'S2';
    if (s.has_registry) return 'S1';
    return 'S0';
  }

  function simulatePerson(i, candidates) {
    const r = rng(1009 * (i + 7));
    const entry = pick(r, ['sp', 'sp', 'sp', 'gr', 'ec', 'fc', 'cl', 'gr', 'ec']);
    const touches = { [entry]: 1 };
    const pool = NBE.APPS.map((a) => a.key).filter((k) => k !== entry && k !== 'la');
    const extra = Math.floor(r() * 4);
    for (let k = 0; k < extra; k++) {
      const app = pick(r, pool);
      if (!touches[app]) touches[app] = 2 + Math.floor(r() * 24);
    }
    if (r() < 0.08) touches.la = 2 + Math.floor(r() * 10);

    const p = {
      id: 'u' + (1000 + i),
      name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}.`,
      email: `${FIRST[i % FIRST.length].toLowerCase()}${i}@example.com`,
      entry,
      diagnosis: pick(r, ['disability', 'pediatric', 'cancer', 'other', 'pediatric', 'cancer']),
      responsiveness: 0.25 + r() * 0.6,
      holdout: i % 10 === 7,
      signals: [], emails: [], decisions: [], conversions: [], days: [],
    };

    const s = { apps: new Set(), has_registry: false, has_photo: false, shared: false,
      followers: 0, donations: 0, raised: 0, days_quiet: 0, diagnosis: p.diagnosis };
    let lastActivity = 1;
    let muteUntil = 0;
    let sharedDay = 0;
    let unopenedStreak = 0;
    const lastSentByCand = {};
    const clickedRecently = (id, day) => p.emails.some((e) => e.cand === id && e.clicked && day - e.day <= 2 && day > e.day);
    const signal = (day, app, name, detail) => { p.signals.push({ day, app, name, detail }); lastActivity = day; };

    for (let day = 1; day <= DAYS; day++) {
      const before = rungOf(s);

      for (const [app, d] of Object.entries(touches)) {
        if (d === day) {
          s.apps.add(app);
          signal(day, app, 'signed_up', `Started using ${NBE.app(app).name}`);
          if (app === 'sp' && r() < 0.75) { s.has_registry = true; signal(day, 'sp', 'registry_created', 'Created a registry'); }
        }
      }

      // Behavior: a small base rate, lifted when a relevant email was clicked.
      const bump = (ids) => (ids.some((id) => clickedRecently(id, day)) ? 0.45 : 0);
      if (!s.has_registry && s.apps.size && r() < 0.01 + bump(['gr-bridge', 'ec-bridge', 'sp-welcome'])) {
        s.has_registry = true; s.apps.add('sp'); signal(day, 'sp', 'registry_created', 'Created a registry');
      }
      if (s.has_registry && !s.has_photo && r() < 0.08 + bump(['sp-photo'])) {
        s.has_photo = true; signal(day, 'sp', 'photo_added', 'Added a registry photo');
      }
      const createdToday = p.signals.some((x) => x.day === day && x.name === 'registry_created');
      if (s.has_registry && !s.shared && r() < (createdToday ? 0.3 : 0.012) + (s.has_photo ? 0.01 : 0) + bump(['sp-ready', 'sp-rescue'])) {
        s.shared = true; sharedDay = day; signal(day, 'sp', 'shared', 'Shared the registry by text');
      }
      // Joins decay fast after a share, matching the real "first send or never" shape.
      if (s.shared) {
        const joins = (r() < 0.2 * p.responsiveness * Math.pow(0.78, day - sharedDay) ? 1 : 0) + (clickedRecently('sp-four', day) && r() < 0.4 ? 1 + (r() < 0.3 ? 1 : 0) : 0);
        if (joins) { s.followers += joins; signal(day, 'sp', 'followers_joined', `${joins} ${joins === 1 ? 'person' : 'people'} joined the registry`); }
      }
      if (s.followers >= 1 && r() < Math.min(0.1, 0.006 * s.followers * s.followers) * Math.pow(0.92, day - sharedDay)) {
        const amt = pick(r, [25, 50, 50, 100, 100, 150, 250]);
        s.donations += 1; s.raised += amt; signal(day, 'sp', 'donation', `Received a $${amt} gift`);
        if (s.donations === 1) muteUntil = day + 2;
      }
      for (const app of s.apps) {
        if (app !== 'sp' && r() < 0.04 * p.responsiveness) signal(day, app, 'active', `Came back to ${NBE.app(app).name}`);
      }

      s.days_quiet = day - lastActivity;
      const after = rungOf(s);
      if (after !== before) p.conversions.push({ day, from: before, to: after, cause: attribute(p, day) });
      s.rung = after;

      if (s.apps.size) decide(day);
      p.days.push({ day, rung: s.rung, followers: s.followers, raised: s.raised });
    }

    function sendEmail(day, cand, tier, decision) {
      const tierLift = tier === 'T3' ? 1.1 : tier === 'T6' ? 0.6 : 0.9;
      const opened = r() < Math.max(0.05, p.responsiveness * tierLift - unopenedStreak * 0.05);
      const clicked = opened && r() < 0.35 + p.responsiveness * 0.3;
      unopenedStreak = opened ? 0 : unopenedStreak + 1;
      lastSentByCand[cand.id] = day;
      const e = { day, cand: cand.id, tier, opened, clicked, decision };
      p.emails.push(e);
      if (clicked) signal(day, cand.app, 'email_click', `Clicked "${cand.subject}"`);
      return e;
    }

    function decide(day) {
      if (p.holdout) {
        for (const [app, d] of Object.entries(touches)) {
          if (DRIP_OFFSETS.includes(day - d)) {
            const cand = candidates.find((c) => c.id === DRIP_CONTENT[app]) || candidates[0];
            sendEmail(day, cand, 'DRIP', null);
          }
        }
        return;
      }

      const state = { ...s, apps: s.apps };
      const sent7 = p.emails.filter((e) => day - e.day < 7 && NBE.TIERS[e.tier].budget);
      const lastT3s = p.emails.filter((e) => e.tier === 'T3').slice(-2);
      const t3ThisWeek = sent7.some((e) => e.tier === 'T3');
      const t3Ignored = lastT3s.length === 2 && lastT3s.every((e) => !e.opened);
      const freshness = Math.pow(0.5, s.days_quiet / 3);
      const fatigue = 0.06 * sent7.length + 0.07 * unopenedStreak;

      const scored = []; const suppressed = [];
      for (const c of candidates) {
        if (c.status !== 'live') continue;
        if (!NBE.matches(c.rules, state)) continue;
        if (c.advances && c.advances !== s.rung) continue;
        if (lastSentByCand[c.id] && day - lastSentByCand[c.id] < c.cooldown) {
          suppressed.push({ cand: c.id, reason: `Cooldown, sent ${day - lastSentByCand[c.id]}d ago` }); continue;
        }
        if (c.tier === 'T5' && t3ThisWeek && !t3Ignored) {
          suppressed.push({ cand: c.id, reason: 'Rule 3: a rung nudge went out this week' }); continue;
        }
        const rv = RUNG_VALUE[s.rung];
        const score = TIER_BASE[c.tier] * rv * (0.45 + 0.55 * freshness) - fatigue;
        scored.push({ cand: c.id, tier: c.tier, score: +score.toFixed(3),
          parts: { tier: TIER_BASE[c.tier], rung: rv, freshness: +freshness.toFixed(2), fatigue: +fatigue.toFixed(2) } });
      }
      scored.sort((a, b) => a.tier.localeCompare(b.tier) || b.score - a.score);

      const base = { day, rung: s.rung, candidates: scored, suppressed };
      if (!scored.length) return;
      let held = null;
      if (day < muteUntil) held = 'Muted 48h after first gift';
      else if (p.emails.some((e) => e.day === day)) held = 'Already sent today';
      else if (sent7.length >= CAP_WEEK) held = `Weekly cap reached (${sent7.length} of ${CAP_WEEK})`;
      else if (scored[0].score < SCORE_FLOOR) held = `Best score ${scored[0].score.toFixed(2)} is under the ${SCORE_FLOOR} floor`;

      if (held) { p.decisions.push({ ...base, held }); return; }
      const winner = candidates.find((c) => c.id === scored[0].cand);
      const decision = { ...base, winner: winner.id };
      p.decisions.push(decision);
      sendEmail(day, winner, winner.tier, decision);
    }

    p.state = s;
    p.rung = rungOf(s);
    p.lastSignalDay = Math.max(...p.signals.map((x) => x.day), 0);
    return p;
  }

  // Credit a rung move to the last clicked email within two days, if any.
  function attribute(p, day) {
    const e = [...p.emails].reverse().find((x) => x.clicked && day - x.day <= 2 && day >= x.day);
    return e ? e.cand : null;
  }

  NBE.DAYS = DAYS;
  NBE.CAP_WEEK = CAP_WEEK;
  NBE.simulate = (candidates, count = 48) => {
    const people = [];
    for (let i = 0; i < count; i++) people.push(simulatePerson(i, candidates));
    return people;
  };
})();
