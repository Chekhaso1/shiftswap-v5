const ACCESS_CODE='SHIFT2026';
const WEB_APP_URL='https://script.google.com/macros/s/AKfycbxvrRsTGA5V-A2pkDZNLvY5Knb-SB--WPxgVR9WCDgklswH6hk79-t91uM30G6aTv1R/exec';

let days=[],messages=[],month=new Date();

const $=x=>document.getElementById(x);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function toast(x){
  $('toast').textContent=x;
  $('toast').style.display='block';
  setTimeout(()=>$('toast').style.display='none',2200);
}

/*
  IMPORTANT:
  We use JSONP instead of fetch().
  Google Apps Script can be reached by the browser, but normal cross-origin
  fetch() can be blocked by browser CORS rules. JSONP uses a normal <script>
  request, which avoids that problem.
*/
function api(action,extra={}){
  return new Promise((resolve,reject)=>{
    const cb='shiftSwapCallback_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const s=document.createElement('script');
    let finished=false;

    const cleanup=()=>{
      if(s.parentNode)s.parentNode.removeChild(s);
      try{delete window[cb]}catch(_){}
    };

    const timer=setTimeout(()=>{
      if(finished)return;
      finished=true;
      cleanup();
      reject(new Error('Google Sheets connection timed out.'));
    },15000);

    window[cb]=(result)=>{
      if(finished)return;
      finished=true;
      clearTimeout(timer);
      cleanup();
      resolve(result);
    };

    s.onerror=()=>{
      if(finished)return;
      finished=true;
      clearTimeout(timer);
      cleanup();
      reject(new Error('Google Sheets connection failed.'));
    };

    const params=new URLSearchParams({
      action,
      code:ACCESS_CODE,
      callback:cb
    });

    Object.keys(extra||{}).forEach(k=>{
      params.set(k,String(extra[k]??''));
    });

    s.src=WEB_APP_URL+'?'+params.toString();
    document.head.appendChild(s);
  });
}

function unlock(){
  $('gate').style.display='none';
  $('app').classList.remove('hidden');
  load();
}

$('gateForm').onsubmit=e=>{
  e.preventDefault();
  if($('code').value.trim().toUpperCase()===ACCESS_CODE){
    sessionStorage.ok='1';
    unlock();
  }else{
    $('err').textContent='Incorrect access code.';
  }
};

async function load(){
  try{
    const r=await api('list');
    if(!r || !r.ok)throw Error(r?.error||'Google Sheets connection failed.');

    days=(r.days||[]).map(a=>Array.isArray(a)
      ? {id:a[0],name:a[1],date:a[2],note:a[3],status:a[4],pickedUpBy:a[5],createdAt:a[6],pickedUpAt:a[7]}
      : a
    );

    messages=(r.messages||[]).map(a=>Array.isArray(a)
      ? {id:a[0],name:a[1],message:a[2],createdAt:a[3]}
      : a
    );

    render();
  }catch(e){
    render();
    toast(e.message||'Google Sheets connection failed.');
  }
}

document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));
  $(b.dataset.tab).classList.add('active');
  b.classList.add('active');
});

function openModal(){
  $('modal').classList.remove('hidden');
  $('name').value=localStorage.ssname||'';
}
$('postTop').onclick=openModal;
$('postHero').onclick=openModal;
$('close').onclick=()=>$('modal').classList.add('hidden');

$('postForm').onsubmit=async e=>{
  e.preventDefault();
  try{
    const name=$('name').value.trim();
    localStorage.ssname=name;
    const r=await api('addDay',{
      name,
      date:$('date').value,
      note:$('note').value.trim()
    });
    if(!r.ok)throw Error(r.error);
    e.target.reset();
    $('modal').classList.add('hidden');
    toast('Saved to Google Sheets.');
    await load();
  }catch(x){
    alert(x.message||'Unable to save day.');
  }
};

