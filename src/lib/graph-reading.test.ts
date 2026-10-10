import { describe, expect, it } from 'vitest';
import { interpretGraph, type ReadingContext } from './graph-reading';
import type { LabAnalysis } from './lab-analysis';
import { X_VARIABLES } from './lab-variables';
const x=X_VARIABLES[0]; if(!x) throw new Error('Variable missing');
const c:ReadingContext={x,metric:'share',year:2026,round:1,scope:'Brasil'};
function analysis(r=.6):LabAnalysis {
 const xs=Array.from({length:120},(_,i)=>i+300), ys=xs.map((_,i)=>r>0?20+i*.3:70-i*.3);
 return {totalRows:120,missing:{x:0,y:0,covariates:0,examples:[]},points:{c:xs.map(String),n:xs.map(String),u:xs.map(()=>'SP'),x:xs,y:ys},pearson:{r,n:120,p:.001,ci:r>0?[.2,.8]:[-.8,-.2]},spearman:{r,n:120,p:.001,ci:[-.8,.8]},model:null,modelNote:null};
}
function adjusted(a:LabAnalysis,estimate:number,ci:[number,number]):LabAnalysis {
 const beta={name:`log10 ${c.x.label.toLowerCase()}`,estimate,ci,se:1,seRobust:1,t:1,p:.1};
 return {...a,model:{label:'',fixedEffects:1,n:120,r2:.817,adjR2:.8,f:1,fP:.1,residualSe:1,breuschPagan:{lm:1,df:1,p:.1},vif:null,coefficients:[{...beta,name:'intercepto',estimate:900},beta,{...beta,name:'superior completo (%)'},{...beta,name:'log10 população'}]}};
}
const read=(a:LabAnalysis,ctx=c)=>interpretGraph(ctx,[{name:'Flávio Bolsonaro',id:'bolsonaro',analysis:a}]);
const text=(a:LabAnalysis,ctx=c)=>read(a,ctx).paragraphs.join(' ');
const duel=(a:LabAnalysis,b:LabAnalysis)=>interpretGraph(c,[{name:'Flávio Bolsonaro',analysis:a},{name:'Lula',analysis:b}]);
describe('journalistic integrated reading',()=>{
 it('positive performance is not leadership',()=>{const r=read(analysis());expect(r.title).toContain('votação maior');expect(r.title).not.toMatch(/lidera|vantagem/);});
 it('negative performance',()=>expect(read(analysis(-.6)).title).toContain('votação menor'));
 it('opposite signs without observed crossing do not claim leadership',()=>{const a=analysis(),b=analysis(-.6);a.points.y=a.points.x.map((_,i)=>10+i*.1);b.points.y=b.points.x.map((_,i)=>80-i*.1);const r=duel(a,b);expect(r.geometry.crossing).toBe(false);expect(r.title).not.toContain('ganha força');});
 it('same signs tell a joint story',()=>expect(duel(analysis(),analysis()).title).toContain('Flávio e Lula'));
 it.each([.03,0])('weak or constant association %s',(r)=>expect(read(analysis(r)).title).toContain('Sem padrão claro'));
 it('conflicting signs remain uncertain',()=>{const a=analysis();if(a.spearman)a.spearman.r=-.5;expect(read(a).title).toContain('Sem padrão claro');});
 it('wide interval remains uncertain',()=>{const a=analysis();if(a.pearson)a.pearson.ci=[-.3,.9];expect(read(a).title).toContain('Sem padrão claro');});
 it('no data and small sample never claim a result',()=>{const a=analysis();a.points.y=[];expect(read(a).title).toContain('Poucas cidades');a.points.y=[1,2];expect(read(a).title).toContain('Poucas cidades');});
 it('null statistics do not invent shape direction',()=>{const a=analysis();a.pearson=null;expect(read(a).title).toContain('Sem padrão claro');});
 it('correct X coefficient reverses editorial finding, not intercept',()=>{const r=read(adjusted(analysis(),-1,[-2,-.1]));expect(r.title).toContain('muda entre cidades semelhantes');expect(r.paragraphs[1]).toContain('se inverte');});
 it('interval crossing zero stays inconclusive',()=>expect(text(adjusted(analysis(),1,[-1,2]))).toContain('não aparece um padrão claro'));
 it('actual controls, excluding own X',()=>{const t=text(adjusted(analysis(),1,[.1,2]));expect(t).toContain('escolaridade');expect(t).not.toContain('em renda');expect(t).not.toContain('UF');});
 it('one uncertain model is not both maintained',()=>{const r=duel(adjusted(analysis(),1,[.1,2]),adjusted(analysis(-.6),1,[-1,2]));expect(r.paragraphs[1]).toContain('Lula');expect(r.paragraphs[1]).toContain('não aparece um padrão claro');});
 it('unavailable model material warning remains',()=>expect(read(analysis()).limitations.length).toBeGreaterThan(0));
 it.each(['zero','constant','varying'])('residual %s stays audited, outside reportage',(kind)=>{const a=analysis(),b=analysis(-.6);b.points.y=a.points.y.map((y,i)=>100-y-(kind==='zero'?0:kind==='constant'?10:5+i*.1));const r=duel(a,b);expect(r.geometry.composition?.kind).toBe(kind);expect(r.paragraphs.join(' ')).not.toMatch(/Outros|somam 100|pares observados/);});
 it('invalid residual never inferred',()=>{const a=analysis(),b=analysis(-.6);b.points.y=a.points.y.map(()=>100);expect(duel(a,b).geometry.composition).toBeNull();});
 it('delta keeps Jair to Flávio and never residual',()=>{const r=read(analysis(),{...c,metric:'share_delta'});expect(r.paragraphs.join(' ')).toContain('Jair em 2022 e Flávio em 2026');expect(r.geometry.composition).toBeNull();expect(r.title).not.toContain('ganha força');});
 it('nonpartisan meanings stay intact',()=>{for(const metric of ['turnout','abstention','blank_null','turnout_delta'] as const){const r=read(analysis(),{...c,metric});expect(r.title).not.toContain('Flávio');expect(r.paragraphs.join(' ')).not.toContain('lidera');}});
 it('2022 keeps real Jair name',()=>{const r=interpretGraph({...c,year:2022},[{name:'Jair Bolsonaro',analysis:analysis()}]);expect(r.title).toContain('Jair Bolsonaro');expect(r.title).not.toContain('Flávio');});
 it('race category is precise in cities, never individual voting',()=>{const v=X_VARIABLES.find(v=>v.id==='preta');if(!v)throw new Error('missing');const r=read(analysis(),{...c,x:v});expect(r.title).toContain('moradores de cor ou raça preta');expect(r.title).not.toContain('parda');});
 it('two short paragraphs without jargon or individual/future claims',()=>{const r=duel(adjusted(analysis(),1,[.1,2]),adjusted(analysis(-.6),-1,[-2,-.1]));expect(r.paragraphs).toHaveLength(2);expect(r.paragraphs.join(' ').split(/\s+/).length).toBeLessThanOrEqual(110);for(const term of ['séries','pares observados','complementaridade','mediana','terço do eixo','escala logarítmica','IQR','coeficiente','inferência','correlação','UF','variável isolada','acurácia','Pearson','OLS','os evangélicos votam','vai aumentar'])expect(r.paragraphs.join(' ')).not.toContain(term);});
});
