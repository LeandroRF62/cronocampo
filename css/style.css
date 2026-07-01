/* ================================================================
   CronoCampo v2 – style.css
   ================================================================ */

/* ---- Variables ---- */
:root {
  --primary:      #2e7d32;
  --primary-d:    #1b5e20;
  --primary-l:    #e8f5e9;
  --accent:       #1565c0;
  --accent-l:     #e3f2fd;
  --danger:       #c62828;
  --danger-l:     #ffebee;
  --warning:      #e65100;
  --warning-l:    #fff3e0;
  --success:      #2e7d32;
  --purple:       #6a1b9a;
  --purple-l:     #f3e5f5;

  --topbar-h:     56px;
  --toolbar-h:    44px;
  --left-w:       380px;

  --bg:           #f5f5f5;
  --surface:      #ffffff;
  --border:       #e0e0e0;
  --border-d:     #bdbdbd;
  --text:         #212121;
  --text-2:       #424242;
  --text-m:       #757575;
  --text-l:       #9e9e9e;

  --row-h:        28px;
  --row-h-group:  32px;

  --radius:       8px;
  --radius-sm:    5px;
  --shadow:       0 1px 3px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.08);
  --shadow-lg:    0 4px 20px rgba(0,0,0,.15);
  --trans:        .18s ease;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 13px; }
body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #bdbdbd; border-radius: 99px; }
button, input, select, textarea { font-family: inherit; }

/* ================================================================
   TOPBAR
   ================================================================ */
.topbar {
  height: var(--topbar-h);
  background: #1a1a2e;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
  z-index: 100;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,.3);
}

.topbar-left  { display:flex; align-items:center; gap:14px; min-width:0; }
.topbar-center{ flex:1; display:flex; justify-content:center; }
.topbar-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }

