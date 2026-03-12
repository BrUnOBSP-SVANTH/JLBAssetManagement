const navLinks = [
  ['Home','index.html'],['Mercado','mercado.html'],['Ações','acoes.html'],['ETFs','etfs.html'],['Renda Fixa','renda-fixa.html'],['Simulador','simulador.html'],['Derivativos','derivativos.html'],['Estatísticas','estatisticas.html'],['Educação','educacao.html'],['Calculadoras','calculadoras.html'],['Dashboard','dashboard.html'],['Sobre','sobre.html'],['Contato','contato.html']
];
function buildLayout(active){
  const nav = document.getElementById('main-nav');
  if (nav) nav.innerHTML = navLinks.map(([t,h]) => `<a class="${h===active?'active':''}" href="${h}">${t}</a>`).join('');
  const year = document.getElementById('year'); if(year) year.textContent = new Date().getFullYear();
}
const brl = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const pct = n => `${n.toFixed(2)}%`;

function lineChart(id, labels, data, label='Evolução'){
  const el = document.getElementById(id); if(!el || !window.Chart) return;
  new Chart(el,{type:'line',data:{labels,datasets:[{label,data,borderColor:'#00a8ff',backgroundColor:'rgba(0,168,255,.15)',fill:true,tension:.3}]},options:{plugins:{legend:{labels:{color:'#e6edf7'}}},scales:{x:{ticks:{color:'#9fb2cf'}},y:{ticks:{color:'#9fb2cf'}}}}});
}
function barChart(id, labels, data){
  const el = document.getElementById(id); if(!el || !window.Chart) return;
  new Chart(el,{type:'bar',data:{labels,datasets:[{label:'Percentual',data,backgroundColor:['#00a8ff','#d4af37','#2fd67a','#ff5e7a','#5f7cff']}]},options:{plugins:{legend:{labels:{color:'#e6edf7'}}},scales:{x:{ticks:{color:'#9fb2cf'}},y:{ticks:{color:'#9fb2cf'}}}}});
}

function setupSimuladores(){
  const form = document.getElementById('sim-form');
  if(form){
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const c = +document.getElementById('capital').value;
      const aporte = +document.getElementById('aporte').value;
      const anos = +document.getElementById('anos').value;
      const taxa = +document.getElementById('taxa').value/100;
      let total = c; const points=[]; const labels=[];
      for(let m=1;m<=anos*12;m++){ total = total*(1+taxa/12)+aporte; if(m%12===0){points.push(total);labels.push(`${m/12}a`);} }
      document.getElementById('sim-result').innerHTML = `<strong>Valor final:</strong> ${brl.format(total)}<br><strong>Rentabilidade:</strong> ${pct(((total-(c+aporte*anos*12))/(c+aporte*anos*12))*100)}`;
      lineChart('sim-chart',labels,points,'Crescimento');
    });
  }

  const cdb = document.getElementById('cdb-form');
  if(cdb){
    cdb.addEventListener('submit',e=>{
      e.preventDefault();
      const inicial = +document.getElementById('cdb-capital').value;
      const anos = +document.getElementById('cdb-prazo').value;
      const cdi = 0.105, taxa = cdi*1.04;
      const montante = inicial*Math.pow(1+taxa,anos);
      document.getElementById('cdb-result').textContent = `CDB 104% CDI estimado: ${brl.format(montante)} (${anos} ano(s)).`;
    });
  }

  const corr = document.getElementById('corr-form');
  if(corr){
    corr.addEventListener('submit',e=>{
      e.preventDefault();
      const x = document.getElementById('serieX').value.split(',').map(Number);
      const y = document.getElementById('serieY').value.split(',').map(Number);
      if(x.length!==y.length){document.getElementById('corr-result').textContent='As séries devem ter o mesmo tamanho.'; return;}
      const mean = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
      const mx=mean(x), my=mean(y);
      const cov = x.reduce((s,v,i)=>s+((v-mx)*(y[i]-my)),0)/x.length;
      const sx = Math.sqrt(x.reduce((s,v)=>s+((v-mx)**2),0)/x.length);
      const sy = Math.sqrt(y.reduce((s,v)=>s+((v-my)**2),0)/y.length);
      const corrv = cov/(sx*sy);
      document.getElementById('corr-result').innerHTML = `Covariância: <strong>${cov.toFixed(4)}</strong><br>Correlação: <strong>${corrv.toFixed(4)}</strong>`;
      lineChart('corr-chart',x.map((_,i)=>`P${i+1}`),x,'Ativo X');
    });
  }

  const meta = document.getElementById('meta-form');
  if(meta){
    meta.addEventListener('submit',e=>{
      e.preventDefault();
      const objetivo = +document.getElementById('objetivo').value;
      const anos = +document.getElementById('meta-anos').value;
      const taxa = +document.getElementById('meta-taxa').value/100/12;
      const n = anos*12;
      const aporte = objetivo*taxa/(Math.pow(1+taxa,n)-1);
      document.getElementById('meta-result').textContent = `Aporte mensal estimado: ${brl.format(aporte)}.`;
    });
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  const active = document.body.dataset.page || 'index.html';
  buildLayout(active);
  setupSimuladores();

  lineChart('homeChart',['Jan','Fev','Mar','Abr','Mai','Jun'],[100,106,101,112,118,121],'Índice Global');
  lineChart('marketChart',['09h','10h','11h','12h','13h','14h','15h','16h'],[100,102,98,101,105,108,106,109],'Mercado Intraday');
  lineChart('stockChart',['2019','2020','2021','2022','2023','2024'],[40,58,75,63,91,118],'Ação Selecionada');
  lineChart('etfChart',['2019','2020','2021','2022','2023','2024'],[100,112,131,122,138,154],'ETF Histórico');
  barChart('statsChart',['Bolsa','Renda Fixa','Poupança','Não investem'],[18,29,34,19]);
  barChart('brIntChart',['Brasil','EUA','Europa'],[38,61,54]);
  lineChart('dashboardChart',['M1','M2','M3','M4','M5','M6'],[30000,30780,31550,32320,33400,34210],'Carteira');
});
