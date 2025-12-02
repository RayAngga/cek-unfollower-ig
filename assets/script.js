/* ===== Shortcuts ===== */
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>document.querySelectorAll(s);

/* ===== Elements ===== */
const followersInput = $('#followersFile');
const followingInput = $('#followingFile');
const followersFileName = $('#followersFileName');
const followingFileName = $('#followingFileName');
const processBtn = $('#processBtn');
const statusEl = $('#status');
const resultsSection = $('#results');
const notFollowingBackList = $('#notFollowingBackList');
const fansList = $('#fansList');
const followersCountBadge = $('#followersCountBadge');
const followingCountBadge = $('#followingCountBadge');
const btnClear = $('#btnClear');
const btnToggle = $('#btnToggle');
const uploadSection = $('#uploadSection');
const instruksiSection = $('#instruksiSection');
const searchNotBack = $('#searchNotBack');
const searchFans = $('#searchFans');

// Language toggle
const btnLangToggle = $('#btnLangToggle');
const langID = $('#lang-id');
const langEN = $('#lang-en');
let currentLang = 'id';

// Theme toggle
const btnTheme = $('#btnTheme');
const themeIcon = $('#themeIcon');

/* ===== State ===== */
let state = { followers:[], following:[], notFollowingBack:[], fans:[] };

/* ===== Helpers ===== */
function setStatus(msg, type='info'){
  const colors = { info:'text-gray-600', ok:'text-emerald-600', warn:'text-amber-600', err:'text-rose-600' };
  statusEl.className = `text-sm ${colors[type]||colors.info}`;
  statusEl.textContent = msg||'';
}
const readFileAsText = (file)=>new Promise((res,rej)=>{const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>rej(new Error('Gagal membaca file.')); r.readAsText(file);});
function parseCSV(t){
  const lines=t.split(/\r?\n/).map(l=>l.trim()).filter(Boolean); if(!lines.length)return [];
  const first=lines[0].split(',').map(s=>s.trim().replace(/^"|"$/g,'')); let col=0;
  const unameIdx=first.findIndex(h=>/^username$/i.test(h)); if(unameIdx>=0) col=unameIdx;
  const start=unameIdx>=0?1:0, out=[];
  for(let i=start;i<lines.length;i++){const cols=lines[i].split(',').map(s=>s.trim().replace(/^"|"$/g,'')); const u=(cols[col]||'').replace(/^@/,'').toLowerCase(); if(u) out.push(u);}
  return Array.from(new Set(out));
}
function extractUsernamesFromFollowers(d){
  if(d && Array.isArray(d.relationships_followers)) return d.relationships_followers.map(it=>it?.string_list_data?.[0]?.value).filter(Boolean).map(s=>s.toLowerCase());
  if(Array.isArray(d)){ const a=d.map(it=>it?.string_list_data?.[0]?.value).filter(Boolean).map(s=>s.toLowerCase()); if(a.length) return a;
    const b=d.map(it=>it?.username||it?.name||it?.value).filter(Boolean).map(s=>String(s).toLowerCase()); if(b.length) return b; }
  return [];
}
function extractUsernamesFromFollowing(d){
  if(d && Array.isArray(d.relationships_following)) return d.relationships_following.map(it=>it?.string_list_data?.[0]?.value).filter(Boolean).map(s=>s.toLowerCase());
  if(Array.isArray(d)){ const a=d.map(it=>it?.string_list_data?.[0]?.value).filter(Boolean).map(s=>s.toLowerCase()); if(a.length) return a;
    const b=d.map(it=>it?.username||it?.name||it?.value).filter(Boolean).map(s=>String(s).toLowerCase()); if(b.length) return b; }
  return [];
}
async function parseFile(file, kind){
  const text=await readFileAsText(file); const ext=(file.name.split('.').pop()||'').toLowerCase();
  try{
    if(ext==='csv') return parseCSV(text);
    const json=JSON.parse(text);
    return kind==='followers'?extractUsernamesFromFollowers(json):extractUsernamesFromFollowing(json);
  }catch(e){ throw new Error(`File ${file.name} tidak valid (${ext.toUpperCase()}).`); }
}

