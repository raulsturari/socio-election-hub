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
describe('one integrated reading',()=>{
 it('positive',()=>expect(text(analysis())).toContain('maior'));
 it('negative',()=>expect(text(analysis(-.6))).toContain('menor'));
 it('near zero',()=>expect(text(analysis(.03))).toContain('Não aparece uma relação linear clara'));
 it('conflicting signs',()=>{const a=analysis();if(a.spearman)a.spearman.r=-.5;expect(text(a)).toContain('direção segura');});
 it('adjusted interval crosses zero',()=>expect(text(adjusted(analysis(),1,[-1,2]))).toContain('sem direção clara'));
 it('reversal selects X not intercept',()=>expect(text(adjusted(analysis(),-1,[-2,-.1]))).toContain('muda de direção'));
 it('adjustment excludes own X',()=>{const t=text(adjusted(analysis(),1,[.1,2]));expect(t).toContain('escolaridade, porte municipal, UF');expect(t).not.toContain('em renda');});
 it('both maintained in one sentence',()=>expect(duel(adjusted(analysis(),1,[.1,2]),adjusted(analysis(-.6),-1,[-2,-.1])).paragraphs.join(' ')).toContain('leitura de ambas permanece'));
 it('one maintained, other uncertain',()=>{const t=duel(adjusted(analysis(),1,[.1,2]),adjusted(analysis(-.6),1,[-1,2])).paragraphs.join(' ');expect(t).toContain('enquanto');expect(t).toContain('sem direção clara');expect(t).not.toContain('ambas permanece');});
 it('neither maintained',()=>expect(duel(adjusted(analysis(),1,[-1,2]),adjusted(analysis(-.6),1,[-1,2])).paragraphs.join(' ')).toContain('ambas fica sem direção clara'));
 it('null model limitation',()=>expect(read(analysis()).limitations.join(' ')).toContain('indisponível'));
 it('missing not duplicated',()=>{const a=analysis();a.missing.x=2;expect(read(a).limitations.join(' ')).not.toContain('2 municípios');});
 it('small sample',()=>{const a=analysis();a.points.y=[1,2];expect(text(a)).toContain('poucos municípios');});
 it('zero variance',()=>{const a=analysis();a.pearson=null;expect(text(a)).toContain('pouca variação');});
 it('wide interval',()=>{const a=analysis();if(a.pearson)a.pearson.ci=[-.3,.9];expect(text(a)).toContain('incerteza');});
 it('log has no invented coefficient example',()=>expect(text(adjusted(analysis(),50,[40,60]))).not.toContain('500'));
 it('nonpartisan outcome',()=>expect(text(analysis(),{...c,metric:'abstention'})).toContain('percentual de abstenção'));
 it('delta is not composition',()=>{const r=read(analysis(),{...c,metric:'share_delta'});expect(r.paragraphs.join(' ')).toContain('Jair em 2022 com Flávio em 2026');expect(r.geometry.composition).toBeNull();});
 it('turnout delta',()=>expect(text(analysis(),{...c,metric:'turnout_delta'})).toContain('variação do comparecimento'));
 it('names together, never candidate blocks',()=>{const r=duel(analysis(),analysis(-.6));expect(r.paragraphs[0]).toContain('Flávio Bolsonaro');expect(r.paragraphs[0]).toContain('Lula');expect(r).not.toHaveProperty('series');});
 it('preta not parda',()=>{const v=X_VARIABLES.find(v=>v.id==='preta');if(!v)throw new Error('missing');expect(text(analysis(),{...c,x:v})).toContain('sem incluir a categoria parda');});
 it.each([['superior','25 anos'],['evangelica','10 anos'],['alfabetizacao','15 anos']])('population %s',(id,age)=>{const v=X_VARIABLES.find(v=>v.id===id);if(!v)throw new Error('missing');expect(text(analysis(),{...c,x:v})).toContain(age);});
 it('no accuracy or statistical jargon in visible prose',()=>{const t=text(adjusted(analysis(),1,[.1,2]));for(const s of ['acurácia','0.817','Pearson','Spearman','OLS','pessoas negras votam'])expect(t).not.toContain(s);});
});
