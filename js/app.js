const DATA_URL = 'data/ciclos_campo_anonimizados.csv';
const COLORS = { Carga:'#4ca7ff', 'Viaje cargado':'#48d5e6', Descarga:'#f4b740', Retorno:'#7588ff', Demoras:'#ff6b6b' };
const componentFields = {
  Carga:'tiempo_carga_min',
  'Viaje cargado':'tiempo_viaje_cargado_min',
  Descarga:'tiempo_descarga_min',
  Retorno:'tiempo_retorno_min',
  Demoras:'demoras_min'
};
const numericFields = ['id_ciclo','distancia_km','toneladas','tiempo_carga_min','tiempo_viaje_cargado_min','tiempo_descarga_min','tiempo_retorno_min','demoras_min','tiempo_ciclo_total_min','productividad_tph'];
let allRows = [];
let lastScenarioRows = [];

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const headers = lines.shift().split(',').map(v => v.trim());
  return lines.map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h,i) => row[h] = values[i]);
    numericFields.forEach(f => row[f] = Number(row[f]));
    return row;
  });
}

const fmt = (n,d=2) => Number(n).toLocaleString('es-PE',{minimumFractionDigits:d,maximumFractionDigits:d});
const mean = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
const unique = arr => [...new Set(arr)].sort();

function computeKpis(rows) {
  const totalTonnes = rows.reduce((s,r)=>s+r.toneladas,0);
  const totalCycle = rows.reduce((s,r)=>s+r.tiempo_ciclo_total_min,0);
  const componentMeans = {};
  Object.entries(componentFields).forEach(([label,field]) => componentMeans[label]=mean(rows.map(r=>r[field])));
  return {
    validCycles: rows.length,
    totalTonnes,
    averagePayload: mean(rows.map(r=>r.toneladas)),
    weightedProductivity: totalTonnes/(totalCycle/60),
    averageCycleProductivity: mean(rows.map(r=>r.productividad_tph)),
    averageCycleTime: mean(rows.map(r=>r.tiempo_ciclo_total_min)),
    averageDistance: mean(rows.map(r=>r.distancia_km)),
    averageDelays: componentMeans.Demoras,
    tonneKm: rows.reduce((s,r)=>s+r.toneladas*r.distancia_km,0),
    componentMeans,
    tonnes8h: totalTonnes/(totalCycle/60)*8
  };
}

function scenarioInputs() {
  return {
    payload:Number(document.querySelector('#payloadSlider').value),
    load:Number(document.querySelector('#loadSlider').value),
    loaded:Number(document.querySelector('#loadedSlider').value),
    unload:Number(document.querySelector('#unloadSlider').value),
    returning:Number(document.querySelector('#returnSlider').value),
    delay:Number(document.querySelector('#delaySlider').value)
  };
}

function simulate(rows, inputs) {
  return rows.map(r => {
    const copy = {...r};
    copy.toneladas = r.toneladas*(1+inputs.payload/100);
    copy.tiempo_carga_min = r.tiempo_carga_min*(1-inputs.load/100);
    copy.tiempo_viaje_cargado_min = r.tiempo_viaje_cargado_min*(1-inputs.loaded/100);
    copy.tiempo_descarga_min = r.tiempo_descarga_min*(1-inputs.unload/100);
    copy.tiempo_retorno_min = r.tiempo_retorno_min*(1-inputs.returning/100);
    copy.demoras_min = r.demoras_min*(1-inputs.delay/100);
    copy.tiempo_ciclo_total_min = copy.tiempo_carga_min+copy.tiempo_viaje_cargado_min+copy.tiempo_descarga_min+copy.tiempo_retorno_min+copy.demoras_min;
    copy.productividad_tph = copy.toneladas/(copy.tiempo_ciclo_total_min/60);
    return copy;
  });
}

function filteredRows() {
  const truck = document.querySelector('#truckFilter').value;
  const shovel = document.querySelector('#shovelFilter').value;
  const shift = document.querySelector('#shiftFilter').value;
  const minDistance = Number(document.querySelector('#distanceMin').value);
  const maxDistance = Number(document.querySelector('#distanceMax').value);
  return allRows.filter(r =>
    (truck==='Todos'||r.modelo_camion===truck) &&
    (shovel==='Todas'||r.pala===shovel) &&
    (shift==='Todos'||r.turno===shift) &&
    r.distancia_km>=minDistance && r.distancia_km<=maxDistance
  );
}

function setOptions(id, values, allLabel) {
  const select = document.querySelector(id);
  select.innerHTML = `<option>${allLabel}</option>` + values.map(v=>`<option>${v}</option>`).join('');
}

function updateSliderLabels() {
  const ids = [['payloadSlider','payloadValue',false],['loadSlider','loadValue',true],['loadedSlider','loadedValue',true],['unloadSlider','unloadValue',true],['returnSlider','returnValue',true],['delaySlider','delayValue',true]];
  ids.forEach(([slider,label,reduction]) => {
    const value = Number(document.querySelector('#'+slider).value);
    const prefix = reduction && value>0 ? '−' : value>0 && !reduction ? '+' : '';
    document.querySelector('#'+label).textContent = `${prefix}${fmt(Math.abs(value), value%1===0?0:1)}%`;
  });
}

