(function(root){
'use strict';
const Charts=typeof module!=='undefined'&&module.exports?require('./unam-area4-charts'):root.UnamCharts;
function validGraphic(q){if(q.grafico===undefined)return true;try{return !!Charts&&Charts.validate(q.grafico)===true;}catch(e){return false;}}
const QUOTAS={'Español':18,'Matemáticas':22,'Física':10,'Química':10,'Biología':10,'Literatura':10,'Geografía':10,'Historia Universal':10,'Historia de México':10,'Filosofía':10};
function validReading(q){
 if(q.lectura===undefined)return true;
 const r=q.lectura;
 return q.categoria==='Español'&&r!==null&&typeof r==='object'&&!Array.isArray(r)&&typeof r.id==='string'&&/^lectura-[a-z0-9-]+$/.test(r.id)&&typeof r.titulo==='string'&&r.titulo.trim().length>0&&r.titulo.length<=180&&typeof r.texto==='string'&&r.texto.trim().length>=100&&r.texto.length<=20000&&Number.isInteger(r.orden)&&r.orden>=1&&r.orden<=5;
}
function readingGroups(questions,expected,contiguous=false){
 const groups=new Map();
 for(let i=0;i<questions.length;i++){
  const q=questions[i];if(!validReading(q))throw Error('Lectura inválida: '+q.id);
  if(q.lectura){let g=groups.get(q.lectura.id);if(!g){g=[];groups.set(q.lectura.id,g);}g.push({q,index:i});}
 }
 if(!groups.size)return groups;
 if(groups.size!==expected)throw Error('Cantidad incorrecta de bloques de lectura.');
 for(const g of groups.values()){
  if(g.length!==5||new Set(g.map(x=>x.q.lectura.orden)).size!==5)throw Error('Bloque de lectura incompleto.');
  const first=g[0].q.lectura;
  if(g.some(x=>x.q.lectura.texto!==first.texto||x.q.lectura.titulo!==first.titulo))throw Error('Texto inconsistente en el bloque.');
  if(contiguous&&g.some((x,i)=>x.index!==g[0].index+i||x.q.lectura.orden!==i+1))throw Error('Bloque de lectura fuera de orden.');
 }
 return groups;
}
function shuffle(a,rng=Math.random){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function validate(bank){if(!Array.isArray(bank))throw Error('El banco no es una lista.');const ids=new Set();for(const q of bank){if(!validReading(q))throw Error('Lectura inválida: '+q.id);if(!validGraphic(q))throw Error('Gráfica inválida: '+q.id);if(!q.id||ids.has(q.id))throw Error('Identificador repetido o vacío.');ids.add(q.id);if(!(q.categoria in QUOTAS)||!q.pregunta||!q.explicacion||Object.keys(q.opciones||{}).sort().join('')!=='abcd'||!['a','b','c','d'].includes(q.respuesta)||!q.opciones[q.respuesta]||new Set(Object.values(q.opciones)).size!==4)throw Error('Pregunta inválida: '+q.id);}const factor=bank.length/120;if(!Number.isInteger(factor)||factor<3)throw Error('El banco debe cubrir al menos tres exámenes completos.');for(const [s,n] of Object.entries(QUOTAS))if(bank.filter(q=>q.categoria===s).length!==n*factor)throw Error('Cantidad incorrecta: '+s);readingGroups(bank,factor);return true;}
function select(bank,seen={},rng=Math.random){
 let selected=[];
 const next=Object.fromEntries(Object.entries(seen||{}).filter(([k,n])=>Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER));
 const groups=readingGroups(bank,bank.length/120);
 const leastUsed=pool=>shuffle(pool,rng).sort((a,b)=>(next[a.id]||0)-(next[b.id]||0));
 for(const [subject,count] of Object.entries(QUOTAS)){
  let take;
  if(subject==='Español'&&groups.size){
   const candidates=shuffle([...groups.values()],rng);
   const usage=g=>Math.max(...g.map(x=>next[x.q.id]||0));
   candidates.sort((a,b)=>usage(a)-usage(b));
   const block=candidates[0].map(x=>x.q).sort((a,b)=>a.lectura.orden-b.lectura.orden);
   take=leastUsed(bank.filter(q=>q.categoria===subject&&!q.lectura)).slice(0,count-5);
   const offset=Math.floor(rng()*(take.length+1));take.splice(offset,0,...block);
  }else take=leastUsed(bank.filter(q=>q.categoria===subject)).slice(0,count);
  for(const q of take)next[q.id]=(next[q.id]||0)+1;
  selected.push(...take.map(q=>({...q,...(q.lectura?{lectura:{...q.lectura}}:{}),order:shuffle(['a','b','c','d'],rng)})));
 }
 return {questions:selected,seen:next};
}
function stats(session){let total={correct:0,wrong:0,blank:0,total:session.questions.length},subjects={};for(let i=0;i<session.questions.length;i++){let q=session.questions[i],s=subjects[q.categoria]||(subjects[q.categoria]={correct:0,wrong:0,blank:0,total:0});s.total++;let key=!session.answers[i]?'blank':session.answers[i]===q.respuesta?'correct':'wrong';s[key]++;total[key]++;}return {total,subjects};}
function validSession(s){
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
if(!record(s)||s.version!==1||!['study','exam'].includes(s.mode)||!Array.isArray(s.questions)||s.questions.length!==120||!record(s.answers)||!record(s.flags)||!Number.isInteger(s.index)||s.index<0||s.index>=120||(s.mode==='exam'&&!Number.isFinite(s.deadline)))return false;
if(!s.questions.every(q=>record(q)&&validGraphic(q)&&validReading(q)&&typeof q.id==='string'&&q.id&&typeof q.pregunta==='string'&&q.pregunta&&q.categoria in QUOTAS&&record(q.opciones)&&Object.keys(q.opciones).sort().join('')==='abcd'&&Object.values(q.opciones).every(v=>typeof v==='string'&&v)&&typeof q.explicacion==='string'&&['a','b','c','d'].includes(q.respuesta)&&q.opciones[q.respuesta]&&Array.isArray(q.order)&&q.order.length===4&&new Set(q.order).size===4&&q.order.every(k=>typeof k==='string'&&['a','b','c','d'].includes(k))))return false;
if(new Set(s.questions.map(q=>q.id)).size!==120)return false;
try{readingGroups(s.questions,1,true);}catch(e){return false;}
for(const [subject,n]of Object.entries(QUOTAS))if(s.questions.filter(q=>q.categoria===subject).length!==n)return false;
const validIndex=k=>/^(0|[1-9][0-9]*)$/.test(k)&&Number(k)<120;
return Object.entries(s.answers).every(([k,v])=>validIndex(k)&&['a','b','c','d'].includes(v))&&Object.entries(s.flags).every(([k,v])=>validIndex(k)&&typeof v==='boolean');
}
function historyCSV(history){const rows=[['Fecha UTC','Modo','Materia','Aciertos','Incorrectas','Sin responder','Total']];for(const h of history){const result=stats(h),date=new Date(h.finishedAt),when=Number.isNaN(date.getTime())?'Fecha no válida':date.toISOString(),mode=h.mode==='exam'?'Examen':'Estudio';for(const [name,t] of [['TOTAL',result.total],...Object.entries(result.subjects)])rows.push([when,mode,name,t.correct,t.wrong,t.blank,t.total]);}return '\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');}
const api={QUOTAS,shuffle,validate,select,stats,validSession,historyCSV};if(typeof module!=='undefined')module.exports=api;root.UnamCore=api;
})(typeof window==='undefined'?globalThis:window);
