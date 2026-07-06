/* ================================================================ 
   app.js – Orquestração principal do CronoCampo v2
   ================================================================ */

dayjs.locale('pt-br');

/* ================================================================
   BOOT
   ================================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  let restored = false;

  try {
    const cloud = await CloudSync.carregar();
    if (cloud.ok && cloud.dados) {
      Store.loadFromJSON(cloud.dados);
      Store.save();
      restored = true;
    }
  } catch (e) {
    console.error('Falha ao conectar ao Supabase, usando dados locais.', e);
  }

  if (!restored) restored = Store.restore();
  if (!restored) Store.loadSample();

  Gantt.init();
  initTopbar();
  initNavTabs();
  initImportExport();
  initTaskModal();
  initGroupModal();
  initSheetsModal();
  initUndoRedo();
  initSalvar();
  initDrillModal();

  document.getElementById('topbarDate').textContent = dayjs().format('ddd DD/MM/YY').replace(/^\w/, c => c.toUpperCase());

  Gantt.refresh();
  renderDashboard();

  const _closeColab = () => document.getElementById('colaboradorOverlay').classList.remove('open');

  document.getElementById('btnAddColaborador')?.addEventListener('click', () => {
    document.getElementById('colaboradorNome').value = '';
    document.getElementById('colaboradorOverlay').classList.add('open');
    setTimeout(() => document.getElementById('colaboradorNome').focus(), 80);
  });
  document.getElementById('colaboradorClose')?.addEventListener('click', _closeColab);
  document.getElementById('btnCancelColaborador')?.addEventListener('click', _closeColab);
  document.getElementById('colaboradorOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'colaboradorOverlay') _closeColab();
  });
  document.getElementById('colaboradorNome')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') _saveColaborador();
    if (e.key === 'Escape') _closeColab();
  });
  document.getElementById('btnSaveColaborador')?.addEventListener('click', _saveColaborador);

  function _saveColaborador() {
    const name = document.getElementById('colaboradorNome').value.trim();
    if (!name) { showToast('Informe o nome.', 'error'); return; }
    const ok = Store.addToRoster(name);
    if (!ok) { showToast(`"${name}" já está na equipe.`, 'error'); return; }
    Store.save();
    _closeColab();
    renderEquipe();
    showToast(`"${name}" adicionado!`, 'success');
  }
});

/* ================================================================
   TOPBAR
   ================================================================ */
function initTopbar() {
  const title = document.getElementById('pageTitle');

  title.addEventListener('dblclick', () => {
    title.contentEditable = 'true';
    title.focus();
    const range = document.createRange();
    range.selectNodeContents(title);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });

  title.addEventListener('blur', () => {
    title.contentEditable = 'false';
    localStorage.setItem('cc_title', title.textContent.trim());
  });

  title.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); title.blur(); }
    if (e.key === 'Escape') {
      title.contentEditable = 'false';
      title.textContent = localStorage.getItem('cc_title') || 'Cronograma MecRoc';
    }
  });

  const savedTitle = localStorage.getItem('cc_title');
  if (savedTitle) title.textContent = savedTitle;
}

/* ================================================================
   NAVIGATION TABS
   ================================================================ */
function initNavTabs() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('view-' + view)?.classList.add('active');

      if (view === 'dashboard') renderDashboard();
      if (view === 'equipe')    renderEquipe();
      if (view === 'gantt')     Gantt.refresh();
    });
  });
}

/* ================================================================
   IMPORT / EXPORT
   ================================================================ */
function initImportExport() {
  const fileInput = document.getElementById('fileInput');

  document.getElementById('btnImport')?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    Sheets.importFile(file, (count) => {
      Gantt.refresh();
      renderDashboard();
      showToast(`${count} linhas importadas com sucesso!`, 'success');
      closeModal('modalOverlay');
    });
    fileInput.value = '';
  });

  document.getElementById('btnExportExcel')?.addEventListener('click', () => {
    const title = document.getElementById('pageTitle')?.textContent || 'CronoCampo';
    Sheets.exportExcel(title);
  });

  document.getElementById('btnAddTaskInline')?.addEventListener('click', () => openTaskModal(null, null));
  document.getElementById('btnAddGroup')?.addEventListener('click', () => openGroupModal(null));
  document.getElementById('btnExportGantt')?.addEventListener('click', exportGanttImage);
  document.getElementById('btnExportCalendar')?.addEventListener('click', exportCalendar);
  document.getElementById('btnExportHTML')?.addEventListener('click', exportarHTML);

  document.getElementById('btnShowHidden')?.addEventListener('click', () => {
    const newVal = !Store.getShowHidden();
    Store.setShowHidden(newVal);
    const btn = document.getElementById('btnShowHidden');
    if (btn) {
      btn.classList.toggle('btn-active-hidden', newVal);
      btn.innerHTML = newVal
        ? '<i class="fas fa-eye-slash"></i> Ocultar Ocultos'
        : '<i class="fas fa-eye"></i> Mostrar Ocultos';
    }
    Gantt.refresh();
  });
}

/* ================================================================
   TASK MODAL
   ================================================================ */
let _editingTaskId  = null;
let _currentResps   = [];
let _currentDetalhes = [];
let _currentPeriodos = [];

function initTaskModal() {
  document.getElementById('modalClose')?.addEventListener('click',    () => closeModal('modalOverlay'));
  document.getElementById('btnCancelModal')?.addEventListener('click', () => closeModal('modalOverlay'));
  document.getElementById('modalOverlay')?.addEventListener('click',  (e) => { if (e.target.id === 'modalOverlay') closeModal('modalOverlay'); });
  document.getElementById('btnSaveTask')?.addEventListener('click',   saveTask);
  document.getElementById('btnDeleteTask')?.addEventListener('click', () => {
    if (_editingTaskId && confirm('Excluir esta tarefa?')) {
      Store.deleteTask(_editingTaskId);
      Store.save();
      Gantt.refresh();
      renderDashboard();
      closeModal('modalOverlay');
      showToast('Tarefa excluída.','');
    }
  });

  const inp  = document.getElementById('fRespInput');
  const sugg = document.getElementById('respSuggestions');

  inp?.addEventListener('click', () => {
    const roster = Store.getRoster().filter(p => !_currentResps.includes(p));
    if (!roster.length) { sugg.classList.remove('open'); return; }
    sugg.innerHTML = roster.map(p => `
      <div class="resp-sugg-item" data-name="${escHtml(p)}">
        <div class="bar-avatar" style="background:${Store.getPersonColor(p)};width:20px;height:20px;font-size:9px">${Store.personInitials(p)}</div>
        ${escHtml(p)}
      </div>
    `).join('');
    sugg.classList.add('open');
  });

  sugg?.addEventListener('click', e => {
    const item = e.target.closest('.resp-sugg-item');
    if (!item) return;
    addResponsavel(item.dataset.name);
    sugg.classList.remove('open');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.resp-input-wrap')) sugg?.classList.remove('open');
  });

  // Botão para adicionar período
  document.getElementById('btnAddPeriodo')?.addEventListener('click', () => {
    _currentPeriodos.push({ inicio: '', fim: '' });
    renderPeriodosList();
  });

  document.getElementById('btnAddDetalhe')?.addEventListener('click', () => {
    _currentDetalhes.push({ data: '', descricao: '' });
    renderDetalhesList();
  });
  document.getElementById('btnGerarCronograma')?.addEventListener('click', gerarCronogramaDetalhado);
}

function openTaskModal(taskId, defaultGroupId) {
  _editingTaskId = taskId;
  _currentResps  = [];
  _currentPeriodos = [];

  const task = taskId ? Store.getTask(taskId) : null;
  const title = document.getElementById('modalTitle');
  title.textContent = task ? 'Editar Tarefa' : 'Nova Tarefa';

  const sel = document.getElementById('fGrupo');
  sel.innerHTML = '<option value="">— Sem grupo (tarefa raiz) —</option>';
  Store.getGroups().forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = `[${g.id}] ${g.nome}`;
    if ((task && task.grupoId === g.id) || (!task && defaultGroupId === g.id)) opt.selected = true;
    sel.appendChild(opt);
  });

  // Ocultar campos antigos de data única
  const fInicio = document.getElementById('fInicio');
  const fFim = document.getElementById('fFim');
  if (fInicio) fInicio.closest('.form-group').style.display = 'none';
  if (fFim) fFim.closest('.form-group').style.display = 'none';

  if (task) {
    document.getElementById('fNome').value   = task.nome;
    document.getElementById('fStatus').value = task.status;
    document.getElementById('fPct').value    = task.pct || 0;
    document.getElementById('fLocal').value  = task.local || '';
    document.getElementById('fTipo').value   = task.tipo  || '';
    document.getElementById('fObs').value    = task.obs   || '';
    _currentResps = [...(task.responsaveis || [])];
    _currentPeriodos = JSON.parse(JSON.stringify(task.periodos || []));
  } else {
    document.getElementById('fNome').value   = '';
    document.getElementById('fStatus').value = 'Planejado';
    document.getElementById('fPct').value    = '0';
    document.getElementById('fLocal').value  = '';
    document.getElementById('fTipo').value   = '';
    document.getElementById('fObs').value    = '';
    _currentResps = [];
    // Adicionar um período padrão
    _currentPeriodos = [{ inicio: dayjs().format('YYYY-MM-DD'), fim: dayjs().add(1, 'day').format('YYYY-MM-DD') }];
  }

  renderRespTags();
  renderPeriodosList();
  _currentDetalhes = task?.detalhes ? JSON.parse(JSON.stringify(task.detalhes)) : [];
  renderDetalhesList();
  const _btnGerar = document.getElementById('btnGerarCronograma');
  if (_btnGerar) _btnGerar.style.display = task ? 'flex' : 'none';
  document.getElementById('btnDeleteTask').style.display = task ? 'flex' : 'none';
  openModal('modalOverlay');
  document.getElementById('fNome').focus();
}

function addResponsavel(name) {
  const clean = name.trim();
  if (!clean || _currentResps.includes(clean)) return;
  _currentResps.push(clean);
  renderRespTags();
}

function renderRespTags() {
  const wrap = document.getElementById('respTags');
  wrap.innerHTML = _currentResps.map(r => `
    <div class="resp-tag">
      <div class="bar-avatar" style="background:${Store.getPersonColor(r)};width:18px;height:18px;font-size:8px">${Store.personInitials(r)}</div>
      ${escHtml(r)}
      <button class="resp-tag-rm" data-rm="${escHtml(r)}" title="Remover">✕</button>
    </div>
  `).join('');

  wrap.querySelectorAll('.resp-tag-rm').forEach(btn => {
    btn.addEventListener('click', () => {
      _currentResps = _currentResps.filter(r => r !== btn.dataset.rm);
      renderRespTags();
    });
  });
}

/* ================================================================
   PERÍODOS - renderização no modal
   ================================================================ */
function renderPeriodosList() {
  const container = document.getElementById('periodosList');
  if (!container) return;
  
  if (!_currentPeriodos.length) {
    container.innerHTML = '<div style="font-size:11px;color:#9e9e9e;padding:4px 0;text-align:center">Nenhum período. Clique em "+ Adicionar Período".</div>';
    return;
  }
  
  container.innerHTML = _currentPeriodos.map((p, i) => `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;background:#f5f5f5;padding:6px 10px;border-radius:6px;border-left:3px solid #1565c0">
      <span style="font-size:10px;font-weight:700;color:#1565c0;min-width:20px;">#${i+1}</span>
      <input type="date" value="${p.inicio || ''}" placeholder="Início"
        style="flex:1;padding:5px 8px;border:1px solid #e0e0e0;border-radius:4px;font-size:12px"
        data-field="inicio" data-idx="${i}"/>
      <span style="color:#999;font-size:12px;">→</span>
      <input type="date" value="${p.fim || ''}" placeholder="Fim"
        style="flex:1;padding:5px 8px;border:1px solid #e0e0e0;border-radius:4px;font-size:12px"
        data-field="fim" data-idx="${i}"/>
      <button type="button" style="padding:4px 8px;border:1px solid #ffcdd2;background:#ffebee;color:#c62828;border-radius:4px;cursor:pointer;font-size:11px;flex-shrink:0" data-rm-periodo="${i}">✕</button>
    </div>
  `).join('');
  
  // Eventos para atualizar os valores
  container.querySelectorAll('input[data-field]').forEach(inp => {
    inp.addEventListener('change', () => {
      const idx = parseInt(inp.dataset.idx);
      const field = inp.dataset.field;
      if (_currentPeriodos[idx]) {
        _currentPeriodos[idx][field] = inp.value;
      }
    });
  });
  
  // Eventos para remover
  container.querySelectorAll('[data-rm-periodo]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.rmPeriodo);
      _currentPeriodos.splice(idx, 1);
      renderPeriodosList();
    });
  });
}

/* ================================================================
   SALVAR TAREFA - atualizado para suportar períodos
   ================================================================ */
function saveTask() {
  const nome   = document.getElementById('fNome').value.trim();

  if (!nome)  { showToast('Informe o nome da tarefa.','error'); document.getElementById('fNome').focus(); return; }
  
  // Validar períodos
  const periodosValidos = _currentPeriodos.filter(p => p.inicio && p.fim);
  if (periodosValidos.length === 0) {
    showToast('Adicione pelo menos um período com data de início e fim.','error');
    return;
  }
  
  // Validar datas dos períodos
  for (const p of periodosValidos) {
    if (dayjs(p.fim).isBefore(dayjs(p.inicio))) {
      showToast(`Período ${p.inicio} → ${p.fim}: data de fim deve ser após a data de início.`,'error');
      return;
    }
  }

  const data = {
    grupoId:      document.getElementById('fGrupo').value || null,
    nome,
    responsaveis: [..._currentResps],
    periodos:     periodosValidos,
    status:       document.getElementById('fStatus').value,
    pct:          parseInt(document.getElementById('fPct').value) || 0,
    local:        document.getElementById('fLocal').value.trim(),
    tipo:         document.getElementById('fTipo').value.trim(),
    obs:          document.getElementById('fObs').value.trim(),
    detalhes:     JSON.parse(JSON.stringify(_currentDetalhes)),
  };

  if (_editingTaskId) {
    Store.updateTask(_editingTaskId, data);
  } else {
    Store.addTask(data);
  }

  Store.save();
  Gantt.refresh();
  renderDashboard();
  closeModal('modalOverlay');
  showToast(_editingTaskId ? 'Tarefa atualizada!' : 'Tarefa adicionada!', 'success');
}

