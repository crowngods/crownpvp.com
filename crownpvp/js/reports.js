(() => {
  const f = document.querySelector('#report-form');
  if (!f) return;

  const type = document.querySelector('#report-type');
  const category = document.querySelector('#report-category');
  const target = document.querySelector('#report-target');
  const targetWrap = document.querySelector('#report-target-wrap');
  const badge = document.querySelector('#api-live-badge');

  const options = {
    player: [
      'Unfair Advantage / Cheating (KillAura, Reach, Velocity)',
      'AutoClicker / Macro / Illegal Client Mod',
      'Scamming / IRL Trading',
      'Severe Harassment / Doxxing / Threats',
      'Ban / Mute Evading',
      'Other Player Violation'
    ],
    faction: [
      'Illegal Cannon / Sandstacking / Patching Exploit',
      'F-Top Manipulation / Boosting',
      'Inside / Griefing Violation',
      'Unraidable Base / Glitching',
      'Other Faction Violation'
    ],
    bug: [
      'Duplication / Economy Exploit (Critical)',
      'PvP / Knockback / Combat Tag Bug',
      'Factions / Claim / Spawner Bug',
      'Store / Tebex / Website Issue',
      'Server Suggestion'
    ]
  };

  fetch('/api/health', { headers: { 'x-requested-with': 'crown' } })
    .then(r => r.ok ? r.json() : null)
    .then(h => {
      if (badge) badge.textContent = h?.forms ? 'DATABASE LIVE' : 'RELAY READY';
    })
    .catch(() => { if (badge) badge.textContent = 'RELAY READY'; });

  function updateType() {
    const t = type.value;
    const keep = category.value;
    category.innerHTML = '<option value="">Choose category</option>' +
      (options[t] || []).map(x => `<option value="${x}">${x}</option>`).join('');
    if ((options[t] || []).includes(keep)) category.value = keep;

    if (t === 'bug') {
      targetWrap.hidden = true;
      target.required = false;
      target.value = 'Server / System';
    } else {
      targetWrap.hidden = false;
      target.required = !!t;
      if (target.value === 'Server / System') target.value = '';
      document.querySelector('#report-target-label').textContent =
        t === 'faction' ? 'Faction name' : 'Player username';
      target.placeholder =
        t === 'faction' ? 'Enter the exact faction name' : 'Enter the Minecraft username';
    }
  }

  type.addEventListener('change', updateType);
  updateType();

  // With accounts set up, reports go to Supabase (readable only by the sender and staff). Otherwise the old route is used.
  async function submitReport(p) {
    const auth = await window.CP.authReady;
    if (!auth) return window.CrownForms.send('reports', p);
    if (!auth.user) throw new Error('Please sign in first (see the box below the form), then send your report.');
    const { data, error } = await auth.sb.rpc('submit_report', {
      p_type: p.type, p_category: p.category, p_target: p.target, p_details: p.details,
      p_contact: p.contact || '', p_evidence: p.evidence || ''
    });
    if (error) throw new Error(/too many/i.test(error.message) ? 'You have sent a lot of reports. Please wait a while and try again.' : 'Could not send your report. Please try again.');
    return { ok: true, data: { id: data } };
  }

  const clearDraft = window.CrownForms.enhance(f, 'report');
  const msg = document.querySelector('#report-message');
  const box = document.createElement('div');
  msg.after(box);

  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (!f.reportValidity()) return;

    const b = document.querySelector('#report-submit');
    b.disabled = true;
    b.textContent = 'Encrypting & Sending…';
    msg.className = 'form-message';
    msg.textContent = 'Transmitting report to owner inbox…';
    box.innerHTML = '';

    const payload = Object.fromEntries(new FormData(f).entries());
    try {
      const res = await submitReport(payload);
      if (res.ok) {
        const refId = `RPT-${res.data.id}`;
        f.reset();
        updateType();
        clearDraft();
        msg.textContent = 'Report received by CrownPVP management.';
        msg.classList.add('success');
        box.innerHTML = `
          <div class="receipt-banner">
            <div>
              <strong>Submitted Successfully</strong><br>
              <small>Save your reference ID for Discord follow-ups:</small>
            </div>
            <div>
              <code>${refId}</code>
              <button type="button" class="btn ghost" id="copy-rpt-id" style="margin-left:8px;padding:8px 12px;">Copy ID</button>
            </div>
          </div>`;
        document.querySelector('#copy-rpt-id')?.addEventListener('click', () => {
          navigator.clipboard?.writeText(refId);
          window.CP?.toast(`Copied ${refId}`);
        });
      } else {
        window.CrownForms.keep('reports', payload);
        f.reset();
        updateType();
        clearDraft();
        msg.textContent = 'Report saved locally — paste into Discord below to notify staff immediately.';
        msg.classList.add('success');
        window.CrownForms.offlinePanel(box, 'reports', payload, () => { msg.textContent = ''; });
      }
    } catch (x) {
      msg.textContent = x.message;
      msg.classList.remove('success');
    } finally {
      b.disabled = false;
      b.textContent = 'Submit Private Report';
    }
  });
})();
