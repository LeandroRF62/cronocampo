/* ================================================================
   data.js – Estrutura de dados central do CronoCampo v2
   Grupos/Ramais, múltiplos responsáveis, undo/redo, import/export
   ================================================================ */

/* ---- Paleta de cores ---- */
const PALETTE = [
  '#2e7d32','#1565c0','#6a1b9a','#c62828','#e65100',
  '#00695c','#4527a0','#283593','#558b2f','#ad1457',
  '#0277bd','#f57f17'
];

const STATUS_COLORS = {
  'Planejado':    '#1565c0',
  'Em andamento': '#e65100',
  'Concluído':    '#2e7d32',
  'Cancelado':    '#c62828',
  'Manutenção':   '#6a1b9a',
};

/* ================================================================
   DATA STORE
   ================================================================ */
const Store = (() => {
  let _groups  = [];   // { id, edt, nome, responsavel, cor, collapsed }
  let _tasks   = [];   // { id, edt, grupoId, nome, responsaveis[], periodos:[{inicio, fim}], status, pct, local, tipo, obs }
  let _people  = [];   // known people (auto-built from tasks)
  let _roster  = [];   // colaboradores manuais da aba Equipe
  let _personColors = {};
  let _showHidden = false;

  /* ---- Undo / Redo ---- */
  let _undoStack = [];
  let _redoStack = [];
  const MAX_UNDO = 50;

  function _snapshot() {
    return JSON.stringify({ groups: _groups, tasks: _tasks });
  }

  function pushUndo() {
    _undoStack.push(_snapshot());
    if (_undoStack.length > MAX_UNDO) _undoStack.shift();
    _redoStack = [];
    _updateUndoBtns();
  }

  function undo() {
    if (!_undoStack.length) return false;
    _redoStack.push(_snapshot());
    const prev = JSON.parse(_undoStack.pop());
    _groups = prev.groups;
    _tasks  = prev.tasks;
    _rebuildPeople();
    _updateUndoBtns();
    return true;
  }

  function redo() {
    if (!_redoStack.length) return false;
    _undoStack.push(_snapshot());
    const next = JSON.parse(_redoStack.pop());
    _groups = next.groups;
    _tasks  = next.tasks;
    _rebuildPeople();
    _updateUndoBtns();
    return true;
  }

  function _updateUndoBtns() {
    const u = document.getElementById('btnUndo');
    const r = document.getElementById('btnRedo');
    if (u) u.disabled = !_undoStack.length;
    if (r) r.disabled = !_redoStack.length;
  }

  /* ---- ROSTER (colaboradores manuais da aba Equipe) ---- */
  function getRoster() { return [..._roster]; }

  function addToRoster(name) {
    const clean = (name || '').trim();
    if (!clean || _roster.includes(clean)) return false;
    _roster.push(clean);
    _roster.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    if (!_personColors[clean]) {
      _personColors[clean] = PALETTE[Object.keys(_personColors).length % PALETTE.length];
    }
    return true;
  }

  function removeFromRoster(name) {
    _roster = _roster.filter(r => r !== name);
  }

  /* ---- People ---- */
  function _rebuildPeople() {
    const names = new Set();
    _tasks.forEach(t => (t.responsaveis || []).forEach(n => names.add(n)));
    _groups.forEach(g => { if (g.responsavel) names.add(g.responsavel); });
    _people = [...names].sort();
    _people.forEach((p, i) => { if (!_personColors[p]) _personColors[p] = PALETTE[i % PALETTE.length]; });
  }

  function getPersonColor(name) {
    if (!_personColors[name]) {
      _personColors[name] = PALETTE[_people.length % PALETTE.length];
    }
    return _personColors[name];
  }

  function personInitials(name) {
    return (name || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  }

  /* ---- GROUPS ---- */
  function getGroups()           { return _groups; }
  function getGroup(id)          { return _groups.find(g => g.id === id); }

  function addGroup(data) {
    pushUndo();
    const g = {
      id:          data.id          || genId(),
      edt:         data.edt         || '',
      nome:        data.nome        || 'Novo Grupo',
      responsavel: data.responsavel || '',
      cor:         data.cor         || PALETTE[_groups.length % PALETTE.length],
      collapsed:   false,
    };
    _groups.push(g);
    _rebuildPeople();
    return g;
  }

  function updateGroup(id, data) {
    pushUndo();
    const idx = _groups.findIndex(g => g.id === id);
    if (idx === -1) return null;
    _groups[idx] = { ..._groups[idx], ...data };
    _rebuildPeople();
    return _groups[idx];
  }

  function deleteGroup(id) {
    pushUndo();
    _groups = _groups.filter(g => g.id !== id);
    // Move tasks to root
    _tasks.forEach(t => { if (t.grupoId === id) t.grupoId = null; });
    _rebuildPeople();
  }

  function toggleGroupCollapse(id) {
    const g = _groups.find(g => g.id === id);
    if (g) g.collapsed = !g.collapsed;
  }

  function collapseAll()  { _groups.forEach(g => g.collapsed = true); }
  function expandAll()    { _groups.forEach(g => g.collapsed = false); }

  /* ---- TASKS ---- */
  function getTasks()            { return _tasks; }
  function getTask(id)           { return _tasks.find(t => t.id === id); }
  function getTasksByGroup(gId)  { return _tasks.filter(t => t.grupoId === (gId || null)); }

  function addTask(data) {
    pushUndo();
    const t = _normalizeTask({ id: genId(), ...data });
    _tasks.push(t);
    _rebuildPeople();
    return t;
  }

  function updateTask(id, data) {
    pushUndo();
    const idx = _tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    _tasks[idx] = _normalizeTask({ ..._tasks[idx], ...data });
    _rebuildPeople();
    return _tasks[idx];
  }

  function deleteTask(id) {
    pushUndo();
    _tasks = _tasks.filter(t => t.id !== id);
    _rebuildPeople();
  }

  function _normalizeTask(t) {
    t.responsaveis = t.responsaveis || [];
    t.status  = t.status  || 'Planejado';
    t.pct     = parseInt(t.pct) || 0;
    t.grupoId = t.grupoId || null;
    
    // Normalizar períodos
    if (t.periodos && Array.isArray(t.periodos) && t.periodos.length > 0) {
      t.periodos = t.periodos.map(p => ({
        inicio: normalizeDate(p.inicio),
        fim: normalizeDate(p.fim)
      })).filter(p => p.inicio && p.fim);
    } else {
      // Converter campos antigos para períodos
      t.periodos = [];
      if (t.inicio && t.fim) {
        t.periodos.push({ inicio: normalizeDate(t.inicio), fim: normalizeDate(t.fim) });
      }
      // Manter inicio/fim sincronizados para compatibilidade
      t.inicio = t.periodos[0]?.inicio || null;
      t.fim    = t.periodos[t.periodos.length-1]?.fim || null;
    }
    return t;
  }

  function normalizeDate(d) {
    if (!d) return null;
    if (typeof d === 'string' && d.includes('/')) {
      const parsed = parseDateBR(d);
      return parsed || d;
    }
    return d;
  }

  /* ---- Date helpers ---- */
  function parseDateBR(s) {
    if (!s) return null;
    const m = String(s).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return s;
  }

  /* ---- Import from parsed rows ---- */
  function loadFromRows(rows) {
    pushUndo();
    _groups = [];
    _tasks  = [];
    _personColors = {};

    // Detect groups: rows where tipo contains 'grupo' or nome ends with ':' or is all caps
    const groupMap = {}; // name -> group id

    rows.forEach((r, i) => {
      const isGroup = r._isGroup ||
        (r.tipo || '').toLowerCase().includes('grupo') ||
        (r.tipo || '').toLowerCase().includes('ramal') ||
        (!r.inicio && !r.fim && r.responsavel);

      if (isGroup) {
        const g = {
          id:          r.id          || String(i + 1),
          edt:         r.edt         || '',
          nome:        r.nome        || r.atividade || r.nome,
          responsavel: r.responsavel || '',
          cor:         PALETTE[_groups.length % PALETTE.length],
          collapsed:   false,
        };
        _groups.push(g);
        groupMap[(r.nome || r.atividade || '').toLowerCase()] = g.id;
      }
    });

    // Now load tasks
    rows.forEach((r, i) => {
      const isGroup = r._isGroup ||
        (r.tipo || '').toLowerCase().includes('grupo') ||
        (r.tipo || '').toLowerCase().includes('ramal') ||
        (!r.inicio && !r.fim && r.responsavel);
      if (isGroup) return;

      let grupoId = r.grupoId || null;
      if (!grupoId && r.grupoNome) {
        grupoId = groupMap[(r.grupoNome || '').toLowerCase()] || null;
      }

      const responsaveis = parseResponsaveis(r.responsavel || r.responsaveis || '');
      
      // Construir períodos a partir das colunas de data
      let periodos = [];
      if (r.inicio && r.fim) {
        periodos.push({ inicio: parseExcelDate(r.inicio), fim: parseExcelDate(r.fim) });
      } else if (r.periodos && Array.isArray(r.periodos)) {
        periodos = r.periodos.map(p => ({
          inicio: parseExcelDate(p.inicio),
          fim: parseExcelDate(p.fim)
        })).filter(p => p.inicio && p.fim);
      }

      _tasks.push(_normalizeTask({
        id:           r.id          || String(i + 1),
        edt:          r.edt         || '',
        grupoId,
        nome:         r.atividade   || r.nome || 'Tarefa',
        responsaveis,
        periodos:     periodos.length > 0 ? periodos : [],
        status:       r.status      || 'Planejado',
        pct:          r.pct         || 0,
        local:        r.local       || '',
        tipo:         r.tipo        || '',
        obs:          r.observacoes || r.obs || '',
      }));
    });

    _rebuildPeople();
  }

  function parseResponsaveis(val) {
    if (Array.isArray(val)) return val.filter(Boolean).map(s => s.trim()).filter(Boolean);
    if (!val) return [];
    return String(val).split(/[;,]/).map(s => s.trim()).filter(Boolean);
  }

  /* ---- Serialize for export ---- */
  function toExportRows() {
    const rows = [];

    _groups.forEach(g => {
      rows.push({
        ID: g.id, EDT: g.edt, Tipo: 'Grupo/Ramal',
        Nome: g.nome, Responsavel: g.responsavel,
        GrupoId: '', Inicio: '', Fim: '', Status: '', Pct: '', Local: '', Obs: '',
      });
      _tasks.filter(t => t.grupoId === g.id).forEach(t => {
        const periodosStr = (t.periodos || []).map(p => 
          `${p.inicio || ''} a ${p.fim || ''}`
        ).join('; ');
        rows.push({
          ID: t.id, EDT: t.edt, Tipo: t.tipo || '',
          Nome: t.nome, Responsavel: t.responsaveis.join(';'),
          GrupoId: g.id,
          Inicio: (t.periodos && t.periodos.length > 0) ? t.periodos[0].inicio : '',
          Fim: (t.periodos && t.periodos.length > 0) ? t.periodos[0].fim : '',
          Periodos: periodosStr,
          Status: t.status, Pct: t.pct,
          Local: t.local, Obs: t.obs,
        });
      });
    });

    // Tasks without group
    _tasks.filter(t => !t.grupoId).forEach(t => {
      const periodosStr = (t.periodos || []).map(p => 
        `${p.inicio || ''} a ${p.fim || ''}`
      ).join('; ');
      rows.push({
        ID: t.id, EDT: t.edt, Tipo: t.tipo || '',
        Nome: t.nome, Responsavel: t.responsaveis.join(';'),
        GrupoId: '',
        Inicio: (t.periodos && t.periodos.length > 0) ? t.periodos[0].inicio : '',
        Fim: (t.periodos && t.periodos.length > 0) ? t.periodos[0].fim : '',
        Periodos: periodosStr,
        Status: t.status, Pct: t.pct,
        Local: t.local, Obs: t.obs,
      });
    });

    return rows;
  }

  /* ---- Serialize to JSON (for Google Sheets) ---- */
  function toJSON() {
    return { groups: _groups, tasks: _tasks, roster: _roster };
  }

  function loadFromJSON(data) {
    pushUndo();
    _groups = data.groups || [];
    _tasks  = (data.tasks  || []).map(_normalizeTask);
    _roster = data.roster || [];
    _rebuildPeople();
  }

  /* ---- Getters ---- */
  function getPeople()           { return _people; }
  function getPersonColors()     { return _personColors; }
  function hasData()             { return _groups.length > 0 || _tasks.length > 0; }

  /* ---- Sample data ---- */
  function loadSample() {
    _groups = [
      { id:'g1', edt:'1', nome:'Tunel Marembá', responsavel:'Bruno D.', cor:'#2e7d32', collapsed:false },
      { id:'g2', edt:'2', nome:'EFVM – Ramal Vitória', responsavel:'Max', cor:'#1565c0', collapsed:false },
      { id:'g3', edt:'3', nome:'EFVM – Ramal Jeceaba', responsavel:'Flavio', cor:'#6a1b9a', collapsed:false },
    ];
    const today = dayjs().format('YYYY-MM-DD');
    const d = (n) => dayjs().add(n,'day').format('YYYY-MM-DD');
    _tasks = [
      { 
        id:'1', edt:'1.1', grupoId:'g1', 
        nome:'Intalação – VT Fábrica', 
        responsaveis:['Bruno M.','Max'], 
        periodos:[{inicio:d(0), fim:d(3)}],
        status:'Em andamento', pct:30, local:'VT Fábrica', tipo:'Campo', obs:'' 
      },
      { 
        id:'2', edt:'1.2', grupoId:'g1', 
        nome:'(Prismas + Crackmeter) – km 19+993 (RFA)', 
        responsaveis:['Max','Anderi','Bruno D.','Flavio'], 
        periodos:[
          {inicio:d(1), fim:d(5)},
          {inicio:d(10), fim:d(14)},
          {inicio:d(21), fim:d(25)}
        ],
        status:'Planejado', pct:0, local:'km 19+993 (RFA)', tipo:'Campo', obs:'Atividade com períodos intercalados' 
      },
      { 
        id:'3', edt:'2.1', grupoId:'g2', 
        nome:'Manut PZ – km 23+487 (RFA)', 
        responsaveis:['Max','Pedro F.'], 
        periodos:[{inicio:d(2), fim:d(4)}],
        status:'Planejado', pct:0, local:'km 23+487', tipo:'Manutenção', obs:'' 
      },
      { 
        id:'4', edt:'2.2', grupoId:'g2', 
        nome:'Manut. Tilts – km 23+487 (RFA)', 
        responsaveis:['Anderi'], 
        periodos:[{inicio:d(2), fim:d(3)}],
        status:'Planejado', pct:0, local:'km 23+487', tipo:'Manutenção', obs:'' 
      },
      { 
        id:'5', edt:'2.3', grupoId:'g2', 
        nome:'Inst. Tiltímetros – Renan', 
        responsaveis:['Renan'], 
        periodos:[{inicio:d(3), fim:d(6)}],
        status:'Planejado', pct:0, local:'km 23+487', tipo:'Campo', obs:'' 
      },
      { 
        id:'6', edt:'3.1', grupoId:'g3', 
        nome:'Manutenção Pluviômetros', 
        responsaveis:['Max','Pedro F.'], 
        periodos:[
          {inicio:d(4), fim:d(8)},
          {inicio:d(12), fim:d(16)}
        ],
        status:'Planejado', pct:0, local:'Ramal Jeceaba', tipo:'Manutenção', obs:'Manutenção com pausa' 
      },
      { 
        id:'7', edt:'', grupoId:null, 
        nome:'Relatório Mensal', 
        responsaveis:['Bruno D.'], 
        periodos:[{inicio:d(6), fim:d(7)}],
        status:'Planejado', pct:0, local:'Escritório', tipo:'Relatório', obs:'' 
      },
    ];
    _rebuildPeople();
  }

  /* ---- Helpers ---- */
  function genId() { return 't_' + Math.random().toString(36).slice(2,8); }
  
  /* ---- Hidden (ocultar do Gantt) ---- */
  function toggleTaskHidden(id) {
    const t = _tasks.find(t => t.id === id);
    if (t) t.hidden = !t.hidden;
  }

  function toggleGroupHidden(id) {
    const g = _groups.find(g => g.id === id);
    if (g) g.hidden = !g.hidden;
  }

  function getShowHidden()    { return _showHidden; }
  function setShowHidden(val) { _showHidden = !!val; }

  /* ---- Reorder tasks within group ---- */
  function reorderTask(taskId, targetTaskId, groupId) {
    const groupTasks = _tasks.filter(t => t.grupoId === groupId);
    const others     = _tasks.filter(t => t.grupoId !== groupId);
    const fromIdx    = groupTasks.findIndex(t => t.id === taskId);
    const toIdx      = groupTasks.findIndex(t => t.id === targetTaskId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = groupTasks.splice(fromIdx, 1);
    groupTasks.splice(toIdx, 0, moved);
    _tasks = [...others, ...groupTasks];
  }

  function reorderGroup(groupId, targetGroupId) {
    const fromIdx = _groups.findIndex(g => g.id === groupId);
    const toIdx   = _groups.findIndex(g => g.id === targetGroupId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = _groups.splice(fromIdx, 1);
    _groups.splice(toIdx, 0, moved);
  }

  function updateRoster(oldName, newName) {
    const clean = (newName || '').trim();
    if (!clean || oldName === clean) return false;
    if (_roster.includes(clean)) return false;
    const idx = _roster.indexOf(oldName);
    if (idx === -1) return false;
    _roster[idx] = clean;
    _tasks.forEach(t => {
      const i = (t.responsaveis || []).indexOf(oldName);
      if (i !== -1) t.responsaveis[i] = clean;
    });
    if (_personColors[oldName]) {
      _personColors[clean] = _personColors[oldName];
      delete _personColors[oldName];
    }
    _rebuildPeople();
    return true;
  }

  /* ---- Persist to localStorage ---- */
  function save() {
    try { localStorage.setItem('cronocampo_v2', JSON.stringify(toJSON())); } catch(e){}
  }
  function restore() {
    try {
      const s = localStorage.getItem('cronocampo_v2');
      if (s) { loadFromJSON(JSON.parse(s)); return true; }
    } catch(e){}
    return false;
  }

  /* ---- Função auxiliar para obter todos os períodos de uma tarefa ---- */
  function getTaskPeriods(taskId) {
    const t = getTask(taskId);
    if (!t) return [];
    return t.periodos || [];
  }

  // Versão que recebe o objeto tarefa diretamente (usada por gantt.js e app.js)
  function getTaskPeriodos(t) {
    if (!t) return [];
    return t.periodos || [];
  }

  function getTaskStart(t) {
    if (!t) return null;
    const starts = (t.periodos || []).map(p => p.inicio).filter(Boolean);
    return starts.length ? starts.reduce((a,b) => a < b ? a : b) : null;
  }

  function getTaskEnd(t) {
    if (!t) return null;
    const ends = (t.periodos || []).map(p => p.fim).filter(Boolean);
    return ends.length ? ends.reduce((a,b) => a > b ? a : b) : null;
  }

  return {
    getGroups, getGroup, addGroup, updateGroup, deleteGroup,
    toggleGroupCollapse, collapseAll, expandAll,
    getTasks, getTask, getTasksByGroup, addTask, updateTask, deleteTask,
    loadFromRows, loadFromJSON, loadSample,
    toExportRows, toJSON,
    getPeople, getPersonColors, getPersonColor, personInitials,
    parseResponsaveis,
    parseDateBR,
    hasData,
    undo, redo,
    save, restore,
    getRoster, addToRoster, removeFromRoster,
    reorderTask, reorderGroup,
    toggleTaskHidden, toggleGroupHidden,
    getShowHidden, setShowHidden,
    updateRoster,
    getTaskPeriods, getTaskPeriodos, getTaskStart, getTaskEnd,
    STATUS_COLORS, PALETTE,
  };
})();