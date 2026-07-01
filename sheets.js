/* ================================================================
   sheets.js – Google Sheets integration + Excel import/export
   ================================================================ */

const Sheets = (() => {

  const COL_MAP = {
    id:           ['id'],
    edt:          ['edt'],
    nome:         ['nome','atividade','tarefa','name','titulo','título','descricao','descrição'],
    responsavel:  ['responsavel','responsável','responsaveis','responsáveis','pessoa','colaborador','funcionario'],
    grupoId:      ['grupoid','grupo_id','grupo id','ramal','ramalid'],
    grupoNome:    ['gruponome','grupo','ramal nome','nome grupo'],
    inicio:       ['inicio','início','data inicio','data_inicio','start','data','datastart'],
    fim:          ['fim','termino','término','data fim','data_fim','end','datafim'],
    periodos:     ['periodos','períodos','periodos_atividade','intervalos','datas'],
    status:       ['status','situacao','situação','estado'],
    pct:          ['pct','%','porcentagem','conclusao','conclusão','progresso'],
    local:        ['local','endereco','endereço','localizacao','localização','km','obra'],
    tipo:         ['tipo','categoria','natureza','type'],
    obs:          ['obs','observacoes','observações','observacao','nota','comentario'],
    prioridade:   ['prioridade','priority'],
  };

  function findColVal(row, key) {
    const aliases = COL_MAP[key] || [key];
    const rowKeys = Object.keys(row);
    for (const alias of aliases) {
      const found = rowKeys.find(k =>
        k.toLowerCase().trim().replace(/[\s_]/g,'').includes(alias.replace(/[\s_]/g,''))
      );
      if (found !== undefined && row[found] !== undefined && row[found] !== '') return row[found];
    }
    return '';
  }

  /* ================================================================
     IMPORT EXCEL / CSV - atualizado para suportar múltiplos períodos
     ================================================================ */
  function importFile(file, onDone) {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, { type:'binary', cellDates:true });

        // Find sheets
        const sheetCrono = wb.SheetNames.find(n => /crono|ativid|tarefa|cronograma|campo/i.test(n)) || wb.SheetNames[0];

        const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetCrono], { defval:'' });
        if (!raw.length) { showToast('Planilha vazia ou não reconhecida.','error'); return; }

        const rows = raw.map((row, i) => {
          const tipo = String(findColVal(row,'tipo')||'').toLowerCase();
          const nome = String(findColVal(row,'nome')||'');
          const isGroup = tipo.includes('grupo') || tipo.includes('ramal');

          // Extrair períodos
          let periodos = [];
          const periodosStr = String(findColVal(row,'periodos') || '');
          
          if (periodosStr) {
            // Tentar parsear períodos no formato "DD/MM/YYYY a DD/MM/YYYY; DD/MM/YYYY a DD/MM/YYYY"
            const partes = periodosStr.split(';').map(p => p.trim()).filter(Boolean);
            for (const parte of partes) {
              const match = parte.match(/(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i);
              if (match) {
                periodos.push({
                  inicio: parseExcelDate(match[1]),
                  fim: parseExcelDate(match[2])
                });
              }
            }
          }
          
          // Se não encontrou períodos via coluna específica, tenta usar inicio/fim
          if (periodos.length === 0) {
            const inicio = findColVal(row,'inicio');
            const fim = findColVal(row,'fim');
            if (inicio && fim) {
              periodos.push({
                inicio: parseExcelDate(inicio),
                fim: parseExcelDate(fim)
              });
            }
          }

          // Se ainda não tem períodos mas tem data única, tenta usar
          if (periodos.length === 0) {
            const dataUnica = findColVal(row,'data') || findColVal(row,'datastart');
            if (dataUnica) {
              const dataParsed = parseExcelDate(dataUnica);
              if (dataParsed) {
                periodos.push({ inicio: dataParsed, fim: dataParsed });
              }
            }
          }

          return {
            _isGroup:    isGroup,
            id:          String(findColVal(row,'id')   || (i+1)),
            edt:         String(findColVal(row,'edt')  || ''),
            atividade:   nome || 'Tarefa ' + (i+1),
            responsavel: String(findColVal(row,'responsavel') || ''),
            grupoId:     String(findColVal(row,'grupoId')     || ''),
            grupoNome:   String(findColVal(row,'grupoNome')   || ''),
            periodos:    periodos,
            status:      normalizeStatus(String(findColVal(row,'status')||'')),
            pct:         parseInt(findColVal(row,'pct')) || 0,
            local:       String(findColVal(row,'local') || ''),
            tipo:        String(findColVal(row,'tipo')  || ''),
            obs:         String(findColVal(row,'obs')   || ''),
          };
        });

        Store.loadFromRows(rows);
        Store.save();
        onDone(rows.length);
      } catch(err) {
        console.error(err);
        showToast('Erro ao ler planilha: ' + err.message, 'error');
      }
    };
    reader.readAsBinaryString(file);
  }

  /* ================================================================
     EXPORT EXCEL - atualizado para incluir coluna de Períodos
     ================================================================ */
  function exportExcel(title) {
    const wb = XLSX.utils.book_new();

    // ---- Sheet 1: Cronograma ----
    const rows  = Store.toExportRows();
    const sheet = XLSX.utils.json_to_sheet(rows, {
      header: ['ID','EDT','Tipo','Nome','Responsavel','GrupoId','Periodos','Inicio','Fim','Status','Pct','Local','Obs']
    });
    sheet['!cols'] = [
      {wch:8},{wch:10},{wch:15},{wch:40},{wch:35},
      {wch:12},{wch:40},{wch:14},{wch:14},{wch:16},{wch:6},{wch:25},{wch:40}
    ];
    XLSX.utils.book_append_sheet(wb, sheet, 'Cronograma');

    // ---- Sheet 2: Modelo de Referência ----
    const headerRows = [[
      'ID','EDT','Tipo','Nome da Tarefa/Grupo','Responsavel(is)',
      'GrupoId','Periodos (separados por ;)','Inicio (DD/MM/AAAA)','Fim (DD/MM/AAAA)',
      'Status','% Concluído','Local/KM','Observações'
    ]];
    const sample = [
      ['G1','1','Grupo/Ramal','Tunel Marembá','Bruno D.',  '', '','','','','','',''],
      ['1', '1.1','Campo',    'Intalação – VT Fábrica','Bruno M.;Max', 'G1', '01/08/2026 a 03/08/2026', '01/08/2026','03/08/2026','Em andamento','30','VT Fábrica',''],
      ['2', '1.2','Campo',    '(Prismas + Crackmeter) km 19+993','Max;Anderi;Flavio', 'G1', '02/08/2026 a 05/08/2026; 10/08/2026 a 14/08/2026', '02/08/2026','14/08/2026','Planejado','0','km 19+993 (RFA)','Atividade com múltiplos períodos'],
      ['G2','2','Grupo/Ramal','EFVM – Ramal Vitória','Max', '', '','','','','','',''],
      ['3', '2.1','Manutenção','Manut PZ – km 23+487','Max;Pedro F.', 'G2', '03/08/2026 a 05/08/2026', '03/08/2026','05/08/2026','Planejado','0','km 23+487',''],
    ];
    const sheetMod = XLSX.utils.aoa_to_sheet([...headerRows, ...sample]);
    sheetMod['!cols'] = [
      {wch:8},{wch:10},{wch:15},{wch:40},{wch:35},{wch:8},{wch:40},{wch:20},{wch:20},{wch:16},{wch:6},{wch:25},{wch:40}
    ];
    XLSX.utils.book_append_sheet(wb, sheetMod, 'Modelo');

    // ---- Sheet 3: Instruções ----
    const instrucoes = [
      ['CRONOCAMPO – Guia de Preenchimento'],[''],
      ['Coluna','Descrição','Valores Aceitos'],
      ['ID',     'Identificador único (número ou texto)','Ex: 1, G1, EFVM-1'],
      ['EDT',    'Código hierárquico','Ex: 1.2.3'],
      ['Tipo',   'Tipo da linha','Grupo/Ramal | Campo | Manutenção | Inspeção | Relatório'],
      ['Nome',   'Nome da tarefa ou do grupo','Texto livre'],
      ['Responsavel','Nomes separados por ponto e vírgula','Bruno D.;Max;Pedro F.'],
      ['GrupoId','ID do grupo pai (deixe vazio para tarefas raiz)','Ex: G1, G2'],
      ['Periodos','Múltiplos períodos separados por ;','02/08/2026 a 05/08/2026; 10/08/2026 a 14/08/2026'],
      ['Inicio', 'Data de início (para um único período)','DD/MM/AAAA'],
      ['Fim',    'Data de conclusão (para um único período)','DD/MM/AAAA'],
      ['Status', 'Situação atual','Planejado | Em andamento | Concluído | Cancelado | Manutenção'],
      ['% Concluído','Percentual de progresso','0 a 100'],
      ['Local/KM','Endereço, KM ou localidade','km 23+487 (RFA)'],
      ['Observações','Informações adicionais','Texto livre'],
      [''],
      ['DICAS:'],
      ['- Linhas com Tipo = Grupo/Ramal são agrupadores (não precisam de datas)'],
      ['- Para múltiplos responsáveis, use ponto e vírgula: Bruno D.;Max;Pedro F.'],
      ['- O campo GrupoId vincula a tarefa ao grupo de mesmo ID'],
      ['- Para múltiplos períodos, use a coluna "Periodos" com o formato: "DD/MM/AAAA a DD/MM/AAAA; DD/MM/AAAA a DD/MM/AAAA"'],
      ['- Salve como .xlsx antes de importar'],
    ];
    const sheetInfo = XLSX.utils.aoa_to_sheet(instrucoes);
    sheetInfo['!cols'] = [{wch:20},{wch:55},{wch:40}];
    XLSX.utils.book_append_sheet(wb, sheetInfo, 'Instrucoes');

    const safeName = (title || 'CronoCampo').replace(/[^a-zA-Z0-9 \-_]/g,'');
    XLSX.writeFile(wb, safeName + '_Cronograma.xlsx');
    showToast('Planilha exportada com sucesso!','success');
  }

  function today(unit, add) {
    return dayjs().add(add, unit).format('DD/MM/YYYY');
  }

  /* ================================================================
     GOOGLE SHEETS INTEGRATION
     ================================================================ */
  let _sheetsUrl = '';
  let _sheetsId  = '';

  function loadConfig() {
    _sheetsUrl = localStorage.getItem('cc_sheets_url') || '';
    _sheetsId  = localStorage.getItem('cc_sheets_id')  || '';
    const urlEl = document.getElementById('sheetsUrl');
    const idEl  = document.getElementById('sheetsId');
    if (urlEl) urlEl.value = _sheetsUrl;
    if (idEl)  idEl.value  = _sheetsId;
  }

  function saveConfig() {
    _sheetsUrl = document.getElementById('sheetsUrl')?.value.trim() || '';
    _sheetsId  = document.getElementById('sheetsId')?.value.trim()  || '';
    localStorage.setItem('cc_sheets_url', _sheetsUrl);
    localStorage.setItem('cc_sheets_id',  _sheetsId);
  }

  async function testConnection() {
    saveConfig();
    if (!_sheetsUrl) { showToast('Insira a URL do Apps Script.','error'); return; }
    try {
      showToast('Testando conexão…','');
      const res = await fetch(_sheetsUrl + '?action=ping', { mode:'cors' });
      const json = await res.json();
      if (json.status === 'ok') {
        showToast('Conexão bem-sucedida! ✓','success');
      } else {
        showToast('Resposta inesperada do servidor.','error');
      }
    } catch(e) {
      showToast('Erro de conexão. Verifique a URL e as permissões CORS.','error');
    }
  }

  async function pushToSheets() {
    saveConfig();
    if (!_sheetsUrl) { showToast('Insira a URL do Apps Script.','error'); return; }
    try {
      showToast('Enviando dados para Google Sheets…','');
      const rows    = Store.toExportRows();
      const payload = JSON.stringify({ action:'write', data: rows });
      const url     = _sheetsUrl + '?action=write&data=' + encodeURIComponent(payload);
      const res     = await fetch(url, { method:'GET', mode:'cors' });
      const json    = await res.json();
      if (json.status === 'ok') {
        showToast('Dados enviados para o Google Sheets! ✓','success');
      } else {
        showToast('Erro: ' + (json.message||'resposta inesperada'),'error');
      }
    } catch(e) {
      showToast('Erro ao enviar: ' + e.message,'error');
    }
  }

  async function pullFromSheets() {
    saveConfig();
    if (!_sheetsUrl) { showToast('Insira a URL do Apps Script.','error'); return; }
    try {
      showToast('Carregando dados do Google Sheets…','');
      const res  = await fetch(_sheetsUrl + '?action=read', { mode:'cors' });
      const json = await res.json();
      if (json.status === 'ok' && json.data) {
        const rows = json.data;
        Store.loadFromRows(rows);
        Store.save();
        Gantt.refresh();
        App.renderDashboard();
        showToast(`${rows.length} registros carregados do Google Sheets!`,'success');
        closeModal('sheetsOverlay');
      } else {
        showToast('Erro ao ler dados: ' + (json.message||'vazio'),'error');
      }
    } catch(e) {
      showToast('Erro ao carregar: ' + e.message,'error');
    }
  }

  /* ---- Apps Script code snippet ---- */
  function getAppsScriptCode() {
    return `// Cole este código no seu Google Apps Script
// (Extensions → Apps Script → New project)

const SHEET_NAME = 'Cronograma';

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'ping') return jsonResp({status:'ok'});
  if (action === 'read') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data  = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1).map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    });
    return jsonResp({status:'ok', data:rows});
  }
  return jsonResp({status:'error', message:'Ação desconhecida'});
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.action === 'write') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME) ||
                  SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);
    const rows  = body.data;
    if (!rows.length) return jsonResp({status:'ok'});
    const headers = Object.keys(rows[0]);
    sheet.clearContents();
    sheet.appendRow(headers);
    rows.forEach(r => sheet.appendRow(headers.map(h => r[h] || '')));
    return jsonResp({status:'ok'});
  }
  return jsonResp({status:'error', message:'Ação desconhecida'});
}

function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;
  }

  /* ---- Date parsing helpers ---- */
  function parseExcelDate(val) {
    if (!val && val !== 0) return null;
    if (val instanceof Date) return dayjs(val).format('YYYY-MM-DD');
    if (typeof val === 'number') {
      return dayjs(new Date((val - 25569) * 86400 * 1000)).format('YYYY-MM-DD');
    }
    const s = String(val).trim();
    // DD/MM/YYYY
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    // YYYY-MM-DD
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return s.slice(0,10);
    // DD-MM-YYYY
    m = s.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const d = dayjs(s);
    return d.isValid() ? d.format('YYYY-MM-DD') : null;
  }

  function normalizeStatus(s) {
    const l = s.toLowerCase().replace(/\s/g,'');
    if (l.includes('andamento')||l.includes('progress')) return 'Em andamento';
    if (l.includes('conclu'))   return 'Concluído';
    if (l.includes('cancel'))   return 'Cancelado';
    if (l.includes('manu'))     return 'Manutenção';
    return 'Planejado';
  }

  return {
    importFile, exportExcel,
    loadConfig, saveConfig,
    testConnection, pushToSheets, pullFromSheets,
    getAppsScriptCode,
    parseExcelDate, normalizeStatus,
  };
})();