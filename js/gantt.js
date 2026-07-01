/* ================================================================
   gantt.js – Renderização e interação do Gráfico de Gantt
   ================================================================ */

const FERIADOS = new Map([
  // ---- FIXOS ----
  // 2025
  ['2025-01-01', 'Ano Novo'], ['2025-04-21', 'Tiradentes'], ['2025-05-01', 'Dia do Trabalho'],
  ['2025-09-07', 'Independência do Brasil'], ['2025-10-12', 'Nossa Senhora Aparecida'],
  ['2025-11-02', 'Finados'], ['2025-11-15', 'Proclamação da República'],
  ['2025-11-20', 'Consciência Negra'], ['2025-12-25', 'Natal'],
  // 2026
  ['2026-01-01', 'Ano Novo'], ['2026-04-21', 'Tiradentes'], ['2026-05-01', 'Dia do Trabalho'],
  ['2026-09-07', 'Independência do Brasil'], ['2026-10-12', 'Nossa Senhora Aparecida'],
  ['2026-11-02', 'Finados'], ['2026-11-15', 'Proclamação da República'],
  ['2026-11-20', 'Consciência Negra'], ['2026-12-25', 'Natal'],
  // 2027
  ['2027-01-01', 'Ano Novo'], ['2027-04-21', 'Tiradentes'], ['2027-05-01', 'Dia do Trabalho'],
  ['2027-09-07', 'Independência do Brasil'], ['2027-10-12', 'Nossa Senhora Aparecida'],
  ['2027-11-02', 'Finados'], ['2027-11-15', 'Proclamação da República'],
  ['2027-11-20', 'Consciência Negra'], ['2027-12-25', 'Natal'],
  // 2028
  ['2028-01-01', 'Ano Novo'], ['2028-04-21', 'Tiradentes'], ['2028-05-01', 'Dia do Trabalho'],
  ['2028-09-07', 'Independência do Brasil'], ['2028-10-12', 'Nossa Senhora Aparecida'],
  ['2028-11-02', 'Finados'], ['2028-11-15', 'Proclamação da República'],
  ['2028-11-20', 'Consciência Negra'], ['2028-12-25', 'Natal'],
  // 2029
  ['2029-01-01', 'Ano Novo'], ['2029-04-21', 'Tiradentes'], ['2029-05-01', 'Dia do Trabalho'],
  ['2029-09-07', 'Independência do Brasil'], ['2029-10-12', 'Nossa Senhora Aparecida'],
  ['2029-11-02', 'Finados'], ['2029-11-15', 'Proclamação da República'],
  ['2029-11-20', 'Consciência Negra'], ['2029-12-25', 'Natal'],
  // 2030
  ['2030-01-01', 'Ano Novo'], ['2030-04-21', 'Tiradentes'], ['2030-05-01', 'Dia do Trabalho'],
  ['2030-09-07', 'Independência do Brasil'], ['2030-10-12', 'Nossa Senhora Aparecida'],
  ['2030-11-02', 'Finados'], ['2030-11-15', 'Proclamação da República'],
  ['2030-11-20', 'Consciência Negra'], ['2030-12-25', 'Natal'],

  // ---- MÓVEIS ----
  ['2025-03-04', 'Carnaval'], ['2025-03-05', 'Carnaval'],
  ['2025-04-18', 'Sexta-feira Santa'], ['2025-06-19', 'Corpus Christi'],
  ['2026-02-17', 'Carnaval'], ['2026-02-18', 'Carnaval'],
  ['2026-04-03', 'Sexta-feira Santa'], ['2026-06-04', 'Corpus Christi'],
  ['2027-02-09', 'Carnaval'], ['2027-02-10', 'Carnaval'],
  ['2027-03-26', 'Sexta-feira Santa'], ['2027-05-27', 'Corpus Christi'],
  ['2028-02-29', 'Carnaval'], ['2028-03-01', 'Carnaval'],
  ['2028-04-14', 'Sexta-feira Santa'], ['2028-06-15', 'Corpus Christi'],
  ['2029-02-13', 'Carnaval'], ['2029-02-14', 'Carnaval'],
  ['2029-03-30', 'Sexta-feira Santa'], ['2029-05-31', 'Corpus Christi'],
  ['2030-03-05', 'Carnaval'], ['2030-03-06', 'Carnaval'],
  ['2030-04-19', 'Sexta-feira Santa'], ['2030-06-20', 'Corpus Christi'],
]);

const DOW_INICIAIS = ['D','S','T','Q','Q','S','S'];

