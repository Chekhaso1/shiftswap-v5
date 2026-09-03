const ACCESS_CODE='SHIFT2026';const WEB_APP_URL='https://script.google.com/macros/s/AKfycbxvrRsTGA5V-A2pkDZNLvY5Knb-SB--WPxgVR9WCDgklswH6hk79-t91uM30G6aTv1R/exec';let days=[],messages=[],month=new Date();const $=x=>document.getElementById(x);const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function toast(x){$('toast').textContent=x;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',2200)}
function unlock(){$('gate').style.display='none';$('app').classList.remove('hidden');load()}
$('gateForm').onsubmit=e=>{e.preventDefault();if($('code').value.trim().toUpperCase()===ACCESS_CODE){sessionStorage.ok='1';unlock()}else $('err').textContent='Incorrect access code.'};
async function api(action,extra={}){
  const r=await fetch(WEB_APP_URL,{
    method:'POST',
    body:JSON.stringify({action,code:ACCESS_CODE,...extra})
  });
  if(!r.ok)throw Error('Google Sheets connection failed ('+r.status+').');
  return r.json();
}async function load(){
  try{
    const r=await api('list');
    if(!r.ok)throw Error(r.error);

    days=(r.days||[]).map(a=>{
      if(Array.isArray(a)){
        return {
          id:a[0],name:a[1],date:a[2],note:a[3],status:a[4],
          pickedUpBy:a[5],createdAt:a[6],pickedUpAt:a[7]
        };
      }
      return a;
    });

    messages=(r.messages||[]).map(a=>{
      if(Array.isArray(a)){
        return {
          id:a[0],name:a[1],message:a[2],createdAt:a[3]
        };
      }
      return a;
    });

    render();
  }catch(e){
    render();
    toast(e.message);
  }
}
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));$(b.dataset.tab).classList.add('active');b.classList.add('active')});
function openModal(){$('modal').classList.remove('hidden');$('name').value=localStorage.ssname||''}$('postTop').onclick=openModal;$('postHero').onclick=openModal;$('close').onclick=()=>$('modal').classList.add('hidden');
$('postForm').onsubmit=async e=>{e.preventDefault();try{let name=$('name').value.trim();localStorage.ssname=name;let r=await api('addDay',{name,date:$('date').value,note:$('note').value.trim()});if(!r.ok)throw Error(r.error);e.target.reset();$('modal').classList.add('hidden');toast('Saved to Google Sheets.');load()}catch(x){alert(x.message)}};
async function pick(id){let name=prompt('Enter your name to pick up this day:',localStorage.ssname||'');if(!name)return;try{let r=await api('pickDay',{id,name:name.trim()});if(!r.ok)throw Error(r.error);localStorage.ssname=name.trim();toast('Day picked up.');load()}catch(x){alert(x.message)}}window.pick=pick;
function card(x){return`<article class="item ${x.status==='taken'?'taken':''}"><div><h3>🏖️ ${esc(x.date)}</h3><div class="meta">Posted by ${esc(x.name)}</div>${x.note?`<div class="meta">${esc(x.note)}</div>`:''}${x.status==='taken'?`<div class="notice">🔴 TAKEN · Picked up by <b>${esc(x.pickedUpBy)}</b></div>`:''}</div><div>${x.status==='taken'?'<span class=badge>TAKEN</span>':`<span class=badge>AVAILABLE</span><br><button onclick="pick('${x.id}')">Pick Up Day</button>`}</div></article>`}
function render(){let q=($('search').value||'').toLowerCase(),a=days.filter(x=>JSON.stringify(x).toLowerCase().includes(q)),av=a.filter(x=>x.status==='available'),tk=a.filter(x=>x.status==='taken');$('available').innerHTML=av.map(card).join('')||'<div class=item>No available days.</div>';$('taken').innerHTML=tk.map(card).join('')||'<div class=item>No picked-up days yet.</div>';$('grabList').innerHTML=av.map(card).join('')||'<div class=item>No days to grab.</div>';$('days').textContent=days.filter(x=>x.status==='available').length;$('takenCount').textContent=days.filter(x=>x.status==='taken').length;$('employees').textContent=new Set(days.map(x=>x.name).filter(Boolean)).size;renderCalendar();$('messagesList').innerHTML=messages.map(m=>`<div class=message><b>${esc(m.name)}</b><p>${esc(m.message)}</p><small>${esc(m.createdAt)}</small></div>`).join('')||'<div class=message>No messages yet.</div>'}
function renderCalendar(){let y=month.getFullYear(),m=month.getMonth(),f=new Date(y,m,1),off=(f.getDay()+6)%7,last=new Date(y,m+1,0).getDate(),h='';$('month').textContent=month.toLocaleString(undefined,{month:'long',year:'numeric'});for(let i=0;i<42;i++){let n=i-off+1,d=n<1?new Date(y,m-1,new Date(y,m,0).getDate()+n):n>last?new Date(y,m+1,n-last):new Date(y,m,n),s=d.toISOString().slice(0,10);h+=`<div class=day><b>${d.getDate()}</b>${days.filter(x=>x.date===s).map(x=>`<div class=event>${x.status==='taken'?'🔴':'🟢'} Available</div>`).join('')}</div>`}$('grid').innerHTML=h}
$('prev').onclick=()=>{month.setMonth(month.getMonth()-1);renderCalendar()};$('next').onclick=()=>{month.setMonth(month.getMonth()+1);renderCalendar()};$('search').oninput=render;$('refresh').onclick=load;
$('msgForm').onsubmit=async e=>{e.preventDefault();try{let r=await api('addMessage',{name:$('msgName').value.trim(),message:$('msgText').value.trim()});if(!r.ok)throw Error(r.error);e.target.reset();toast('Message saved.');load()}catch(x){alert(x.message)}};
if(sessionStorage.ok==='1')unlock();
