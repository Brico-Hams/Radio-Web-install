'use strict';
let language='pl';
const $=id=>document.getElementById(id),t=key=>FTX1_CONTENT[language][key];
const states=[];
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
for(const f of FTX1_CONTENT.functions)$('functions').append(el('li','',f));
function resetOutput(s){if(s.url)URL.revokeObjectURL(s.url);s.url=null;s.outputHash='';s.link.hidden=true;}
function render(s){
 s.inputExpectedLabel.textContent=t('inputExpected');s.inputExpected.textContent=s.c.input_sha256;
 s.inputActualLabel.textContent=t('inputActual');s.inputActual.textContent=s.inputHash||t('empty');
 s.outputExpectedLabel.textContent=t('outputExpected');s.outputExpected.textContent=s.c.output_sha256;
 s.outputActualLabel.textContent=t('outputActual');s.outputActual.textContent=s.outputHash||t('none');
 s.fileLabel.textContent=t('choose');s.button.textContent=t('patchButton');
 s.button.disabled=!s.valid||s.busy||!$('consent').checked;
 s.input.disabled=s.busy;s.status.textContent=s.message?t(s.message):'';
 s.status.className='status '+(['mismatch','failed','secure','size','fileFailure'].includes(s.message)?'error':['success','valid'].includes(s.message)?'ok':'');
 s.link.textContent=t('download')+' '+s.c.filename;
}
for(const c of [...FTX1_PATCH.components].sort((a,b)=>b.component.localeCompare(a.component))){
 const s={c,valid:false,busy:false,message:'',inputHash:'',outputHash:'',revision:0,url:null};states.push(s);
 const article=el('article','patcher');article.append(el('h3','',`${c.component} ${c.version}`),el('p','filename',c.filename));
 const label=el('label','file');s.fileLabel=el('span');s.input=el('input');s.input.type='file';s.input.accept='.sfl,.SFL';s.input.id='file-'+c.component;label.append(s.fileLabel,s.input);article.append(label);
 const dl=el('dl','hashes');
 for(const field of ['inputExpected','inputActual','outputExpected','outputActual']){s[field+'Label']=el('dt');s[field]=el('dd','hash');dl.append(s[field+'Label'],s[field]);}article.append(dl);
 s.status=el('p','status');s.status.setAttribute('role','status');s.status.setAttribute('aria-live','polite');s.button=el('button','action');s.button.type='button';s.link=el('a','download');s.link.hidden=true;s.link.download=c.filename;article.append(s.status,s.button,s.link);$('patchers').append(article);
 s.input.addEventListener('change',async()=>{
  const revision=++s.revision;s.valid=false;s.raw=null;s.inputHash='';s.message='';resetOutput(s);const file=s.input.files[0];
  if(!file){render(s);return;}
  if(!globalThis.crypto||!crypto.subtle){s.message='secure';render(s);return;}
  s.message='checking';render(s);
  try{
   const raw=new Uint8Array(await file.arrayBuffer()),hash=await FTX1_CORE.sha(raw);
   if(revision!==s.revision)return;
   s.inputHash=hash;
   if(hash!==c.input_sha256){s.message='mismatch';}
   else if(raw.length!==c.size){s.message='size';}
   else{s.raw=raw;s.valid=true;s.message='valid';}
  }catch(e){if(revision!==s.revision)return;s.message='fileFailure';}
  render(s);
 });
 s.button.addEventListener('click',async()=>{
  if(!s.valid||s.busy||!$('consent').checked)return;
  s.busy=true;s.message='busy';resetOutput(s);render(s);
  try{
   // Core independently checks input again, including SHA-256, decoded hashes and CRC.
   const result=await FTX1_CORE.patch(s.raw,FTX1_PATCH,hash=>{s.outputHash=hash;render(s);});
   if(result.component.component!==s.c.component||s.outputHash!==s.c.output_sha256)throw Error('output mismatch');
   s.url=URL.createObjectURL(new Blob([result.bytes],{type:'application/octet-stream'}));s.link.href=s.url;s.link.hidden=false;s.message='success';
  }catch(e){s.message='failed';s.link.hidden=true;}
  finally{s.busy=false;render(s);}
 });render(s);
}
$('consent').addEventListener('change',()=>states.forEach(render));
function setLanguage(lang){
 language=lang;document.documentElement.lang=lang;
 document.querySelectorAll('[data-list]').forEach(n=>{n.replaceChildren();for(const text of (FTX1_CONTENT[lang][n.dataset.list]||FTX1_CONTENT[n.dataset.list]))n.append(el('li','',text));});
 const table=$('ranges');table.replaceChildren();const head=el('tr');for(const text of t('rangeHeaders'))head.append(el('th','',text));table.append(head);for(const row of FTX1_CONTENT.ranges){const tr=el('tr');for(const text of row)tr.append(el('td','',text));table.append(tr);}
 document.querySelectorAll('[data-i18n]').forEach(n=>n.textContent=t(n.dataset.i18n));
 document.querySelectorAll('[data-alt]').forEach(n=>n.alt=t(n.dataset.alt));
 for(const id of ['pl','en'])$(id).setAttribute('aria-pressed',String(id===lang));
 document.querySelector('.languages').setAttribute('aria-label',t('language'));states.forEach(render);
}
$('pl').addEventListener('click',()=>setLanguage('pl'));$('en').addEventListener('click',()=>setLanguage('en'));
setLanguage('pl');
