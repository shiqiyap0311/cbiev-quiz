// Run from the project root: node tests/quiz.test.cjs
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const bank = JSON.parse(fs.readFileSync('data/questions.json'));
assert.equal(bank.questions.length,15);assert.equal(bank.questions.filter(q=>q.category==='CBIEV').length,10);assert.deepEqual(bank.questions.filter(q=>q.category==='IIPC').map(q=>q.correctAnswer),[1,2,0,3,1]);assert.deepEqual(bank.settings,{questionsPerRound:5,autoAdvanceDelay:3});
class Node {
 constructor(tag,text=''){this.tagName=tag;this._text=text;this.children=[];this.attrs={};this.handlers={};this.style={setProperty(){}};this.classes=new Set();this.classList={add:(...c)=>c.forEach(x=>this.classes.add(x)),remove:(...c)=>c.forEach(x=>this.classes.delete(x))};}
 set textContent(x){this._text=x;this.children=[]} get textContent(){return this._text+this.children.map(x=>typeof x==='string'?x:x.textContent).join('')}
 append(...x){this.children.push(...x)}replaceChildren(...x){this._text='';this.children=x}setAttribute(k,v){this.attrs[k]=v}addEventListener(k,v){this.handlers[k]=v}get firstChild(){return this.children[0]}focus(){}remove(){}reset(){}click(){if(!this.disabled)(this.handlers.click||this.onclick||(()=>{}))()}
 querySelector(s){return this.all().find(n=>s.split(',').includes(n.tagName))}all(){return this.children.flatMap(n=>typeof n==='string'?[]:[n,...n.all()])}
}
function environment(admin=false){const nodes={}, timers=new Map(), storage=new Map([['cbiev-question-draft-v1',JSON.stringify({settings:{questionsPerRound:10,autoAdvanceDelay:9},questions:[{question:'OLD'}]})]]);let time=0,id=0;
 if(!admin)nodes.app=new Node('main');
 const document={body:new Node('body'),hidden:false,createElement:t=>new Node(t),getElementById:id=>admin?(nodes[id]??=new Node('div')):(nodes[id]||null),addEventListener(){},querySelectorAll:()=>[]};
 const ctx=vm.createContext({document,window:{addEventListener(){},scrollTo(){}},navigator:{},matchMedia:()=>({matches:false}),setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:time+ms});return id},clearTimeout:id=>timers.delete(id),fetch:async(url,opts)=>{assert.equal(url,'data/questions.json');assert.equal(opts.cache,'no-store');return {ok:true,json:async()=>structuredClone(bank)}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},console,confirm:()=>true});
 vm.runInContext(fs.readFileSync('js/quiz.js','utf8'),ctx);if(admin)vm.runInContext(fs.readFileSync('js/admin.js','utf8'),ctx);
 return {ctx,nodes,storage,advance(ms){const end=time+ms;while(true){let next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;time=next[1].at;timers.delete(next[0]);next[1].fn()}time=end}};
}
const settle=()=>new Promise(r=>setImmediate(r));
(async()=>{
const e=environment();await settle();
const Quest=vm.runInContext('Quest',e.ctx);
const original=JSON.parse(require('child_process').execFileSync('git',['show','1a1f6e1:data/questions.json']));
assert.deepEqual(bank.questions.filter(q=>q.category==='CBIEV').map(({category,...q})=>q),original.questions);
for(let i=0;i<1000;i++){
 const round=Quest.selectRound(bank);assert.equal(round.length,5);assert.equal(new Set(round.map(q=>q.id)).size,5);assert.equal(round.filter(q=>q.category==='CBIEV').length,1);assert.equal(round.filter(q=>q.category==='IIPC').length,4);
 for(const q of round){const opts=Quest.shuffleOptions(q);assert.equal(opts.length,4);assert.equal(new Set(opts.map(o=>o.index)).size,4);for(const o of opts)assert.equal(o.text,q.options[o.index]);assert.equal(opts.find(o=>o.index===q.correctAnswer).text,q.options[q.correctAnswer]);}
}
const override=structuredClone(bank);override.settings.questionsPerRound=99;override.settings.categoryQuotas={CBIEV:5,IIPC:0};const enforced=Quest.selectRound(Quest.validate(override));assert.equal(enforced.length,5);assert.equal(enforced.filter(q=>q.category==='IIPC').length,4);
for(const category of ['CBIEV','IIPC']){const insufficient=structuredClone(bank);insufficient.questions.forEach(q=>{if(q.category===category)q.enabled=false});assert.throws(()=>Quest.selectRound(insufficient),/at least/);}
const invalid=structuredClone(bank);invalid.questions[0].category='Other';assert.throws(()=>Quest.validate(invalid),/category/);
const app=e.nodes.app;
const find=(pred)=>app.all().find(pred);const btn=text=>find(n=>n.tagName==='button'&&n.textContent===text);
btn('Let’s Play!  →').click();const orders=new Set(),optionOrders=new Set();
for(let r=0;r<12;r++){
 const seen=[];
 for(let i=0;i<5;i++){
  assert(app.textContent.includes(`Question ${i+1}/5`));const question=find(n=>n.tagName==='h2').textContent;const q=bank.questions.find(q=>q.question===question);assert(q);assert(!seen.includes(q.id));seen.push(q.id);
  const answers=app.all().filter(n=>n.tagName==='button'&&n.className==='answer');assert.equal(answers.length,4);assert.deepEqual(answers.map(n=>n.children[1].textContent).sort(),[...q.options].sort());optionOrders.add(q.id+':'+answers.map(n=>n.children[1].textContent).join('|'));
  const correct=q.options[q.correctAnswer];const pick=i%2===0?correct:q.options[(q.correctAnswer+1)%4];answers.find(n=>n.children[1].textContent===pick).click();assert(answers.every(n=>n.disabled));assert.equal(answers.find(n=>n.classes.has('correct')).children[1].textContent,correct);assert(app.textContent.includes(`Correct answer: ${correct}`));assert(app.textContent.includes('in 3…'));
  const progress=find(n=>n.attrs.role==='progressbar');assert.equal(progress.attrs['aria-valuenow'],String(i+1));assert.equal(progress.attrs['aria-valuemax'],'5');
  e.advance(2999);assert(app.textContent.includes(`Question ${i+1}/5`));e.advance(201);
 }
 assert.equal(seen.filter(id=>bank.questions.find(q=>q.id===id).category==='CBIEV').length,1);assert.equal(seen.filter(id=>bank.questions.find(q=>q.id===id).category==='IIPC').length,4);assert(app.textContent.includes('QUIZ COMPLETED!'));assert(app.textContent.includes('5 of 5 questions completed.'));assert(e.nodes.app.querySelector('h1'));orders.add(seen.join(','));btn('Play Again').click();
}
assert(orders.size>1);assert(optionOrders.size>5);
const a=environment(true);await settle();assert(!a.storage.has('cbiev-question-draft-v1'));assert(!a.storage.has('cbiev-question-draft-iipc-2026-v2')); assert.equal(a.nodes.counts.textContent,'15 total · 15 active');assert.equal(a.nodes['advance-delay'].value,3);assert.equal(a.nodes['round-count'].value,5);assert.equal(a.nodes.list.children.length,15);
for(let i=0;i<15;i++){const row=a.nodes.list.children[i];assert(row.textContent.includes(bank.questions[i].question));row.children[1].click();assert.equal(a.nodes.question.value,bank.questions[i].question);assert.equal(a.nodes.category.value,bank.questions[i].category);assert.equal(a.nodes.correct.value,bank.questions[i].correctAnswer);for(let j=0;j<4;j++)assert.equal(a.nodes['option-'+j].value,bank.questions[i].options[j]);}
console.log(`PASS: 1,000 simulated 1+4 rounds and 12 complete five-question runtime rounds, ${orders.size} question orders, ${optionOrders.size} answer layouts; correct/wrong selections, 3-second countdown, progress, completion, replay, Admin content and legacy-cache removal.`);
})().catch(e=>{console.error(e);process.exitCode=1});
