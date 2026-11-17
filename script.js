var ST=["Nicht begonnen","In Bearbeitung","Fertig"],KEY="ideenwerkstatt-v2",NOCAT="Ohne Kategorie";
var ideas=[],cats=[],fs=-1,open={};
var $=function(i){return document.getElementById(i)};
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function esc(t){return String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function load(){try{var d=JSON.parse(localStorage.getItem(KEY)||"{}");ideas=d.ideas||[];cats=d.cats||[]}catch(e){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify({ideas:ideas,cats:cats}))}catch(e){}}
function find(id){return ideas.filter(function(x){return x.id===id})[0]}
function allCats(){var c=cats.slice();ideas.forEach(function(i){if(i.cat&&c.indexOf(i.cat)<0)c.push(i.cat)});return c.sort(function(a,b){return a.localeCompare(b,"de")})}
function add(){
  var v=$("q").value.trim();if(!v)return;
  var i={id:uid(),title:v,desc:"",status:0,cat:"",materials:"",tags:[],ts:Date.now()};
  ideas.unshift(i);open[i.id]=true;save();$("q").value="";render();
}
function render(){
  var q=$("s").value.toLowerCase();
  $("sf").innerHTML=['<button class="chip'+(fs<0?' on':'')+'" data-s="-1">Alle</button>'].concat(ST.map(function(n,k){return '<button class="chip'+(fs===k?' on':'')+'" data-s="'+k+'">'+n+'</button>'})).join("");
  var list=ideas.filter(function(i){
    if(fs>=0&&i.status!==fs)return false;
    return !q||[i.title,i.desc,i.materials,i.cat,(i.tags||[]).join(" ")].join(" ").toLowerCase().indexOf(q)>=0;
  });
  if(!list.length){$("list").innerHTML='<div class="empty">'+(ideas.length?'Nichts gefunden.':'Noch keine Ideen. Die erste kommt oben rein.')+'</div>';return}
  var groups={};list.forEach(function(i){var k=i.cat||NOCAT;(groups[k]=groups[k]||[]).push(i)});
  var keys=Object.keys(groups).sort(function(a,b){return a===NOCAT?1:b===NOCAT?-1:a.localeCompare(b,"de")});
  $("list").innerHTML=keys.map(function(k){
    return '<h2><span>'+esc(k)+'</span><span>'+groups[k].length+'</span></h2>'+groups[k].sort(function(a,b){return a.status-b.status||b.ts-a.ts}).map(card).join("");
  }).join("");
}
function card(i){
  var o=open[i.id],h='<div class="card s'+i.status+'" data-id="'+i.id+'"><div class="top"><div class="ttl">'+esc(i.title)+'</div><span class="st">'+ST[i.status]+'</span></div>';
  if(!o){
    if(i.desc)h+='<div class="meta">'+esc(i.desc.length>110?i.desc.slice(0,110)+"…":i.desc)+'</div>';
    if(i.materials)h+='<div class="meta">🔧 '+esc(i.materials.replace(/\n/g,", "))+'</div>';
    if((i.tags||[]).length)h+='<div class="tags">'+i.tags.map(function(t){return '<span class="tag">#'+esc(t)+'</span>'}).join("")+'</div>';
  }else{
    var opts='<option value="">'+NOCAT+'</option>'+allCats().map(function(c){return '<option'+(c===i.cat?' selected':'')+' value="'+esc(c)+'">'+esc(c)+'</option>'}).join("");
    h+='<div class="det"><label>Name<input type="text" data-f="title" value="'+esc(i.title)+'"></label>'
    +'<label>Beschreibung<textarea data-f="desc">'+esc(i.desc)+'</textarea></label>'
    +'<label>Status</label><div class="seg" style="margin-top:-6px">'+ST.map(function(n,k){return '<button data-act="set" data-v="'+k+'" class="'+(i.status===k?'on':'')+'">'+n+'</button>'}).join("")+'</div>'
    +'<label>Kategorie<select data-f="cat">'+opts+'</select></label>'
    +'<div class="newcat"><input type="text" id="nc-'+i.id+'" placeholder="Neue Kategorie anlegen…" autocomplete="off"><button class="btn" data-act="addcat">Anlegen</button></div>'
    +'<label>Materialien (eins pro Zeile)<textarea data-f="materials">'+esc(i.materials)+'</textarea></label>'
    +'<label>Tags (mit Komma)<input type="text" data-f="tags" value="'+esc((i.tags||[]).join(", "))+'"></label>'
    +'<button class="del" data-act="del">Löschen</button></div>';
  }
  return h+'</div>';
}
document.addEventListener("click",function(e){
  var c=e.target.closest(".chip");
  if(c&&c.dataset.s!==undefined){fs=+c.dataset.s;render();return}
  var card=e.target.closest(".card");if(!card)return;
  var i=find(card.dataset.id);if(!i)return;
  var a=e.target.dataset.act;
  if(a==="set"){i.status=+e.target.dataset.v;save();render()}
  else if(a==="addcat"){newCat(i)}
  else if(a==="del"){if(confirm("Idee wirklich löschen?")){ideas=ideas.filter(function(x){return x!==i});save();render()}}
  else if(e.target.classList.contains("ttl")){open[i.id]=!open[i.id];render()}
});
function newCat(i){
  var el=$("nc-"+i.id),n=el?el.value.trim():"";if(!n)return;
  var ex=allCats().filter(function(c){return c.toLowerCase()===n.toLowerCase()})[0];
  if(ex)n=ex;else cats.push(n);
  i.cat=n;save();render();
}
document.addEventListener("keydown",function(e){
  if(e.key!=="Enter"||!e.target.id||e.target.id.indexOf("nc-")!==0)return;
  var i=find(e.target.id.slice(3));if(i){e.preventDefault();newCat(i)}
});
document.addEventListener("change",function(e){
  var f=e.target.dataset.f,card=e.target.closest(".card");if(!f||!card)return;
  var i=find(card.dataset.id);if(!i)return;var v=e.target.value;
  if(f==="tags")i.tags=v.split(",").map(function(t){return t.trim().replace(/^#/,"").toLowerCase()}).filter(Boolean);
  else if(f==="title"){if(v.trim())i.title=v.trim()}
  else if(f==="cat")i.cat=v;
  else i[f]=v;
  save();setTimeout(render,0);
});
$("go").onclick=add;
$("q").addEventListener("keydown",function(e){if(e.key==="Enter")add()});
$("s").addEventListener("input",render);
$("ex").onclick=function(){var b=new Blob([JSON.stringify({ideas:ideas,cats:cats},null,1)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="ideen-sicherung.json";a.click()};
$("im").onclick=function(){$("fi").click()};
$("fi").onchange=function(){var f=this.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{var d=JSON.parse(r.result),ids={};ideas.forEach(function(i){ids[i.id]=1});(d.ideas||[]).forEach(function(i){if(i&&i.title&&!ids[i.id])ideas.push(i)});(d.cats||[]).forEach(function(c){if(cats.indexOf(c)<0)cats.push(c)});save();render()}catch(e){alert("Datei konnte nicht gelesen werden.")}};r.readAsText(f)};
load();render();
