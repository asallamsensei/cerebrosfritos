(function(root){
'use strict';
const QUOTAS={'Español':18,'Matemáticas':22,'Física':10,'Química':10,'Biología':10,'Literatura':10,'Geografía':10,'Historia Universal':10,'Historia de México':10,'Filosofía':10};
function shuffle(a,rng=Math.random){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function validate(bank){if(!Array.isArray(bank))throw Error('El banco no es una lista.');const ids=new Set();for(const q of bank){if(!q.id||ids.has(q.id))throw Error('Identificador repetido o vacío.');ids.add(q.id);if(!(q.categoria in QUOTAS)||!q.pregunta||!q.explicacion||Object.keys(q.opciones||{}).sort().join('')!=='abcd'||!q.opciones[q.respuesta]||new Set(Object.values(q.opciones)).size!==4)throw Error('Pregunta inválida: '+q.id);}for(const [s,n] of Object.entries(QUOTAS))if(bank.filter(q=>q.categoria===s).length!==n*3)throw Error('Cantidad incorrecta: '+s);return true;}
function select(bank,seen={},rng=Math.random){let selected=[];const next={...seen};for(const [subject,count] of Object.entries(QUOTAS)){let pool=shuffle(bank.filter(q=>q.categoria===subject),rng);pool.sort((a,b)=>(next[a.id]||0)-(next[b.id]||0));let take=pool.slice(0,count);for(const q of take)next[q.id]=(next[q.id]||0)+1;selected.push(...take.map(q=>({...q,order:shuffle(['a','b','c','d'],rng)})));}return {questions:selected,seen:next};}
function stats(session){let total={correct:0,wrong:0,blank:0,total:session.questions.length},subjects={};for(let i=0;i<session.questions.length;i++){let q=session.questions[i],s=subjects[q.categoria]||(subjects[q.categoria]={correct:0,wrong:0,blank:0,total:0});s.total++;let key=!session.answers[i]?'blank':session.answers[i]===q.respuesta?'correct':'wrong';s[key]++;total[key]++;}return {total,subjects};}
function validSession(s){
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
if(!record(s)||s.version!==1||!['study','exam'].includes(s.mode)||!Array.isArray(s.questions)||s.questions.length!==120||!record(s.answers)||!record(s.flags)||!Number.isInteger(s.index)||s.index<0||s.index>=120||(s.mode==='exam'&&!Number.isFinite(s.deadline)))return false;
if(!s.questions.every(q=>record(q)&&typeof q.id==='string'&&q.id&&typeof q.pregunta==='string'&&q.pregunta&&q.categoria in QUOTAS&&record(q.opciones)&&Object.keys(q.opciones).sort().join('')==='abcd'&&Object.values(q.opciones).every(v=>typeof v==='string'&&v)&&typeof q.explicacion==='string'&&q.opciones[q.respuesta]&&Array.isArray(q.order)&&q.order.length===4&&new Set(q.order).size===4&&q.order.every(k=>typeof k==='string'&&['a','b','c','d'].includes(k))))return false;
if(new Set(s.questions.map(q=>q.id)).size!==120)return false;
for(const [subject,n]of Object.entries(QUOTAS))if(s.questions.filter(q=>q.categoria===subject).length!==n)return false;
const validIndex=k=>/^(0|[1-9][0-9]*)$/.test(k)&&Number(k)<120;
return Object.entries(s.answers).every(([k,v])=>validIndex(k)&&['a','b','c','d'].includes(v))&&Object.entries(s.flags).every(([k,v])=>validIndex(k)&&typeof v==='boolean');
}
const api={QUOTAS,shuffle,validate,select,stats,validSession};if(typeof module!=='undefined')module.exports=api;root.UnamCore=api;
})(typeof window==='undefined'?globalThis:window);
