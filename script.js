import {initializeApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {initializeFirestore,getFirestore,persistentLocalCache,collection,doc,setDoc,deleteDoc,onSnapshot} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig={
  apiKey:"AIzaSyBfG8fwj8JCAA9CqRbE-FL_4d3PS28PDw0",
  authDomain:"ideenwerkstatt-38cf2.firebaseapp.com",
  projectId:"ideenwerkstatt-38cf2",
  storageBucket:"ideenwerkstatt-38cf2.firebasestorage.app",
  messagingSenderId:"518496043919",
  appId:"1:518496043919:web:4be02f5c51c359f5f541fa"
};
const app=initializeApp(firebaseConfig),auth=getAuth(app);
let db;try{db=initializeFirestore(app,{localCache:persistentLocalCache()})}catch(e){db=getFirestore(app)}

const ST=["Nicht begonnen","In Bearbeitung","Fertig"],NOCAT="Ohne Kategorie";
let ideas=[],cats=[],fs=-1,open={},unsubs=[];
const $=id=>document.getElementById(id);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const esc=t=>String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const find=id=>ideas.find(x=>x.id===id);
const strip=i=>({id:i.id,title:i.title,desc:i.desc||"",status:i.status||0,cat:i.cat||"",materials:i.materials||"",tags:i.tags||[],ts:i.ts||Date.now()});
const saveIdea=i=>setDoc(doc(db,"ideas",i.id),strip(i)).catch(()=>alert("Speichern fehlgeschlagen. Bist du online?"));
const saveCats=()=>setDoc(doc(db,"meta","cats"),{list:cats}).catch(()=>{});
function allCats(){const c=cats.slice();ideas.forEach(i=>{if(i.cat&&c.indexOf(i.cat)<0)c.push(i.cat)});return c.sort((a,b)=>a.localeCompare(b,"de"))}

/* ---------- Login ---------- */
$("login").addEventListener("submit",e=>{
  e.preventDefault();$("err").textContent="";
  signInWithEmailAndPassword(auth,$("em").value.trim(),$("pw").value).catch(err=>{
    $("err").textContent=/invalid|wrong|user-not/.test(err.code)?"E-Mail oder Passwort falsch.":"Anmeldung fehlgeschlagen. Bist du online?";
  });
});
$("out").onclick=()=>signOut(auth);
onAuthStateChanged(auth,u=>{
  unsubs.forEach(f=>f());unsubs=[];
  if(!u){ideas=[];cats=[];$("app").hidden=true;$("login").hidden=false;return}
  $("login").hidden=true;$("app").hidden=false;$("pw").value="";
  const fail=()=>{$("list").innerHTML='<div class="empty">Kein Zugriff auf die Daten. Bitte neu anmelden.</div>'};
  unsubs.push(onSnapshot(collection(db,"ideas"),s=>{ideas=s.docs.map(d=>d.data());if(!busy())render()},fail));
  unsubs.push(onSnapshot(doc(db,"meta","cats"),s=>{cats=(s.exists()&&s.data().list)||[];if(!busy())render()},()=>{}));
});

/* ---------- Ideen ---------- */
function add(){
  const v=$("q").value.trim();if(!v)return;
  const i={id:uid(),title:v,desc:"",status:0,cat:"",materials:"",tags:[],ts:Date.now()};
  ideas.unshift(i);open[i.id]=true;saveIdea(i);$("q").value="";render();
}
function busy(){const a=document.activeElement;return a&&$("list").contains(a)&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)}
function render(){
  const q=$("s").value.toLowerCase();
  $("sf").innerHTML=['<button class="chip'+(fs<0?' on':'')+'" data-s="-1">Alle</button>'].concat(ST.map((n,k)=>'<button class="chip'+(fs===k?' on':'')+'" data-s="'+k+'">'+n+'</button>')).join("");
  const list=ideas.filter(i=>(fs<0||i.status===fs)&&(!q||[i.title,i.desc,i.materials,i.cat,(i.tags||[]).join(" ")].join(" ").toLowerCase().indexOf(q)>=0));
  if(!list.length){$("list").innerHTML='<div class="empty">'+(ideas.length?'Nichts gefunden.':'Noch keine Ideen. Die erste kommt oben rein.')+'</div>';return}
  const groups={};list.forEach(i=>{const k=i.cat||NOCAT;(groups[k]=groups[k]||[]).push(i)});
  const keys=Object.keys(groups).sort((a,b)=>a===NOCAT?1:b===NOCAT?-1:a.localeCompare(b,"de"));
  $("list").innerHTML=keys.map(k=>'<h2><span>'+esc(k)+'</span><span>'+groups[k].length+'</span></h2>'+groups[k].sort((a,b)=>a.status-b.status||b.ts-a.ts).map(card).join("")).join("");
}
function card(i){
  const o=open[i.id];
  let h='<div class="card s'+i.status+'" data-id="'+i.id+'"><div class="top"><div class="ttl">'+esc(i.title)+'</div><span class="st">'+ST[i.status]+'</span></div>';
  if(!o){
    if(i.desc)h+='<div class="meta">'+esc(i.desc.length>110?i.desc.slice(0,110)+"…":i.desc)+'</div>';
    if(i.materials)h+='<div class="meta">🔧 '+esc(i.materials.replace(/\n/g,", "))+'</div>';
    if((i.tags||[]).length)h+='<div class="tags">'+i.tags.map(t=>'<span class="tag">#'+esc(t)+'</span>').join("")+'</div>';
  }else{
    const opts='<option value="">'+NOCAT+'</option>'+allCats().map(c=>'<option'+(c===i.cat?' selected':'')+' value="'+esc(c)+'">'+esc(c)+'</option>').join("");
    h+='<div class="det"><label>Name<input type="text" data-f="title" value="'+esc(i.title)+'"></label>'
    +'<label>Beschreibung<textarea data-f="desc">'+esc(i.desc)+'</textarea></label>'
    +'<label>Status</label><div class="seg" style="margin-top:-6px">'+ST.map((n,k)=>'<button data-act="set" data-v="'+k+'" class="'+(i.status===k?'on':'')+'">'+n+'</button>').join("")+'</div>'
    +'<label>Kategorie<select data-f="cat">'+opts+'</select></label>'
    +'<div class="newcat"><input type="text" id="nc-'+i.id+'" placeholder="Neue Kategorie anlegen…" autocomplete="off"><button class="btn" data-act="addcat">Anlegen</button></div>'
    +'<label>Materialien (eins pro Zeile)<textarea data-f="materials">'+esc(i.materials)+'</textarea></label>'
    +'<label>Tags (mit Komma)<input type="text" data-f="tags" value="'+esc((i.tags||[]).join(", "))+'"></label>'
    +'<button class="del" data-act="del">Löschen</button></div>';
  }
  return h+'</div>';
}
function newCat(i){
  const el=$("nc-"+i.id);let n=el?el.value.trim():"";if(!n)return;
  const ex=allCats().find(c=>c.toLowerCase()===n.toLowerCase());
  if(ex)n=ex;else{cats.push(n);saveCats()}
  i.cat=n;saveIdea(i);render();
}
document.addEventListener("click",e=>{
  const c=e.target.closest(".chip");
  if(c&&c.dataset.s!==undefined){fs=+c.dataset.s;render();return}
  const card=e.target.closest(".card");if(!card)return;
  const i=find(card.dataset.id);if(!i)return;
  const a=e.target.dataset.act;
  if(a==="set"){i.status=+e.target.dataset.v;saveIdea(i);render()}
  else if(a==="addcat")newCat(i);
  else if(a==="del"){if(confirm("Idee wirklich löschen?")){ideas=ideas.filter(x=>x!==i);deleteDoc(doc(db,"ideas",i.id)).catch(()=>{});render()}}
  else if(e.target.classList.contains("ttl")){open[i.id]=!open[i.id];render()}
});
document.addEventListener("keydown",e=>{
  if(e.key!=="Enter"||!e.target.id||e.target.id.indexOf("nc-")!==0)return;
  const i=find(e.target.id.slice(3));if(i){e.preventDefault();newCat(i)}
});
document.addEventListener("change",e=>{
  const f=e.target.dataset.f,card=e.target.closest(".card");if(!f||!card)return;
  const i=find(card.dataset.id);if(!i)return;const v=e.target.value;
  if(f==="tags")i.tags=v.split(",").map(t=>t.trim().replace(/^#/,"").toLowerCase()).filter(Boolean);
  else if(f==="title"){if(v.trim())i.title=v.trim()}
  else i[f]=v;
  saveIdea(i);setTimeout(render,0);
});
$("go").onclick=add;
$("q").addEventListener("keydown",e=>{if(e.key==="Enter")add()});
$("s").addEventListener("input",render);
$("ex").onclick=()=>{const b=new Blob([JSON.stringify({ideas:ideas.map(strip),cats},null,1)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="ideen-sicherung.json";a.click()};