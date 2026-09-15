// Admin chrome (sidebar + header) and small render helpers shared by every page.
(function () {
  const NAV = [
    { href: 'index.html',    icon: 'fa-chart-line',   label: 'Overview',          page: 'overview' },
    { href: 'library.html',  icon: 'fa-layer-group',  label: 'Candidate library', page: 'library' },
    { href: 'editor.html',   icon: 'fa-pen-to-square', label: 'Email editor',     page: 'editor' },
    { href: 'journeys.html', icon: 'fa-route',        label: 'Journeys',          page: 'journeys' },
  ];
  const CONTEXT_NAV = [
    { icon: 'fa-hand-holding-heart', label: 'Registries' },
    { icon: 'fa-users',              label: 'Users' },
    { icon: 'fa-envelope',           label: 'Email templates' },
  ];

  NBE.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  NBE.cand = (id) => NBE.candidates.find((c) => c.id === id) || { id, name: id, subject: id, app: 'sp', tier: 'T4' };

  NBE.tierBadge = (tier) => `<span class="tier tier-${NBE.TIERS[tier].cls}" title="${NBE.TIERS[tier].name}">${tier === 'DRIP' ? 'Drip' : tier}</span>`;
  NBE.rungPill = (k) => `<span class="rung rung-${k}" title="${NBE.RUNGS[NBE.rungIndex(k)].name}">${k} ${NBE.RUNGS[NBE.rungIndex(k)].short}</span>`;
  NBE.appChip = (k) => `<span class="app-chip" style="--app:${NBE.app(k).color}"><i></i>${NBE.app(k).name}</span>`;
  NBE.appDot = (k) => `<span class="app-dot" style="--app:${NBE.app(k).color}" title="${NBE.app(k).name}"></span>`;
  NBE.pct = (n, d) => (d ? Math.round((100 * n) / d) + '%' : 'n/a');
  NBE.dayLabel = (d) => `Day ${d}`;

  NBE.people = () => {
    if (!NBE._people) NBE._people = NBE.simulate(NBE.candidates);
    return NBE._people;
  };

  NBE.mount = () => {
    NBE.candidates = NBE.loadCandidates();
    const body = document.body;
    const page = body.dataset.page;

    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = `
      <div class="sb-header"><span class="sb-brand">Admin</span></div>
      <div class="sb-section">Next Best Email</div>
      <ul class="sb-nav">
        ${NAV.map((n) => `
          <li class="${n.page === page ? 'is-current' : ''}">
            <a href="${n.href}"><i class="fa-solid ${n.icon}"></i><span>${n.label}</span></a>
          </li>`).join('')}
      </ul>
      <div class="sb-section">Elsewhere in admin</div>
      <ul class="sb-nav is-muted">
        ${CONTEXT_NAV.map((n) => `<li><a aria-disabled="true"><i class="fa-solid ${n.icon}"></i><span>${n.label}</span></a></li>`).join('')}
      </ul>
      <div class="sb-footer">Prototype · simulated data, 48 people, 60 days</div>`;

    const crumbs = (body.dataset.crumbs || '').split('/').map((s) => s.trim()).filter(Boolean);
    const actions = document.getElementById('page-actions');
    document.getElementById('page-header').innerHTML = `
      <div class="container-fluid">
        <div class="small text-muted mb-3 mt-2">${crumbs.map(NBE.esc).join(' / ')}</div>
        <div class="d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <h1 class="mb-0">${NBE.esc(body.dataset.title)}</h1>
          <div class="text-end">${actions ? actions.innerHTML : ''}</div>
        </div>
      </div>`;
  };
})();