/* ================================================================
   GROUP MODAL
   ================================================================ */
let _editingGroupId = null;
const GROUP_COLORS = [
  '#2e7d32','#1565c0','#6a1b9a','#c62828','#e65100',
  '#00695c','#4527a0','#283593','#558b2f','#ad1457',
  '#0277bd','#f57f17','#37474f','#455a64',
];
let _selectedGroupColor = GROUP_COLORS[0];

function initGroupModal() {
  document.getElementById('groupClose')?.addEventListener('click',    () => closeModal('groupOverlay'));
  document.getElementById('btnCancelGroup')?.addEventListener('click', () => closeModal('groupOverlay'));
  document.getElementById('groupOverlay')?.addEventListener('click',  (e) => { if (e.target.id === 'groupOverlay') closeModal('groupOverlay'); });
  document.getElementById('btnSaveGroup')?.addEventListener('click',  saveGroup);
  document.getElementById('btnAddGroup')?.addEventListener('click',   () => openGroupModal(null));
  document.getElementById('btnDeleteGroup')?.addEventListener('click', () => {
    if (_editingGroupId && confirm('Excluir este grupo? As tarefas serão movidas para sem grupo.')) {
      Store.deleteGroup(_editingGroupId);
      Store.save();
      Gantt.refresh();
      renderDashboard();
      closeModal('groupOverlay');
      showToast('Grupo excluído.','');
    }
  });

  const picker = document.getElementById('groupColorPicker');
  GROUP_COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (c === _selectedGroupColor ? ' selected' : '');
    sw.style.background = c;
    sw.dataset.color = c;
    sw.addEventListener('click', () => {
      _selectedGroupColor = c;
      picker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
    });
    picker.appendChild(sw);
  });
}

function openGroupModal(groupId) {
  _editingGroupId = groupId;
  const g = groupId ? Store.getGroup(groupId) : null;
  document.getElementById('groupModalTitle').textContent = g ? 'Editar Grupo/Ramal' : 'Novo Grupo/Ramal';

  document.getElementById('gNome').value = g?.nome  || '';
  document.getElementById('gResp').value = g?.responsavel || '';

  _selectedGroupColor = g?.cor || GROUP_COLORS[Store.getGroups().length % GROUP_COLORS.length];
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === _selectedGroupColor);
  });

  document.getElementById('btnDeleteGroup').style.display = g ? 'flex' : 'none';
  openModal('groupOverlay');
  document.getElementById('gNome').focus();
}

function saveGroup() {
  const nome = document.getElementById('gNome').value.trim();
  if (!nome) { showToast('Informe o nome do grupo.','error'); return; }

  const data = {
    nome,
    responsavel: document.getElementById('gResp').value.trim(),
    cor:         _selectedGroupColor,
  };

  if (_editingGroupId) {
    Store.updateGroup(_editingGroupId, data);
  } else {
    Store.addGroup(data);
  }

  Store.save();
  Gantt.refresh();
  renderDashboard();
  closeModal('groupOverlay');
  showToast(_editingGroupId ? 'Grupo atualizado!' : 'Grupo criado!', 'success');
}

/* ================================================================
   SALVAR / CARREGAR JSON
   ================================================================ */
function initSalvar() {
  document.getElementById('btnBackupJson')?.addEventListener('click', () => {
    const dados  = Store.toJSON();
    const titulo = (document.getElementById('pageTitle')?.textContent || 'CronoCampo').trim();
    const blob   = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = titulo + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup baixado!', 'success');
  });

  document.getElementById('btnSalvar')?.addEventListener('click', async () => {
    const dados = Store.toJSON();
    Store.save(); // cache local (offline)

    const btn = document.getElementById('btnSalvar');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    const result = await CloudSync.salvar(dados);

    btn.disabled = false;
    btn.innerHTML = original;

    if (result.ok) {
      showToast('Cronograma salvo na nuvem!', 'success');
    } else {
      showToast('Salvo localmente, mas falhou ao enviar para a nuvem.', 'error');
    }
  });

  document.getElementById('btnCarregar')?.addEventListener('click', () => {
    document.getElementById('fileInputJson').click();
  });

  document.getElementById('fileInputJson')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const dados = JSON.parse(ev.target.result);
        Store.loadFromJSON(dados);
        Store.save();
        Gantt.refresh();
        renderDashboard();
        showToast('Cronograma carregado!', 'success');
      } catch(err) {
        showToast('Arquivo inválido.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

/* ================================================================
   SHEETS MODAL
   ================================================================ */
function initSheetsModal() {
  document.getElementById('btnSheets')?.addEventListener('click', () => {
    Sheets.loadConfig();
    document.getElementById('sheetsInstructions').innerHTML = `
      <ol style="padding-left:16px;margin-bottom:8px">
        <li>Abra sua planilha no Google Sheets</li>
        <li>Vá em <strong>Extensions → Apps Script</strong></li>
        <li>Cole o código abaixo e salve</li>
        <li>Clique em <strong>Deploy → New deployment → Web app</strong></li>
        <li>Em "Who has access", selecione <strong>Anyone</strong></li>
        <li>Copie a URL gerada e cole no campo acima</li>
      </ol>
      <pre>${escHtml(Sheets.getAppsScriptCode())}</pre>
    `;
    openModal('sheetsOverlay');
  });
  document.getElementById('sheetsClose')?.addEventListener('click',  () => closeModal('sheetsOverlay'));
  document.getElementById('sheetsOverlay')?.addEventListener('click', e => { if (e.target.id === 'sheetsOverlay') closeModal('sheetsOverlay'); });
  document.getElementById('sheetsBtnTest')?.addEventListener('click',  Sheets.testConnection);
  document.getElementById('sheetsBtnSave')?.addEventListener('click',  Sheets.pushToSheets);
  document.getElementById('sheetsBtnLoad')?.addEventListener('click',  Sheets.pullFromSheets);
}

/* ================================================================
   UNDO / REDO
   ================================================================ */
function initUndoRedo() {
  document.getElementById('btnUndo')?.addEventListener('click', () => {
    if (Store.undo()) { Gantt.refresh(); renderDashboard(); showToast('Desfeito.',''); }
  });
  document.getElementById('btnRedo')?.addEventListener('click', () => {
    if (Store.redo()) { Gantt.refresh(); renderDashboard(); showToast('Refeito.',''); }
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey||e.metaKey) && !e.shiftKey && e.key==='z') {
      e.preventDefault();
      if (Store.undo()) { Gantt.refresh(); renderDashboard(); showToast('Desfeito.',''); }
    }
    if ((e.ctrlKey||e.metaKey) && (e.key==='y'||(e.shiftKey&&e.key==='z'))) {
      e.preventDefault();
      if (Store.redo()) { Gantt.refresh(); renderDashboard(); showToast('Refeito.',''); }
    }
  });
}

/* ================================================================
   DRILL-DOWN MODAL
   ================================================================ */
function initDrillModal() {
  const close = () => closeModal('drillOverlay');
  document.getElementById('drillClose')?.addEventListener('click', close);
  document.getElementById('drillCloseBtn')?.addEventListener('click', close);
  document.getElementById('drillOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'drillOverlay') close();
  });
}

function openDrill(title, tasks) {
  document.getElementById('drillTitle').innerHTML = title;
  const body = document.getElementById('drillBody');

  if (!tasks.length) {
    body.innerHTML = '<div style="padding:40px;text-align:center;color:#9e9e9e;font-size:13px">Nenhuma atividade encontrada.</div>';
  } else {
    body.innerHTML = tasks.map(t => {
      const color = Store.STATUS_COLORS[t.status] || '#90a4ae';
      const grupo = t.grupoId ? (Store.getGroup(t.grupoId)?.nome || '—') : '—';
      const periodosStr = (t.periodos || []).map(p => 
        `${p.inicio || '—'} → ${p.fim || '—'}`
      ).join(' | ');
      const dur = (t.periodos || []).reduce((acc, p) => {
        if (p.inicio && p.fim) {
          return acc + dayjs(p.fim).diff(dayjs(p.inicio), 'day') + 1;
        }
        return acc;
      }, 0) + ' dias';
      return `
        <div class="activity-item" style="padding:12px 20px;border-bottom:1px solid #f0f0f0;cursor:pointer"
             data-taskid="${t.id}">
          <div class="activity-dot" style="background:${color};flex-shrink:0"></div>
          <div class="activity-info" style="flex:1;min-width:0">
            <div class="activity-title">${escHtml(t.nome)}</div>
            <div class="activity-meta" style="margin-top:3px;line-height:1.8">
              👤 ${escHtml((t.responsaveis||[]).join(', ')||'—')} &nbsp;·&nbsp;
              📁 ${escHtml(grupo)} &nbsp;·&nbsp;
              📍 ${escHtml(t.local||'—')} &nbsp;·&nbsp;
              📅 ${periodosStr || '—'} (${dur})
              ${t.obs ? `<br>📝 ${escHtml(t.obs)}` : ''}
              ${(t.periodos || []).length > 1 ? `<br>🔁 ${(t.periodos || []).length} períodos` : ''}
            </div>
          </div>
          <span class="status-pill ${spClass(t.status)}" style="flex-shrink:0;margin-left:10px">${t.status}</span>
        </div>
      `;
    }).join('');

    body.querySelectorAll('[data-taskid]').forEach(row => {
      row.addEventListener('click', () => {
        closeModal('drillOverlay');
        openTaskModal(row.dataset.taskid);
      });
    });
  }

  openModal('drillOverlay');
}

/* ================================================================
   DASHBOARD - atualizado para suportar períodos
   ================================================================ */
let _dashCharts = {};

