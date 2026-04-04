/**
 * SKYTEAM Admin Panel Extension
 * Provides enhanced admin functionality: user editing, community management, membership control
 * Loaded after index.html inline scripts
 *
 * Dependencies: USERS, CU, RANKS, SUPABASE_URL, SUPABASE_KEY, showToast()
 * Extends: switchAdminTab(), renderAdminUsuarios()
 */

// ============================================================================
// INITIALIZATION & CONFIGURATION
// ============================================================================

(function() {
  'use strict';

  // Safely access global variables
  const getGlobal = (name, fallback = null) => {
    try {
      return window[name] || fallback;
    } catch (e) {
      console.warn(`Global ${name} not found:`, e.message);
      return fallback;
    }
  };

  const USERS_REF = getGlobal('USERS', {});
  const CURRENT_USER = getGlobal('CU', {});
  const RANKS_REF = getGlobal('RANKS', {});
  const SUPABASE_URL = getGlobal('SUPABASE_URL', '');
  const SUPABASE_KEY = getGlobal('SUPABASE_KEY', '');
  const showToastFn = getGlobal('showToast', (msg) => console.log(msg));

  // Inject CSS for admin panel extension
  const injectStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
      /* User Edit Modal */
      .admin-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: inherit;
      }

      .admin-modal {
        background: var(--bg2, #0a0a12);
        border: 1px solid var(--border, rgba(255,255,255,0.06));
        border-radius: 12px;
        padding: 28px;
        max-width: 600px;
        width: 90%;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
      }

      .admin-modal-header {
        display: flex;
        align-items: center;
        margin-bottom: 24px;
        gap: 16px;
      }

      .admin-modal-avatar {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: var(--bg3, #14141f);
        border: 2px solid rgba(255,255,255,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: rgba(255,255,255,0.6);
        font-size: 20px;
        flex-shrink: 0;
      }

      .admin-modal-title {
        flex: 1;
      }

      .admin-modal-title h2 {
        margin: 0;
        color: var(--text, #F0EDE6);
        font-size: 20px;
        font-weight: 600;
      }

      .admin-modal-title p {
        margin: 4px 0 0 0;
        color: var(--muted, rgba(255,255,255,0.45));
        font-size: 13px;
      }

      .admin-modal-close {
        background: none;
        border: none;
        color: var(--muted, rgba(255,255,255,0.45));
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }

      .admin-modal-close:hover {
        background: var(--bg3, #14141f);
        color: var(--text, #F0EDE6);
      }

      .admin-form-group {
        margin-bottom: 18px;
      }

      .admin-form-group label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: var(--text, #F0EDE6);
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .admin-form-group input,
      .admin-form-group select,
      .admin-form-group textarea {
        width: 100%;
        padding: 10px 12px;
        background: var(--bg3, #14141f);
        border: 1px solid var(--border, rgba(255,255,255,0.06));
        border-radius: 6px;
        color: var(--text, #F0EDE6);
        font-size: 14px;
        font-family: inherit;
        transition: all 0.2s;
        box-sizing: border-box;
      }

      .admin-form-group input:focus,
      .admin-form-group select:focus,
      .admin-form-group textarea:focus {
        outline: none;
        border-color: rgba(255,255,255,0.25);
        box-shadow: 0 0 0 3px rgba(255,255,255,0.08);
      }

      .admin-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .admin-form-actions {
        display: flex;
        gap: 10px;
        margin-top: 24px;
      }

      .admin-btn {
        flex: 1;
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .admin-btn-primary {
        background: var(--gold, #C9A84C);
        color: #000;
      }

      .admin-btn-primary:hover {
        background: #E8D48B;
        transform: translateY(-2px);
      }

      .admin-btn-secondary {
        background: var(--bg3, #14141f);
        color: var(--text, #F0EDE6);
        border: 1px solid rgba(255,255,255,0.08);
      }

      .admin-btn-secondary:hover {
        background: rgba(255,255,255,0.06);
      }

      /* Tab Navigation */
      .admin-tabs-nav {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        overflow-x: auto;
        padding-bottom: 12px;
      }

      .admin-tab-btn {
        padding: 8px 16px;
        background: none;
        border: none;
        color: var(--muted, rgba(255,255,255,0.45));
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        border-bottom: 2px solid transparent;
        white-space: nowrap;
        transition: all 0.2s;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .admin-tab-btn.active {
        color: var(--gold, #C9A84C);
        border-bottom-color: var(--gold, #C9A84C);
      }

      .admin-tab-btn:hover {
        color: var(--text, #F0EDE6);
      }

      /* Community Tab */
      .admin-comunidad-search {
        margin-bottom: 16px;
      }

      .admin-comunidad-search input {
        width: 100%;
        padding: 10px 12px;
        background: var(--bg3, #14141f);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 6px;
        color: var(--text, #F0EDE6);
        font-size: 13px;
      }

      .admin-message-item {
        background: var(--bg3, #14141f);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 10px;
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }

      .admin-message-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--bg2, #0a0a12);
        border: 1px solid rgba(255,255,255,0.06);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 500;
        color: rgba(255,255,255,0.6);
        font-size: 12px;
        flex-shrink: 0;
      }

      .admin-message-content {
        flex: 1;
        min-width: 0;
      }

      .admin-message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }

      .admin-message-user {
        font-weight: 500;
        color: var(--text, #F0EDE6);
        font-size: 13px;
      }

      .admin-message-time {
        color: var(--muted, rgba(255,255,255,0.45));
        font-size: 12px;
      }

      .admin-message-text {
        color: var(--text, #F0EDE6);
        font-size: 13px;
        line-height: 1.4;
        word-break: break-word;
      }

      .admin-message-delete {
        background: none;
        border: none;
        color: var(--muted, rgba(255,255,255,0.45));
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
        padding: 4px 8px;
        border-radius: 4px;
      }

      .admin-message-delete:hover {
        background: rgba(255, 68, 68, 0.2);
        color: #ff4444;
      }

      /* Membership Tab */
      .admin-membership-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }

      .admin-membership-table th {
        background: var(--bg3, #14141f);
        color: var(--text, #F0EDE6);
        padding: 12px;
        text-align: left;
        font-size: 12px;
        font-weight: 600;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .admin-membership-table td {
        padding: 12px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        font-size: 13px;
        color: var(--text, #F0EDE6);
      }

      .admin-membership-table tbody tr:hover {
        background: var(--bg3, #14141f);
      }

      .admin-status-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .admin-status-active {
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
      }

      .admin-status-expiring {
        background: rgba(255, 193, 7, 0.2);
        color: #ffc107;
      }

      .admin-status-expired {
        background: rgba(244, 67, 54, 0.2);
        color: #f44336;
      }

      .admin-membership-actions {
        display: flex;
        gap: 6px;
      }

      .admin-membership-btn {
        padding: 6px 10px;
        background: var(--bg2, #0a0a12);
        border: 1px solid rgba(255,255,255,0.08);
        color: var(--gold, #C9A84C);
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .admin-membership-btn:hover {
        background: var(--gold, #C9A84C);
        color: #000;
      }

      .admin-screenshot-area {
        background: var(--bg3, #14141f);
        border: 2px dashed rgba(255,255,255,0.08);
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        color: var(--muted, rgba(255,255,255,0.45));
        font-size: 13px;
        margin: 16px 0;
      }

      .admin-screenshot-area.dragover {
        border-color: rgba(255,255,255,0.25);
        background: rgba(255,255,255,0.04);
      }

      .admin-screenshot-preview {
        width: 100%;
        max-width: 300px;
        height: auto;
        border-radius: 6px;
        margin: 12px 0;
      }

      @media (max-width: 640px) {
        .admin-modal {
          padding: 20px;
          max-width: 95%;
        }

        .admin-form-row {
          grid-template-columns: 1fr;
        }

        .admin-tabs-nav {
          flex-wrap: wrap;
        }

        .admin-membership-table {
          font-size: 12px;
        }

        .admin-membership-table th,
        .admin-membership-table td {
          padding: 8px;
        }
      }
    `;
    document.head.appendChild(style);
  };

  // ============================================================================
  // USER EDIT MODAL
  // ============================================================================

  const createUserEditModal = (userId) => {
    const user = USERS_REF[userId];
    if (!user) {
      showToastFn('Usuario no encontrado');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'admin-modal-overlay';

    // Calculate membership info
    const now = new Date();
    const expiryDate = user.expiry ? new Date(user.expiry) : null;
    const daysRemaining = expiryDate ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) : 0;
    const startDate = user.membresia_inicio ? new Date(user.membresia_inicio) : now;

    // Get available leaders (rank >= 4)
    const leaders = Object.entries(USERS_REF)
      .filter(([_, u]) => u.rank >= 4 && u.id !== userId)
      .map(([id, u]) => ({ id, name: u.name }));

    const rankOptions = Object.entries(RANKS_REF)
      .sort(([_, a], [__, b]) => a.level - b.level)
      .map(([key, r]) => `<option value="${key}" ${user.rank === key ? 'selected' : ''}>${r.name}</option>`)
      .join('');

    modal.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <div class="admin-modal-avatar">
            ${user.name.charAt(0).toUpperCase()}
          </div>
          <div class="admin-modal-title">
            <h2>${user.name}</h2>
            <p>${user.email}</p>
          </div>
          <button class="admin-modal-close">&times;</button>
        </div>

        <form class="admin-edit-form">
          <div class="admin-form-group">
            <label>Nombre</label>
            <input type="text" name="name" value="${escapeHtml(user.name)}" required />
          </div>

          <div class="admin-form-group">
            <label>Email</label>
            <input type="email" name="email" value="${escapeHtml(user.email)}" required />
          </div>

          <div class="admin-form-row">
            <div class="admin-form-group">
              <label>WhatsApp</label>
              <input type="text" name="wa" value="${escapeHtml(user.wa || '')}" />
            </div>
            <div class="admin-form-group">
              <label>CÃ³digo de Referido</label>
              <input type="text" name="ref" value="${escapeHtml(user.ref || '')}" />
            </div>
          </div>

          <div class="admin-form-row">
            <div class="admin-form-group">
              <label>Meses de MembresÃ­a</label>
              <select name="membership_months">
                ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => `<option value="${m}" ${daysRemaining > 0 && Math.ceil(daysRemaining / 30) === m ? 'selected' : ''}>${m} mes${m > 1 ? 'es' : ''}</option>`).join('')}
              </select>
            </div>
            <div class="admin-form-group">
              <label>Estado</label>
              <select name="membership_status">
                <option value="active" ${daysRemaining > 0 ? 'selected' : ''}>Activo</option>
                <option value="expiring" ${daysRemaining > 0 && daysRemaining <= 7 ? 'selected' : ''}>Por vencer</option>
                <option value="expired" ${daysRemaining <= 0 ? 'selected' : ''}>Expirado</option>
                <option value="pending" ${!expiryDate ? 'selected' : ''}>Por confirmar</option>
              </select>
            </div>
          </div>

          <div class="admin-form-group">
            <label>LÃ­der Asignado</label>
            <select name="leader_id">
              <option value="">Sin lÃ­der</option>
              ${leaders.map(l => `<option value="${l.id}" ${user.patrocinador === l.id ? 'selected' : ''}>${l.name}</option>`).join('')}
            </select>
          </div>

          <div class="admin-form-row">
            <div class="admin-form-group">
              <label>Ventas (USD)</label>
              <input type="number" name="ventas" value="${user.ventas || 0}" step="0.01" />
            </div>
            <div class="admin-form-group">
              <label>Rango</label>
              <select name="rank">
                ${rankOptions}
              </select>
            </div>
          </div>

          <div class="admin-form-actions">
            <button type="submit" class="admin-btn admin-btn-primary">Guardar Cambios</button>
            <button type="button" class="admin-btn admin-btn-secondary" data-action="close">Cerrar</button>
          </div>
        </form>
      </div>
    `;

    const form = modal.querySelector('.admin-edit-form');
    const closeBtn = modal.querySelector('.admin-modal-close');
    const closeFormBtn = modal.querySelector('[data-action="close"]');

    const handleClose = () => modal.remove();
    closeBtn.addEventListener('click', handleClose);
    closeFormBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleClose();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const updateData = {
        name: formData.get('name'),
        email: formData.get('email'),
        wa: formData.get('wa'),
        ref: formData.get('ref'),
        ventas: parseFloat(formData.get('ventas')) || 0,
        rank: formData.get('rank'),
        patrocinador: formData.get('leader_id') || null
      };

      // Calculate new expiry based on months
      const months = parseInt(formData.get('membership_months')) || 1;
      const newExpiry = new Date();
      newExpiry.setMonth(newExpiry.getMonth() + months);
      updateData.expiry = newExpiry.toISOString();

      try {
        // Update local USERS object
        Object.assign(USERS_REF[userId], updateData);

        // Save to Supabase
        if (SUPABASE_URL && SUPABASE_KEY) {
          const response = await fetch(
            `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
              },
              body: JSON.stringify(updateData)
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
        }

        showToastFn(`Usuario ${updateData.name} actualizado correctamente`);
        handleClose();

        // Refresh users table if function exists
        if (typeof renderAdminUsuarios === 'function') {
          renderAdminUsuarios();
        }
      } catch (error) {
        console.error('Error updating user:', error);
        showToastFn('Error al guardar cambios: ' + error.message);
      }
    });

    document.body.appendChild(modal);
  };

  // ============================================================================
  // COMMUNITY TAB
  // ============================================================================

  const renderComunidadTab = () => {
    const container = document.getElementById('admin-comunidad-content');
    if (!container) return;

    container.innerHTML = `
      <div class="admin-comunidad-search">
        <input type="text" placeholder="Buscar mensajes..." class="admin-search-input" />
      </div>
      <div class="admin-messages-list"></div>
    `;

    const searchInput = container.querySelector('.admin-search-input');
    const messagesList = container.querySelector('.admin-messages-list');

    const loadMessages = async () => {
      try {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
          messagesList.innerHTML = '<p style="color: var(--muted);">Supabase no configurado</p>';
          return;
        }

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/community_messages?order=created_at.desc&limit=100`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const messages = await response.json();
        renderMessages(messages, messagesList);
      } catch (error) {
        console.error('Error loading messages:', error);
        messagesList.innerHTML = `<p style="color: var(--muted);">Error al cargar mensajes</p>`;
      }
    };

    const renderMessages = (messages, container) => {
      if (messages.length === 0) {
        container.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 20px;">No hay mensajes</p>';
        return;
      }

      container.innerHTML = messages.map(msg => {
        const user = USERS_REF[msg.user_id] || {};
        const time = new Date(msg.created_at).toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });

        return `
          <div class="admin-message-item">
            <div class="admin-message-avatar">${(user.name || 'U').charAt(0).toUpperCase()}</div>
            <div class="admin-message-content">
              <div class="admin-message-header">
                <span class="admin-message-user">${escapeHtml(user.name || 'AnÃ³nimo')}</span>
                <span class="admin-message-time">${time}</span>
              </div>
              <div class="admin-message-text">${escapeHtml(msg.message)}</div>
            </div>
            <button class="admin-message-delete" data-msg-id="${msg.id}">Eliminar</button>
          </div>
        `;
      }).join('');

      // Attach delete handlers
      container.querySelectorAll('.admin-message-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const msgId = btn.dataset.msgId;
          if (!confirm('Â¿Eliminar este mensaje?')) return;

          try {
            const response = await fetch(
              `${SUPABASE_URL}/rest/v1/community_messages?id=eq.${msgId}`,
              {
                method: 'DELETE',
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`
                }
              }
            );

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            showToastFn('Mensaje eliminado');
            loadMessages();
          } catch (error) {
            console.error('Error deleting message:', error);
            showToastFn('Error al eliminar mensaje');
          }
        });
      });
    };

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const items = messagesList.querySelectorAll('.admin-message-item');
      items.forEach(item => {
        const text = item.querySelector('.admin-message-text').textContent.toLowerCase();
        const user = item.querySelector('.admin-message-user').textContent.toLowerCase();
        const visible = text.includes(query) || user.includes(query);
        item.style.display = visible ? '' : 'none';
      });
    });

    loadMessages();
  };

  // ============================================================================
  // MEMBERSHIP TAB
  // ============================================================================

  const renderMembresiaTab = () => {
    const container = document.getElementById('admin-membresia-content');
    if (!container) return;

    const now = new Date();
    const usersArray = Object.entries(USERS_REF).map(([id, user]) => {
      const expiry = user.expiry ? new Date(user.expiry) : null;
      const daysRemaining = expiry ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)) : 0;
      const monthsRemaining = Math.ceil(daysRemaining / 30);

      let status = 'expired';
      if (daysRemaining > 7) status = 'active';
      else if (daysRemaining > 0) status = 'expiring';

      return { id, ...user, daysRemaining, monthsRemaining, expiry, status };
    }).sort((a, b) => (b.expiry || 0) - (a.expiry || 0));

    container.innerHTML = `
      <table class="admin-membership-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Nombre</th>
            <th>Meses Restantes</th>
            <th>Fecha Inicio</th>
            <th>Fecha Fin</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${usersArray.map(user => `
            <tr>
              <td>${escapeHtml(user.ref || '-')}</td>
              <td>${escapeHtml(user.name)}</td>
              <td>${user.monthsRemaining > 0 ? user.monthsRemaining : '0'}</td>
              <td>${user.expiry ? new Date(user.membresia_inicio || user.expiry).toLocaleDateString('es-ES') : '-'}</td>
              <td>${user.expiry ? new Date(user.expiry).toLocaleDateString('es-ES') : '-'}</td>
              <td>
                <span class="admin-status-badge admin-status-${user.status}">
                  ${user.status === 'active' ? 'Activo' : user.status === 'expiring' ? 'Por Vencer' : 'Expirado'}
                </span>
              </td>
              <td>
                <div class="admin-membership-actions">
                  <button class="admin-membership-btn" data-action="activate" data-user-id="${user.id}">Activar</button>
                  <button class="admin-membership-btn" data-action="renew" data-user-id="${user.id}">Renovar</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);">
        <h3 style="color: var(--text); margin: 0 0 12px 0;">Capturas de Pantalla de Usuarios</h3>
        <div class="admin-screenshot-area" id="admin-screenshot-drop">
          Arrastra imÃ¡genes aquÃ­ o haz clic para seleccionar
        </div>
        <div id="admin-screenshot-preview"></div>
      </div>
    `;

    // Membership actions
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.action;
        const userId = btn.dataset.userId;
        const user = USERS_REF[userId];

        if (action === 'activate') {
          const months = prompt('Â¿CuÃ¡ntos meses deseas activar? (1-12)', '3');
          if (!months) return;

          const newExpiry = new Date();
          newExpiry.setMonth(newExpiry.getMonth() + parseInt(months));
          updateMembership(userId, parseInt(months), newExpiry);
        } else if (action === 'renew') {
          const months = prompt('Â¿CuÃ¡ntos meses deseas agregar? (1-12)', '1');
          if (!months) return;

          const currentExpiry = user.expiry ? new Date(user.expiry) : new Date();
          const newExpiry = new Date(currentExpiry);
          newExpiry.setMonth(newExpiry.getMonth() + parseInt(months));
          updateMembership(userId, parseInt(months), newExpiry);
        }
      });
    });

    // Screenshot upload
    const screenshotArea = container.querySelector('#admin-screenshot-drop');
    const screenshotPreview = container.querySelector('#admin-screenshot-preview');

    if (screenshotArea) {
      screenshotArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        screenshotArea.classList.add('dragover');
      });

      screenshotArea.addEventListener('dragleave', () => {
        screenshotArea.classList.remove('dragover');
      });

      screenshotArea.addEventListener('drop', (e) => {
        e.preventDefault();
        screenshotArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          handleScreenshotUpload(files[0], screenshotPreview);
        }
      });

      screenshotArea.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', (e) => {
          if (e.target.files.length > 0) {
            handleScreenshotUpload(e.target.files[0], screenshotPreview);
          }
        });
        input.click();
      });
    }
  };

  const handleScreenshotUpload = (file, previewContainer) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewContainer.innerHTML = `
        <p style="color: var(--text); font-size: 12px; margin: 10px 0;">Archivo: ${file.name}</p>
        <img src="${e.target.result}" alt="Screenshot" class="admin-screenshot-preview" />
        <p style="color: var(--muted); font-size: 12px; margin-top: 10px;">
          Para subir a Supabase, implementar endpoint de storage
        </p>
      `;
    };
    reader.readAsDataURL(file);
  };

  const updateMembership = async (userId, months, newExpiry) => {
    try {
      USERS_REF[userId].expiry = newExpiry.toISOString();
      USERS_REF[userId].membresia_inicio = new Date().toISOString();

      if (SUPABASE_URL && SUPABASE_KEY) {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
              expiry: newExpiry.toISOString(),
              membresia_inicio: new Date().toISOString()
            })
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      }

      showToastFn(`MembresÃ­a actualizada: ${months} meses`);
      renderMembresiaTab();
    } catch (error) {
      console.error('Error updating membership:', error);
      showToastFn('Error al actualizar membresÃ­a');
    }
  };

  // ============================================================================
  // EXTEND EXISTING FUNCTIONS
  // ============================================================================

  const originalSwitchAdminTab = window.switchAdminTab;
  window.switchAdminTab = function(tab) {
    // Call original function if available
    if (originalSwitchAdminTab && typeof originalSwitchAdminTab === 'function') {
      try {
        originalSwitchAdminTab(tab);
      } catch (e) {
        console.warn('Original switchAdminTab error:', e);
      }
    }

    // Handle new tabs
    const adminContent = document.querySelector('.admin-panel-content') ||
                         document.querySelector('[data-admin-content]');
    if (!adminContent) return;

    // Remove existing content divs
    adminContent.querySelectorAll('[id^="admin-"][id$="-content"]').forEach(el => {
      el.style.display = 'none';
    });

    if (tab === 'comunidad') {
      let comunidadDiv = document.getElementById('admin-comunidad-content');
      if (!comunidadDiv) {
        comunidadDiv = document.createElement('div');
        comunidadDiv.id = 'admin-comunidad-content';
        adminContent.appendChild(comunidadDiv);
      }
      comunidadDiv.style.display = 'block';
      renderComunidadTab();
    } else if (tab === 'membresia') {
      let membresiaDiv = document.getElementById('admin-membresia-content');
      if (!membresiaDiv) {
        membresiaDiv = document.createElement('div');
        membresiaDiv.id = 'admin-membresia-content';
        adminContent.appendChild(membresiaDiv);
      }
      membresiaDiv.style.display = 'block';
      renderMembresiaTab();
    }
  };

  const originalRenderAdminUsuarios = window.renderAdminUsuarios;
  window.renderAdminUsuarios = function() {
    // Call original to render the table
    if (originalRenderAdminUsuarios && typeof originalRenderAdminUsuarios === 'function') {
      originalRenderAdminUsuarios();
    }

    // Enhance with click handlers
    const table = document.querySelector('[data-admin-table="usuarios"]') ||
                  document.querySelector('.admin-usuarios-table');

    if (!table) return;

    table.querySelectorAll('tbody tr').forEach(row => {
      const userId = row.dataset.userId || row.querySelector('[data-user-id]')?.dataset.userId;
      if (userId) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', (e) => {
          // Don't open modal if clicking action buttons
          if (e.target.closest('button')) return;
          createUserEditModal(userId);
        });
        row.addEventListener('mouseover', () => {
          row.style.opacity = '0.8';
        });
        row.addEventListener('mouseout', () => {
          row.style.opacity = '1';
        });
      }
    });
  };

  // ============================================================================
  // ADD TAB BUTTONS TO DOM
  // ============================================================================

  const addTabButtons = () => {
    // Find existing admin tabs navigation
    const tabsNav = document.querySelector('.admin-tabs-nav') ||
                    document.querySelector('[data-admin-tabs]');

    if (!tabsNav) {
      console.warn('Admin tabs navigation not found');
      return;
    }

    // Check if tabs already added
    if (tabsNav.querySelector('[data-tab="comunidad"]')) {
      return; // Already added
    }

    // Create new tab buttons
    const comunidadBtn = document.createElement('button');
    comunidadBtn.className = 'admin-tab-btn';
    comunidadBtn.dataset.tab = 'comunidad';
    comunidadBtn.textContent = 'Comunidad';
    comunidadBtn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      comunidadBtn.classList.add('active');
      window.switchAdminTab('comunidad');
    });

    const membresiaBtn = document.createElement('button');
    membresiaBtn.className = 'admin-tab-btn';
    membresiaBtn.dataset.tab = 'membresia';
    membresiaBtn.textContent = 'MembresÃ­a';
    membresiaBtn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      membresiaBtn.classList.add('active');
      window.switchAdminTab('membresia');
    });

    tabsNav.appendChild(comunidadBtn);
    tabsNav.appendChild(membresiaBtn);
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const escapeHtml = (text) => {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  const init = () => {
    try {
      injectStyles();
      addTabButtons();

      // Re-enhance usuarios tab when it's rendered
      const originalSetup = window.setupAdminPanel;
      if (originalSetup && typeof originalSetup === 'function') {
        window.setupAdminPanel = function() {
          originalSetup();
          window.renderAdminUsuarios();
        };
      }

      console.log('Admin panel extension loaded successfully');
    } catch (error) {
      console.error('Error initializing admin panel extension:', error);
    }
  };

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