/* ===== Dropzones ===== */
$$('.dropzone').forEach(zone=>{
  const type=zone.dataset.type;
  const input=type==='followers'?followersInput:followingInput;
  const label=type==='followers'?followersFileName:followingFileName;
  zone.addEventListener('click',e=>{ if(!e.target.closest('label')) input.click(); });
  zone.addEventListener('dragover',e=>{ e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave',()=> zone.classList.remove('dragover'));
  zone.addEventListener('drop',e=>{
    e.preventDefault(); zone.classList.remove('dragover');
    if(!e.dataTransfer.files?.length) return;
    const file=e.dataTransfer.files[0];
    input.files=e.dataTransfer.files;
    label.textContent=file.name;
  });
});
followersInput.addEventListener('change',()=>{ followersFileName.textContent=followersInput.files[0]?followersInput.files[0].name:'Belum ada file'; });
followingInput.addEventListener('change',()=>{ followingFileName.textContent=followingInput.files[0]?followingInput.files[0].name:'Belum ada file'; });

/* ===== Rendering ===== */
function makeRow(u){
  const url=`https://www.instagram.com/${encodeURIComponent(u)}`;
  return `
    <div class="flex items-center justify-between px-4 py-2 rounded-lg hover:bg-slate-50">
      <span class="username font-medium">@${u}</span>
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="text-sm font-semibold text-violet-700 hover:text-violet-900">Profil →</a>
    </div>`;
}
function renderLists(){
  $('#notFollowingBackCount').textContent=state.notFollowingBack.length;
  $('#fansCount').textContent=state.fans.length;
  followersCountBadge.textContent=`Followers: ${state.followers.length}`;
  followingCountBadge.textContent=`Following: ${state.following.length}`;
  const q1=($('#searchNotBack')?.value||'').trim().toLowerCase();
  const q2=($('#searchFans')?.value||'').trim().toLowerCase();
  const list1=(q1?state.notFollowingBack.filter(u=>u.includes(q1)):state.notFollowingBack).map(makeRow).join('')||`<p class="px-6 pb-4 text-sm text-gray-500">Tidak ada data yang cocok.</p>`;
  const list2=(q2?state.fans.filter(u=>u.includes(q2)):state.fans).map(makeRow).join('')||`<p class="px-6 pb-4 text-sm text-gray-500">Tidak ada data yang cocok.</p>`;
  notFollowingBackList.innerHTML=list1; fansList.innerHTML=list2;
}

/* ===== Actions ===== */
processBtn.addEventListener('click', async ()=>{
  if(!followersInput.files[0] || !followingInput.files[0]){ alert('Harap unggah kedua file (followers dan following).'); return; }
  try{
    processBtn.disabled=true; setStatus('Memproses data…','info');
    const [followers, following]=await Promise.all([parseFile(followersInput.files[0],'followers'), parseFile(followingInput.files[0],'following')]);
    const followersSet=new Set(followers); const followingSet=new Set(following);
    const notFollowingBack=[...followingSet].filter(u=>!followersSet.has(u)).sort();
    const fans=[...followersSet].filter(u=>!followingSet.has(u)).sort();
    state={followers:[...followersSet], following:[...followingSet], notFollowingBack, fans};
    resultsSection.classList.remove('hidden'); renderLists();
    setStatus('Selesai ✔','ok'); resultsSection.scrollIntoView({behavior:'smooth'});
  }catch(err){ console.error(err); alert(`Terjadi kesalahan: ${err.message}`); setStatus('Gagal memproses. Cek format file Anda.','err'); }
  finally{ processBtn.disabled=false; }
});

$('#searchNotBack')?.addEventListener('input', renderLists);
$('#searchFans')?.addEventListener('input', renderLists);

btnClear.addEventListener('click', ()=>{
  followersInput.value=''; followingInput.value='';
  followersFileName.textContent='Belum ada file'; followingFileName.textContent='Belum ada file';
  state={followers:[], following:[], notFollowingBack:[], fans:[]};
  resultsSection.classList.add('hidden'); setStatus('');
  window.scrollTo({top:0, behavior:'smooth'});
});

/* ===== Toggle Upload <-> Instruksi ===== */
let showingUpload=true;
function animateSwap(hideEl, showEl){
  return new Promise((resolve)=>{
    hideEl.classList.add('leave');
    hideEl.addEventListener('animationend', ()=>{
      hideEl.classList.add('hidden'); hideEl.classList.remove('leave');
      showEl.classList.remove('hidden'); showEl.classList.add('enter');
      showEl.addEventListener('animationend', ()=>{ showEl.classList.remove('enter'); resolve(); }, {once:true});
    }, {once:true});
  });
}
btnToggle.addEventListener('click', async ()=>{
  if(showingUpload){
    btnToggle.disabled=true; btnToggle.textContent='Kembali ke Unggah Data';
    btnToggle.setAttribute('aria-expanded','true'); instruksiSection.setAttribute('aria-hidden','false');
    await animateSwap(uploadSection, instruksiSection); btnToggle.disabled=false;
  }else{
    btnToggle.disabled=true; btnToggle.textContent='Cara Unduh Data';
    btnToggle.setAttribute('aria-expanded','false'); instruksiSection.setAttribute('aria-hidden','true');
    await animateSwap(instruksiSection, uploadSection); btnToggle.disabled=false;
  }
  showingUpload=!showingUpload;
  (showingUpload?uploadSection:instruksiSection).scrollIntoView({behavior:'smooth', block:'start'});
});

/* ===== Language toggle (single button) ===== */
function showLang(lang){
  btnLangToggle.textContent = lang.toUpperCase();
  const toShow = lang === 'id' ? langID : langEN;
  const toHide = lang === 'id' ? langEN : langID;

  toHide.classList.remove('active','lang-enter');
  toHide.setAttribute('aria-hidden','true');

  toShow.classList.add('active');
  toShow.setAttribute('aria-hidden','false');
  toShow.classList.remove('lang-enter'); void toShow.offsetWidth; toShow.classList.add('lang-enter');
  currentLang = lang;
}
btnLangToggle.addEventListener('click', ()=>{
  const next = currentLang === 'id' ? 'en' : 'id';
  showLang(next);
});
showLang(currentLang);

/* ===== Dark mode toggle ===== */
function renderThemeIcon(isDark){
  themeIcon.innerHTML = isDark
    ? `<svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v2m0 14v2m7-9h2M3 12H1m15.364-6.364 1.414 1.414M6.222 17.778l-1.414 1.414m0-12.728 1.414 1.414M17.778 17.778l1.414 1.414"/></svg>`
    : `<svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  btnTheme.setAttribute('aria-pressed', String(isDark));
}
function applyTheme(theme){
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  renderThemeIcon(isDark);
}
function initTheme(){
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}
btnTheme.addEventListener('click', ()=>{
  const isDark = document.documentElement.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
});
initTheme();