function renderDashboard() {
  const tasks  = Store.getTasks();
  const groups = Store.getGroups();
  const today  = dayjs().startOf('day');
  const fimSemana = today.add(14, 'day');

  const total     = tasks.length;
  const peopleSet = new Set(tasks.flatMap(t => t.responsaveis||[]));
  
  // Atividades ativas hoje - verifica todos os períodos
  const hojeList  = tasks.filter(t => {
    if (t.status === 'Concluído' || t.status === 'Cancelado') return false;
    const periodos = t.periodos || [];
    return periodos.some(p => {
      if (!p.inicio || !p.fim) return false;
      const s = dayjs(p.inicio).startOf('day');
      const e = dayjs(p.fim).startOf('day');
      return !today.isBefore(s) && !today.isAfter(e);
    });
  });
  
  const andamentoList = tasks.filter(t => t.status === 'Em andamento');
  const concluídoList = tasks.filter(t => t.status === 'Concluído');
  const canceladoList = tasks.filter(t => t.status === 'Cancelado');

  // ── KPI cards (clicáveis) ──
  const kpis = [
    { icon:'fa-stream',       label:'Atividades',    value:total,               cls:'kpi-green',  filter: () => tasks },
    { icon:'fa-folder-open',  label:'Grupos/Ramais', value:groups.length,       cls:'kpi-blue',   filter: null },
    { icon:'fa-users',        label:'Pessoas',       value:peopleSet.size,      cls:'kpi-purple', filter: null },
    { icon:'fa-clock',        label:'Ativas Hoje',   value:hojeList.length,     cls:'kpi-orange', filter: () => hojeList },
    { icon:'fa-spinner',      label:'Em Andamento',  value:andamentoList.length,cls:'kpi-orange', filter: () => andamentoList },
    { icon:'fa-check-circle', label:'Concluídas',    value:concluídoList.length,cls:'kpi-green',  filter: () => concluídoList },
    { icon:'fa-ban',          label:'Canceladas',    value:canceladoList.length,cls:'kpi-red',    filter: () => canceladoList },
  ];

  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = kpis.map((k, i) => `
    <div class="kpi-card ${k.cls}${k.filter ? ' kpi-clickable' : ''}" data-kpi="${i}"
         style="${k.filter ? 'cursor:pointer' : ''}">
      <div class="kpi-icon"><i class="fas ${k.icon}"></i></div>
      <div><div class="kpi-value">${k.value}</div><div class="kpi-label">${k.label}</div></div>
      ${k.filter ? '<div style="position:absolute;top:8px;right:10px;font-size:10px;color:#bdbdbd"><i class="fas fa-search"></i></div>' : ''}
    </div>
  `).join('');
  grid.style.position = 'relative';

  grid.querySelectorAll('[data-kpi]').forEach(card => {
    const idx = parseInt(card.dataset.kpi);
    if (!kpis[idx].filter) return;
    card.addEventListener('click', () => {
      openDrill(`<i class="fas ${kpis[idx].icon}"></i> &nbsp;${kpis[idx].label}`, kpis[idx].filter());
    });
  });

  // ── Gráfico: Por Responsável ──
  const byPessoa = (() => {
    const c = {};
    tasks.forEach(t => (t.responsaveis||[]).forEach(r => c[r]=(c[r]||0)+1));
    return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,10);
  })();

  renderDashChart('chartPessoas', 'doughnut', byPessoa, p => Store.getPersonColor(p), (label) => {
    const list = tasks.filter(t => (t.responsaveis||[]).includes(label));
    openDrill(`<i class="fas fa-user"></i> &nbsp;${escHtml(label)}`, list);
  });

  // ── Gráfico: Por Status ──
  const byStatus = (() => {
    const c = {};
    tasks.forEach(t => c[t.status]=(c[t.status]||0)+1);
    return Object.entries(c);
  })();

  renderDashChart('chartStatus', 'pie', byStatus, s => Store.STATUS_COLORS[s]||'#90a4ae', (label) => {
    const list = tasks.filter(t => t.status === label);
    openDrill(`<i class="fas fa-tag"></i> &nbsp;${escHtml(label)}`, list);
  });

  // ── Gráfico: Por Grupo ──
  const byGrupo = (() => {
    const c = {};
    tasks.forEach(t => {
      const g = t.grupoId ? (Store.getGroup(t.grupoId)?.nome||'Sem grupo') : 'Sem grupo';
      c[g]=(c[g]||0)+1;
    });
    return Object.entries(c).sort((a,b)=>b[1]-a[1]);
  })();

  renderDashChart('chartGrupos', 'bar', byGrupo, (k) => {
    const g = Store.getGroups().find(g => g.nome === k);
    return g ? g.cor : Store.PALETTE[0];
  }, (label) => {
    const list = tasks.filter(t => {
      const nome = t.grupoId ? (Store.getGroup(t.grupoId)?.nome||'Sem grupo') : 'Sem grupo';
      return nome === label;
    });
    openDrill(`<i class="fas fa-folder"></i> &nbsp;${escHtml(label)}`, list);
  });

  // ── Próximos 14 dias ──
  const proxList = tasks.filter(t => {
    if (t.status === 'Concluído' || t.status === 'Cancelado') return false;
    const periodos = t.periodos || [];
    return periodos.some(p => {
      if (!p.inicio || !p.fim) return false;
      const s = dayjs(p.inicio).startOf('day');
      const e = dayjs(p.fim).startOf('day');
      return e.isAfter(today) && s.isBefore(fimSemana.add(1, 'day'));
    });
  }).filter(t => !hojeList.includes(t));

  const renderItem = t => {
    const color = Store.STATUS_COLORS[t.status]||'#90a4ae';
    const periodosStr = (t.periodos || []).map(p => 
      `${p.inicio || '—'} → ${p.fim || '—'}`
    ).join(' | ');
    return `
      <div class="activity-item" style="cursor:pointer" data-taskid="${t.id}">
        <div class="activity-dot" style="background:${color}"></div>
        <div class="activity-info">
          <div class="activity-title">${escHtml(t.nome)}</div>
          <div class="activity-meta">👤 ${escHtml((t.responsaveis||[]).join(', ')||'—')} · 📍 ${escHtml(t.local||'—')} · 📅 ${periodosStr || '—'}</div>
        </div>
        <span class="status-pill ${spClass(t.status)}">${t.status}</span>
      </div>
    `;
  };

  document.getElementById('badgeHoje').textContent = hojeList.length;
  const listaHoje = document.getElementById('listaHoje');
  listaHoje.innerHTML = hojeList.length
    ? hojeList.map(renderItem).join('')
    : '<div style="padding:20px;text-align:center;color:#9e9e9e;font-size:12px">Nenhuma atividade para hoje</div>';

  document.getElementById('badgeProx').textContent = proxList.length;
  const listaProx = document.getElementById('listaProx');
  listaProx.innerHTML = proxList.length
    ? proxList.map(renderItem).join('')
    : '<div style="padding:20px;text-align:center;color:#9e9e9e;font-size:12px">Nenhuma atividade para os próximos 14 dias</div>';

  [listaHoje, listaProx].forEach(lista => {
    lista.querySelectorAll('[data-taskid]').forEach(row => {
      row.addEventListener('click', () => openTaskModal(row.dataset.taskid));
    });
  });

  // ── Gráfico: Conclusão por Grupo ──
  const byConclusao = groups.map(g => {
    const gTasks = tasks.filter(t => t.grupoId === g.id);
    if (!gTasks.length) return null;
    const pct = Math.round(gTasks.filter(t => t.status === 'Concluído').length / gTasks.length * 100);
    return [g.nome, pct, g.cor];
  }).filter(Boolean).sort((a,b) => b[1]-a[1]);

  if (_dashCharts['chartConclusao']) { _dashCharts['chartConclusao'].destroy(); delete _dashCharts['chartConclusao']; }
  const ctxConc = document.getElementById('chartConclusao')?.getContext('2d');
  if (ctxConc && byConclusao.length) {
    _dashCharts['chartConclusao'] = new Chart(ctxConc, {
      type: 'bar',
      data: {
        labels: byConclusao.map(([nome]) => nome.length>18 ? nome.slice(0,18)+'…' : nome),
        datasets: [{
          label: '% Concluído',
          data: byConclusao.map(([,pct]) => pct),
          backgroundColor: byConclusao.map(([,,cor]) => cor),
          borderRadius: 6,
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x}%` } }
        },
        scales: {
          x: { min: 0, max: 100, ticks: { callback: v => v+'%', stepSize: 25 } }
        },
        onClick: (e, els) => {
          if (!els.length) return;
          const nome = byConclusao[els[0].index][0];
          const list = tasks.filter(t => {
            const g = t.grupoId ? Store.getGroup(t.grupoId)?.nome : null;
            return g === nome;
          });
          openDrill(`<i class="fas fa-tasks"></i> &nbsp;${escHtml(nome)} — Conclusão`, list);
        },
        onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
      }
    });
  }

  // ── Lista: Atividades Atrasadas ──
  const atrasadasList = tasks.filter(t => {
    if (t.status === 'Concluído' || t.status === 'Cancelado') return false;
    const periodos = t.periodos || [];
    return periodos.some(p => {
      if (!p.fim) return false;
      return dayjs(p.fim).startOf('day').isBefore(today);
    });
  }).sort((a,b) => {
    const fimA = a.periodos?.reduce((min, p) => {
      if (!p.fim) return min;
      const d = dayjs(p.fim);
      return min && d.isAfter(min) ? min : d;
    }, null);
    const fimB = b.periodos?.reduce((min, p) => {
      if (!p.fim) return min;
      const d = dayjs(p.fim);
      return min && d.isAfter(min) ? min : d;
    }, null);
    if (fimA && fimB) return fimA.diff(fimB);
    return 0;
  });

  document.getElementById('badgeAtrasadas').textContent = atrasadasList.length;
  const listaAtrasadas = document.getElementById('listaAtrasadas');
  if (listaAtrasadas) {
    listaAtrasadas.innerHTML = atrasadasList.length
      ? atrasadasList.map(t => {
          const ultimoFim = t.periodos?.reduce((min, p) => {
            if (!p.fim) return min;
            const d = dayjs(p.fim);
            return min && d.isAfter(min) ? min : d;
          }, null);
          const diasAtraso = ultimoFim ? today.diff(ultimoFim.startOf('day'), 'day') : 0;
          return `
            <div class="activity-item" style="cursor:pointer" data-taskid="${t.id}">
              <div class="activity-dot" style="background:#c62828"></div>
              <div class="activity-info">
                <div class="activity-title">${escHtml(t.nome)}</div>
                <div class="activity-meta">
                  👤 ${escHtml((t.responsaveis||[]).join(', ')||'—')} · 📍 ${escHtml(t.local||'—')} · 📅 venceu ${ultimoFim ? ultimoFim.format('DD/MM/YYYY') : '—'}
                </div>
              </div>
              <span style="font-size:11px;font-weight:700;color:#c62828;white-space:nowrap;margin-left:10px">+${diasAtraso}d</span>
            </div>
          `;
        }).join('')
      : '<div style="padding:20px;text-align:center;color:#9e9e9e;font-size:12px">Nenhuma atividade atrasada 🎉</div>';

    listaAtrasadas.querySelectorAll('[data-taskid]').forEach(row => {
      row.addEventListener('click', () => openTaskModal(row.dataset.taskid));
    });
  }
}

function renderDashChart(id, type, entries, colorFn, onClickFn) {
  if (_dashCharts[id]) { _dashCharts[id].destroy(); delete _dashCharts[id]; }
  const ctx = document.getElementById(id)?.getContext('2d');
  if (!ctx || !entries.length) return;

  const labels = entries.map(([k]) => k.length>18?k.slice(0,18)+'…':k);
  const fullLabels = entries.map(([k]) => k);
  const values = entries.map(([,v]) => v);
  const colors = entries.map(([k], i) => colorFn(k, i));

  const chart = new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderRadius: type==='bar'?6:0,
        borderWidth: type==='bar'?0:2,
        borderColor: '#fff',
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      indexAxis: type==='bar'?'y':undefined,
      plugins:{
        legend:{
          position: type==='bar'?'bottom':'right',
          labels:{ font:{size:11}, boxWidth:12, padding:8, filter: (item) => item.text !== 'undefined' },
          onClick: (e, legendItem) => {
            if (onClickFn) onClickFn(fullLabels[legendItem.index]);
          }
        }
      },
      scales: type==='bar' ? { x:{ticks:{stepSize:1}} } : undefined,
      onClick: (e) => {
        if (!onClickFn) return;
        const pts = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
        if (pts.length) onClickFn(fullLabels[pts[0].index]);
      },
      onHover: (e, els) => {
        e.native.target.style.cursor = els.length ? 'pointer' : 'default';
      },
    }
  });

  _dashCharts[id] = chart;
}

/* ================================================================
   EQUIPE VIEW
   ================================================================ */
function renderEquipe() {
  const tasks  = Store.getTasks();
  const roster = Store.getRoster();
  const el     = document.getElementById('equipeGrid');

  if (!roster.length) {
    el.innerHTML = `
      <div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;padding:80px 20px;text-align:center">
        <i class="fas fa-users" style="font-size:48px;color:#e0e0e0;margin-bottom:16px"></i>
        <div style="font-size:15px;font-weight:600;color:#9e9e9e;margin-bottom:6px">Nenhum colaborador cadastrado</div>
        <div style="font-size:12px;color:#bdbdbd">Clique em "Adicionar Colaborador" para começar</div>
      </div>`;
    return;
  }

  const maxAtiv = Math.max(...roster.map(p => tasks.filter(t => (t.responsaveis||[]).includes(p)).length), 1);

  el.innerHTML = roster.map(person => {
    const mine    = tasks.filter(t => (t.responsaveis||[]).includes(person));
    const conc    = mine.filter(t => t.status==='Concluído').length;
    const and     = mine.filter(t => t.status==='Em andamento').length;
    const color   = Store.getPersonColor(person);
    const pct     = Math.round(mine.length / maxAtiv * 100);
    const locais  = {};
    mine.forEach(t => { if(t.local) locais[t.local]=(locais[t.local]||0)+1; });
    const topLocal = Object.entries(locais).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';

    return `
      <div class="person-card">
        <div class="person-card-head">
          <div class="person-avatar-lg" style="background:${color}">${Store.personInitials(person)}</div>
          <div style="flex:1">
            <div class="person-name" style="cursor:pointer;text-decoration:underline dotted" data-person="${escHtml(person)}">${escHtml(person)}</div>
            <div class="person-role">📍 ${escHtml(topLocal)}</div>
          </div>
          <button class="person-card-edit-btn" title="Editar colaborador" data-edit-person="${escHtml(person)}">
            <i class="fas fa-pen"></i>
          </button>
        </div>
        <div class="person-stats">
          <div class="person-stat"><div class="person-stat-v">${mine.length}</div><div class="person-stat-l">Ativ.</div></div>
          <div class="person-stat"><div class="person-stat-v" style="color:#2e7d32">${conc}</div><div class="person-stat-l">Concl.</div></div>
          <div class="person-stat"><div class="person-stat-v" style="color:#e65100">${and}</div><div class="person-stat-l">Andando</div></div>
        </div>
        <div class="person-bar-wrap">
          <div class="person-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('[data-person]').forEach(btn => {
    btn.addEventListener('click', () => openColaboradorAtividades(btn.dataset.person));
  });

  el.querySelectorAll('[data-edit-person]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditColaborador(btn.dataset.editPerson);
    });
  });
}

/* ================================================================
   MODAL ATIVIDADES DO COLABORADOR - atualizado para períodos
   ================================================================ */
