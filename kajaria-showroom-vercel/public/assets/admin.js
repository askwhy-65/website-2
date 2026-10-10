(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const loginCard = $('#login-card');
  const dashboard = $('#dashboard');
  const loginMessage = $('#login-message');
  const leadsList = $('#leads');

  function escapeHtml(value) {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    return String(value ?? '').replace(/[&<>"']/g, (character) => entities[character]);
  }

  function showSignedOut() {
    loginCard.classList.remove('hide');
    dashboard.classList.add('hide');
  }

  function renderLeads(leads) {
    if (!leads.length) {
      leadsList.innerHTML = '<div class="empty-state">No enquiries yet. New website enquiries will appear here.</div>';
      return;
    }

    leadsList.innerHTML = leads.map((lead) => `
      <article class="lead-card">
        <div class="admin-bar">
          <div>
            <strong>${escapeHtml(lead.name)}</strong>
            <div class="meta">${escapeHtml(new Date(lead.createdAt).toLocaleString())}</div>
          </div>
          <select class="status-select" data-id="${escapeHtml(lead.id)}" aria-label="Enquiry status">
            <option value="new" ${lead.status === 'new' ? 'selected' : ''}>New</option>
            <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
            <option value="closed" ${lead.status === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
        </div>
        <p><strong>Phone:</strong> ${escapeHtml(lead.phone)}${lead.email ? ` · <strong>Email:</strong> ${escapeHtml(lead.email)}` : ''}</p>
        <p><strong>Interest:</strong> ${escapeHtml(lead.interest || 'Not specified')}</p>
        <p>${escapeHtml(lead.message)}</p>
      </article>
    `).join('');

    leadsList.querySelectorAll('.status-select').forEach((select) => {
      select.addEventListener('change', async () => {
        select.disabled = true;

        try {
          const response = await fetch(`/api/admin/leads/${encodeURIComponent(select.dataset.id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: select.value })
          });

          if (!response.ok) {
            throw new Error('Could not update status. Please sign in again.');
          }
        } catch (error) {
          alert(error.message || 'Could not update enquiry status.');
          await loadLeads();
        } finally {
          select.disabled = false;
        }
      });
    });
  }

  async function loadLeads() {
    try {
      const response = await fetch('/api/admin/leads', { cache: 'no-store' });
      if (!response.ok) {
        showSignedOut();
        return;
      }

      const data = await response.json();
      loginCard.classList.add('hide');
      dashboard.classList.remove('hide');
      renderLeads(data.leads || []);
    } catch {
      showSignedOut();
      loginMessage.textContent = 'Could not connect. Please refresh and try again.';
      loginMessage.className = 'form-message error';
    }
  }

  $('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    loginMessage.textContent = 'Signing in…';
    loginMessage.className = 'form-message';

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.get('username'),
          password: form.get('password')
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sign-in failed.');
      }

      event.currentTarget.reset();
      await loadLeads();
    } catch (error) {
      loginMessage.textContent = error.message || 'Sign-in failed.';
      loginMessage.classList.add('error');
    }
  });

  $('#logout').addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    showSignedOut();
  });

  loadLeads();
})();