const Gantt = (() => {

  /* ---- Config ---- */
  let COL_W = 28;
  let selectedTaskId = null;
  let tooltipEl = null;
  let _ctxTargetId = null;

  /* ---- DOM refs ---- */
  const $ = (id) => document.getElementById(id);

  /* ================================================================
     SCALE CONFIG
     ================================================================ */
  function getScaleConfig() {
    return { colW: 28, days: 0 };
  }

  function getViewStart() {
    const el = document.getElementById('ganttDateStart');
    return el?.value ? dayjs(el.value) : dayjs().startOf('day');
  }

  function getViewEnd() {
    const el = document.getElementById('ganttDateEnd');
    return el?.value ? dayjs(el.value) : dayjs().add(55, 'day');
  }

  /* ================================================================
     RENDER
     ================================================================ */
  function render(searchFilter) {
    COL_W = 28;
    const vStart  = getViewStart();
    const vEnd    = getViewEnd();
    const numDays = Math.max(vEnd.diff(vStart, 'day') + 1, 1);
    const today   = dayjs().startOf('day');

    const elStart = document.getElementById('ganttDateStart');
    const elEnd   = document.getElementById('ganttDateEnd');

    const groups   = Store.getGroups();
    const allTasks = Store.getTasks();
    const search   = (searchFilter || '').toLowerCase().trim();

    // Divide por vírgula e limpa espaços
    const terms = search ? search.split(',').map(x => x.trim()).filter(Boolean) : [];
    const showHidden = Store.getShowHidden();

    // Build ordered row list
    const rows = [];
    groups.forEach(g => {
      if (g.hidden && !showHidden) return;

      const gTasks = allTasks.filter(t => t.grupoId === g.id);
      const visible = !search || terms.some(term => g.nome.toLowerCase().includes(term)) ||
        gTasks.some(t => matchesSearch(t, terms));
      if (!visible) return;

      rows.push({ type:'group', data:g, hidden:!!g.hidden });

      const groupNameMatch = search && terms.some(term => g.nome.toLowerCase().includes(term));
      if (!g.collapsed || search) {
        gTasks
          .filter(t => showHidden || !t.hidden)
          .filter(t => groupNameMatch || !search || matchesSearch(t, terms))
          .forEach(t => rows.push({ type:'task', data:t, groupColor: g.cor, hidden:!!t.hidden }));
      }
    });
    // Root tasks (no group)
    allTasks
      .filter(t => !t.grupoId)
      .filter(t => showHidden || !t.hidden)
      .filter(t => !search || matchesSearch(t, terms))
      .forEach(t => rows.push({ type:'task', data:t, groupColor: null, hidden:!!t.hidden }));

    renderLeft(rows);
    renderChartHeader(vStart, numDays, today);
    renderChartBody(rows, vStart, numDays, today);
  }

  /* ── Busca multi-termo: recebe array de termos ── */
  function matchesSearch(t, terms) {
    if (!terms || terms.length === 0) return true;
    return terms.some(term =>
      (t.nome||'').toLowerCase().includes(term) ||
      (t.responsaveis||[]).some(r => r.toLowerCase().includes(term)) ||
      (t.local||'').toLowerCase().includes(term) ||
      (t.status||'').toLowerCase().includes(term)
    );
  }

  /* ----------------------------------------------------------------
     LEFT PANEL
     ---------------------------------------------------------------- */
  function renderLeft(rows) {
    const body = $('ganttLeftBody');
    body.innerHTML = '';

    rows.forEach(({ type, data, groupColor, hidden }) => {
      const div = document.createElement('div');
      div.className = 'gantt-row' + (type === 'group' ? ' is-group' : '') + (hidden ? ' is-hidden-item' : '');
      div.dataset.id   = data.id;
      div.dataset.type = type;

      if (type === 'group') {
        const g = data;
        const stripeColor = g.cor || '#2e7d32';
        div.innerHTML = `
          <div class="group-stripe" style="background:${stripeColor}"></div>
          <div class="drag-handle"><i class="fas fa-grip-vertical"></i></div>
          <div class="row-name">
            <button class="expand-btn ${g.collapsed ? 'collapsed' : ''}" data-gid="${g.id}" title="Expandir/Recolher">
              <i class="fas fa-chevron-down"></i>
            </button>
            <i class="fas fa-folder" style="color:${stripeColor};font-size:11px;flex-shrink:0"></i>
            <div class="row-name-text">
              <span>${escHtml(g.nome)}</span>
              ${g.responsavel ? `<small><i class="fas fa-user" style="font-size:9px"></i> ${escHtml(g.responsavel)}</small>` : ''}
            </div>
          </div>
          <div class="row-actions">
            <button class="act-btn ${g.hidden ? 'hidden-eye' : ''}" data-action="toggle-hide-group" data-id="${g.id}" title="${g.hidden ? 'Mostrar grupo' : 'Ocultar grupo'}"><i class="fas ${g.hidden ? 'fa-eye-slash' : 'fa-eye'}"></i></button>
            <button class="act-btn" data-action="edit-group" data-id="${g.id}" title="Editar grupo"><i class="fas fa-edit"></i></button>
            <button class="act-btn" data-action="add-child" data-gid="${g.id}" title="Adicionar tarefa"><i class="fas fa-plus"></i></button>
          </div>
        `;
      } else {
        const t = data;
        const indent = t.grupoId ? 24 : 8;
        const periodosStr = (t.periodos || []).map(p => 
          `${p.inicio || '?'} → ${p.fim || '?'}`
        ).join(' | ');
        div.innerHTML = `
          <div class="row-indent" style="width:${indent}px;flex-shrink:0"></div>
          <div class="drag-handle"><i class="fas fa-grip-vertical"></i></div>
          <div class="row-name">
            <div class="row-name-text">
              <span>${escHtml(t.nome)}</span>
              ${(t.periodos || []).length > 1 ? `<small>${(t.periodos || []).length} períodos</small>` : ''}
            </div>
          </div>
          <div class="row-actions">
            <button class="act-btn ${t.hidden ? 'hidden-eye' : ''}" data-action="toggle-hide-task" data-id="${t.id}" title="${t.hidden ? 'Mostrar atividade' : 'Ocultar atividade'}"><i class="fas ${t.hidden ? 'fa-eye-slash' : 'fa-eye'}"></i></button>
            <button class="act-btn" data-action="edit-task" data-id="${t.id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="act-btn del" data-action="delete-task" data-id="${t.id}" title="Excluir"><i class="fas fa-trash"></i></button>
          </div>
        `;
      }

      // Events
      div.addEventListener('click', (e) => handleLeftClick(e, type, data.id));
      div.addEventListener('contextmenu', (e) => handleCtxMenu(e, type, data.id));

      // Drag & drop — grupos
      if (type === 'group') {
        div.draggable = true;

        div.addEventListener('dragstart', e => {
          e.dataTransfer.setData('groupDragId', data.id);
          div.classList.add('dragging');
        });

        div.addEventListener('dragend', () => {
          div.classList.remove('dragging');
          document.querySelectorAll('.gantt-row').forEach(r => r.classList.remove('drag-over'));
        });

        div.addEventListener('dragover', e => {
          e.preventDefault();
          const draggedGid = e.dataTransfer.getData('groupDragId');
          if (draggedGid && draggedGid !== data.id) {
            document.querySelectorAll('.gantt-row').forEach(r => r.classList.remove('drag-over'));
            div.classList.add('drag-over');
          }
        });

        div.addEventListener('drop', e => {
          e.preventDefault();
          const draggedGid = e.dataTransfer.getData('groupDragId');
          if (draggedGid && draggedGid !== data.id) {
            Store.reorderGroup(draggedGid, data.id);
            Store.save();
            refresh();
          }
          document.querySelectorAll('.gantt-row').forEach(r => r.classList.remove('drag-over'));
        });
      }

      // Drag & drop reorder (tarefas dentro de grupo)
      if (type === 'task' && data.grupoId) {
        div.draggable = true;

        div.addEventListener('dragstart', e => {
          e.dataTransfer.setData('taskId',  data.id);
          e.dataTransfer.setData('groupId', data.grupoId);
          div.classList.add('dragging');
        });

        div.addEventListener('dragend', () => {
          div.classList.remove('dragging');
          document.querySelectorAll('.gantt-row').forEach(r => r.classList.remove('drag-over'));
        });

        div.addEventListener('dragover', e => {
          e.preventDefault();
          const draggedId = e.dataTransfer.getData('taskId');
          if (draggedId && draggedId !== data.id) {
            document.querySelectorAll('.gantt-row').forEach(r => r.classList.remove('drag-over'));
            div.classList.add('drag-over');
          }
        });

        div.addEventListener('drop', e => {
          e.preventDefault();
          const taskId  = e.dataTransfer.getData('taskId');
          const groupId = e.dataTransfer.getData('groupId');
          if (taskId && taskId !== data.id && groupId === data.grupoId) {
            Store.reorderTask(taskId, data.id, groupId);
            Store.save();
            refresh();
          }
          document.querySelectorAll('.gantt-row').forEach(r => r.classList.remove('drag-over'));
        });
      }

      body.appendChild(div);
    });

    // Sync scroll with chart
    body.addEventListener('scroll', () => {
      const chartScroll = $('ganttChartScroll');
      if (chartScroll) chartScroll.scrollTop = body.scrollTop;
    }, { passive:true });
  }

  function handleLeftClick(e, type, id) {
    const action = e.target.closest('[data-action]')?.dataset.action;
    const gid    = e.target.closest('[data-gid]')?.dataset.gid;
    const eid    = e.target.closest('[data-id]')?.dataset.id;

    if (e.target.closest('.expand-btn')) {
      const groupId = e.target.closest('.expand-btn').dataset.gid;
      Store.toggleGroupCollapse(groupId);
      refresh();
      return;
    }

    if (action === 'toggle-hide-group') {
      Store.toggleGroupHidden(eid);
      Store.save();
      refresh();
      return;
    }
    if (action === 'toggle-hide-task') {
      Store.toggleTaskHidden(eid);
      Store.save();
      refresh();
      return;
    }
    if (action === 'edit-group')   { App.openGroupModal(eid); return; }
    if (action === 'edit-task')    { App.openTaskModal(eid);  return; }
    if (action === 'add-child')    { App.openTaskModal(null, gid); return; }
    if (action === 'delete-task')  {
      if (confirm('Excluir esta tarefa?')) {
        Store.deleteTask(eid);
        Store.save();
        refresh();
        App.renderDashboard();
        showToast('Tarefa excluída.','');
      }
      return;
    }

    // Select row
    selectedTaskId = id;
    document.querySelectorAll('.gantt-row').forEach(r => r.classList.remove('selected'));
    e.currentTarget.classList.add('selected');
    if (type === 'task' && !action) {
      App.openTaskModal(id);
    }
  }

  /* ----------------------------------------------------------------
     CHART HEADER
     ---------------------------------------------------------------- */
  function renderChartHeader(vStart, numDays, today) {
    const inner = $('ganttChartInner');
    let oldH = inner.querySelector('.gantt-chart-header');
    if (oldH) oldH.remove();

    const header = document.createElement('div');
    header.className = 'gantt-chart-header';
    header.style.width = (numDays * COL_W) + 'px';

    // ---- Month row ----
    const monthRow = document.createElement('div');
    monthRow.className = 'chart-header-months';

    const months = {};
    for (let i = 0; i < numDays; i++) {
      const d = vStart.add(i, 'day');
      const key = d.format('YYYY-MM');
      if (!months[key]) months[key] = { label: capitalizeFirst(d.format('MMM YYYY')), count: 0 };
      months[key].count++;
    }
    Object.values(months).forEach(m => {
      const cell = document.createElement('div');
      cell.className = 'chart-month-cell';
      cell.style.width = (m.count * COL_W) + 'px';
      cell.style.minWidth = (m.count * COL_W) + 'px';
      cell.textContent = m.label;
      monthRow.appendChild(cell);
    });

    // ---- Day row ----
    const dayRow = document.createElement('div');
    dayRow.className = 'chart-header-days';

    for (let i = 0; i < numDays; i++) {
      const d = vStart.add(i, 'day');
      const isToday   = d.isSame(today, 'day');
      const isWeekend = d.day() === 0 || d.day() === 6;
      const holidayName = FERIADOS.get(d.format('YYYY-MM-DD'));
      const isHoliday   = !!holidayName;

      const cell = document.createElement('div');
      cell.className = 'chart-day-header' +
        (isToday   ? ' today-h' : '') +
        (isWeekend ? ' weekend' : '') +
        (isHoliday ? ' holiday' : '');
      cell.style.width    = COL_W + 'px';
      cell.style.minWidth = COL_W + 'px';
      cell.title = holidayName
        ? `🎉 ${holidayName} – ${d.format('DD/MM/YYYY')}`
        : d.format('DD/MM/YYYY – ddd');

      cell.innerHTML = `
        <span style="font-size:9px;font-weight:500;opacity:0.6;line-height:1">${DOW_INICIAIS[d.day()]}</span>
        <span style="font-size:10px;line-height:1">${d.format('DD')}</span>
      `;

      dayRow.appendChild(cell);
    }

    header.appendChild(monthRow);
    header.appendChild(dayRow);
    inner.prepend(header);
  }

/* ----------------------------------------------------------------
   CHART BODY - Label à direita em TODOS os períodos
   ---------------------------------------------------------------- */
function renderChartBody(rows, vStart, numDays, today) {
  const inner = $('ganttChartInner');

  let oldBody = inner.querySelector('.gantt-chart-body');
  if (oldBody) oldBody.remove();

  const body = document.createElement('div');
  body.className = 'gantt-chart-body';
  body.style.width    = (numDays * COL_W) + 'px';
  body.style.minWidth = (numDays * COL_W) + 'px';
  body.style.position = 'relative';

  const ROW_H_TASK  = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--row-h').trim()) || 36;
  const ROW_H_GROUP = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--row-h-group').trim()) || 40;

  let yOffset = 0;

  rows.forEach(({ type, data, groupColor, hidden }) => {
    const rowH = type === 'group' ? ROW_H_GROUP : ROW_H_TASK;

    const rowDiv = document.createElement('div');
    rowDiv.className = 'chart-row' + (type === 'group' ? ' is-group' : '') + (hidden ? ' is-hidden-item' : '');
    rowDiv.style.height = rowH + 'px';
    rowDiv.dataset.id = data.id;

    // Grid cells (background)
    for (let i = 0; i < numDays; i++) {
      const d = vStart.add(i, 'day');
      const isToday     = d.isSame(today, 'day');
      const isWeekend   = d.day() === 0 || d.day() === 6;
      const holidayName = FERIADOS.get(d.format('YYYY-MM-DD'));
      const isHoliday   = !!holidayName;
      const isMonthStart = d.date() === 1;
      const cell = document.createElement('div');
      cell.className = 'chart-cell' +
        (isToday   ? ' today-c' : '') +
        (isWeekend ? ' weekend' : '') +
        (isHoliday ? ' holiday' : '') +
        (isMonthStart ? ' month-start' : '');
      if (holidayName) cell.title = `🎉 ${holidayName}`;
      cell.style.width    = COL_W + 'px';
      cell.style.minWidth = COL_W + 'px';

      rowDiv.appendChild(cell);
    }

    body.appendChild(rowDiv);

    // Draw bar for tasks - suporte a múltiplos períodos
    if (type === 'task') {
      const t = data;
      const periodos = t.periodos || [];
      
      if (periodos.length === 0) {
        yOffset += rowH;
        return;
      }

      const statusColor = Store.STATUS_COLORS[t.status];
      let barColor = (t.status === 'Planejado' || t.status === 'Manutenção')
        ? (groupColor || statusColor || '#1565c0')
        : (statusColor || groupColor || '#1565c0');

      // ============================================================
      // CONSTRUÇÃO DO LABEL (vai à direita de CADA barra)
      // ============================================================
      const resps = (t.responsaveis || []).slice(0, 8);
      const listaResps = resps.join(', ')
        + ((t.responsaveis || []).length > 8
            ? ` +${t.responsaveis.length - 8}`
            : '');

      // Badge de status
      const _statusMap = {
        'Concluído':    { label:'Concluído',    bg:'#2e7d32', icon:'✔' },
        'Cancelado':    { label:'Cancelado',    bg:'#c62828', icon:'✖' },
        'Em andamento': { label:'Em andamento', bg:'#e65100', icon:''  },
        'Planejado':    { label:'Planejado',    bg:'#1565c0', icon:''  },
        'Manutenção':   { label:'Manutenção',   bg:'#6a1b9a', icon:''  },
      };
      const sm = _statusMap[t.status] || { label: t.status, bg:'#546e7a', icon:'' };
      const statusBadge = `<span style="display:inline-flex;align-items:center;padding:1px 8px;background:${sm.bg};color:#fff;border-radius:12px;font-size:9px;font-weight:700;margin-left:4px;white-space:nowrap;">${sm.icon ? sm.icon+' ' : ''}${sm.label}</span>`;

      // Nomes em preto (sem cores por pessoa)
      const nomesHtml = resps.map(r => {
        return `<span style="color:#212121;font-weight:600;">${escHtml(r)}</span>`;
      }).join(', ');

      // Indicador de múltiplos períodos
      const multiIndicator = periodos.length > 1 ? `<span style="color:#6a1b9a;font-size:9px;font-weight:700;margin-left:4px;">${periodos.length} períodos</span>` : '';

      // Label à direita da barra: responsáveis + status + indicador de períodos
      const labelHtml = `
        <span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:500;color:#212121;background:rgba(255,255,255,0.95);padding:2px 10px;border-radius:4px;border:1px solid #e0e0e0;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          ${nomesHtml}
          ${statusBadge}
          ${multiIndicator}
        </span>
      `;

      // Para cada período, desenhar uma barra e seu label à direita
      periodos.forEach((periodo, idx) => {
        if (!periodo.inicio || !periodo.fim) return;

        const tStart = dayjs(periodo.inicio).startOf('day');
        const tEnd   = dayjs(periodo.fim).startOf('day');
        
        if (!tStart.isValid() || !tEnd.isValid()) return;

        const startOff = tStart.diff(vStart, 'day');
        const endOff   = tEnd.diff(vStart, 'day');

        const clampS = Math.max(startOff, 0);
        const clampE = Math.min(endOff, numDays - 1);
        if (clampE < clampS - 1) return;

        const barLeft  = clampS * COL_W;
        const barW     = Math.max((clampE - clampS + 1) * COL_W, 6);
        const barTop   = yOffset + (rowH - 24) / 2;

        const wrap = document.createElement('div');
        wrap.className      = 'gantt-bar-wrap';
        wrap.style.left     = barLeft + 'px';
        wrap.style.width    = barW + 'px';
        wrap.style.top      = barTop + 'px';
        wrap.style.height   = '24px';
        wrap.dataset.taskId = t.id;
        wrap.dataset.periodoIdx = idx;

        const bar = document.createElement('div');
        bar.className = 'gantt-bar';
        bar.style.width  = '100%';
        bar.style.height = '24px';

        if (t.status === 'Concluído') {
          bar.classList.add('bar-concluida');
          const check = document.createElement('div');
          check.className = 'bar-check';
          check.innerHTML = '✔';
          bar.appendChild(check);
        } else if (t.status === 'Cancelado') {
          bar.classList.add('bar-cancelada');
          const cross = document.createElement('div');
          cross.className = 'bar-x';
          cross.innerHTML = '✖';
          bar.appendChild(cross);
        } else {
          bar.style.background = barColor;
        }

        // Dashed border if clipped
        if (startOff < 0)        bar.style.borderLeft  = '3px dashed rgba(255,255,255,.6)';
        if (endOff >= numDays)   bar.style.borderRight = '3px dashed rgba(255,255,255,.6)';

        // Progress fill (apenas se for um único período)
        if (t.pct > 0 && t.periodos.length === 1) {
          const prog = document.createElement('div');
          prog.className = 'bar-progress';
          prog.style.width = t.pct + '%';
          bar.appendChild(prog);
        }

        // Resize handles (apenas no último período para simplificar)
        if (idx === periodos.length - 1) {
          const resL = document.createElement('div'); 
          resL.className = 'bar-resize-l';
          const resR = document.createElement('div'); 
          resR.className = 'bar-resize-r';
          bar.appendChild(resL); 
          bar.appendChild(resR);
          setupBarResize(resL, resR, wrap, t, vStart, idx);
        }

        wrap.appendChild(bar);
        body.appendChild(wrap);

        // ============================================================
        // NOME DA ATIVIDADE À ESQUERDA DA BARRA — apenas no 1º período
        // Ancorado por "right" para ficar grudado na borda da barra
        // ============================================================
        if (idx === 0 && t.nome) {
          const totalChartW = numDays * COL_W;
          const nomeWrap = document.createElement('div');
          nomeWrap.className = 'gantt-bar-wrap';
          nomeWrap.style.cssText = `
            position: absolute;
            top: ${yOffset + (rowH - 24) / 2}px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            z-index: 3;
            pointer-events: none;
            white-space: nowrap;
            right: ${totalChartW - barLeft + 6}px;
            max-width: ${Math.max(barLeft - 8, 20)}px;
            overflow: hidden;
          `;
          nomeWrap.innerHTML = `<span style="font-size:10px;font-weight:700;color:#212121;background:rgba(255,255,255,0.95);padding:2px 8px;border-radius:4px;border:1px solid #e0e0e0;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(t.nome)}</span>`;
          body.appendChild(nomeWrap);
        }

        // ============================================================
        // LABEL À DIREITA DA BARRA - EM TODOS OS PERÍODOS
        // ============================================================
        const labelWrap = document.createElement('div');
        labelWrap.className = 'gantt-bar-wrap';
        labelWrap.style.cssText = `
          position: absolute;
          left: ${(clampE + 1) * COL_W + 6}px;
          top: ${yOffset + (rowH - 24) / 2}px;
          height: 24px;
          display: flex;
          align-items: center;
          z-index: 3;
          pointer-events: none;
          white-space: nowrap;
        `;
        labelWrap.innerHTML = labelHtml;
        body.appendChild(labelWrap);

        // Tooltip
        bar.addEventListener('mouseenter', (e) => showBarTooltip(e, t, periodo));
        bar.addEventListener('mouseleave', () => hideTooltip());

        // Click → open modal
        wrap.addEventListener('click', (e) => {
          if (!e.target.classList.contains('bar-resize-l') && !e.target.classList.contains('bar-resize-r')) {
            App.openTaskModal(t.id);
          }
        });
      });
    }

    // Linha fina colorida na row do grupo
    if (type === 'group') {
      const g = data;
      const gTasks = Store.getTasks().filter(t => t.grupoId === g.id);
      let minD = null, maxD = null;
      
      gTasks.forEach(t => {
        (t.periodos || []).forEach(p => {
          if (p.inicio && p.fim) {
            const s = dayjs(p.inicio);
            const e = dayjs(p.fim);
            if (s.isValid() && e.isValid()) {
              if (!minD || s.isBefore(minD)) minD = s;
              if (!maxD || e.isAfter(maxD)) maxD = e;
            }
          }
        });
      });

      if (minD && maxD) {
        const s  = minD.diff(vStart, 'day');
        const e  = maxD.diff(vStart, 'day');
        const cs = Math.max(s, 0);
        const ce = Math.min(e, numDays - 1);
        if (ce >= cs) {
          const gBar = document.createElement('div');
          gBar.className = 'gantt-bar-wrap';
          gBar.style.left   = (cs * COL_W) + 'px';
          gBar.style.width  = ((ce - cs + 1) * COL_W) + 'px';
          gBar.style.top    = (yOffset + (ROW_H_GROUP - 20) / 2) + 'px';
          gBar.style.height = '20px';

          const gBarInner = document.createElement('div');
          gBarInner.className = 'gantt-bar bar-group';
          gBarInner.style.background = g.cor;
          gBarInner.style.width  = '100%';
          gBarInner.style.height = '20px';
          gBar.appendChild(gBarInner);
          body.appendChild(gBar);
        }
      }
    }

    yOffset += rowH;
  });

  // Labels verticais dos feriados — centralizados em toda a altura
  for (let i = 0; i < numDays; i++) {
    const d = vStart.add(i, 'day');
    const holidayName = FERIADOS.get(d.format('YYYY-MM-DD'));
    if (!holidayName) continue;
    const lbl = document.createElement('div');
    lbl.className = 'holiday-label';
    lbl.textContent = holidayName;
    lbl.style.left   = (i * COL_W + COL_W / 2) + 'px';
    lbl.style.top    = (yOffset / 2) + 'px';
    body.appendChild(lbl);
  }

  // Today line
  const todayOff = today.diff(vStart, 'day');
  if (todayOff >= 0 && todayOff < numDays) {
    const line = document.createElement('div');
    line.className = 'today-line';
    line.style.left   = (todayOff * COL_W + COL_W / 2 - 1) + 'px';
    line.style.height = yOffset + 'px';
    body.appendChild(line);
  }

  inner.appendChild(body);

  // Sync left scroll
  const chartScroll = $('ganttChartScroll');
  const leftBody    = $('ganttLeftBody');
  chartScroll.addEventListener('scroll', () => {
    if (leftBody) leftBody.scrollTop = chartScroll.scrollTop;
  }, { passive: true });
}

  /* ----------------------------------------------------------------
     BAR RESIZE - atualizado para suportar período específico
     ---------------------------------------------------------------- */
  function setupBarResize(resL, resR, wrap, task, vStart, periodoIdx) {
    function makeResizeDrag(side) {
      return function(e) {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const origL  = parseInt(wrap.style.left);
        const origW  = parseInt(wrap.style.width);

        function onMove(ev) {
          const dx = ev.clientX - startX;
          if (side === 'right') {
            const newW = Math.max(COL_W, origW + Math.round(dx / COL_W) * COL_W);
            wrap.style.width = newW + 'px';
          } else {
            const snap = Math.round(dx / COL_W) * COL_W;
            const newL = Math.max(0, origL + snap);
            const newW = Math.max(COL_W, origW - snap);
            wrap.style.left  = newL + 'px';
            wrap.style.width = newW + 'px';
          }
        }

        function onUp() {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);

          const newStartOff = Math.round(parseInt(wrap.style.left) / COL_W);
          const newDays     = Math.round(parseInt(wrap.style.width) / COL_W);
          const newStart    = vStart.add(newStartOff, 'day').format('YYYY-MM-DD');
          const newEnd      = vStart.add(newStartOff + newDays - 1, 'day').format('YYYY-MM-DD');

          // Atualizar o período específico
          const periodos = [...(task.periodos || [])];
          if (periodoIdx !== undefined && periodoIdx < periodos.length) {
            periodos[periodoIdx] = { inicio: newStart, fim: newEnd };
            Store.updateTask(task.id, { periodos: periodos });
            Store.save();
            refresh();
            App.renderDashboard();
            showToast('Período atualizado.', 'success');
          }
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      };
    }

    resR.addEventListener('mousedown', makeResizeDrag('right'));
    resL.addEventListener('mousedown', makeResizeDrag('left'));
  }

  /* ----------------------------------------------------------------
     TOOLTIP - atualizado para mostrar período
     ---------------------------------------------------------------- */
  function showBarTooltip(e, t, periodo) {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'gantt-tooltip';
      document.body.appendChild(tooltipEl);
    }
    const resps = (t.responsaveis||[]).join(', ') || '—';
    const dur   = periodo && periodo.inicio && periodo.fim
      ? dayjs(periodo.fim).diff(dayjs(periodo.inicio), 'day') + 1
      : '?';
    
    const totalPeriodos = (t.periodos || []).length;
    const periodoInfo = totalPeriodos > 1 ? ` (Período ${(t.periodos || []).findIndex(p => p === periodo) + 1}/${totalPeriodos})` : '';
    
    tooltipEl.innerHTML = [
      `<strong>${escHtml(t.nome)}</strong>`,
      `📅 ${periodo?.inicio || '—'} → ${periodo?.fim || '—'} (${dur} dias)${periodoInfo}`,
      `👤 ${escHtml(resps)}`,
      `📍 ${t.local||'—'}`,
      `📊 ${t.status} ${t.pct ? '· '+t.pct+'%' : ''}`,
      t.obs ? `📝 ${escHtml(t.obs.slice(0,80))}` : null,
    ].filter(Boolean).join('<br>');
    tooltipEl.style.display = 'block';
    positionTooltip(e);
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.style.display = 'none';
  }

  document.addEventListener('mousemove', e => {
    if (tooltipEl && tooltipEl.style.display === 'block') positionTooltip(e);
  });

  function positionTooltip(e) {
    if (!tooltipEl) return;
    const x  = e.clientX + 16, y = e.clientY + 16;
    const tw = tooltipEl.offsetWidth  || 260;
    const th = tooltipEl.offsetHeight || 100;
    tooltipEl.style.left = (x + tw > window.innerWidth  ? x - tw - 32 : x) + 'px';
    tooltipEl.style.top  = (y + th > window.innerHeight ? y - th - 32 : y) + 'px';
  }

  /* ----------------------------------------------------------------
     CONTEXT MENU
     ---------------------------------------------------------------- */
  function handleCtxMenu(e, type, id) {
    e.preventDefault();
    _ctxTargetId = id;
    const menu     = $('ctxMenu');
    const addChild = $('ctxAddChild');
    addChild.style.display = type === 'group' ? 'flex' : 'none';
    menu.style.left = e.clientX + 'px';
    menu.style.top  = e.clientY + 'px';
    menu.classList.add('open');
  }

  document.addEventListener('click', () => {
    $('ctxMenu')?.classList.remove('open');
  });

  $('ctxEdit')?.addEventListener('click', () => {
    if (!_ctxTargetId) return;
    const task = Store.getTask(_ctxTargetId);
    if (task) App.openTaskModal(_ctxTargetId);
    else App.openGroupModal(_ctxTargetId);
  });

  $('ctxDuplicate')?.addEventListener('click', () => {
    const task = Store.getTask(_ctxTargetId);
    if (!task) return;
    const copy = { 
      ...task, 
      id: undefined, 
      nome: task.nome + ' (cópia)',
      periodos: JSON.parse(JSON.stringify(task.periodos || []))
    };
    Store.addTask(copy); Store.save(); refresh(); App.renderDashboard();
    showToast('Tarefa duplicada.','success');
  });

  $('ctxAddChild')?.addEventListener('click', () => {
    App.openTaskModal(null, _ctxTargetId);
  });

  $('ctxDelete')?.addEventListener('click', () => {
    const task = Store.getTask(_ctxTargetId);
    const grp  = Store.getGroup(_ctxTargetId);
    if (task) {
      if (confirm('Excluir tarefa?')) { Store.deleteTask(_ctxTargetId); Store.save(); refresh(); App.renderDashboard(); }
    } else if (grp) {
      if (confirm(`Excluir grupo "${grp.nome}"? As tarefas do grupo serão movidas para sem grupo.`)) {
        Store.deleteGroup(_ctxTargetId); Store.save(); refresh(); App.renderDashboard();
      }
    }
  });

  /* ----------------------------------------------------------------
     RESIZE LEFT PANEL
     ---------------------------------------------------------------- */
  function setupResizer() {
    const resizer = $('ganttResizer');
    const left    = $('ganttLeft');
    let dragging  = false;
    let startX, startW;

    resizer?.addEventListener('mousedown', e => {
      dragging = true;
      startX   = e.clientX;
      startW   = left.offsetWidth;
      resizer.classList.add('dragging');
      document.body.style.cursor     = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const w = Math.max(180, Math.min(startW + (e.clientX - startX), window.innerWidth * 0.6));
      left.style.width = w + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      resizer?.classList.remove('dragging');
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
    });
  }

  /* ---- Public API ---- */
  function init() {
    setupResizer();

    document.getElementById('ganttDateStart')?.addEventListener('change', () => refresh());
    document.getElementById('ganttDateEnd')?.addEventListener('change',   () => refresh());

    $('btnToday')?.addEventListener('click', () => {
      const elStart = document.getElementById('ganttDateStart');
      const elEnd   = document.getElementById('ganttDateEnd');
      if (elStart) elStart.value = dayjs().format('YYYY-MM-DD');
      if (elEnd)   elEnd.value   = dayjs().add(55, 'day').format('YYYY-MM-DD');
      refresh();
    });

    $('ganttSearch')?.addEventListener('input', e => refresh(e.target.value));
    $('btnCollapseAll')?.addEventListener('click', () => { Store.collapseAll(); refresh(); });
    $('btnExpandAll')?.addEventListener('click',   () => { Store.expandAll();   refresh(); });
  }

  function refresh(searchFilter) {
    render(searchFilter !== undefined ? searchFilter : ($('ganttSearch')?.value || ''));
  }

  return { init, refresh };

})();

/* ---- Helpers ---- */
function capitalizeFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showToast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show${type ? ' '+type : ''}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3200);
}