function openColaboradorAtividades(person) {
  const tasks = Store.getTasks().filter(t => (t.responsaveis||[]).includes(person));
  const color = Store.getPersonColor(person);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'colabAtivOverlay';

  overlay.innerHTML = `
    <div class="modal" style="width:660px">
      <div class="modal-header">
        <h2>
          <div class="bar-avatar" style="background:${color};width:28px;height:28px;font-size:11px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;flex-shrink:0">
            ${Store.personInitials(person)}
          </div>
          ${escHtml(person)} — Atividades
        </h2>
        <button class="modal-close" id="colabAtivClose"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:0">
        ${!tasks.length
          ? '<div style="padding:40px;text-align:center;color:#9e9e9e">Nenhuma atividade designada.</div>'
          : tasks.map(t => {
              const periodosStr = (t.periodos || []).map(p => 
                `${p.inicio || '—'} → ${p.fim || '—'}`
              ).join(' | ');
              return `
                <div class="activity-item" style="padding:12px 20px;border-bottom:1px solid #f0f0f0">
                  <div class="activity-dot" style="background:${Store.STATUS_COLORS[t.status]||'#90a4ae'}"></div>
                  <div class="activity-info">
                    <div class="activity-title">${escHtml(t.nome)}</div>
                    <div class="activity-meta" style="margin-top:4px;line-height:1.8">
                      📅 ${periodosStr || '—'}<br>
                      📍 ${escHtml(t.local||'—')}<br>
                      🏷️ ${escHtml(t.tipo||'—')}
                      ${t.obs ? `<br>📝 ${escHtml(t.obs)}` : ''}
                      ${(t.periodos || []).length > 1 ? `<br>🔁 ${(t.periodos || []).length} períodos` : ''}
                    </div>
                  </div>
                  <span class="status-pill ${spClass(t.status)}">${t.status}</span>
                </div>
              `;
            }).join('')
        }
      </div>
      <div class="modal-footer">
        <div style="flex:1"></div>
        <button class="btn-outline" id="colabAtivCloseBtn">Fechar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('colabAtivClose')?.addEventListener('click', close);
  document.getElementById('colabAtivCloseBtn')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

/* ================================================================
   STATUS PILL CLASS
   ================================================================ */
function spClass(s) {
  return {'Planejado':'sp-plan','Em andamento':'sp-and','Concluído':'sp-conc','Cancelado':'sp-canc','Manutenção':'sp-manu'}[s]||'sp-plan';
}

/* ================================================================
   MODAL HELPERS
   ================================================================ */
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

/* ================================================================
   EXPOSE TO OTHER MODULES
   ================================================================ */
const App = {
  openTaskModal,
  openGroupModal,
  renderDashboard,
  renderEquipe,
};

/* ================================================================
   EXPORTAR GANTT COMO PNG
   ================================================================ */
async function exportGanttImage() {
  showToast('Gerando imagem do Gantt...', 'info');
  try {
    if (!window.html2canvas) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    const title  = document.getElementById('pageTitle')?.textContent?.trim() || 'CronoCampo';
    const layout = document.getElementById('ganttLayout');
    if (!layout) { showToast('Gantt não encontrado.', 'error'); return; }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;background:#fff;font-family:Inter,sans-serif;width:' + layout.scrollWidth + 'px';

    const header = document.createElement('div');
    header.innerHTML = _buildHeader(title);
    wrapper.appendChild(header);

    const clone = layout.cloneNode(true);
    clone.style.cssText = 'width:' + layout.scrollWidth + 'px;position:relative;overflow:visible;display:flex';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);
    await new Promise(r => setTimeout(r, 200));

    const canvas = await html2canvas(wrapper, {
      scale: 1.5, useCORS: true, backgroundColor: '#ffffff',
      width: wrapper.scrollWidth, height: wrapper.scrollHeight, scrollX: 0, scrollY: 0,
    });
    document.body.removeChild(wrapper);
    const link = document.createElement('a');
    link.download = title + '_Gantt.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Gantt exportado!', 'success');
  } catch(err) { showToast('Erro: ' + err.message, 'error'); }
}

function _buildHeader(title) {
  const hoje = dayjs().format('DD/MM/YYYY');
  return '<div style="background:#1a1a2e;padding:12px 24px;display:flex;align-items:center;gap:14px;font-family:Inter,Arial,sans-serif">'
    + '<div style="background:#fff;border-radius:6px;padding:4px 8px;display:inline-flex;align-items:center"><img src="data:image/png;base64,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" style="height:30px;object-fit:contain"/></div>'
    + '<div style="flex:1"><div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-.3px">' + escHtml(title) + '</div>'
    + '<div style="font-size:10px;color:#90a4ae;margin-top:1px">Gerado em ' + hoje + '</div></div></div>';
}


/* ================================================================
   MODAL PARA ESCOLHER O NOME E OS MESES DO ARQUIVO
   ================================================================ */
function showExportNameModal(monthsAvailable) {
  return new Promise((resolve) => {
    const title = document.getElementById('pageTitle')?.textContent?.trim() || 'CronoCampo';
    const defaultName = title + '_Calendario';

    // Remove modal existente se houver
    const existing = document.getElementById('exportNameOverlay');
    if (existing) existing.remove();

    // Cria o overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'exportNameOverlay';
    overlay.style.display = 'flex';

    // Opções de meses
    const monthOptions = monthsAvailable.map((m, index) => {
      const label = m.format('MMMM/YYYY');
      const value = index;
      const checked = true; // Todos selecionados por padrão
      return `
        <label style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;cursor:pointer;transition:background 0.2s;hover:background:#f5f5f5;">
          <input type="checkbox" class="month-checkbox" value="${value}" checked style="width:16px;height:16px;accent-color:#2e7d32;cursor:pointer;"/>
          <span style="font-size:13px;font-weight:500;color:#333;">${label}</span>
        </label>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="modal" style="width:480px;max-height:90vh;">
        <div class="modal-header">
          <h2><i class="fas fa-calendar-alt" style="color:var(--primary)"></i> Exportar Calendário</h2>
          <button class="modal-close" id="exportNameClose"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <div class="form-group" style="margin-bottom:16px;">
            <label style="font-size:12px;font-weight:600;color:#333;margin-bottom:4px;">Nome do arquivo</label>
            <input type="text" id="exportFileName" value="${escHtml(defaultName)}" 
              style="width:100%;padding:10px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;transition:border-color 0.2s;"
              placeholder="Digite o nome do arquivo..."
              autofocus/>
          </div>
          
          <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:600;color:#333;display:flex;align-items:center;justify-content:space-between;">
              <span>📅 Selecionar meses</span>
              <span style="font-size:11px;font-weight:400;color:#999;">
                <button type="button" id="selectAllMonths" style="border:none;background:none;color:#2e7d32;cursor:pointer;font-weight:600;font-size:11px;padding:0 4px;">Selecionar todos</button>
                <span style="color:#ccc;">|</span>
                <button type="button" id="deselectAllMonths" style="border:none;background:none;color:#c62828;cursor:pointer;font-weight:600;font-size:11px;padding:0 4px;">Desmarcar todos</button>
              </span>
            </label>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:4px;max-height:200px;overflow-y:auto;padding:4px 0;border:1px solid #e8e8e8;border-radius:6px;padding:8px 12px;background:#fafafa;">
              ${monthOptions}
            </div>
            <div style="font-size:11px;color:#999;margin-top:6px;">
              <i class="fas fa-info-circle"></i> Selecione os meses que deseja incluir no calendário
            </div>
          </div>
          
          <div style="font-size:11px;color:#999;margin-top:4px;">
            <i class="fas fa-file-image"></i> O arquivo será salvo como <strong>.jpeg</strong>
          </div>
        </div>
        <div class="modal-footer" style="justify-content:space-between;">
          <button class="btn-outline" id="exportNameCancel">Cancelar</button>
          <button class="btn-primary" id="exportNameConfirm" style="padding:8px 24px;">
            <i class="fas fa-download"></i> Exportar JPEG
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Estilos para o input em foco
    const style = document.createElement('style');
    style.textContent = `
      #exportFileName:focus {
        border-color: var(--primary) !important;
        box-shadow: 0 0 0 3px rgba(46,125,50,0.12);
      }
      #exportNameConfirm:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(46,125,50,0.3);
      }
      .month-checkbox:hover {
        cursor:pointer;
      }
      .month-checkbox:checked + span {
        color: #2e7d32;
      }
    `;
    overlay.appendChild(style);

    // Referências
    const input = document.getElementById('exportFileName');
    const closeModal = () => {
      overlay.remove();
      resolve(null);
    };

    // Eventos para fechar
    overlay.querySelector('#exportNameClose')?.addEventListener('click', closeModal);
    overlay.querySelector('#exportNameCancel')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Selecionar/Desmarcar todos
    document.getElementById('selectAllMonths')?.addEventListener('click', () => {
      overlay.querySelectorAll('.month-checkbox').forEach(cb => cb.checked = true);
    });
    document.getElementById('deselectAllMonths')?.addEventListener('click', () => {
      overlay.querySelectorAll('.month-checkbox').forEach(cb => cb.checked = false);
    });

    // Confirmar exportação
    document.getElementById('exportNameConfirm')?.addEventListener('click', () => {
      // Pega os meses selecionados
      const selectedIndexes = [];
      overlay.querySelectorAll('.month-checkbox:checked').forEach(cb => {
        selectedIndexes.push(parseInt(cb.value));
      });
      
      if (selectedIndexes.length === 0) {
        showToast('Selecione pelo menos um mês.', 'error');
        return;
      }

      const name = input.value.trim() || 'Calendario';
      overlay.remove();
      resolve({ name, selectedIndexes });
    });

    // Enter para confirmar
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selectedIndexes = [];
        overlay.querySelectorAll('.month-checkbox:checked').forEach(cb => {
          selectedIndexes.push(parseInt(cb.value));
        });
        if (selectedIndexes.length === 0) {
          showToast('Selecione pelo menos um mês.', 'error');
          return;
        }
        const name = input.value.trim() || 'Calendario';
        overlay.remove();
        resolve({ name, selectedIndexes });
      }
      if (e.key === 'Escape') {
        closeModal();
      }
    });

    // Seleciona todo o texto automaticamente
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);

    // Fechar com ESC
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  });
}

/* ================================================================
   EXPORTAR CALENDÁRIO - JPEG com escolha de nome e meses
   ================================================================ */
async function exportCalendar() {
  try {
    // Carrega html2canvas se necessário
    if (!window.html2canvas) {
      showToast('Carregando bibliotecas...', 'info');
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });
    }

    const tasks = Store.getTasks().filter(t => {
      if (t.hidden) return false;
      if (t.grupoId && Store.getGroup(t.grupoId)?.hidden) return false;
      return (t.periodos || []).some(p => p.inicio && p.fim);
    });
    const groups = Store.getGroups();
    const title = document.getElementById('pageTitle')?.textContent?.trim() || 'CronoCampo';

    if (!tasks.length) {
      showToast('Nenhuma atividade para exportar.', 'error');
      return;
    }

    // Coletar todas as datas dos períodos
    const dates = [];
    tasks.forEach(t => {
      (t.periodos || []).forEach(p => {
        if (p.inicio) dates.push(dayjs(p.inicio));
        if (p.fim) dates.push(dayjs(p.fim));
      });
    });

    if (dates.length === 0) {
      showToast('Nenhuma data válida encontrada.', 'error');
      return;
    }

    const minM = dates.reduce((a, b) => a.isBefore(b) ? a : b).startOf('month');
    const maxM = dates.reduce((a, b) => a.isAfter(b) ? a : b).startOf('month');
    const allMonths = [];
    let cur = minM;
    while (cur.isBefore(maxM) || cur.isSame(maxM, 'month')) {
      allMonths.push(cur);
      cur = cur.add(1, 'month');
    }

    // ============================================================
    // MOSTRA MODAL PARA ESCOLHER NOME E MESES
    // ============================================================
    const result = await showExportNameModal(allMonths);
    if (!result) return; // Usuário cancelou

    const { name, selectedIndexes } = result;
    const months = selectedIndexes.map(idx => allMonths[idx]);

    if (months.length === 0) {
      showToast('Nenhum mês selecionado.', 'error');
      return;
    }

    showToast(`Gerando calendário (${months.length} meses)...`, 'info');

    const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    function getColor(t) {
      const g = t.grupoId ? groups.find(g => g.id === t.grupoId) : null;
      const statusColor = Store.STATUS_COLORS[t.status];
      if (t.status === 'Planejado' || t.status === 'Manutenção') {
        return g ? g.cor : (statusColor || '#1565c0');
      }
      return statusColor || (g ? g.cor : '#1565c0');
    }

    function rgba(hex, a) {
      if (!hex) return `rgba(46,125,50,${a})`;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }

    function getMonthColor(m) {
      const c = {};
      tasks.forEach(t => {
        (t.periodos || []).forEach(p => {
          if (!p.inicio || !p.fim) return;
          if (dayjs(p.fim).isBefore(m.startOf('month')) || dayjs(p.inicio).isAfter(m.endOf('month'))) return;
          const cor = getColor(t);
          c[cor] = (c[cor] || 0) + 1;
        });
      });
      const e = Object.entries(c);
      return e.length ? e.sort((a, b) => b[1] - a[1])[0][0] : '#2e7d32';
    }

    function renderMonth(m) {
      const mc = getMonthColor(m);
      const startDow = m.startOf('month').day();
      const dim = m.daysInMonth();
      const dowHdr = DOW.map(d => `
        <th style="background:${mc};color:#fff;padding:7px 4px;font-size:10px;font-weight:700;text-align:center;border:1px solid rgba(255,255,255,.2);width:14.28%">${d}</th>
      `).join('');

      let rows = '',
        row = '',
        col = 0;

      for (let i = 0; i < startDow; i++) {
        row += `<td style="background:${rgba(mc, .06)};border:1px solid #e8e8e8;vertical-align:top;height:70px;width:14.28%;padding:4px"></td>`;
        col++;
      }

      for (let day = 1; day <= dim; day++) {
        const date = m.date(day);
        const ds = date.format('YYYY-MM-DD');
        const isToday = date.isSame(dayjs().startOf('day'), 'day');
        const isWeekend = date.day() === 0 || date.day() === 6;
        const holName = typeof FERIADOS !== 'undefined' ? FERIADOS.get(ds) : null;
        const isHoliday = !!holName;

        const dayTasks = (isWeekend || isHoliday) ? [] : tasks.filter(t => {
          return (t.periodos || []).some(p => {
            if (!p.inicio || !p.fim) return false;
            const s = dayjs(p.inicio).startOf('day');
            const e = dayjs(p.fim).startOf('day');
            return !date.isBefore(s) && !date.isAfter(e);
          });
        });

        const taskHtml = dayTasks.map(t => {
          const isconcluído = t.status === 'Concluído';
          const isCancelado = t.status === 'Cancelado';
          const bCor = isconcluído ? '#2e7d32' : isCancelado ? '#c62828' : getColor(t);
          const resp = (t.responsaveis || []).join(', ');
          const grp = t.grupoId ? (groups.find(g => g.id === t.grupoId)?.nome || '') : '';

          const statusMap = {
            'Concluído': { icon: '✔ ', label: 'CONCLUÍDO', bg: '#2e7d32' },
            'Cancelado': { icon: '✖ ', label: 'CANCELADO', bg: '#c62828' },
            'Em andamento': { icon: '', label: 'EM ANDAMENTO', bg: '#e65100' },
            'Planejado': { icon: '', label: 'PLANEJADO', bg: '#1565c0' },
            'Manutenção': { icon: '', label: 'MANUTENÇÃO', bg: '#6a1b9a' },
          };
          const sm = statusMap[t.status] || { icon: '', label: t.status.toUpperCase(), bg: bCor };
          const tag = `<span style="display:inline-block;padding:0 3px;background:${sm.bg};color:#fff;border-radius:2px;font-size:6px;font-weight:700;margin-left:3px;vertical-align:middle">${sm.icon}${sm.label}</span>`;

          return `<div style="margin:1px 0;padding:2px 4px;background:${rgba(bCor, .13)};border-left:3px solid ${bCor};border-radius:2px;font-size:7.5px;line-height:1.35;word-break:break-word">
            ${grp ? `<span style="color:${bCor};font-weight:700;font-size:6.5px;text-transform:uppercase">${escHtml(grp)}</span><br>` : ''}
            <span style="font-weight:700">${escHtml(t.nome)}</span>${tag}
            ${resp ? `<br><span style="color:#546e7a;font-size:7px">${escHtml(resp)}</span>` : ''}
          </div>`;
        }).join('');

        const holHtml = isHoliday ? `
          <div style="margin:1px 0;padding:2px 4px;background:#ffebee;border-left:3px solid #c62828;border-radius:2px;font-size:7.5px;font-weight:700;color:#c62828">🎉 ${escHtml(holName.toUpperCase())}</div>
        ` : '';

        const bg = isHoliday ? '#fff5f5' : isToday ? rgba(mc, .18) : isWeekend ? rgba(mc, .08) : '#fff';
        const dnBg = isToday ? mc : 'transparent';
        const dnC = isHoliday ? '#c62828' : isToday ? '#fff' : isWeekend ? mc : '#263238';

        row += `<td style="background:${bg};border:1px solid #e0e0e0;vertical-align:top;height:70px;width:14.28%;padding:4px">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${dnBg};font-size:11px;font-weight:${isToday ? '800' : '500'};color:${dnC};margin-bottom:2px">${day}</div>
          ${holHtml}${taskHtml}
        </td>`;

        col++;
        if (col === 7 || day === dim) {
          if (day === dim && col < 7) {
            for (let x = col; x < 7; x++) {
              row += `<td style="background:${rgba(mc, .06)};border:1px solid #e8e8e8;height:70px"></td>`;
            }
          }
          rows += `<tr>${row}</tr>`;
          row = '';
          col = 0;
        }
      }

      return `<div style="font-family:Inter,Arial,sans-serif;background:#fff;padding:16px 20px;width:1122px;box-sizing:border-box">
        <div style="display:flex;align-items:flex-end;gap:10px;margin-bottom:8px">
          <span style="font-size:32px;font-weight:900;color:${mc};line-height:1;letter-spacing:-1px">${capitalizeFirst(m.format('MMMM')).toUpperCase()}</span>
          <span style="font-size:28px;font-weight:300;color:#546e7a;line-height:1">${m.format('YYYY')}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed">
          <thead><tr>${dowHdr}</tr></thead><tbody>${rows}</tbody>
        </table>
      </div>`;
    }

    // ============================================================
    // GERAR CABEÇALHO
    // ============================================================
    const hdrDiv = document.createElement('div');
    hdrDiv.style.cssText = 'position:fixed;left:-9999px;top:0;width:1122px';
    hdrDiv.innerHTML = _buildHeader(title);
    document.body.appendChild(hdrDiv);
    await new Promise(r => setTimeout(r, 100));

    let hdrCanvas;
    try {
      hdrCanvas = await html2canvas(hdrDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#1a1a2e',
        width: 1122,
        height: hdrDiv.scrollHeight
      });
    } catch (err) {
      console.error('Erro ao gerar cabeçalho:', err);
      document.body.removeChild(hdrDiv);
      showToast('Erro ao gerar calendário.', 'error');
      return;
    }
    document.body.removeChild(hdrDiv);

    // ============================================================
    // GERAR APENAS OS MESES SELECIONADOS
    // ============================================================
    const renderPromises = months.map(async (m) => {
      const tmp = document.createElement('div');
      tmp.style.cssText = 'position:fixed;left:-9999px;top:0';
      tmp.innerHTML = renderMonth(m);
      document.body.appendChild(tmp);
      await new Promise(r => setTimeout(r, 80));

      try {
        const c = await html2canvas(tmp, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#fff',
          width: 1122,
          height: tmp.scrollHeight
        });
        document.body.removeChild(tmp);
        return { canvas: c, height: c.height };
      } catch (err) {
        document.body.removeChild(tmp);
        return null;
      }
    });

    const results = await Promise.all(renderPromises);
    const monthData = results.filter(r => r !== null);

    if (monthData.length === 0) {
      showToast('Erro ao gerar os meses.', 'error');
      return;
    }

    // ============================================================
    // MONTAR IMAGEM FINAL
    // ============================================================
    const totalW = Math.max(hdrCanvas.width, ...monthData.map(d => d.canvas.width));
    const totalH = hdrCanvas.height + monthData.reduce((s, d) => s + d.canvas.height, 0);

    const final = document.createElement('canvas');
    final.width = totalW;
    final.height = totalH;
    const ctx = final.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, totalW, totalH);
    ctx.drawImage(hdrCanvas, 0, 0);

    let yy = hdrCanvas.height;
    monthData.forEach(d => {
      ctx.drawImage(d.canvas, 0, yy);
      yy += d.canvas.height;
    });

    // ============================================================
    // BAIXAR COM O NOME ESCOLHIDO
    // ============================================================
    const link = document.createElement('a');
    const safeName = name.replace(/[^a-zA-Z0-9 \-_]/g, '');
    link.download = safeName + '.jpeg';
    link.href = final.toDataURL('image/jpeg', 0.95);
    link.click();

    showToast(`Calendário exportado! (${monthData.length} meses)`, 'success');

  } catch (err) {
    console.error('Erro:', err);
    showToast('Erro: ' + err.message, 'error');
  }
}