function renderKpis(base, scenario) {
  const prodDelta = (scenario.weightedProductivity/base.weightedProductivity-1)*100;
  const cycleDelta = scenario.averageCycleTime-base.averageCycleTime;
  const delayDelta = scenario.averageDelays-base.averageDelays;
  const data = [
    ['Productividad ponderada',`${fmt(scenario.weightedProductivity)} t/h`,`${prodDelta>=0?'+':''}${fmt(prodDelta)}%`,prodDelta>0?'up':'', '#38d39f'],
    ['Tiempo de ciclo',`${fmt(scenario.averageCycleTime)} min`,`${cycleDelta>=0?'+':''}${fmt(cycleDelta)} min`,cycleDelta<0?'up':cycleDelta>0?'down':'', '#f4b740'],
    ['Payload',`${fmt(scenario.averagePayload)} t/ciclo`,'Base medida','', '#4ca7ff'],
    ['Demoras',`${fmt(scenario.averageDelays)} min`,`${delayDelta>=0?'+':''}${fmt(delayDelta)} min`,delayDelta<0?'up':delayDelta>0?'down':'', '#ff6b6b'],
    ['Distancia media',`${fmt(scenario.averageDistance)} km`,'Campo','', '#48d5e6'],
    ['Ciclos válidos',`${scenario.validCycles}`,'Depurados','', '#7588ff']
  ];
  document.querySelector('#kpiGrid').innerHTML = data.map(([label,value,delta,cls,color])=>`
    <article class="kpi-card" style="--accent:${color}">
      <div class="kpi-label">${label.toUpperCase()}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-delta ${cls}">${delta}</div>
    </article>`).join('');
}

function renderComposition(base, scenario) {
  const labels = Object.keys(componentFields);
  const total = obj => labels.reduce((s,l)=>s+obj.componentMeans[l],0);
  const row = (name,obj) => `<div class="composition-row"><div class="composition-label">${name}</div><div class="stack">${labels.map(l=>`<span title="${l}: ${fmt(obj.componentMeans[l])} min" style="width:${obj.componentMeans[l]/total(obj)*100}%;background:${COLORS[l]}"></span>`).join('')}</div><strong>${fmt(total(obj))} min</strong></div>`;
  document.querySelector('#cycleComposition').innerHTML = row('BASE',base)+row('ESCENARIO',scenario)+`<div class="legend">${labels.map(l=>`<span class="legend-item"><span class="legend-dot" style="background:${COLORS[l]}"></span>${l}</span>`).join('')}</div>`;
}

function groupedProductivity(rows, field) {
  const groups = {};
  rows.forEach(r => (groups[r[field]] ||= []).push(r));
  return Object.entries(groups).map(([label,subset]) => ({label,value:computeKpis(subset).weightedProductivity})).sort((a,b)=>b.value-a.value);
}

function renderBarChart(id,data) {
  const max = Math.max(...data.map(d=>d.value),1);
  document.querySelector(id).innerHTML = data.map(d=>`<div class="bar-row"><div class="bar-label">${d.label}</div><div class="bar-track"><div class="bar-fill" style="width:${d.value/max*100}%"></div></div><div class="bar-value">${fmt(d.value,1)} t/h</div></div>`).join('');
}

function classify(pct) {
  if (Math.abs(pct)<0.005) return 'LÍNEA BASE';
  if (pct<2) return 'MEJORA MARGINAL';
  if (pct<5) return 'MEJORA MODERADA';
  if (pct<=10) return 'MEJORA SIGNIFICATIVA';
  return 'ESCENARIO AGRESIVO';
}

function renderResult(base, scenario) {
  const inputs = scenarioInputs();
  const pct = (scenario.weightedProductivity/base.weightedProductivity-1)*100;
  const saved = base.averageCycleTime-scenario.averageCycleTime;
  const extra = scenario.tonnes8h-base.tonnes8h;
  const savings = {
    Carga:base.componentMeans.Carga-scenario.componentMeans.Carga,
    'Viaje cargado':base.componentMeans['Viaje cargado']-scenario.componentMeans['Viaje cargado'],
    Descarga:base.componentMeans.Descarga-scenario.componentMeans.Descarga,
    Retorno:base.componentMeans.Retorno-scenario.componentMeans.Retorno,
    Demoras:base.componentMeans.Demoras-scenario.componentMeans.Demoras
  };
  const dominant = Object.entries(savings).sort((a,b)=>b[1]-a[1])[0];
  const driver = dominant[1] > 0.0001 ? dominant[0] : (inputs.payload!==0?'Payload':'—');
  document.querySelector('#improvementIndex').textContent = `${pct>=0?'+':''}${fmt(pct)}%`;
  document.querySelector('#classification').textContent = classify(pct);
  document.querySelector('#savedMinutes').textContent = `${fmt(saved)} min`;
  document.querySelector('#extraTonnes').textContent = `${extra>=0?'+':''}${fmt(extra,1)} t`;
  document.querySelector('#dominantDriver').textContent = driver;
  const aggressive = Math.max(inputs.load,inputs.loaded,inputs.unload,inputs.returning,inputs.delay)>20 || pct>10;
  document.querySelector('#interpretation').textContent = `El escenario modifica la productividad ponderada de ${fmt(base.weightedProductivity)} a ${fmt(scenario.weightedProductivity)} t/h (${pct>=0?'+':''}${fmt(pct)}%). Se recuperan ${fmt(saved)} minutos por ciclo y la mayor contribución directa proviene de ${driver.toLowerCase()}. ${aggressive?'El nivel de intervención es agresivo y requiere validación operacional antes de su aplicación.':'El resultado es una proyección determinística y debe contrastarse con condiciones operacionales reales.'}`;
}