async function pick(id){
  const name=prompt('Enter your name to pick up this day:',localStorage.ssname||'');
  if(!name)return;
  try{
    const cleanName=name.trim();
    const r=await api('pickDay',{id,name:cleanName});
    if(!r.ok)throw Error(r.error);
    localStorage.ssname=cleanName;
    toast('Day picked up.');
    await load();
  }catch(x){
    alert(x.message||'Unable to pick up day.');
  }
}
window.pick=pick;

function card(x){
  return `<article class="item ${x.status==='taken'?'taken':''}">
    <div>
      <h3>🏖️ ${esc(x.date)}</h3>
      <div class="meta">Posted by ${esc(x.name)}</div>
      ${x.note?`<div class="meta">${esc(x.note)}</div>`:''}
      ${x.status==='taken'?`<div class="notice">🔴 TAKEN · Picked up by <b>${esc(x.pickedUpBy)}</b></div>`:''}
    </div>
    <div>
      ${x.status==='taken'
        ?'<span class=badge>TAKEN</span>'
        :`<span class=badge>AVAILABLE</span><br><button onclick="pick('${x.id}')">Pick Up Day</button>`}
    </div>
  </article>`;
}

function render(){
  const q=($('search').value||'').toLowerCase();
  const a=days.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
  const av=a.filter(x=>x.status==='available');
  const tk=a.filter(x=>x.status==='taken');

  $('available').innerHTML=av.map(card).join('')||'<div class=item>No available days.</div>';
  $('taken').innerHTML=tk.map(card).join('')||'<div class=item>No picked-up days yet.</div>';
  $('grabList').innerHTML=av.map(card).join('')||'<div class=item>No days to grab.</div>';

  $('days').textContent=days.filter(x=>x.status==='available').length;
  $('takenCount').textContent=days.filter(x=>x.status==='taken').length;
  $('employees').textContent=new Set(days.map(x=>x.name).filter(Boolean)).size;

  renderCalendar();

  $('messagesList').innerHTML=messages.map(m=>
    `<div class=message><b>${esc(m.name)}</b><p>${esc(m.message)}</p><small>${esc(m.createdAt)}</small></div>`
  ).join('')||'<div class=message>No messages yet.</div>';
}

function renderCalendar(){
  const y=month.getFullYear(),m=month.getMonth();
  const f=new Date(y,m,1);
  const off=(f.getDay()+6)%7;
  const last=new Date(y,m+1,0).getDate();
  let h='';

  $('month').textContent=month.toLocaleString(undefined,{month:'long',year:'numeric'});

  for(let i=0;i<42;i++){
    const n=i-off+1;
    const d=n<1
      ?new Date(y,m-1,new Date(y,m,0).getDate()+n)
      :n>last
        ?new Date(y,m+1,n-last)
        :new Date(y,m,n);
    const s=d.toISOString().slice(0,10);

    h+=`<div class=day><b>${d.getDate()}</b>${
      days.filter(x=>x.date===s).map(x=>
        `<div class=event>${x.status==='taken'?'🔴':'🟢'} Available</div>`
      ).join('')
    }</div>`;
  }

  $('grid').innerHTML=h;
}

$('prev').onclick=()=>{
  month.setMonth(month.getMonth()-1);
  renderCalendar();
};
$('next').onclick=()=>{
  month.setMonth(month.getMonth()+1);
  renderCalendar();
};
$('search').oninput=render;
$('refresh').onclick=load;

$('msgForm').onsubmit=async e=>{
  e.preventDefault();
  try{
    const r=await api('addMessage',{
      name:$('msgName').value.trim(),
      message:$('msgText').value.trim()
    });
    if(!r.ok)throw Error(r.error);
    e.target.reset();
    toast('Message saved.');
    await load();
  }catch(x){
    alert(x.message||'Unable to save message.');
  }
};

if(sessionStorage.ok==='1')unlock();