/* ================================================================
   EXPORTAR COMO HTML - Cronograma interativo
   ================================================================ */
function exportarHTML() {
  try {
    const title = document.getElementById('pageTitle')?.textContent?.trim() || 'CRONOGRAMA DE ATIVIDADES';
    
    const tasks = Store.getTasks().filter(t => {
      if (t.hidden) return false;
      if (t.grupoId && Store.getGroup(t.grupoId)?.hidden) return false;
      return (t.periodos || []).some(p => p.inicio && p.fim);
    });
    const groups = Store.getGroups();
    const roster = Store.getRoster();

    if (tasks.length === 0) {
      showToast('Nenhuma atividade para exportar.', 'error');
      return;
    }

    const htmlContent = buildHTMLPage(title, tasks, groups, roster);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = title.replace(/[^a-zA-Z0-9]/g, '_') + '_Cronograma.html';
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('HTML exportado com sucesso!', 'success');
  } catch (err) {
    console.error('Erro ao exportar HTML:', err);
    showToast('Erro ao exportar: ' + err.message, 'error');
  }
}

/* ================================================================
   CONSTRUTOR DA PÁGINA HTML
   ================================================================ */
function buildHTMLPage(title, tasks, groups, roster) {
  var obj = {
    title: title || 'CRONOGRAMA DE ATIVIDADES',
    tasks: tasks.map(function(t) {
      return {
        id: t.id, nome: t.nome||'', grupoId: t.grupoId||null,
        responsaveis: t.responsaveis||[],
        periodos: (t.periodos||[]).filter(function(p){return p.inicio&&p.fim;}),
        status: t.status||'Planejado', pct: t.pct||0,
        local: t.local||'', tipo: t.tipo||'', obs: t.obs||''
      };
    }).filter(function(t){return t.periodos.length > 0;}),
    groups: groups.map(function(g){
      return {id:g.id,nome:g.nome||'',cor:g.cor||'#2e7d32',responsavel:g.responsavel||''};
    }),
    roster: roster||[]
  };

  var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  var ts  = dayjs().format('DD/MM/YYYY HH:mm');
  var ttl = escHtml(title||'CRONOGRAMA DE ATIVIDADES');

  var html = '';
  html += '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n';
  html += '<meta charset="UTF-8"/>\n';
  html += '<meta name="viewport" content="width=device-width,initial-scale=1.0"/>\n';
  html += '<title>' + ttl + '</title>\n';
  html += '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>\n';
  html += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css"/>\n';
  html += '<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"><\/script>\n';
  html += '<style>\n';
  html += '*{margin:0;padding:0;box-sizing:border-box}\n';
  html += 'body{font-family:Inter,Arial,sans-serif;background:#f5f5f5;padding:16px;color:#263238;font-size:13px}\n';
  html += '.w{max-width:100%;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.1);padding:20px;overflow:hidden}\n';
  html += '.hdr{background:#1a1a2e;color:#fff;padding:14px 24px;margin:-20px -20px 20px;border-radius:8px 8px 0 0;display:flex;align-items:center;gap:16px}\n';
  html += '.hdr h1{font-size:18px;font-weight:700;flex:1;text-align:center;letter-spacing:.5px}\n';
  html += '.hdr small{font-size:10px;color:#90a4ae;white-space:nowrap}\n';
  html += '.fi{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px;background:#f8f8f8;border-radius:6px;border:1px solid #e0e0e0;margin-bottom:16px}\n';
  html += '.fi label{font-size:11px;font-weight:600;color:#666;display:flex;align-items:center;gap:4px}\n';
  html += '.fi input,.fi select{padding:5px 9px;border:1px solid #ddd;border-radius:4px;font-size:12px;outline:none}\n';
  html += '.fi button{padding:6px 14px;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600}\n';
  html += '.bf{background:#2e7d32;color:#fff}.bc{background:#e53935;color:#fff}.bp{background:#1565c0;color:#fff}\n';
  html += '.vt{display:flex;gap:4px;margin-left:8px}\n';
  html += '.vt button{padding:6px 14px;border:1px solid #ddd;background:#fff;color:#666;font-size:11px;font-weight:600;cursor:pointer;border-radius:4px}\n';
  html += '.vt button.active{background:#1565c0;color:#fff;border-color:#1565c0}\n';
  html += '.cnt{margin-left:auto;font-size:12px;color:#666}\n';
  // tabela
  html += 'table.tbl{width:100%;border-collapse:collapse;font-size:13px}\n';
  html += 'table.tbl th{background:#263238;color:#fff;padding:9px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}\n';
  html += '.tbl .gr td{background:#eceff1;font-weight:700;padding:8px 12px;font-size:12px;border-bottom:2px solid #cfd8dc}\n';
  html += '.tbl .tr td{padding:7px 12px;border-bottom:1px solid #f0f0f0;vertical-align:top}\n';
  html += '.tbl .tr:hover{background:#fffde7;cursor:pointer}\n';
  html += '.sb{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;color:#fff}\n';
  html += '.sp{background:#1565c0}.sa{background:#e65100}.sc{background:#2e7d32}.sx{background:#c62828}.sm{background:#6a1b9a}\n';
  html += '.pt{display:inline-block;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:3px;padding:2px 6px;font-size:11px;margin:1px}\n';
  html += '.ptm{background:#e8eaf6!important;border-color:#9fa8da!important}\n';
  html += '.pe{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;color:#fff;margin:1px}\n';
  // calendário
  html += '.cal-month{margin-bottom:32px}\n';
  html += '.cal-mhdr{display:flex;align-items:flex-end;gap:10px;margin-bottom:8px}\n';
  html += '.cal-mname{font-size:28px;font-weight:900;line-height:1;letter-spacing:-1px;text-transform:uppercase}\n';
  html += '.cal-myear{font-size:24px;font-weight:300;color:#546e7a;line-height:1}\n';
  html += '.cal-grid{width:100%;border-collapse:collapse;table-layout:fixed}\n';
  html += '.cal-grid th{color:#fff;padding:7px 4px;font-size:10px;font-weight:700;text-align:center;border:1px solid rgba(255,255,255,.2)}\n';
  html += '.cal-grid td{border:1px solid #e0e0e0;vertical-align:top;height:78px;padding:4px;width:14.28%}\n';
  html += '.cal-dn{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-size:11px;margin-bottom:2px}\n';
  html += '.cal-ev{margin:1px 0;padding:2px 4px;border-radius:2px;font-size:7.5px;line-height:1.35;word-break:break-word;cursor:pointer}\n';
  html += '.cal-ev-grp{font-weight:700;font-size:6.5px;text-transform:uppercase;display:block}\n';
  html += '.cal-ev-nome{font-weight:700}\n';
  html += '.cal-ev-resp{color:#546e7a;font-size:7px;display:block}\n';
  html += '.cal-ev-tag{display:inline-block;padding:0 3px;color:#fff;border-radius:2px;font-size:6px;font-weight:700;margin-left:3px;vertical-align:middle}\n';
  // gantt
  html += '.gantt-wrap{overflow-x:auto;border:1px solid #e0e0e0;border-radius:6px}\n';
  html += '.gantt-layout{display:flex;min-width:max-content}\n';
  html += '.gantt-left-col{width:220px;min-width:220px;flex-shrink:0;border-right:2px solid #cfd8dc;position:sticky;left:0;z-index:10;background:#fff}\n';
  html += '.gantt-left-col .gl-hdr{background:#263238;color:#90a4ae;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:5px 8px;height:58px;display:flex;align-items:flex-end}\n';
  html += '.gantt-right{flex:1;overflow:visible}\n';
  html += '.gantt-hdr{position:sticky;top:0;z-index:5;background:#263238;color:#eceff1;user-select:none}\n';
  html += '.gantt-hdr-months{display:flex;height:30px;border-bottom:1px solid #37474f}\n';
  html += '.gantt-hdr-month{display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-right:1px solid #37474f;white-space:nowrap;overflow:hidden}\n';
  html += '.gantt-hdr-days{display:flex;height:28px}\n';
  html += '.ghd{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-size:10px;font-weight:600;color:#90a4ae;border-right:1px solid #37474f;flex-shrink:0}\n';
  html += '.ghd.wk{background:#263238;color:#ef9a9a}\n';
  html += '.ghd.hol{background:#ffebee!important;color:#c62828!important;font-weight:700}\n';
  html += '.ghd.td{background:#2e7d32!important;color:#fff!important;font-weight:700}\n';
  html += '.ghd.ms{border-left:1.5px solid rgba(255,255,255,.3)!important}\n';
  html += '.gantt-body{}\n';
  html += '.gantt-row{display:flex;height:38px;border-bottom:1px solid #f0f0f0;position:relative}\n';
  html += '.gantt-row.grow{height:28px;background:#f5f7f8;border-bottom:1px solid #e0e0e0}\n';
  html += '.gantt-row-name{width:220px;min-width:220px;padding:0 8px;display:flex;align-items:center;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-right:2px solid #cfd8dc;position:sticky;left:0;z-index:2;background:#fff;flex-shrink:0}\n';
  html += '.gantt-row.grow .gantt-row-name{background:#f5f7f8;font-weight:700}\n';
  html += '.gantt-row-chart{position:relative;flex:1;display:flex}\n';
  html += '.gcell{height:100%;border-right:1px solid #e0e0e0;flex-shrink:0}\n';
  html += '.gcell.wk{background-image:repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 6px);background-color:#eceff1}\n';
  html += '.gcell.hol{background-image:repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(198,40,40,0.12) 3px,rgba(198,40,40,0.12) 6px);background-color:#fff5f5}\n';
  html += '.gcell.td{background:rgba(46,125,50,.06);border-right:1px solid rgba(46,125,50,.2)}\n';
  html += '.gcell.ms{border-left:1.5px solid rgba(0,0,0,.18)!important}\n';
  html += '.gbar{position:absolute;top:50%;transform:translateY(-50%);height:18px;border-radius:3px;opacity:.92;z-index:3}\n';
  html += '.gbar-grp{height:10px;opacity:.4;border-radius:2px}\n';
  html += '.gbar-lbl{position:absolute;top:50%;transform:translateY(-50%);font-size:9.5px;font-weight:600;white-space:nowrap;z-index:4;padding-left:4px;pointer-events:none}\n';
  html += '.gnrow{left:0;position:absolute;top:50%;transform:translateY(-50%);font-size:10px;font-weight:700;color:#0d47a1;white-space:nowrap;max-width:210px;overflow:hidden;text-overflow:ellipsis}\n';
  html += '.ft{text-align:center;font-size:11px;color:#90a4ae;padding:12px;margin-top:16px;border-top:1px solid #eee}\n';
  html += '@media print{.fi{display:none}.vt{display:none}.w{box-shadow:none;padding:0}.hdr{border-radius:0}}\n';
  html += '</style>\n</head>\n<body>\n';
  html += '<div class="w">\n';
  html += '<div class="hdr"><h1>' + ttl + '</h1><small>Gerado em ' + ts + '</small></div>\n';
  html += '<div class="fi">\n';
  html += '<label>Inicio: <input type="date" id="fs"/></label>\n';
  html += '<label>Fim: <input type="date" id="fe"/></label>\n';
  html += '<label>Status: <select id="fst"><option value="">Todos</option>';
  html += '<option value="Planejado">Planejado</option>';
  html += '<option value="Em andamento">Em andamento</option>';
  html += '<option value="Conclu\u00eddo">Conclu\u00eddo</option>';
  html += '<option value="Cancelado">Cancelado</option>';
  html += '<option value="Manuten\u00e7\u00e3o">Manuten\u00e7\u00e3o</option>';
  html += '</select></label>\n';
  html += '<label>Buscar: <input type="text" id="fb" placeholder="Nome ou responsavel..."/></label>\n';
  html += '<button class="bf" onclick="render()">Filtrar</button>\n';
  html += '<button class="bc" onclick="limpar()">Limpar</button>\n';
  html += '<button class="bp" onclick="window.print()">Imprimir</button>\n';
  html += '<span class="vt">';
  html += '<button id="vtTable" class="active" onclick="setView(\'table\')"><i class="fas fa-list"></i> Tabela</button>';
  html += '<button id="vtCal" onclick="setView(\'cal\')"><i class="fas fa-calendar-alt"></i> Calendario</button>';
  html += '<button id="vtGantt" class="" onclick="setView(\'gantt\')"><i class="fas fa-stream"></i> Gantt</button>';
  html += '</span>\n';
  html += '<span class="cnt" id="cnt">0 atividades</span>\n';
  html += '</div>\n';
  html += '<div id="viewTable"><table class="tbl"><thead><tr>';
  html += '<th style="width:30%">Atividade</th><th style="width:27%">Periodos</th>';
  html += '<th style="width:11%">Status</th><th style="width:20%">Equipe</th><th style="width:12%">Local</th>';
  html += '</tr></thead><tbody id="tb"></tbody></table></div>\n';
  html += '<div id="viewCal" style="display:none"></div>\n';
  html += '<div id="viewGantt" style="display:none"></div>\n';
  html += '<div class="ft">Gerado em ' + ts + ' &bull; Use Imprimir para salvar PDF</div>\n';
  html += '</div>\n';

  // ── JS inline ──
  html += '<script>\n';
  html += 'var _b="' + b64 + '";\n';
  html += 'var DATA=JSON.parse(decodeURIComponent(escape(atob(_b))));\n';
  html += 'var FERIADOS={"2025-01-01": "Ano Novo", "2025-04-21": "Tiradentes", "2025-05-01": "Dia do Trabalho", "2025-09-07": "Independ\u00eancia do Brasil", "2025-10-12": "Nossa Senhora Aparecida", "2025-11-02": "Finados", "2025-11-15": "Proclama\u00e7\u00e3o da Rep\u00fablica", "2025-11-20": "Consci\u00eancia Negra", "2025-12-25": "Natal", "2026-01-01": "Ano Novo", "2026-04-21": "Tiradentes", "2026-05-01": "Dia do Trabalho", "2026-09-07": "Independ\u00eancia do Brasil", "2026-10-12": "Nossa Senhora Aparecida", "2026-11-02": "Finados", "2026-11-15": "Proclama\u00e7\u00e3o da Rep\u00fablica", "2026-11-20": "Consci\u00eancia Negra", "2026-12-25": "Natal", "2027-01-01": "Ano Novo", "2027-04-21": "Tiradentes", "2027-05-01": "Dia do Trabalho", "2027-09-07": "Independ\u00eancia do Brasil", "2027-10-12": "Nossa Senhora Aparecida", "2027-11-02": "Finados", "2027-11-15": "Proclama\u00e7\u00e3o da Rep\u00fablica", "2027-11-20": "Consci\u00eancia Negra", "2027-12-25": "Natal", "2028-01-01": "Ano Novo", "2028-04-21": "Tiradentes", "2028-05-01": "Dia do Trabalho", "2028-09-07": "Independ\u00eancia do Brasil", "2028-10-12": "Nossa Senhora Aparecida", "2028-11-02": "Finados", "2028-11-15": "Proclama\u00e7\u00e3o da Rep\u00fablica", "2028-11-20": "Consci\u00eancia Negra", "2028-12-25": "Natal", "2025-03-04": "Carnaval", "2025-03-05": "Carnaval", "2025-04-18": "Sexta-feira Santa", "2025-06-19": "Corpus Christi", "2026-02-17": "Carnaval", "2026-02-18": "Carnaval", "2026-04-03": "Sexta-feira Santa", "2026-06-04": "Corpus Christi", "2027-02-09": "Carnaval", "2027-02-10": "Carnaval", "2027-03-26": "Sexta-feira Santa", "2027-05-27": "Corpus Christi", "2028-02-29": "Carnaval", "2028-03-01": "Carnaval", "2028-04-14": "Sexta-feira Santa", "2028-06-15": "Corpus Christi", "2029-02-13": "Carnaval", "2029-02-14": "Carnaval", "2029-03-30": "Sexta-feira Santa", "2029-05-31": "Corpus Christi"};';
  html += '\n';
  html += 'var DOW=["D","S","T","Q","Q","S","S"];\n';
  html += 'var PAL=["#2e7d32","#1565c0","#6a1b9a","#c62828","#e65100","#00695c","#4527a0","#283593","#558b2f","#ad1457"];\n';
  html += 'var _pc={};\n';
  html += 'function pc(n){if(!_pc[n])_pc[n]=PAL[Object.keys(_pc).length%PAL.length];return _pc[n];}\n';
  html += 'function fd(d){if(!d)return"-";return dayjs(d).format("DD/MM/YYYY");}\n';
  html += 'function sg(id){return DATA.groups.find(function(g){return g.id===id;})||null;}\n';
  html += 'function scls(s){var m={"Planejado":"sp","Em andamento":"sa","Conclu\u00eddo":"sc","Cancelado":"sx","Manuten\u00e7\u00e3o":"sm"};return m[s]||"sp";}\n';
  html += 'function rgba2(hex,a){if(!hex)return "rgba(46,125,50,"+a+")";var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return "rgba("+r+","+g+","+b+","+a+")";}\n';
  html += 'function getColor(t){var g=sg(t.grupoId);var smap={"Conclu\u00eddo":"#2e7d32","Cancelado":"#c62828","Em andamento":"#e65100"};if(smap[t.status])return smap[t.status];return(t.status==="Planejado"||t.status==="Manuten\u00e7\u00e3o")?(g?g.cor:"#1565c0"):(g?g.cor:"#1565c0");}\n';
  html += 'function isFeriado(ds){return FERIADOS[ds]||null;}\n';
  html += 'var currentView="table";\n';
  html += 'function setView(v){currentView=v;["Table","Cal","Gantt"].forEach(function(k){var btn=document.getElementById("vt"+k);if(btn)btn.className=v===k.toLowerCase()?"active":"";var el=document.getElementById("view"+k);if(el)el.style.display=v===k.toLowerCase()?"":"none";});render();}\n';
  html += 'function filterTasks(){\n';
  html += '  var fs=document.getElementById("fs").value;\n';
  html += '  var fe=document.getElementById("fe").value;\n';
  html += '  var fst=document.getElementById("fst").value;\n';
  html += '  var fb=document.getElementById("fb").value.toLowerCase();\n';
  html += '  return DATA.tasks.filter(function(t){\n';
  html += '    if(fst&&t.status!==fst)return false;\n';
  html += '    if(fb){var ok=t.nome.toLowerCase().indexOf(fb)>=0;if(!ok)ok=(t.responsaveis||[]).some(function(r){return r.toLowerCase().indexOf(fb)>=0;});if(!ok)ok=(t.local||"").toLowerCase().indexOf(fb)>=0;if(!ok)return false;}\n';
  html += '    if(fs||fe){var ok2=(t.periodos||[]).some(function(p){\n';
  html += '      if(!p.inicio||!p.fim)return false;\n';
  html += '      var s=dayjs(p.inicio),e=dayjs(p.fim);\n';
  html += '      if(fs&&e.isBefore(dayjs(fs)))return false;\n';
  html += '      if(fe&&s.isAfter(dayjs(fe)))return false;\n';
  html += '      return true;\n';
  html += '    });if(!ok2)return false;}\n';
  html += '    return true;\n';
  html += '  });\n';
  html += '}\n';
  html += 'function render(){var tasks=filterTasks();document.getElementById("cnt").textContent=tasks.length+" atividades";if(currentView==="table")renderTable(tasks);else if(currentView==="cal")renderCal(tasks);else renderGantt(tasks);}\n';

  // ── TABELA ──
  html += 'function renderTable(tasks){\n';
  html += '  var Q=String.fromCharCode(34);\n';
  html += '  var bg={};DATA.groups.forEach(function(g){bg[g.id]=[];});bg["__r"]=[];\n';
  html += '  tasks.forEach(function(t){var k=t.grupoId||"__r";if(!bg[k])bg[k]=[];bg[k].push(t);});\n';
  html += '  var h="";\n';
  html += '  DATA.groups.forEach(function(g){var gt=bg[g.id]||[];if(!gt.length)return;\n';
  html += '    h+=\'<tr class="gr"><td colspan="5"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:\'+g.cor+\';margin-right:6px;vertical-align:middle"></span>\'+g.nome+\'</td></tr>\';\n';
  html += '    gt.forEach(function(t){h+=rowHtml(t,g);});});\n';
  html += '  var rt=bg["__r"]||[];if(rt.length){h+=\'<tr class="gr"><td colspan="5">Sem grupo</td></tr>\';rt.forEach(function(t){h+=rowHtml(t,null);});}\n';
  html += '  if(!h)h=\'<tr><td colspan="5" style="text-align:center;padding:40px;color:#999">Nenhuma atividade encontrada.</td></tr>\';\n';
  html += '  document.getElementById("tb").innerHTML=h;\n';
  html += '}\n';
  html += 'function rowHtml(t,g){\n';
  html += '  var cor=g?g.cor:"#1565c0";\n';
  html += '  var per=(t.periodos||[]).map(function(p,i){var cl=(t.periodos.length>1)?"pt ptm":"pt";return\'<span class="\'+cl+\'">\'+fd(p.inicio)+" - "+fd(p.fim)+"</span>";}).join(" ");\n';
  html += '  var eq=(t.responsaveis||[]).map(function(r){return\'<span class="pe" style="background:\'+pc(r)+\'">\'+r+"</span>";}).join(" ");\n';
  html += '  return\'<tr class="tr" onclick="det(\\\'\'+t.id+\'\\\')">\'\n';
  html += '    +\'<td><span style="display:inline-block;width:3px;height:16px;background:\'+cor+\';border-radius:2px;vertical-align:middle;margin-right:6px"></span>\'+t.nome+(t.periodos.length>1?\' <span style="font-size:10px;color:#6a1b9a;font-weight:700">(\'+t.periodos.length+\'p)</span>\':"")+"</td>"\n';
  html += '    +\'<td>\'+per+\'</td>\'\n';
  html += '    +\'<td><span class="sb \'+scls(t.status)+\'">\'+t.status+\'</span></td>\'\n';
  html += '    +\'<td>\'+eq+\'</td>\'\n';
  html += '    +\'<td>\'+( t.local||"-")+\'</td></tr>\';\n';
  html += '}\n';

  // ── CALENDÁRIO ──
  html += 'function mkTag(t){var Q=String.fromCharCode(34);var sm={"Conclu\u00eddo":{ic:"\u2714 ",lb:"CONCLU\u00cdDO",bg:"#2e7d32"},"Cancelado":{ic:"\u2716 ",lb:"CANCELADO",bg:"#c62828"},"Em andamento":{ic:"",lb:"EM ANDAMENTO",bg:"#e65100"},"Planejado":{ic:"",lb:"PLANEJADO",bg:"#1565c0"},"Manuten\u00e7\u00e3o":{ic:"",lb:"MANUTEN\u00c7\u00c3O",bg:"#6a1b9a"}};var s=sm[t.status]||{ic:"",lb:t.status.toUpperCase(),bg:"#546e7a"};return "<span class="+Q+"cal-ev-tag"+Q+" style="+Q+"background:"+s.bg+Q+">"+s.ic+s.lb+"</span>";}\n';
  html += 'function getMonthColor(m,tasks){var c={};tasks.forEach(function(t){(t.periodos||[]).forEach(function(p){if(!p.inicio||!p.fim)return;if(dayjs(p.fim).isBefore(m.startOf("month"))||dayjs(p.inicio).isAfter(m.endOf("month")))return;var cor=getColor(t);c[cor]=(c[cor]||0)+1;});});var e=Object.entries(c);return e.length?e.sort(function(a,b){return b[1]-a[1];})[0][0]:"#2e7d32";}\n';
  html += 'function renderCal(tasks){\n';
  html += '  var cont=document.getElementById("viewCal");var Q=String.fromCharCode(34);\n';
  html += '  if(!tasks.length){cont.innerHTML="<div style="+Q+"text-align:center;padding:40px;color:#999"+Q+">Nenhuma atividade.</div>";return;}\n';
  html += '  var allD=[];tasks.forEach(function(t){(t.periodos||[]).forEach(function(p){if(p.inicio)allD.push(dayjs(p.inicio));if(p.fim)allD.push(dayjs(p.fim));});});\n';
  html += '  var fs=document.getElementById("fs").value;var fe=document.getElementById("fe").value;\n';
  html += '  var minM=fs?dayjs(fs).startOf("month"):allD.reduce(function(a,b){return a.isBefore(b)?a:b;}).startOf("month");\n';
  html += '  var maxM=fe?dayjs(fe).startOf("month"):allD.reduce(function(a,b){return a.isAfter(b)?a:b;}).startOf("month");\n';
  html += '  var months=[];var cur=minM;while(cur.isBefore(maxM)||cur.isSame(maxM,"month")){months.push(cur);cur=cur.add(1,"month");}\n';
  html += '  var DOWCAL=["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];var h="";\n';
  html += '  months.forEach(function(m){\n';
  html += '    var mc=getMonthColor(m,tasks);var dim=m.daysInMonth();var sd=m.startOf("month").day();\n';
  html += '    var dh="";DOWCAL.forEach(function(d){dh+="<th style="+Q+"background:"+mc+Q+">"+d+"</th>";});\n';
  html += '    var rows="";var row="";var col=0;\n';
  html += '    for(var i=0;i<sd;i++){row+="<td style="+Q+"background:"+rgba2(mc,.06)+Q+"></td>";col++;}\n';
  html += '    for(var day=1;day<=dim;day++){\n';
  html += '      var date=m.date(day);var isWk=date.day()===0||date.day()===6;var isTd=date.isSame(dayjs().startOf("day"),"day");\n';
  html += '      var inRange=(!fs||!date.isBefore(dayjs(fs)))&&(!fe||!date.isAfter(dayjs(fe)));\n';
  html += '      var dt=(!inRange||isWk)?[]:tasks.filter(function(t){return (t.periodos||[]).some(function(p){if(!p.inicio||!p.fim)return false;var s=dayjs(p.inicio).startOf("day"),e=dayjs(p.fim).startOf("day");return !date.isBefore(s)&&!date.isAfter(e);});});\n';
  html += '      var ev="";dt.forEach(function(t){var g=sg(t.grupoId);var bCor=getColor(t);var resp=(t.responsaveis||[]).join(", ");var grp=g?g.nome:"";var tag=mkTag(t);ev+="<div class="+Q+"cal-ev"+Q+" style="+Q+"background:"+rgba2(bCor,.13)+";border-left:3px solid "+bCor+Q+" onclick="+Q+"det(\'"+t.id+"\')"+Q+">"+(grp?"<span class="+Q+"cal-ev-grp"+Q+" style="+Q+"color:"+bCor+Q+">"+grp+"</span>":"")+"<span class="+Q+"cal-ev-nome"+Q+">"+t.nome+"</span>"+tag+(resp?"<span class="+Q+"cal-ev-resp"+Q+">"+resp+"</span>":"")+"</div>";});\n';
  html += '      var bg=isTd?rgba2(mc,.18):isWk?rgba2(mc,.08):"#fff";var dnBg=isTd?mc:"transparent";var dnC=isTd?"#fff":isWk?mc:"#263238";\n';
  html += '      row+="<td style="+Q+"background:"+bg+Q+"><div class="+Q+"cal-dn"+Q+" style="+Q+"background:"+dnBg+";color:"+dnC+";font-weight:"+(isTd?700:500)+Q+">"+day+"</div>"+ev+"</td>";\n';
  html += '      col++;if(col===7||day===dim){if(day===dim&&col<7)for(var x=col;x<7;x++)row+="<td style="+Q+"background:"+rgba2(mc,.06)+Q+"></td>";rows+="<tr>"+row+"</tr>";row="";col=0;}\n';
  html += '    }\n';
  html += '    h+="<div class="+Q+"cal-month"+Q+"><div class="+Q+"cal-mhdr"+Q+"><span class="+Q+"cal-mname"+Q+" style="+Q+"color:"+mc+Q+">"+m.format("MMMM")+"</span><span class="+Q+"cal-myear"+Q+">"+m.format("YYYY")+"</span></div>";\n';
  html += '    h+="<table class="+Q+"cal-grid"+Q+"><thead><tr>"+dh+"</tr></thead><tbody>"+rows+"</tbody></table></div>";\n';
  html += '  });\n';
  html += '  cont.innerHTML=h;\n';
  html += '}\n';

  // ── GANTT ──
  html += 'var CW=22;\n';
  html += 'function renderGantt(tasks){\n';
  html += '  var cont=document.getElementById("viewGantt");var Q=String.fromCharCode(34);\n';
  html += '  if(!tasks.length){cont.innerHTML="<div style="+Q+"text-align:center;padding:40px;color:#999"+Q+">Nenhuma atividade.</div>";return;}\n';
  html += '  // Calcular janela — respeita filtro de data\n';
  html += '  var fs=document.getElementById("fs").value;\n';
  html += '  var fe=document.getElementById("fe").value;\n';
  html += '  var allD=[];tasks.forEach(function(t){(t.periodos||[]).forEach(function(p){if(p.inicio)allD.push(dayjs(p.inicio));if(p.fim)allD.push(dayjs(p.fim));});});\n';
  html += '  var vStart=fs?dayjs(fs).startOf("day"):allD.reduce(function(a,b){return a.isBefore(b)?a:b;}).startOf("day").subtract(3,"day");\n';
  html += '  var vEnd=fe?dayjs(fe).startOf("day"):allD.reduce(function(a,b){return a.isAfter(b)?a:b;}).startOf("day").add(3,"day");\n';
  html += '  var nDays=Math.max(vEnd.diff(vStart,"day")+1,7);\n';
  html += '  var today=dayjs().startOf("day");\n';
  html += '  // Cabeçalho meses\n';
  html += '  var mths={};for(var di=0;di<nDays;di++){var d=vStart.add(di,"day");var k=d.format("YYYY-MM");if(!mths[k]){mths[k]={label:d.format("MMM YYYY").toUpperCase(),count:0};}mths[k].count++;}\n';
  html += '  var mHdr="";Object.values(mths).forEach(function(m){mHdr+="<div class="+Q+"gantt-hdr-month"+Q+" style="+Q+"width:"+(m.count*CW)+"px;min-width:"+(m.count*CW)+"px"+Q+">"+m.label+"</div>";});\n';
  html += '  // Cabeçalho dias\n';
  html += '  var dHdr="";for(var di=0;di<nDays;di++){\n';
  html += '    var d=vStart.add(di,"day");\n';
  html += '    var isWk=d.day()===0||d.day()===6;\n';
  html += '    var isTd=d.isSame(today,"day");\n';
  html += '    var isFer=!!isFeriado(d.format("YYYY-MM-DD"));\n';
  html += '    var isMs=d.date()===1;\n';
  html += '    var cls="ghd"+(isWk?" wk":"")+(isFer?" hol":"")+(isTd?" td":"")+(isMs?" ms":"");\n';
  html += '    dHdr+="<div class="+Q+cls+Q+" style="+Q+"width:"+CW+"px;min-width:"+CW+"px"+Q+"><span style="+Q+"font-size:8px;opacity:.7"+Q+">"+DOW[d.day()]+"</span><span>"+d.format("DD")+"</span></div>";\n';
  html += '  }\n';
  html += '  // Agrupar tarefas\n';
  html += '  var byG={};DATA.groups.forEach(function(g){byG[g.id]=[];});byG["__r"]=[];\n';
  html += '  tasks.forEach(function(t){var k=t.grupoId||"__r";if(!byG[k])byG[k]=[];byG[k].push(t);});\n';
  html += '  // Ordenar grupos por data mais antiga\n';
  html += '  var gOrder=DATA.groups.slice().sort(function(a,b){\n';
  html += '    var ta=byG[a.id]||[],tb=byG[b.id]||[];\n';
  html += '    if(!ta.length&&!tb.length)return 0;if(!ta.length)return 1;if(!tb.length)return -1;\n';
  html += '    function minD(ts2){var d=null;ts2.forEach(function(t2){(t2.periodos||[]).forEach(function(p){if(p.inicio&&(!d||p.inicio<d))d=p.inicio;});});return d;}\n';
  html += '    var da=minD(ta),db=minD(tb);if(!da&&!db)return 0;if(!da)return 1;if(!db)return -1;return da<db?-1:da>db?1:0;\n';
  html += '  });\n';
  html += '  // Células de uma linha (grade de dias)\n';
  html += '  function makeCells(){\n';
  html += '    var c="";for(var di=0;di<nDays;di++){\n';
  html += '      var d=vStart.add(di,"day");\n';
  html += '      var isWk=d.day()===0||d.day()===6;\n';
  html += '      var isTd=d.isSame(today,"day");\n';
  html += '      var isFer=!!isFeriado(d.format("YYYY-MM-DD"));\n';
  html += '      var isMs=d.date()===1;\n';
  html += '      var cls="gcell"+(isFer?" hol":isWk?" wk":"")+(isTd?" td":"")+(isMs?" ms":"");\n';
  html += '      c+="<div class="+Q+cls+Q+" style="+Q+"width:"+CW+"px;min-width:"+CW+"px"+Q+"></div>";\n';
  html += '    }return c;\n';
  html += '  }\n';
  html += '  // Barras de uma tarefa\n';
  html += '  function makeBars(t){\n';
  html += '    var cor=getColor(t);var bars="";\n';
  html += '    (t.periodos||[]).forEach(function(p){\n';
  html += '      if(!p.inicio||!p.fim)return;\n';
  html += '      var sOff=Math.max(dayjs(p.inicio).diff(vStart,"day"),0);\n';
  html += '      var eOff=Math.min(dayjs(p.fim).diff(vStart,"day"),nDays-1);\n';
  html += '      if(eOff<sOff)return;\n';
  html += '      var lft=sOff*CW+1;var wid=(eOff-sOff+1)*CW-2;\n';
  html += '      bars+="<div class="+Q+"gbar"+Q+" style="+Q+"left:"+lft+"px;width:"+wid+"px;background:"+cor+Q+"></div>";\n';
  html += '    });\n';
  html += '    // Label à direita da última barra\n';
  html += '    var pers=t.periodos.filter(function(p){return p.inicio&&p.fim;});\n';
  html += '    if(pers.length){\n';
  html += '      var lastOff=Math.min(dayjs(pers[pers.length-1].fim).diff(vStart,"day"),nDays-1);\n';
  html += '      var lblLeft=(lastOff+1)*CW+4;\n';
  html += '      var resp=(t.responsaveis||[]).join(", ");\n';
  html += '      var sCors={"Conclu\u00eddo":"#2e7d32","Cancelado":"#c62828","Em andamento":"#e65100","Planejado":"#1565c0","Manuten\u00e7\u00e3o":"#6a1b9a"};\n';
  html += '      var sCor=sCors[t.status]||"#546e7a";\n';
  html += '      bars+="<span class="+Q+"gbar-lbl"+Q+" style="+Q+"left:"+lblLeft+"px"+Q+">"\n';
  html += '        +(resp?"<span style="+Q+"color:#212121"+Q+">"+resp+"</span> ":"")\n';
  html += '        +"<span style="+Q+"font-weight:700;color:#212121"+Q+">"+t.nome+"</span> "\n';
  html += '        +"<span style="+Q+"display:inline-block;padding:1px 6px;background:"+sCor+";color:#fff;border-radius:3px;font-size:8px;font-weight:700"+Q+">"+t.status+"</span>"\n';
  html += '        +"</span>";\n';
  html += '    }\n';
  html += '    return bars;\n';
  html += '  }\n';
  html += '  // Montar HTML\n';
  html += '  var lRows="";var rRows="";\n';
  html += '  gOrder.forEach(function(g){\n';
  html += '    var gt=byG[g.id]||[];if(!gt.length)return;\n';
  html += '    // Linha grupo — nome\n';
  html += '    lRows+="<div class="+Q+"gantt-row grow"+Q+"><div class="+Q+"gantt-row-name"+Q+"><span style="+Q+"display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:"+g.cor+";color:#fff;font-size:9px;font-weight:700;margin-right:5px;flex-shrink:0"+Q+">"+g.nome.charAt(0)+"</span>"+g.nome+"</div></div>";\n';
  html += '    // Linha grupo — barra resumo\n';
  html += '    var allGD=[];gt.forEach(function(t){(t.periodos||[]).forEach(function(p){if(p.inicio)allGD.push(p.inicio);if(p.fim)allGD.push(p.fim);});});\n';
  html += '    var gBarHtml="";\n';
  html += '    if(allGD.length){var gS=allGD.reduce(function(a,b){return a<b?a:b;});var gE=allGD.reduce(function(a,b){return a>b?a:b;});var gsOff=Math.max(dayjs(gS).diff(vStart,"day"),0);var geOff=Math.min(dayjs(gE).diff(vStart,"day"),nDays-1);if(geOff>=gsOff){var gL=gsOff*CW+1;var gW=(geOff-gsOff+1)*CW-2;gBarHtml="<div class="+Q+"gbar gbar-grp"+Q+" style="+Q+"left:"+gL+"px;width:"+gW+"px;background:"+g.cor+Q+"></div>";}}\n';
  html += '    rRows+="<div class="+Q+"gantt-row grow"+Q+"><div class="+Q+"gantt-row-chart"+Q+">"+makeCells()+gBarHtml+"</div></div>";\n';
  html += '    // Tarefas\n';
  html += '    gt.sort(function(a,b){var da=(a.periodos[0]||{}).inicio||"";var db=(b.periodos[0]||{}).inicio||"";return da<db?-1:da>db?1:0;});\n';
  html += '    gt.forEach(function(t){\n';
  html += '      var cor=getColor(t);\n';
  html += '      lRows+="<div class="+Q+"gantt-row"+Q+"><div class="+Q+"gantt-row-name"+Q+"><span style="+Q+"display:inline-block;width:3px;height:16px;background:"+cor+";border-radius:2px;margin-right:5px;vertical-align:middle;flex-shrink:0"+Q+"></span>"+t.nome+"</div></div>";\n';
  html += '      rRows+="<div class="+Q+"gantt-row"+Q+"><div class="+Q+"gantt-row-chart"+Q+" style="+Q+"position:relative"+Q+">"+makeCells()+makeBars(t)+"</div></div>";\n';
  html += '    });\n';
  html += '  });\n';
  html += '  // Raízes\n';
  html += '  var roots=byG["__r"]||[];\n';
  html += '  if(roots.length){\n';
  html += '    lRows+="<div class="+Q+"gantt-row grow"+Q+"><div class="+Q+"gantt-row-name"+Q+">Sem grupo</div></div>";\n';
  html += '    rRows+="<div class="+Q+"gantt-row grow"+Q+"><div class="+Q+"gantt-row-chart"+Q+">"+makeCells()+"</div></div>";\n';
  html += '    roots.forEach(function(t){\n';
  html += '      lRows+="<div class="+Q+"gantt-row"+Q+"><div class="+Q+"gantt-row-name"+Q+">"+t.nome+"</div></div>";\n';
  html += '      rRows+="<div class="+Q+"gantt-row"+Q+"><div class="+Q+"gantt-row-chart"+Q+" style="+Q+"position:relative"+Q+">"+makeCells()+makeBars(t)+"</div></div>";\n';
  html += '    });\n';
  html += '  }\n';
  html += '  // Montar layout de duas colunas (left sticky + right scroll)\n';
  html += '  var totalW=(nDays*CW)+"px";\n';
  html += '  var ganttHtml="<div class="+Q+"gantt-wrap"+Q+">";\n';
  html += '  ganttHtml+="<div class="+Q+"gantt-layout"+Q+">";\n';
  html += '  // Coluna esquerda\n';
  html += '  ganttHtml+="<div class="+Q+"gantt-left-col"+Q+">";\n';
  html += '  ganttHtml+="<div class="+Q+"gantt-left-col"+Q+" style="+Q+"display:flex;flex-direction:column"+Q+">";\n';
  html += '  ganttHtml+="<div class="+Q+"gl-hdr"+Q+">ATIVIDADE</div>";\n';
  html += '  ganttHtml+="<div class="+Q+"gantt-body"+Q+">"+lRows+"</div>";\n';
  html += '  ganttHtml+="</div></div>";\n';
  html += '  // Coluna direita (header + body)\n';
  html += '  ganttHtml+="<div class="+Q+"gantt-right"+Q+" style="+Q+"overflow-x:auto"+Q+">";\n';
  html += '  ganttHtml+="<div class="+Q+"gantt-hdr"+Q+" style="+Q+"width:"+totalW+";min-width:"+totalW+Q+">";\n';
  html += '  ganttHtml+="<div class="+Q+"gantt-hdr-months"+Q+">"+mHdr+"</div>";\n';
  html += '  ganttHtml+="<div class="+Q+"gantt-hdr-days"+Q+">"+dHdr+"</div>";\n';
  html += '  ganttHtml+="</div>";\n';
  html += '  ganttHtml+="<div class="+Q+"gantt-body"+Q+" style="+Q+"width:"+totalW+";min-width:"+totalW+Q+">"+rRows+"</div>";\n';
  html += '  ganttHtml+="</div></div></div>";\n';
  html += '  cont.innerHTML=ganttHtml;\n';
  html += '}\n';

  // ── helpers ──
  html += 'function det(id){var t=DATA.tasks.find(function(x){return x.id===id;});if(!t)return;var per=(t.periodos||[]).map(function(p){return fd(p.inicio)+" - "+fd(p.fim);}).join(", ");alert(t.nome+"\\nPeriodos: "+per+"\\nEquipe: "+(t.responsaveis||[]).join(", ")+"\\nLocal: "+(t.local||"-")+"\\nStatus: "+t.status+(t.obs?"\\nObs: "+t.obs:""));}\n';
  html += 'function limpar(){document.getElementById("fs").value="";document.getElementById("fe").value="";document.getElementById("fst").value="";document.getElementById("fb").value="";render();}\n';
  html += 'document.addEventListener("DOMContentLoaded",function(){render();});\n';
  html += 'document.getElementById("fb").addEventListener("keydown",function(e){if(e.key==="Enter")render();});\n';
  html += '<\/script>\n</body>\n</html>';

  return html;
}

