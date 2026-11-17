/* Optional, dependency-free charts. User strings enter only textContent. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.UnamCharts=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';let sequence=0;
const NS='http://www.w3.org/2000/svg';
function text(value,name,max){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Texto inválido: '+name);return value;}
function validate(s){
 if(!s||!['line','bar'].includes(s.type))throw Error('Tipo inválido');
 text(s.title,'title',180);text(s.xLabel,'xLabel',80);text(s.yLabel,'yLabel',80);
 if(!Array.isArray(s.points)||s.points.length<2||s.points.length>12)throw Error('Se requieren 2–12 puntos');
 let last=-Infinity;const labels=new Set();
 for(const p of s.points){if(!p||typeof p.y!=='number'||!Number.isFinite(p.y)||Math.abs(p.y)>1e12)throw Error('y inválida');
  if(s.type==='line'){if(typeof p.x!=='number'||!Number.isFinite(p.x)||Math.abs(p.x)>1e12||p.x<=last)throw Error('x debe crecer estrictamente');last=p.x;}
  else {text(p.label,'label',28);if(labels.has(p.label))throw Error('Categorías repetidas');labels.add(p.label);}}
 return true;
}
function format(n){return Number(n.toPrecision(6)).toLocaleString('es',{maximumSignificantDigits:6});}
function render(s,doc){validate(s);doc=doc||(typeof document!=='undefined'?document:null);if(!doc)throw Error('Documento requerido');
 const W=720,L=90,R=30,T=40,pw=W-L-R;
 const labelWidth=pw/s.points.length-12,charWidth=c=>/[MWmw@#%]/.test(c)?14:/[ilI.,:;!|' ]/.test(c)?4:10;
 const labels=s.type==='bar'?s.points.map(p=>{const chunks=[];let rest=p.label;while(rest){let cut=0,width=0;while(cut<rest.length&&width+charWidth(rest[cut])<=labelWidth){width+=charWidth(rest[cut++]);}if(cut>=rest.length){chunks.push(rest);break;}const space=rest.lastIndexOf(' ',cut);if(space>0)cut=space;cut=Math.max(1,cut);chunks.push(rest.slice(0,cut));rest=rest.slice(cut).trimStart();}return chunks;}):[];
 const B=s.type==='bar'?Math.max(100,50+18*Math.max(...labels.map(a=>a.length))):100,H=310+B,ph=H-T-B,id='unam-chart-'+(++sequence);
 const el=(tag,str)=>{const e=doc.createElement(tag);if(str!==undefined)e.textContent=str;return e;};
 const svgEl=(tag,attrs,str)=>{const e=doc.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs||{}))e.setAttribute(k,String(v));if(str!==undefined)e.textContent=str;return e;};
 const figure=el('figure');figure.className='unam-chart';figure.style.margin='1rem 0';
 const caption=el('figcaption',s.title);caption.id=id+'-caption';figure.append(caption);
 const svg=svgEl('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-labelledby':id+'-title','aria-describedby':id+'-desc',focusable:'false'});svg.style.width='100%';svg.style.maxWidth='720px';svg.style.height='auto';svg.style.background='#fff';svg.style.color='#14213d';
 svg.append(svgEl('title',{id:id+'-title'},s.title),svgEl('desc',{id:id+'-desc'},`${s.type==='line'?'Gráfica de líneas':'Gráfica de barras'}. Eje horizontal: ${s.xLabel}. Eje vertical: ${s.yLabel}. Los valores exactos están en la tabla de datos siguiente.`));
 let lo=Math.min(0,...s.points.map(p=>p.y)),hi=Math.max(0,...s.points.map(p=>p.y));if(lo===hi)hi=1;
 const sy=v=>T+(hi-v)/(hi-lo)*ph,base=sy(0);
 const ticks=Array.from({length:5},(_,i)=>lo+(hi-lo)*i/4).filter(v=>v===0||Math.abs(v)>=(hi-lo)/20);if(!ticks.includes(0))ticks.push(0);ticks.sort((a,b)=>a-b);for(const v of ticks){const y=sy(v);svg.append(svgEl('line',{x1:L,y1:y,x2:W-R,y2:y,stroke:'#d5dae1','stroke-width':1}),svgEl('text',{x:L-8,y:y+5,'text-anchor':'end',fill:'#14213d','font-size':14},format(v)));}
 svg.append(svgEl('line',{x1:L,y1:T,x2:L,y2:H-B,stroke:'#14213d','stroke-width':2}),svgEl('line',{x1:L,y1:base,x2:W-R,y2:base,stroke:'#14213d','stroke-width':2}));
 const coords=[];
 s.points.forEach((p,i)=>{const x=s.type==='line'?L+(p.x-s.points[0].x)/(s.points[s.points.length-1].x-s.points[0].x)*pw:L+(i+.5)*pw/s.points.length,y=sy(p.y);coords.push(`${x},${y}`);
  if(s.type==='bar'){const bw=pw/s.points.length*.65;svg.append(svgEl('rect',{x:x-bw/2,y:Math.min(y,base),width:bw,height:Math.max(0,Math.abs(y-base)),fill:'#005b96',stroke:'#14213d','stroke-width':1}));}
  const label=s.type==='line'?format(p.x):p.label;
  if(s.type==='bar'){const tx=svgEl('text',{x,y:H-B+23,fill:'#14213d','font-size':14,'text-anchor':'middle'});labels[i].forEach((part,j)=>tx.append(svgEl('tspan',{x,dy:j?18:0},part)));svg.append(tx);}else svg.append(svgEl('text',{x,y:H-B+23,fill:'#14213d','font-size':14,'text-anchor':'end',transform:`rotate(-35 ${x} ${H-B+23})`},label));
 });
 if(s.type==='line'){svg.append(svgEl('polyline',{points:coords.join(' '),fill:'none',stroke:'#005b96','stroke-width':3}));for(const xy of coords){const [cx,cy]=xy.split(',');svg.append(svgEl('circle',{cx,cy,r:5,fill:'#005b96',stroke:'#14213d'}));}}
 svg.append(svgEl('text',{x:L+pw/2,y:H-8,fill:'#14213d','font-size':16,'text-anchor':'middle'},s.xLabel),svgEl('text',{x:18,y:T+ph/2,fill:'#14213d','font-size':16,'text-anchor':'middle',transform:`rotate(-90 18 ${T+ph/2})`},s.yLabel));figure.append(svg);
 const details=el('details');details.append(el('summary','Ver tabla de datos (alternativa accesible)'));const table=el('table');table.style.borderCollapse='collapse';table.append(el('caption',s.title));const head=el('thead'),hr=el('tr');for(const label of [s.xLabel,s.yLabel]){const th=el('th',label);th.setAttribute('scope','col');hr.append(th);}head.append(hr);table.append(head);const body=el('tbody');for(const p of s.points){const tr=el('tr'),th=el('th',s.type==='line'?String(p.x):p.label);th.setAttribute('scope','row');tr.append(th,el('td',String(p.y)));body.append(tr);}table.append(body);details.append(table);figure.append(details);return figure;
}
return {validate,render};});