function sensitivityRows(rows, parameter) {
  const max = parameter==='Demoras'?50:20;
  const levels = [0,max*.2,max*.4,max*.6,max*.8,max];
  return levels.map(level => {
    const inputs={payload:0,load:0,loaded:0,unload:0,returning:0,delay:0};
    const key={Carga:'load','Viaje cargado':'loaded',Descarga:'unload',Retorno:'returning',Demoras:'delay'}[parameter];
    inputs[key]=level;
    return {level,value:computeKpis(simulate(rows,inputs)).weightedProductivity};
  });
}

function renderSensitivity(rows) {
  const parameter = document.querySelector('#sensitivityParameter').value;
  const points = sensitivityRows(rows,parameter);
  const width=900,height=220,pad=44;
  const min=Math.min(...points.map(p=>p.value))*0.98,max=Math.max(...points.map(p=>p.value))*1.02;
  const x = i => pad+i*(width-2*pad)/(points.length-1);
  const y = v => height-pad-(v-min)/(max-min)*(height-2*pad);
  const poly = points.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ');
  document.querySelector('#sensitivityChart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Curva de sensibilidad"><line x1="${pad}" y1="${height-pad}" x2="${width-pad}" y2="${height-pad}" stroke="#25394a"/><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height-pad}" stroke="#25394a"/><polyline fill="none" stroke="#38d39f" stroke-width="4" points="${poly}"/>${points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.value)}" r="5" fill="#38d39f"/><text x="${x(i)}" y="${height-14}" text-anchor="middle" fill="#8ea4b8" font-size="12">${fmt(p.level,0)}%</text><text x="${x(i)}" y="${y(p.value)-12}" text-anchor="middle" fill="#edf4fa" font-size="12" font-weight="700">${fmt(p.value,1)}</text>`).join('')}</svg>`;
}

function downloadScenario() {
  const headers = Object.keys(lastScenarioRows[0]);
  const csv = [headers.join(','),...lastScenarioRows.map(r=>headers.map(h=>r[h]).join(','))].join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='milla_escenario_simulado.csv'; a.click(); URL.revokeObjectURL(a.href);
}

function updateDashboard() {
  updateSliderLabels();
  const rows = filteredRows();
  if (!rows.length) { document.querySelector('#kpiGrid').innerHTML='<div class="error">Los filtros no contienen ciclos válidos.</div>'; return; }
  const base=computeKpis(rows);
  lastScenarioRows=simulate(rows,scenarioInputs());
  const scenario=computeKpis(lastScenarioRows);
  renderKpis(base,scenario);
  renderComposition(base,scenario);
  renderResult(base,scenario);
  renderBarChart('#truckChart',groupedProductivity(rows,'modelo_camion'));
  renderBarChart('#shovelChart',groupedProductivity(rows,'pala'));
  renderSensitivity(rows);
}

function resetControls() {
  ['truckFilter','shiftFilter'].forEach(id=>document.querySelector('#'+id).selectedIndex=0);
  document.querySelector('#shovelFilter').selectedIndex=0;
  document.querySelector('#distanceMin').value=Math.min(...allRows.map(r=>r.distancia_km));
  document.querySelector('#distanceMax').value=Math.max(...allRows.map(r=>r.distancia_km));
  ['payloadSlider','loadSlider','loadedSlider','unloadSlider','returnSlider','delaySlider'].forEach(id=>document.querySelector('#'+id).value=0);
  updateDashboard();
}

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`No se pudo cargar la base (${response.status})`);
    allRows=parseCSV(await response.text());
    setOptions('#truckFilter',unique(allRows.map(r=>r.modelo_camion)),'Todos');
    setOptions('#shovelFilter',unique(allRows.map(r=>r.pala)),'Todas');
    setOptions('#shiftFilter',unique(allRows.map(r=>r.turno)),'Todos');
    document.querySelector('#distanceMin').value=Math.min(...allRows.map(r=>r.distancia_km));
    document.querySelector('#distanceMax').value=Math.max(...allRows.map(r=>r.distancia_km));
    document.querySelectorAll('select,input').forEach(el=>el.addEventListener('input',updateDashboard));
    document.querySelector('#resetBtn').addEventListener('click',resetControls);
    document.querySelector('#downloadBtn').addEventListener('click',downloadScenario);
    updateDashboard();
  } catch (error) {
    document.querySelector('main').innerHTML=`<div class="error">${error.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded',init);