function renderDetalhesList() {
  const container = document.getElementById('detalhesList');
  if (!container) return;
  if (!_currentDetalhes.length) {
    container.innerHTML = '<div style="font-size:11px;color:#9e9e9e;padding:4px 0">Nenhuma linha. Clique em "+ Adicionar Linha".</div>';
    return;
  }
  container.innerHTML = _currentDetalhes.map((d, i) => `
    <div style="display:flex;gap:6px;align-items:center">
      <input type="text" value="${escHtml(d.data)}" placeholder="Data / Per\u00edodo (ex: 20/04/26)"
        style="flex:1;padding:6px 8px;border:1px solid #e0e0e0;border-radius:5px;font-size:12px"
        data-field="data" data-idx="${i}"/>
      <input type="text" value="${escHtml(d.descricao)}" placeholder="Descri\u00e7\u00e3o da atividade"
        style="flex:2;padding:6px 8px;border:1px solid #e0e0e0;border-radius:5px;font-size:12px"
        data-field="descricao" data-idx="${i}"/>
      <button type="button" style="padding:5px 8px;border:1px solid #ffcdd2;background:#ffebee;color:#c62828;border-radius:5px;cursor:pointer;font-size:11px;flex-shrink:0" data-rm="${i}">\u2715</button>
    </div>
  `).join('');
  container.querySelectorAll('input[data-field]').forEach(inp => {
    inp.addEventListener('input', () => {
      _currentDetalhes[parseInt(inp.dataset.idx)][inp.dataset.field] = inp.value;
    });
  });
  container.querySelectorAll('[data-rm]').forEach(btn => {
    btn.addEventListener('click', () => {
      _currentDetalhes.splice(parseInt(btn.dataset.rm), 1);
      renderDetalhesList();
    });
  });
}