/* Logo */
.logo { display:flex; align-items:center; gap:10px; flex-shrink:0; }
.logo-icon {
  width:36px; height:36px; border-radius:8px;
  background: linear-gradient(135deg,#2e7d32,#66bb6a);
  display:flex; align-items:center; justify-content:center;
  font-size:16px; color:#fff;
}
.logo-text { display:flex; flex-direction:column; line-height:1.1; }
.logo-brand { font-size:15px; font-weight:800; color:#fff; letter-spacing:-.3px; }
.logo-sub   { font-size:10px; color:#90a4ae; font-weight:500; }

.page-title {
  font-size:22px; font-weight:700; color:#fff;
  outline:none; border-radius:4px; padding:2px 12px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  flex:1; text-align:center; cursor:pointer;
}
.page-title:hover { background:rgba(255,255,255,.08); }
.page-title[contenteditable="true"] { background:rgba(255,255,255,.12); cursor:text; }

/* Nav tabs */
.nav-tabs { display:flex; gap:2px; }
.nav-tab {
  padding:7px 18px; border:none; background:rgba(255,255,255,.06);
  color:#90a4ae; border-radius:6px; cursor:pointer; font-size:13px; font-weight:500;
  display:flex; align-items:center; gap:6px;
  transition: background var(--trans), color var(--trans);
}
.nav-tab:hover  { background:rgba(255,255,255,.12); color:#eceff1; }
.nav-tab.active { background:#2e7d32; color:#fff; }

/* Topbar date */
.topbar-date { color:#78909c; font-size:12px; white-space:nowrap; }

/* Buttons */
.btn-primary {
  padding:7px 16px; background:var(--primary); color:#fff; border:none;
  border-radius:var(--radius-sm); cursor:pointer; font-size:12px; font-weight:600;
  display:flex; align-items:center; gap:6px;
  transition:background var(--trans), transform var(--trans);
}
.btn-primary:hover { background:var(--primary-d); transform:translateY(-1px); }

.btn-outline {
  padding:6px 14px; background:rgba(255,255,255,.08); color:#cfd8dc;
  border:1px solid rgba(255,255,255,.18); border-radius:var(--radius-sm);
  cursor:pointer; font-size:12px; font-weight:500;
  display:flex; align-items:center; gap:6px;
  transition:background var(--trans);
}
.btn-outline:hover { background:rgba(255,255,255,.16); }

.btn-sheets {
  padding:6px 14px; background:#1a73e8; color:#fff;
  border:none; border-radius:var(--radius-sm); cursor:pointer;
  font-size:12px; font-weight:600;
  display:flex; align-items:center; gap:6px;
  transition:background var(--trans);
}
.btn-sheets:hover { background:#1557b0; }

.btn-icon {
  width:32px; height:32px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
  color:#90a4ae; border-radius:var(--radius-sm); cursor:pointer; font-size:13px;
  display:flex; align-items:center; justify-content:center;
  transition:background var(--trans), color var(--trans);
}
.btn-icon:hover { background:rgba(255,255,255,.16); color:#eceff1; }
.btn-icon:disabled { opacity:.35; cursor:not-allowed; }

/* ================================================================
   MAIN CONTENT
   ================================================================ */
.main-content { flex:1; overflow:hidden; display:flex; flex-direction:column; }

.view { display:none; flex:1; overflow:hidden; flex-direction:column; }
.view.active { display:flex; }

/* ================================================================
   GANTT TOOLBAR
   ================================================================ */
.gantt-toolbar {
  height:var(--toolbar-h); background:var(--surface); border-bottom:1px solid var(--border);
  display:flex; align-items:center; justify-content:space-between; padding:0 12px;
  gap:12px; flex-shrink:0; z-index:10;
}
.toolbar-left, .toolbar-right { display:flex; align-items:center; gap:8px; }

.btn-sm {
  padding:5px 12px; border:1px solid var(--border); background:#fff; color:var(--text-2);
  border-radius:var(--radius-sm); cursor:pointer; font-size:12px; font-weight:500;
  display:flex; align-items:center; gap:5px; white-space:nowrap;
  transition:background var(--trans), border-color var(--trans);
}
.btn-sm:hover { background:var(--primary-l); border-color:var(--primary); color:var(--primary); }
.btn-today { background:var(--accent-l); border-color:var(--accent); color:var(--accent); }
.btn-today:hover { background:#bbdefb; }

.search-wrap {
  display:flex; align-items:center; gap:6px;
  background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-sm);
  padding:4px 10px;
}
.search-wrap i { color:var(--text-l); font-size:11px; }
.search-wrap input {
  border:none; background:transparent; font-size:12px; color:var(--text); outline:none; width:180px;
}

.toolbar-label { font-size:11px; color:var(--text-m); font-weight:600; }

.select-sm {
  padding:4px 8px; border:1px solid var(--border); border-radius:var(--radius-sm);
  font-size:12px; background:#fff; color:var(--text); outline:none; cursor:pointer;
}

.btn-nav {
  width:28px; height:28px; border:1px solid var(--border); border-radius:var(--radius-sm);
  background:#fff; cursor:pointer; font-size:11px;
  display:flex; align-items:center; justify-content:center;
  transition:background var(--trans);
}
.btn-nav:hover { background:var(--primary-l); }

.period-badge {
  font-size:12px; font-weight:700; color:var(--text); padding:0 4px; white-space:nowrap;
}

/* ================================================================
   GANTT LAYOUT
   ================================================================ */
.gantt-layout {
  flex:1; display:flex; overflow:hidden; position:relative;
}

/* ---- LEFT (task list) ---- */
.gantt-left {
  width: var(--left-w);
  min-width: 220px;
  max-width: 60vw;
  background: var(--surface);
  border-right: 2px solid var(--border-d);
  display: flex; flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

.gantt-left-header {
  display: flex; align-items: center;
  height: 58px;
  background: #263238;
  color: #eceff1;
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  border-bottom: 2px solid #1a2327;
  flex-shrink: 0;
  user-select: none;
}

.col-id    { width: 46px; min-width:46px; padding: 0 8px; flex-shrink:0; }
.col-edt   { width: 56px; min-width:56px; padding: 0 6px; flex-shrink:0; }
.col-name  { flex:1; padding: 0 8px; overflow:hidden; }
.col-actions { flex-shrink:0; padding: 0 8px; }

.gantt-left-body { flex:1; overflow-y:auto; overflow-x:hidden; }

/* ---- RESIZER ---- */
.gantt-resizer {
  width: 4px; background: transparent; cursor: col-resize; flex-shrink:0; z-index:10;
  transition: background var(--trans);
}
.gantt-resizer:hover, .gantt-resizer.dragging { background: var(--primary); }

/* ---- RIGHT (chart) ---- */
.gantt-right {
  flex:1; overflow:hidden; position:relative;
}

.gantt-chart-scroll {
  width:100%; height:100%; overflow:auto; position:relative;
}

.gantt-chart-inner {
  position:relative; min-height:100%;
}

/* ----------------------------------------------------------------
   GANTT ROWS (left)
   ---------------------------------------------------------------- */
.gantt-row {
  display:flex; align-items:center;
  height: var(--row-h);
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  position: relative;
  transition: background var(--trans);
}
.gantt-row:hover { background: #f9fbe7; }
.gantt-row.selected { background: #e8f5e9 !important; }
.gantt-row.dragging-row { opacity:.5; }

.gantt-row.is-group {
  height: var(--row-h-group);
  background: #eceff1;
  border-bottom: 1px solid #cfd8dc;
  font-weight: 700;
}
.gantt-row.is-group:hover { background: #e0f2f1; }

.gantt-row.hidden-row { display:none; }

/* Row cells */
.row-id {
  width:46px; min-width:46px; padding:0 8px;
  font-size:11px; font-weight:700; color:var(--text-m);
  flex-shrink:0; white-space:nowrap;
}
.row-edt {
  width:56px; min-width:56px; padding:0 6px;
  font-size:10px; color:var(--text-l); flex-shrink:0; white-space:nowrap;
}
.row-name {
  flex:1; padding:0 6px; display:flex; align-items:center; gap:6px;
  overflow:hidden;
  font-size:12px; color:var(--text);
  min-width:0;
}

.row-indent { flex-shrink:0; }

.expand-btn {
  width:18px; height:18px; border:none; background:none; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  color:var(--text-m); font-size:10px; flex-shrink:0; padding:0;
  border-radius:3px; transition:background var(--trans), transform var(--trans);
}
.expand-btn:hover { background:rgba(0,0,0,.08); }
.expand-btn.collapsed { transform:rotate(-90deg); }

.row-name-text {
  flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  line-height:1.2;
}
.row-name-text small {
  display:block; font-size:10px; color:var(--text-m); font-weight:400;
}

.row-actions {
  width:0; min-width:0; overflow:hidden; display:flex; align-items:center; justify-content:flex-end;
  gap:2px; padding:0; flex-shrink:0; opacity:0;
  transition:opacity var(--trans), width var(--trans), padding var(--trans);
}
.gantt-row:hover .row-actions {
  opacity:1; width:72px; min-width:72px; padding:0 4px;
}

.act-btn {
  width:22px; height:22px; border:none; background:none; border-radius:3px;
  cursor:pointer; font-size:11px; color:var(--text-m);
  display:flex; align-items:center; justify-content:center;
  transition:background var(--trans), color var(--trans);
}
.act-btn:hover { background:rgba(0,0,0,.08); color:var(--text); }
.act-btn.del:hover { background:var(--danger-l); color:var(--danger); }
.act-btn.hidden-eye { color:#bdbdbd; }
.act-btn.hidden-eye:hover { color:#e65100; }

/* Linhas ocultas — aparecem ofuscadas no modo "Mostrar Ocultos" */
.gantt-row.is-hidden-item {
  opacity: 0.38;
  background: repeating-linear-gradient(
    135deg,
    transparent,
    transparent 4px,
    rgba(0,0,0,0.04) 4px,
    rgba(0,0,0,0.04) 8px
  ) !important;
  font-style: italic;
}
.gantt-row.is-hidden-item:hover { opacity: 0.6; }
.chart-row.is-hidden-item { opacity: 0.35; }

/* Botão Mostrar Ocultos ativo */
.btn-active-hidden {
  background: #fff3e0 !important;
  border-color: #e65100 !important;
  color: #e65100 !important;
}

/* Group color stripe */
.group-stripe {
  width:4px; height:100%; flex-shrink:0; border-radius:0 2px 2px 0;
}

/* Drag handle */
.drag-handle {
  width:16px; height:100%; flex-shrink:0; cursor:grab; display:flex; align-items:center; justify-content:center; color:var(--text-l); font-size:10px;
}
.drag-handle:active { cursor:grabbing; }

/* ----------------------------------------------------------------
   GANTT CHART HEADER
   ---------------------------------------------------------------- */
.gantt-chart-header {
  position:sticky; top:0; z-index:5;
  background:#263238; color:#eceff1;
  display:flex; flex-direction:column;
  border-bottom:2px solid #1a2327;
  user-select:none;
}

.chart-header-months {
  display:flex; height:30px;
  border-bottom:1px solid #37474f;
}

.chart-month-cell {
  display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px;
  border-right:1px solid #37474f;
  white-space:nowrap;
}

.chart-header-days {
  display:flex; height:28px;
}

/* ── ALTERAÇÃO: iniciais dos dias da semana ── */
.chart-day-header {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:1px;
  font-size:10px; font-weight:600; color:#90a4ae;
  border-right:1px solid #37474f;
  flex-shrink:0;
}
.chart-day-header.today-h   { background:#2e7d32 !important; color:#fff !important; }
.chart-day-header.weekend   { background:#263238; color:#ff8a80; }
.chart-day-header.holiday   { background:#ffebee !important; color:#c62828 !important; font-weight:700; }
.chart-day-header.week-label { font-size:9px; }

/* ----------------------------------------------------------------
   GANTT CHART ROWS
   ---------------------------------------------------------------- */
.gantt-chart-body { position:relative; }

.chart-row {
  display:flex; align-items:center;
  height:var(--row-h); border-bottom:1px solid #f5f5f5; position:relative;
}
.chart-row.is-group    { height:var(--row-h-group); background:#f5f7f8; border-bottom:1px solid #e0e0e0; }

.chart-row.hidden-row  { display:none; }
.chart-row.selected-row{ background:#f1f8e9; }

/* Grid cells */
.chart-cell {
  height:100%; flex-shrink:0; border-right:1px solid #e0e0e0;
  position: relative; overflow: visible;
}
.chart-cell.weekend {
  background-image: repeating-linear-gradient(
    45deg, transparent, transparent 3px,
    rgba(0,0,0,0.10) 3px, rgba(0,0,0,0.10) 6px
  );
  background-color: #eceff1;
}
.chart-cell.holiday {
  background-image: repeating-linear-gradient(
    45deg, transparent, transparent 3px,
    rgba(198,40,40,0.12) 3px, rgba(198,40,40,0.12) 6px
  );
  background-color: #fff5f5;
}
.chart-cell.today-c { background:rgba(46,125,50,.06); border-right:1px solid rgba(46,125,50,.2); }
.chart-cell.month-start { border-left:1.5px solid rgba(0,0,0,0.18); }

/* Nome do feriado em texto vertical — absoluto no body, centralizado */
.holiday-label {
  position: absolute;
  transform: translateX(-50%) translateY(-50%) rotate(-90deg);
  transform-origin: center center;
  white-space: nowrap;
  font-size: 9px;
  font-weight: 600;
  color: #c62828;
  opacity: 0.75;
  pointer-events: none;
  z-index: 2;
  letter-spacing: 0.3px;
}

/* Today line */
.today-line {
  position:absolute; top:0; bottom:0; width:2px; background:#2e7d32;
  opacity:.7; pointer-events:none; z-index:4;
}

/* ----------------------------------------------------------------
   GANTT BARS
   ---------------------------------------------------------------- */
.gantt-bar-wrap {
  position:absolute; top:0; bottom:0; display:flex; align-items:center;
  padding:4px 0; z-index:3; cursor:pointer;
}

.gantt-bar {
  height:24px; border-radius:4px; position:relative;
  display:flex; align-items:center; overflow:hidden;
  box-shadow:0 1px 3px rgba(0,0,0,.2);
  transition: filter var(--trans);
  min-width: 4px;
}
.gantt-bar:hover { filter:brightness(1.08); box-shadow:0 2px 8px rgba(0,0,0,.25); }

.bar-group { height:20px; border-radius:3px; opacity:.45; }

/* Progress fill */
.bar-progress {
  position:absolute; top:0; left:0; height:100%;
  background:rgba(255,255,255,.25); border-radius:4px 0 0 4px;
  pointer-events:none;
}

.gantt-bar.bar-concluida .bar-progress { display:none; }

/* Bar label */
.bar-label {
  position:relative; z-index:1; padding:0 8px;
  font-size:10px; font-weight:600; color:#fff;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  text-shadow:0 1px 2px rgba(0,0,0,.3);
}

/* Resize handles */
.bar-resize-l, .bar-resize-r {
  position:absolute; top:0; bottom:0; width:6px; cursor:ew-resize; z-index:5;
  background:rgba(0,0,0,.15); opacity:0; transition:opacity var(--trans);
  border-radius:4px;
}
.bar-resize-l { left:0; border-radius:4px 0 0 4px; }
.bar-resize-r { right:0; border-radius:0 4px 4px 0; }
.gantt-bar:hover .bar-resize-l,
.gantt-bar:hover .bar-resize-r { opacity:1; }

/* Tooltip */
.gantt-tooltip {
  position:fixed; background:#263238; color:#eceff1; border-radius:6px;
  padding:10px 14px; font-size:11px; z-index:9999;
  pointer-events:none; max-width:280px; box-shadow:var(--shadow-lg);
  line-height:1.7; border:1px solid #37474f;
}

/* Responsible avatars on bar */
.bar-avatars {
  display:flex; gap:2px; padding-right:6px; flex-shrink:0;
}
.bar-avatar {
  width:16px; height:16px; border-radius:50%; border:1px solid rgba(255,255,255,.4);
  display:flex; align-items:center; justify-content:center;
  font-size:8px; font-weight:700; color:#fff;
  flex-shrink:0;
}

/* ================================================================
   BARRA CONCLUÍDA
   ================================================================ */
.gantt-bar.bar-concluida {
  background-color: #9e9e9e !important;
  position: relative;
  overflow: hidden;
}

/* ✔ ícone check */
.bar-check {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  font-weight: bold;
  color: #fff;
  background: #2e7d32;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 6;
}

/* ================================================================
   BARRA CANCELADA
   ================================================================ */
.gantt-bar.bar-cancelada {
  background: #9e9e9e !important;
  position: relative;
  overflow: hidden;
}

/* ❌ ícone X */
.bar-x {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  background: #c62828;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 6;
}

/* ================================================================
   DRAG & DROP REORDER
   ================================================================ */
.gantt-row.dragging  { opacity: .4; }
.gantt-row.drag-over { border-top: 2px solid var(--primary); background: var(--primary-l); }

/* ================================================================
   VIEWS: DASHBOARD
   ================================================================ */
.dash-content { flex:1; overflow-y:auto; padding:20px; }

.kpi-grid {
  display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:14px; margin-bottom:16px;
}

.kpi-card {
  background:#fff; border:1px solid var(--border); border-radius:var(--radius);
  padding:16px 18px; display:flex; align-items:center; gap:14px;
  box-shadow:var(--shadow); transition:transform var(--trans), box-shadow var(--trans);
}
.kpi-card:hover { transform:translateY(-2px); box-shadow:var(--shadow-lg); }
.kpi-icon { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
.kpi-value { font-size:26px; font-weight:800; line-height:1; }
.kpi-label { font-size:11px; color:var(--text-m); font-weight:500; margin-top:3px; }

.kpi-green  .kpi-icon { background:var(--primary-l); color:var(--primary); }
.kpi-green  .kpi-value { color:var(--primary); }
.kpi-blue   .kpi-icon { background:var(--accent-l); color:var(--accent); }
.kpi-blue   .kpi-value { color:var(--accent); }
.kpi-orange .kpi-icon { background:var(--warning-l); color:var(--warning); }
.kpi-orange .kpi-value { color:var(--warning); }
.kpi-purple .kpi-icon { background:var(--purple-l); color:var(--purple); }
.kpi-purple .kpi-value { color:var(--purple); }
.kpi-red    .kpi-icon { background:var(--danger-l); color:var(--danger); }
.kpi-red    .kpi-value { color:var(--danger); }

.dash-charts-row {
  display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; margin-bottom:14px;
}

.card {
  background:#fff; border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow);
}
.card-header {
  padding:12px 16px; border-bottom:1px solid var(--border);
  display:flex; align-items:center; gap:8px;
}
.card-header h3 { font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px; flex:1; }
.card-header h3 i { color:var(--primary); font-size:12px; }
.badge { background:var(--primary); color:#fff; border-radius:20px; padding:1px 8px; font-size:11px; font-weight:700; }

.mt-16 { margin-top:16px; }

.activity-list { padding:0; }
.activity-item {
  display:flex; align-items:center; gap:10px; padding:9px 16px;
  border-bottom:1px solid var(--border); transition:background var(--trans);
}
.activity-item:hover { background:var(--bg); }
.activity-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.activity-info { flex:1; min-width:0; }
.activity-title { font-size:12px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.activity-meta  { font-size:11px; color:var(--text-m); margin-top:1px; }

/* ================================================================
   VIEWS: EQUIPE
   ================================================================ */
.equipe-content {
  flex:1; overflow-y:auto; padding:20px;
  display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:14px; align-content:start;
}

.person-card {
  background:#fff; border:1px solid var(--border); border-radius:var(--radius);
  padding:18px; box-shadow:var(--shadow);
  transition:transform var(--trans), box-shadow var(--trans);
}
.person-card:hover { transform:translateY(-2px); box-shadow:var(--shadow-lg); }
.person-card-head  { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
.person-avatar-lg  { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; color:#fff; flex-shrink:0; }
.person-name { font-size:14px; font-weight:700; }
.person-role { font-size:11px; color:var(--text-m); margin-top:1px; }
.person-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.person-stat { background:var(--bg); border-radius:var(--radius-sm); padding:8px; text-align:center; }
.person-stat-v { font-size:18px; font-weight:800; color:var(--primary); }
.person-stat-l { font-size:10px; color:var(--text-m); font-weight:500; margin-top:1px; }
.person-bar-wrap { height:3px; background:var(--border); border-radius:99px; overflow:hidden; margin-top:12px; }
.person-bar-fill { height:100%; border-radius:99px; transition:width .6s ease; }

/* ================================================================
   MODALS
   ================================================================ */
.modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:1000;
  display:none; align-items:center; justify-content:center;
  backdrop-filter:blur(2px);
}
.modal-overlay.open { display:flex; }

.modal {
  background:#fff; border-radius:var(--radius); width:640px; max-width:96vw;
  max-height:92vh; display:flex; flex-direction:column;
  box-shadow:var(--shadow-lg); animation:modalIn .2s ease;
}
.modal-sm { width:500px; }

@keyframes modalIn { from{ opacity:0; transform:scale(.96) translateY(8px); } to{ opacity:1; transform:none; } }

.modal-header {
  padding:16px 20px; border-bottom:1px solid var(--border);
  display:flex; align-items:center; justify-content:space-between;
  flex-shrink:0;
}
.modal-header h2 { font-size:16px; font-weight:700; display:flex; align-items:center; gap:8px; }
.modal-close { background:none; border:none; cursor:pointer; color:var(--text-m); font-size:16px; padding:4px; border-radius:4px; transition:background var(--trans); }
.modal-close:hover { background:var(--bg); }

.modal-body { padding:20px; overflow-y:auto; flex:1; }
.modal-footer {
  padding:12px 20px; border-top:1px solid var(--border);
  display:flex; align-items:center; gap:8px; flex-shrink:0; background:#fafafa;
}

/* Form */
.form-row  { display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap; }
.form-group { display:flex; flex-direction:column; gap:4px; flex:1; min-width:120px; }
.form-group.wide { flex:2; }
.form-group.full { flex:100; }

.form-group label { font-size:11px; font-weight:600; color:var(--text-m); text-transform:uppercase; letter-spacing:.4px; }
.form-group input,
.form-group select,
.form-group textarea {
  padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius-sm);
  font-size:13px; color:var(--text); background:#fff; outline:none;
  transition:border-color var(--trans), box-shadow var(--trans);
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color:var(--primary); box-shadow:0 0 0 3px rgba(46,125,50,.12);
}
.form-group textarea { resize:vertical; }
.hint { font-size:10px; font-weight:400; color:var(--text-l); text-transform:none; letter-spacing:0; }

.mt-12 { margin-top:12px; }

/* Responsible tags */
.resp-input-wrap { position:relative; }
.resp-input-wrap input { width:100%; }
.resp-suggestions {
  position:absolute; top:100%; left:0; right:0; background:#fff;
  border:1px solid var(--border); border-top:none; border-radius:0 0 var(--radius-sm) var(--radius-sm);
  z-index:100; max-height:160px; overflow-y:auto; display:none;
}
.resp-suggestions.open { display:block; }
.resp-sugg-item { padding:7px 10px; cursor:pointer; font-size:12px; transition:background var(--trans); display:flex; align-items:center; gap:8px; }
.resp-sugg-item:hover { background:var(--primary-l); }

.resp-tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; min-height:28px; }
.resp-tag {
  display:flex; align-items:center; gap:5px;
  background:var(--primary-l); color:var(--primary); border:1px solid #a5d6a7;
  border-radius:20px; padding:3px 10px 3px 8px; font-size:12px; font-weight:500;
}
.resp-tag-rm { background:none; border:none; cursor:pointer; color:var(--primary); font-size:11px; padding:0; line-height:1; }
.resp-tag-rm:hover { color:var(--danger); }

/* Color picker */
.color-picker { display:flex; flex-wrap:wrap; gap:8px; margin-top:4px; }
.color-swatch {
  width:28px; height:28px; border-radius:50%; cursor:pointer;
  border:2px solid transparent; transition:transform var(--trans), border-color var(--trans);
}
.color-swatch:hover { transform:scale(1.15); }
.color-swatch.selected { border-color:#333; transform:scale(1.15); }

/* Danger button */
.btn-danger-sm {
  padding:6px 12px; background:var(--danger-l); color:var(--danger);
  border:1px solid #ef9a9a; border-radius:var(--radius-sm); cursor:pointer;
  font-size:12px; font-weight:600; display:flex; align-items:center; gap:5px;
  transition:background var(--trans);
}
.btn-danger-sm:hover { background:#ffcdd2; }

/* Info box */
.info-box {
  background:#e3f2fd; border:1px solid #90caf9; border-radius:var(--radius-sm);
  padding:12px; display:flex; gap:10px; font-size:12px; color:#1565c0;
}
.info-box i { font-size:16px; flex-shrink:0; margin-top:1px; }

/* Instructions */
.instructions-details { margin-top:14px; }
.instructions-details summary { cursor:pointer; font-size:12px; font-weight:600; color:var(--accent); padding:4px 0; }
.instructions-body {
  background:#f8f8f8; border:1px solid var(--border); border-radius:var(--radius-sm);
  padding:12px; margin-top:8px; font-size:11px; line-height:1.7; color:var(--text-2);
}
.instructions-body pre {
  background:#263238; color:#a5d6a7; padding:10px; border-radius:4px;
  font-size:10px; overflow-x:auto; margin:8px 0;
}

/* ================================================================
   CONTEXT MENU
   ================================================================ */
.ctx-menu {
  position:fixed; background:#fff; border:1px solid var(--border); border-radius:var(--radius);
  box-shadow:var(--shadow-lg); z-index:2000; padding:4px 0; min-width:180px;
  display:none; animation:ctxIn .1s ease;
}
.ctx-menu.open { display:block; }
@keyframes ctxIn { from{ opacity:0; transform:scale(.95); } to{ opacity:1; transform:none; } }

.ctx-item {
  padding:8px 14px; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:8px;
  color:var(--text-2); transition:background var(--trans);
}
.ctx-item:hover { background:var(--primary-l); color:var(--primary); }
.ctx-item.ctx-danger { color:var(--danger); }
.ctx-item.ctx-danger:hover { background:var(--danger-l); }
.ctx-sep { height:1px; background:var(--border); margin:4px 0; }

/* ================================================================
   TOAST
   ================================================================ */
.toast {
  position:fixed; bottom:20px; right:20px; background:#263238; color:#fff;
  padding:10px 18px; border-radius:var(--radius-sm); font-size:12px; font-weight:500;
  z-index:9999; opacity:0; transform:translateY(8px);
  transition:opacity .25s, transform .25s; pointer-events:none; max-width:320px;
  box-shadow:var(--shadow-lg);
}
.toast.show { opacity:1; transform:none; }
.toast.success { background:#2e7d32; }
.toast.error   { background:#c62828; }
.toast.info    { background:#1565c0; }

/* ================================================================
   STATUS PILLS
   ================================================================ */
.status-pill {
  display:inline-block; padding:2px 8px; border-radius:20px;
  font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; white-space:nowrap;
}
.sp-plan { background:#e3f2fd; color:#1565c0; }
.sp-and  { background:#fff3e0; color:#e65100; }
.sp-conc { background:#e8f5e9; color:#2e7d32; }
.sp-canc { background:#ffebee; color:#c62828; }
.sp-manu { background:#f3e5f5; color:#6a1b9a; }

/* ================================================================
   PERÍODOS NO MODAL
   ================================================================ */
#periodosList {
  scrollbar-width: thin;
  max-height: 200px;
  overflow-y: auto;
}

#periodosList::-webkit-scrollbar {
  width: 4px;
}

#periodosList::-webkit-scrollbar-thumb {
  background: #bdbdbd;
  border-radius: 99px;
}

#periodosList::-webkit-scrollbar-track {
  background: transparent;
}

/* Cada item de período */
#periodosList > div {
  transition: background 0.2s ease;
}

#periodosList > div:hover {
  background: #e8eaf6 !important;
}

/* Inputs de data dentro dos períodos */
#periodosList input[type="date"] {
  font-family: 'Inter', sans-serif;
}

#periodosList input[type="date"]:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.15);
}

/* Botão de remover período */
#periodosList [data-rm-periodo] {
  transition: background 0.2s ease, transform 0.2s ease;
}

#periodosList [data-rm-periodo]:hover {
  background: #ffcdd2 !important;
  transform: scale(1.05);
}

/* Indicador visual de múltiplos períodos na barra do Gantt */
.gantt-bar-wrap.multi-periodo .gantt-bar {
  border: 1px solid rgba(255,255,255,0.3);
}

.gantt-bar-wrap.multi-periodo .gantt-bar::after {
  content: '⟳';
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 8px;
  opacity: 0.6;
  color: #fff;
}

/* Indicador de múltiplos períodos na linha esquerda */
.gantt-row .periodos-badge {
  display: inline-block;
  background: #6a1b9a;
  color: #fff;
  border-radius: 10px;
  padding: 0 8px;
  font-size: 9px;
  font-weight: 700;
  margin-left: 6px;
}

/* Destaque para tarefas com múltiplos períodos no Gantt */
.gantt-row .row-name-text .multi-periodo-indicator {
  display: inline-block;
  background: #6a1b9a;
  color: #fff;
  border-radius: 10px;
  padding: 0 6px;
  font-size: 8px;
  font-weight: 700;
  margin-left: 4px;
  vertical-align: middle;
}

/* Conector entre períodos na mesma linha (opcional) */
.gantt-periodo-connector {
  position: absolute;
  height: 2px;
  background: rgba(0,0,0,0.1);
  border-top: 2px dashed rgba(0,0,0,0.15);
  z-index: 2;
  pointer-events: none;
}

/* ================================================================
   RESPONSIVE
   ================================================================ */
@media (max-width:768px) {
  .topbar-center { display:none; }
  .page-title { font-size:14px; max-width:140px; }
  .gantt-left { width:200px; }
  .col-edt { display:none; }
  
  /* Ajuste para períodos em mobile */
  #periodosList > div {
    flex-wrap: wrap;
  }
  
  #periodosList input[type="date"] {
    min-width: 80px;
    font-size: 11px;
  }
  
  .modal {
    max-width: 98vw;
    width: 98vw;
  }
}