async function gerarCronogramaDetalhado() {
  const task = _editingTaskId ? Store.getTask(_editingTaskId) : null;
  if (!task) { showToast('Salve a tarefa primeiro.', 'error'); return; }
  if (!_currentDetalhes.length) { showToast('Adicione ao menos uma linha.', 'error'); return; }
  showToast('Gerando cronograma...', 'info');
  if (!window.html2canvas) {
    await new Promise((res, rej) => {
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload=res; s.onerror=rej; document.head.appendChild(s);
    });
  }
  const grupo=task.grupoId?Store.getGroup(task.grupoId):null;
  const cor=grupo?grupo.cor:'#1565c0';
  const resp=(task.responsaveis||[]).join(', ')||'\u2014';
  const periodosStr = (task.periodos || []).map(p => 
    `${p.inicio ? dayjs(p.inicio).format('DD/MM/YY') : '\u2014'} a ${p.fim ? dayjs(p.fim).format('DD/MM/YY') : '\u2014'}`
  ).join(' | ');
  const dur = (task.periodos || []).reduce((acc, p) => {
    if (p.inicio && p.fim) {
      return acc + dayjs(p.fim).diff(dayjs(p.inicio), 'day') + 1;
    }
    return acc;
  }, 0) + ' dias';

  const linhasHtml=_currentDetalhes.map((d,i)=>
    `<tr style="background:${i%2===0?'#fff':'#f9f9f9'}">
      <td style="padding:9px 14px;border:1px solid #e0e0e0;font-size:12px;text-align:center;white-space:nowrap;width:28%">${escHtml(d.data)}</td>
      <td style="padding:9px 14px;border:1px solid #e0e0e0;font-size:12px">${escHtml(d.descricao)}</td>
    </tr>`
  ).join('');

  const LOGO='data:image/png;base64,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';

  const html=`<div style="font-family:Inter,Arial,sans-serif;background:#fff;width:900px;box-sizing:border-box">
    <div style="background:#1a1a2e;padding:12px 24px;display:flex;align-items:center;justify-content:space-between">
      <div style="font-size:22px;font-weight:700;color:#fff">${escHtml(grupo?grupo.nome:task.nome)}</div>
      <div style="background:#fff;border-radius:6px;padding:4px 8px;display:flex;align-items:center"><img src="${LOGO}" style="height:30px;object-fit:contain"/></div>
    </div>
    <div style="background:${cor};padding:14px 24px;display:flex;align-items:center">
      <div style="font-size:18px;font-weight:800;color:#fff">${escHtml(task.nome)}</div>
    </div>
    <div style="display:flex;border-bottom:2px solid #e0e0e0">
      <div style="flex:1;padding:12px 20px;text-align:center;border-right:1px solid #e0e0e0">
        <div style="font-size:9px;color:#78909c;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Per\u00edodos</div>
        <div style="font-size:12px;font-weight:700;color:#263238">${periodosStr || '\u2014'}</div>
      </div>
      <div style="flex:1;padding:12px 20px;text-align:center;border-right:1px solid #e0e0e0">
        <div style="font-size:9px;color:#78909c;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Dura\u00e7\u00e3o Total</div>
        <div style="font-size:13px;font-weight:700;color:#263238">${dur}</div>
      </div>
      <div style="flex:1;padding:12px 20px;text-align:center">
        <div style="font-size:9px;color:#78909c;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Equipe</div>
        <div style="font-size:13px;font-weight:700;color:#263238">${escHtml(resp)}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:${cor}">
          <th style="padding:10px 14px;font-size:12px;font-weight:700;color:#fff;border:1px solid rgba(255,255,255,.2);width:28%;text-align:center">Data / Per\u00edodo</th>
          <th style="padding:10px 14px;font-size:12px;font-weight:700;color:#fff;border:1px solid rgba(255,255,255,.2);text-align:center">Atividade</th>
        </tr>
      </thead>
      <tbody>${linhasHtml}</tbody>
    </table>
  </div>`;

  const tmp=document.createElement('div');
  tmp.style.cssText='position:fixed;left:-9999px;top:0';
  tmp.innerHTML=html;
  document.body.appendChild(tmp);
  await new Promise(r=>setTimeout(r,200));
  const canvas=await html2canvas(tmp,{scale:2,useCORS:true,backgroundColor:'#fff',width:900,height:tmp.scrollHeight});
  document.body.removeChild(tmp);
  const link=document.createElement('a');
  link.download=task.nome.replace(/[^a-zA-Z0-9]/g,'_')+'_Cronograma.png';
  link.href=canvas.toDataURL('image/png');
  link.click();
  showToast('Cronograma gerado!','success');
}

/* ================================================================
   EDITAR COLABORADOR
   ================================================================ */
function openEditColaborador(person) {
  const overlay=document.createElement('div');
  overlay.className='modal-overlay open';
  overlay.innerHTML=`
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2><i class="fas fa-user-edit" style="color:var(--primary)"></i> Editar Colaborador</h2>
        <button class="modal-close" id="editColabClose"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Nome do Colaborador *</label>
          <input type="text" id="editColabNome" value="${escHtml(person)}" autocomplete="off"/>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-danger-sm" id="editColabDelete"><i class="fas fa-trash"></i> Remover</button>
        <div style="flex:1"></div>
        <button class="btn-outline" id="editColabCancel">Cancelar</button>
        <button class="btn-primary" id="editColabSave"><i class="fas fa-save"></i> Salvar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const input=document.getElementById('editColabNome');
  setTimeout(()=>{input.focus();input.select();},80);
  const close=()=>overlay.remove();
  document.getElementById('editColabClose')?.addEventListener('click',close);
  document.getElementById('editColabCancel')?.addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  document.getElementById('editColabDelete')?.addEventListener('click',()=>{
    if(!confirm(`Remover "${person}" da equipe?`))return;
    Store.removeFromRoster(person);Store.save();close();renderEquipe();Gantt.refresh();
    showToast(`"${person}" removido.`,'');
  });
  document.getElementById('editColabSave')?.addEventListener('click',()=>{
    const newName=document.getElementById('editColabNome').value.trim();
    if(!newName){showToast('Informe o nome.','error');return;}
    if(newName===person){close();return;}
    const ok=Store.updateRoster(person,newName);
    if(!ok){showToast('Nome j\u00e1 existe ou inv\u00e1lido.','error');return;}
    Store.save();close();renderEquipe();Gantt.refresh();
    showToast(`Renomeado para "${newName}"!`,'success');
  });
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter')document.getElementById('editColabSave').click();
    if(e.key==='Escape')close();
  });
}
