const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];

const STORAGE_KEY="bernaV7Miki";
const VERSION="7.0.0";
const DEFAULT_CATEGORIES=["Genel","Psikoloji","İngilizce","Python"];
const THEMES=[
  {id:"paper",name:"Kâğıt",c1:"#f7f3ee",c2:"#8d9d79"},
  {id:"night",name:"Gece",c1:"#131513",c2:"#97ab87"},
  {id:"rose",name:"Gül",c1:"#f9f1f2",c2:"#c08a92"},
  {id:"sky",name:"Gökyüzü",c1:"#eef4f8",c2:"#7ea1b2"}
];
const ROOM_ITEMS={
  wall:{label:"Duvar kağıdı", description:"Duvarı daha tatlı bir hale getir.", costs:[35,55,85], max:3},
  floor:{label:"Zemin", description:"Ahşap zemini daha şık yap.", costs:[30,50,80], max:3},
  window:{label:"Pencere", description:"Miki için daha güzel bir manzara aç.", costs:[25,45,70], max:3},
  bed:{label:"Yatak", description:"Miki'nin uyuduğu alanı rahatlat.", costs:[30,55,90], max:3},
  rug:{label:"Halı", description:"Tatlı, cozy bir pixel halı ekle.", costs:[20,40,60], max:3},
  plant:{label:"Bitki", description:"Odaya sıcaklık ve canlılık kat.", costs:[25,45,75], max:3},
  shelf:{label:"Raf", description:"Rafa kitaplar ve süsler ekle.", costs:[30,50,80], max:3},
  lamp:{label:"Lamba", description:"Yumuşak bir oda ışığı oluştur.", costs:[25,45,70], max:3},
  toy:{label:"Oyuncak", description:"Miki'nin oyuncaklarını çoğalt.", costs:[18,35,55], max:3}
};
const STAGES=[
  {name:"Yavru", minXp:0, next:50},
  {name:"Meraklı", minXp:50, next:130},
  {name:"Oyuncu", minXp:130, next:250},
  {name:"Koca Miki", minXp:250, next:null}
];

function dateKey(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function safeDate(key){
  const date=new Date(`${key}T12:00:00`);
  return Number.isNaN(date.getTime())?new Date():date;
}
function uid(){return `${Date.now()}-${Math.random().toString(16).slice(2)}`;}
function clamp(value,min,max){return Math.min(max,Math.max(min,Number(value)||min));}
function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}
function formatMinutes(value){
  const minutes=Number(value)||0;
  if(minutes<60)return `${minutes} dk`;
  const hour=Math.floor(minutes/60),remaining=minutes%60;
  return remaining?`${hour} sa ${remaining} dk`:`${hour} sa`;
}
function toast(message){
  const element=$("#toast");
  element.textContent=message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>element.classList.remove("show"),1900);
}
function emptyState(text){return `<div class="empty-state">${escapeHtml(text)}</div>`;}

function createDefaultState(){
  return {
    version:VERSION,
    settings:{focus:25,short:5,long:15,dailyGoal:120,theme:"paper"},
    categories:[...DEFAULT_CATEGORIES],
    agenda:[],
    history:{},
    sessions:[],
    stats:{totalMinutes:0,totalSessions:0,currentStreak:0,bestStreak:0,lastFocusDate:null},
    miki:{name:"Miki",xp:0,coins:0},
    room:{wall:0,floor:0,window:0,bed:0,rug:0,plant:0,shelf:0,lamp:0,toy:0}
  };
}
function loadState(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!parsed||typeof parsed!=="object")return createDefaultState();
    const fresh=createDefaultState();
    return {
      ...fresh,...parsed,
      settings:{...fresh.settings,...(parsed.settings||{})},
      stats:{...fresh.stats,...(parsed.stats||{})},
      miki:{...fresh.miki,...(parsed.miki||{})},
      room:{...fresh.room,...(parsed.room||{})},
      categories:Array.isArray(parsed.categories)&&parsed.categories.length?parsed.categories:fresh.categories,
      agenda:Array.isArray(parsed.agenda)?parsed.agenda:[],
      history:parsed.history&&typeof parsed.history==="object"?parsed.history:{},
      sessions:Array.isArray(parsed.sessions)?parsed.sessions:[]
    };
  }catch{return createDefaultState();}
}
let state=loadState();
function saveState(){
  state.version=VERSION;
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}

let selectedDate=dateKey();
let calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
let agendaFilter="all";
let timer={mode:"focus",running:false,remaining:state.settings.focus*60,endAt:null,interval:null};

function getStageInfo(xp=state.miki.xp){
  let stage=STAGES[0];
  for(const item of STAGES){if(xp>=item.minXp)stage=item;}
  return stage;
}
function getStageProgress(){
  const stage=getStageInfo();
  const currentMin=stage.minXp;
  const next=stage.next;
  if(next===null)return {percent:100,label:"Miki tamamen büyüdü!",stage};
  const gained=state.miki.xp-currentMin;
  const total=next-currentMin;
  return {percent:Math.round(gained/total*100),label:`Sonraki evreye ${Math.max(0,next-state.miki.xp)} XP`,stage};
}
function applyTheme(){
  document.body.dataset.theme=state.settings.theme==="paper"?"":state.settings.theme;
  const colors={paper:"#f7f3ee",night:"#131513",rose:"#f9f1f2",sky:"#eef4f8"};
  $('meta[name="theme-color"]').setAttribute("content",colors[state.settings.theme]||colors.paper);
}
function greeting(){
  const hour=new Date().getHours();
  if(hour<6)return "İyi geceler";
  if(hour<12)return "Günaydın";
  if(hour<18)return "İyi günler";
  return "İyi akşamlar";
}
function todayAgendaItems(){return state.agenda.filter(item=>item.date===dateKey());}
function todayFocusStats(){
  return {
    minutes:Number(state.history[dateKey()]||0),
    sessions:state.sessions.filter(item=>item.dateKey===dateKey()).length
  };
}
function switchPage(id){
  $$(".page").forEach(page=>page.classList.toggle("active",page.id===id));
  $$(".nav-button").forEach(button=>button.classList.toggle("active",button.dataset.page===id));
  if(id==="todayPage")renderToday();
  if(id==="agendaPage")renderAgenda();
  if(id==="roomPage")renderRoom();
  if(id==="progressPage")renderProgress();
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderHeaderCoins(){
  $("#globalCoins").textContent=state.miki.coins;
  $("#todayCoins").textContent=`${state.miki.coins} coin`;
  $("#roomCoins").textContent=state.miki.coins;
}
function renderCategories(){
  const focusValue=$("#focusCategory").value;
  const agendaValue=$("#agendaCategorySelect").value;
  const options=state.categories.map(category=>`<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
  $("#focusCategory").innerHTML=options;
  $("#agendaCategorySelect").innerHTML=options;
  if(state.categories.includes(focusValue))$("#focusCategory").value=focusValue;
  if(state.categories.includes(agendaValue))$("#agendaCategorySelect").value=agendaValue;
  $("#rewardSubject").textContent=$("#focusCategory").value||state.categories[0]||"Genel";
}
function todoTemplate(item,scope){
  const meta=[];
  if(item.time)meta.push(`<span>${escapeHtml(item.time)}</span>`);
  if(item.category)meta.push(`<span>${escapeHtml(item.category)}</span>`);
  return `<div class="todo-item ${item.done?"done":""}">
    <label class="check-label">
      <input type="checkbox" data-toggle-${scope}="${item.id}" ${item.done?"checked":""}>
      <span class="check-box">✓</span>
    </label>
    <div class="todo-copy">
      <strong class="todo-title">${escapeHtml(item.text)}</strong>
      ${meta.length?`<div class="todo-meta">${meta.join("")}</div>`:""}
    </div>
    <button class="delete-button" type="button" data-delete-${scope}="${item.id}" aria-label="Sil">×</button>
  </div>`;
}
function addAgendaItem({text,date=dateKey(),time="",category=""}){
  const clean=text.trim();
  if(!clean)return false;
  state.agenda.push({id:uid(),text:clean,date,time,category:category||state.categories[0]||"Genel",done:false});
  saveState();
  return true;
}
function toggleAgenda(id,done){
  const item=state.agenda.find(entry=>entry.id===id);
  if(item)item.done=done;
  saveState();
}
function deleteAgenda(id){
  state.agenda=state.agenda.filter(item=>item.id!==id);
  saveState();
}
function renderToday(){
  const stats=todayFocusStats();
  const today=todayAgendaItems();
  const done=today.filter(item=>item.done).length;
  const goalPercent=Math.min(100,Math.round(stats.minutes/state.settings.dailyGoal*100));
  const stageInfo=getStageInfo();
  $("#todayGreeting").textContent=greeting();
  $("#todayFocusMinutes").textContent=formatMinutes(stats.minutes);
  $("#todaySessionCount").textContent=`${stats.sessions} oturum`;
  $("#todayAgendaRatio").textContent=`${done} / ${today.length}`;
  $("#todayAgendaHint").textContent=today.length?`${today.length-done} görev kaldı`:"Henüz görev eklenmedi";
  $("#heroMikiStage").textContent=stageInfo.name;
  $("#heroMikiXp").textContent=state.miki.xp;
  $("#mikiGrowthHint").textContent=`${stageInfo.name} Miki`;
  $("#goalPercent").textContent=`${goalPercent}%`;
  $("#goalRing").style.strokeDashoffset=String(282.75-(282.75*goalPercent/100));
  $("#todayCopy").textContent=goalPercent>=100?"Günlük hedef tamamlandı, Miki seninle gurur duyuyor.":"Miki ile birlikte odaklan, coin kazan ve odayı güzelleştir.";
  const preview=[...today].sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99")).slice(0,5);
  $("#todayPreviewList").innerHTML=preview.length?preview.map(item=>todoTemplate(item,"today")).join(""):emptyState("Bugün için henüz bir plan eklenmedi.");
}
function timerDuration(mode=timer.mode){return Number(state.settings[mode]||25)*60;}
function setTimerMode(mode){
  stopTimer();
  timer.mode=mode;
  timer.remaining=timerDuration(mode);
  $$(".mode-button").forEach(button=>button.classList.toggle("active",button.dataset.mode===mode));
  renderTimer();
}
function timerCopy(mode){
  return {
    focus:["ODAK ZAMANI","Tek bir işe odaklan ve süre bitene kadar devam et."],
    short:["KISA MOLA","Kısa bir nefes al ve ekranı bırak."],
    long:["UZUN MOLA","Enerjini toplamak için biraz uzaklaş."]
  }[mode];
}
function renderTimer(){
  const minutes=Math.floor(timer.remaining/60),seconds=timer.remaining%60;
  $("#timerDisplay").textContent=`${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
  const total=timerDuration();
  const completed=Math.max(0,total-timer.remaining);
  $("#timerProgressBar").style.width=`${Math.min(100,Math.round(completed/total*100))}%`;
  const [label,hint]=timerCopy(timer.mode);
  $("#timerLabel").textContent=label;
  $("#timerHint").textContent=hint;
  document.title=`${$("#timerDisplay").textContent} · Berna`;
}
function startTimer(){
  if(timer.running)return;
  timer.running=true;
  timer.endAt=Date.now()+timer.remaining*1000;
  $("#toggleTimer").textContent="Duraklat";
  timer.interval=setInterval(updateTimer,250);
}
function stopTimer(){
  timer.running=false;
  timer.endAt=null;
  clearInterval(timer.interval);
  timer.interval=null;
  $("#toggleTimer").textContent="Başlat";
}
function resetTimer(){
  stopTimer();
  timer.remaining=timerDuration();
  renderTimer();
}
function updateStreak(today){
  if(state.stats.lastFocusDate===today)return;
  const yesterday=safeDate(today); yesterday.setDate(yesterday.getDate()-1);
  const yesterdayKey=dateKey(yesterday);
  state.stats.currentStreak=state.stats.lastFocusDate===yesterdayKey?state.stats.currentStreak+1:1;
  state.stats.bestStreak=Math.max(state.stats.bestStreak,state.stats.currentStreak);
  state.stats.lastFocusDate=today;
}
function finishTimer(){
  const completedMode=timer.mode;
  stopTimer();
  if(completedMode==="focus"){
    const minutes=Number(state.settings.focus);
    const today=dateKey();
    const previousStage=getStageInfo().name;
    state.history[today]=Number(state.history[today]||0)+minutes;
    state.stats.totalMinutes+=minutes;
    state.stats.totalSessions+=1;
    updateStreak(today);
    state.miki.xp+=15;
    state.miki.coins+=10;
    state.sessions.unshift({
      id:uid(),
      date:new Date().toISOString(),
      dateKey:today,
      category:$("#focusCategory").value||"Genel",
      goal:$("#focusGoalInput").value.trim(),
      minutes,rewardXp:15,rewardCoins:10
    });
    state.sessions=state.sessions.slice(0,100);
    saveState();
    renderAll();
    const newStage=getStageInfo().name;
    if(newStage!==previousStage)toast(`Miki büyüdü! Yeni evre: ${newStage}`);
    else toast("Pomodoro tamamlandı · +15 XP · +10 coin");
    setTimerMode("short");
  }else{
    toast("Mola tamamlandı");
    setTimerMode("focus");
  }
}
function updateTimer(){
  const remaining=Math.max(0,Math.ceil((timer.endAt-Date.now())/1000));
  if(remaining!==timer.remaining){timer.remaining=remaining;renderTimer();}
  if(remaining===0)finishTimer();
}
function renderDailyGoal(){
  const minutes=todayFocusStats().minutes;
  const percent=Math.min(100,Math.round(minutes/state.settings.dailyGoal*100));
  $("#dailyGoalLabel").textContent=`${minutes} / ${state.settings.dailyGoal} dakika`;
  $("#dailyGoalPercent").textContent=`${percent}%`;
  $("#dailyGoalBar").style.width=`${percent}%`;
}
function renderCalendar(){
  const year=calendarMonth.getFullYear(),month=calendarMonth.getMonth();
  $("#calendarTitle").textContent=calendarMonth.toLocaleDateString("tr-TR",{month:"long",year:"numeric"}).replace(/^./,c=>c.toUpperCase());
  const firstOffset=(new Date(year,month,1).getDay()+6)%7;
  const daysInMonth=new Date(year,month+1,0).getDate();
  const prevDays=new Date(year,month,0).getDate();
  const cells=[];
  for(let index=0;index<42;index++){
    let day, cellMonth=month, other=false;
    if(index<firstOffset){day=prevDays-firstOffset+index+1;cellMonth=month-1;other=true;}
    else if(index>=firstOffset+daysInMonth){day=index-firstOffset-daysInMonth+1;cellMonth=month+1;other=true;}
    else day=index-firstOffset+1;
    const value=dateKey(new Date(year,cellMonth,day));
    const hasTask=state.agenda.some(item=>item.date===value);
    cells.push(`<button class="calendar-day ${other?"other":""} ${value===selectedDate?"selected":""} ${value===dateKey()?"today":""} ${hasTask?"has-task":""}" data-date="${value}" type="button">${day}</button>`);
  }
  $("#calendarGrid").innerHTML=cells.join("");
}
function filteredAgenda(){
  const items=state.agenda.filter(item=>item.date===selectedDate).sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99"));
  if(agendaFilter==="pending")return items.filter(item=>!item.done);
  if(agendaFilter==="done")return items.filter(item=>item.done);
  return items;
}
function renderAgenda(){
  renderCalendar();
  const date=safeDate(selectedDate);
  $("#selectedDateLabel").textContent=selectedDate===dateKey()?"Bugün":date.toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long"}).replace(/^./,c=>c.toUpperCase());
  const all=state.agenda.filter(item=>item.date===selectedDate);
  const done=all.filter(item=>item.done).length;
  const percent=all.length?Math.round(done/all.length*100):0;
  $("#agendaCounter").textContent=`${done} / ${all.length}`;
  $("#agendaProgressBar").style.width=`${percent}%`;
  $("#clearCompletedAgenda").disabled=done===0;
  const items=filteredAgenda();
  $("#agendaList").innerHTML=items.length?items.map(item=>todoTemplate(item,"agenda")).join(""):emptyState(
    agendaFilter==="pending"?"Yapılacak madde kalmadı.":agendaFilter==="done"?"Henüz tamamlanan madde yok.":"Bu güne henüz görev eklenmedi."
  );
}
function rect(x,y,w,h,color,rx=0){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" rx="${rx}"/>`;}
function drawCat(stageIndex){
  const size=[1,1.1,1.2,1.34][stageIndex]||1;
  const x=122-(size*12), y=82-(size*5);
  const p=5*size;
  const light="#cfd2d7", mid="#9ba1a9", dark="#5d6166", pink="#f4b7c3", eye="#1d1f23";
  let svg="";
  svg+=rect(x+2*p,y+0*p,1*p,1*p,mid); svg+=rect(x+5*p,y+0*p,1*p,1*p,mid);
  svg+=rect(x+1*p,y+1*p,1*p,1*p,dark); svg+=rect(x+2*p,y+1*p,1*p,1*p,light); svg+=rect(x+5*p,y+1*p,1*p,1*p,light); svg+=rect(x+6*p,y+1*p,1*p,1*p,dark);
  svg+=rect(x+1*p,y+2*p,6*p,1*p,light);
  svg+=rect(x+0*p,y+3*p,8*p,3*p,light);
  svg+=rect(x+1*p,y+6*p,6*p,2*p,light);
  svg+=rect(x+2*p,y+8*p,4*p,1*p,light);
  svg+=rect(x+2*p,y+4*p,1*p,1*p,eye); svg+=rect(x+5*p,y+4*p,1*p,1*p,eye);
  svg+=rect(x+3*p,y+5*p,2*p,1*p,pink);
  svg+=rect(x+0*p,y+7*p,1*p,3*p,mid); svg+=rect(x+7*p,y+7*p,1*p,3*p,mid);
  svg+=rect(x+1*p,y+9*p,1*p,3*p,dark); svg+=rect(x+6*p,y+9*p,1*p,3*p,dark);
  // tail
  svg+=rect(x+7.5*p,y+6*p,1*p,1*p,mid); svg+=rect(x+8.5*p,y+5*p,1*p,1*p,mid); svg+=rect(x+9.5*p,y+4*p,1*p,2*p,mid);
  return svg;
}
function renderRoomScene(){
  const room=state.room;
  const stageIndex=STAGES.findIndex(item=>item.name===getStageInfo().name);
  const wallColors=["#f5eadf","#ffe2ea","#dff2ff","#f0e6ff"];
  const floorColors=["#cda173","#b9906f","#7f6550","#586472"];
  const outsideColors=["#d7efff","#ffd7b5","#b9e5c6","#9fc7ff"];
  const bedColors=["#f5d9d9","#ffcad5","#d2e1ff","#e4d7ff"];
  const rugColors=["#f4c9c9","#ffd6a5","#d6f0c7","#d7d3ff"];
  const lampColors=["#f4e8b5","#ffd9e0","#dde7ff","#d4ffe6"];
  const shelfColors=["#b98969","#a67758","#8f684a","#75563d"];
  const wall=wallColors[room.wall]||wallColors[0];
  const floor=floorColors[room.floor]||floorColors[0];
  const outside=outsideColors[room.window]||outsideColors[0];
  const bed=bedColors[room.bed]||bedColors[0];
  const rug=rugColors[room.rug]||rugColors[0];
  const lamp=lampColors[room.lamp]||lampColors[0];
  const shelf=shelfColors[room.shelf]||shelfColors[0];
  let svg=`<svg viewBox="0 0 220 150" width="100%" height="100%" role="img" aria-label="Miki'nin odası" shape-rendering="crispEdges">`;
  svg+=rect(0,0,220,90,wall);
  if(room.wall>=1){for(let i=12;i<220;i+=28){svg+=rect(i,18,6,6,"rgba(255,255,255,.35)")}}
  if(room.wall>=2){for(let i=18;i<220;i+=36){svg+=rect(i,42,4,4,"rgba(255,255,255,.32)");svg+=rect(i+6,46,4,4,"rgba(255,255,255,.32)")}}
  if(room.wall>=3){for(let i=10;i<220;i+=32){svg+=rect(i,66,10,2,"rgba(255,255,255,.25)")}}
  svg+=rect(0,90,220,60,floor);
  for(let i=0;i<220;i+=18){svg+=rect(i,118,1,32,"rgba(0,0,0,.10)")}
  // window
  svg+=rect(148,16,48,36,"#5d4b42");
  svg+=rect(152,20,18,28,outside);
  svg+=rect(174,20,18,28,outside);
  svg+=rect(171,20,3,28,"#5d4b42");
  svg+=rect(152,33,40,3,"#5d4b42");
  if(room.window>=1){svg+=rect(156,24,10,10,"rgba(255,255,255,.35)")}
  if(room.window>=2){svg+=rect(178,39,8,3,"#fff5aa");svg+=rect(181,36,2,9,"#fff5aa")}
  if(room.window>=3){svg+=rect(154,44,12,4,"#7bc96f");svg+=rect(178,44,12,4,"#7bc96f")}
  // shelf
  if(room.shelf>0){
    svg+=rect(16,18,46,5,shelf); svg+=rect(18,23,4,12,shelf); svg+=rect(56,23,4,12,shelf);
    svg+=rect(22,12,8,6,"#e1b2c0"); svg+=rect(33,10,8,8,"#9ec8f3");
    if(room.shelf>=2){svg+=rect(44,12,10,6,"#f5db8f")}
    if(room.shelf>=3){svg+=rect(24,25,12,6,"#f6e4b1"); svg+=rect(41,25,10,6,"#c8e4bf")}
  }
  // lamp
  if(room.lamp>0){
    svg+=rect(102,0,4,16,"#5b5b5b"); svg+=rect(94,16,20,12,lamp);
    if(room.lamp>=2){svg+=rect(98,28,12,5,"rgba(255,243,174,.42)")}
    if(room.lamp>=3){svg+=rect(90,33,28,4,"rgba(255,243,174,.22)")}
  }
  // bed
  if(room.bed>0){
    svg+=rect(18,97,58,22,"#8a6b59"); svg+=rect(18,92,18,8,"#6c5445"); svg+=rect(24,99,46,16,bed);
    svg+=rect(24,95,18,8,"#fff8f5");
    if(room.bed>=2){svg+=rect(48,98,16,6,"#ffdbe4")}
    if(room.bed>=3){svg+=rect(18,86,4,11,"#6c5445"); svg+=rect(72,86,4,11,"#6c5445"); svg+=rect(18,86,58,4,"#6c5445")}
  }
  // rug
  if(room.rug>0){
    svg+=rect(74,108,70,18,rug);
    if(room.rug>=2){for(let i=78;i<138;i+=12){svg+=rect(i,112,6,4,"rgba(255,255,255,.35)")}}
    if(room.rug>=3){svg+=rect(102,114,8,6,"#ff9fb3"); svg+=rect(98,118,16,3,"#ff9fb3")}
  }
  // plant
  if(room.plant>0){
    svg+=rect(12,108,12,12,"#b8825e"); svg+=rect(16,92,4,16,"#417a44");
    svg+=rect(11,94,6,6,"#7cc67a"); svg+=rect(17,88,8,8,"#7cc67a");
    if(room.plant>=2){svg+=rect(20,96,8,8,"#6bbf68"); svg+=rect(8,100,8,8,"#8cd28a")}
    if(room.plant>=3){svg+=rect(20,84,6,6,"#a2d49f"); svg+=rect(25,89,4,16,"#4b8a50")}
  }
  // toy
  if(room.toy>0){
    svg+=rect(176,110,18,8,"#f3b9c8");
    if(room.toy>=2){svg+=rect(168,116,10,6,"#f7c65e")}
    if(room.toy>=3){svg+=rect(194,112,10,10,"#8fd0f0")}
  }
  // cat shadow
  svg+=rect(108,120,32,6,"rgba(0,0,0,.12)",3);
  // cat
  svg+=drawCat(stageIndex<0?0:stageIndex);
  svg+=`</svg>`;
  $("#roomScene").innerHTML=svg;
}
function shopCard(key,config){
  const level=state.room[key];
  const nextLevel=level+1;
  const isMax=level>=config.max;
  const cost=isMax?0:config.costs[level];
  const names=["Başlangıç","Seviye 1","Seviye 2","Seviye 3"];
  const buttonLabel=isMax?"Maksimum":`Yükselt · ${cost} coin`;
  return `<article class="shop-card">
    <div class="shop-meta">
      <h3>${escapeHtml(config.label)}</h3>
      <span class="soft-pill">${names[level]}</span>
    </div>
    <p>${escapeHtml(config.description)}</p>
    <div class="shop-meta">
      <span class="shop-price">${isMax?"Tamamlandı":`Sonraki: ${cost} coin`}</span>
      <button class="primary-button" type="button" data-buy-item="${key}" ${isMax||state.miki.coins<cost?"disabled":""}>${buttonLabel}</button>
    </div>
  </article>`;
}
function renderRoom(){
  renderRoomScene();
  renderHeaderCoins();
  const progress=getStageProgress();
  $("#mikiStageLabel").textContent=progress.stage.name;
  $("#mikiXpLabel").textContent=state.miki.xp;
  $("#mikiNextLabel").textContent=progress.label;
  $("#mikiPercentLabel").textContent=`${progress.percent}%`;
  $("#mikiXpBar").style.width=`${progress.percent}%`;
  $("#shopGrid").innerHTML=Object.entries(ROOM_ITEMS).map(([key,config])=>shopCard(key,config)).join("");
}
function buyRoomItem(key){
  const config=ROOM_ITEMS[key];
  const level=state.room[key];
  if(level>=config.max)return;
  const cost=config.costs[level];
  if(state.miki.coins<cost)return toast("Yeterli coin yok");
  state.miki.coins-=cost;
  state.room[key]+=1;
  saveState();
  renderAll();
  toast(`${config.label} geliştirildi`);
}
function lastSevenDays(){
  const days=[];
  for(let offset=6;offset>=0;offset--){
    const date=new Date(); date.setDate(date.getDate()-offset); days.push(date);
  }
  return days;
}
function renderProgress(){
  const days=lastSevenDays();
  const values=days.map(day=>Number(state.history[dateKey(day)]||0));
  const total=values.reduce((sum,value)=>sum+value,0);
  const max=Math.max(1,...values);
  $("#weeklyMinutes").textContent=formatMinutes(total);
  $("#weeklyChart").innerHTML=days.map((day,index)=>`<div class="chart-column">
    <div class="chart-track"><div class="chart-value" style="height:${Math.max(3,Math.round(values[index]/max*100))}%"></div></div>
    <small>${day.toLocaleDateString("tr-TR",{weekday:"short"}).slice(0,3)}</small>
  </div>`).join("");
  $("#allTimeMinutes").textContent=formatMinutes(state.stats.totalMinutes);
  $("#allTimeSessions").textContent=state.stats.totalSessions;
  $("#bestStreak").textContent=`${state.stats.bestStreak} gün`;
  $("#sessionHistory").innerHTML=state.sessions.length?state.sessions.slice(0,12).map(session=>{
    const date=new Date(session.date);
    return `<div class="history-item">
      <strong>${escapeHtml(session.category||"Genel")}</strong>
      <span>${session.minutes} dk</span>
      <small>${date.toLocaleDateString("tr-TR",{day:"numeric",month:"long"})}${session.goal?` · ${escapeHtml(session.goal)}`:""} · +${session.rewardXp} XP · +${session.rewardCoins} coin</small>
    </div>`;
  }).join(""):emptyState("Tamamlanan odak oturumları burada görünecek.");
}
function renderSettings(){
  $("#settingFocus").value=state.settings.focus;
  $("#settingShort").value=state.settings.short;
  $("#settingLong").value=state.settings.long;
  $("#settingGoal").value=state.settings.dailyGoal;
  $("#themeOptions").innerHTML=THEMES.map(theme=>`<button class="theme-button ${state.settings.theme===theme.id?"active":""}" data-theme="${theme.id}" type="button">
    <span class="theme-swatch" style="--c1:${theme.c1};--c2:${theme.c2}"></span>
    <small>${theme.name}</small>
  </button>`).join("");
}
function renderAll(){
  renderHeaderCoins();
  renderCategories();
  renderToday();
  renderDailyGoal();
  renderAgenda();
  renderRoom();
  renderProgress();
}

function exportData(){
  const blob=new Blob([JSON.stringify({app:"Berna Miki",version:VERSION,exportedAt:new Date().toISOString(),state},null,2)],{type:"application/json"});
  const anchor=document.createElement("a");
  anchor.href=URL.createObjectURL(blob);
  anchor.download=`berna-miki-yedek-${dateKey()}.json`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
  toast("Yedek indirildi");
}
async function importData(file){
  try{
    const parsed=JSON.parse(await file.text());
    const incoming=parsed.state||parsed;
    if(!incoming||typeof incoming!=="object")throw new Error("invalid");
    state={...createDefaultState(),...incoming,settings:{...createDefaultState().settings,...(incoming.settings||{})},stats:{...createDefaultState().stats,...(incoming.stats||{})},miki:{...createDefaultState().miki,...(incoming.miki||{})},room:{...createDefaultState().room,...(incoming.room||{})}};
    saveState();
    applyTheme();
    timer.remaining=timerDuration();
    renderTimer();
    renderAll();
    toast("Yedek yüklendi");
  }catch{toast("Geçersiz yedek dosyası");}
}
async function registerServiceWorker(){
  if(!("serviceWorker" in navigator))return;
  try{
    const registration=await navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"});
    await registration.update();
  }catch(error){console.warn("SW error",error);}
}

$$(".nav-button").forEach(button=>button.addEventListener("click",()=>switchPage(button.dataset.page)));
$$(".mode-button").forEach(button=>button.addEventListener("click",()=>setTimerMode(button.dataset.mode)));
$("#jumpToFocus").addEventListener("click",()=>switchPage("focusPage"));
$("#seeFullAgenda").addEventListener("click",()=>{selectedDate=dateKey();calendarMonth=new Date();switchPage("agendaPage");});

$("#quickAgendaForm").addEventListener("submit",event=>{
  event.preventDefault();
  if(addAgendaItem({text:$("#quickAgendaInput").value})){
    $("#quickAgendaInput").value="";
    renderToday(); renderAgenda();
    toast("Bugüne eklendi");
  }
});
$("#todayPreviewList").addEventListener("change",event=>{
  const id=event.target.dataset.toggleToday;
  if(!id)return;
  toggleAgenda(id,event.target.checked);
  renderToday(); renderAgenda();
});
$("#todayPreviewList").addEventListener("click",event=>{
  const button=event.target.closest("[data-delete-today]");
  if(!button)return;
  deleteAgenda(button.dataset.deleteToday);
  renderToday(); renderAgenda();
});

$("#toggleTimer").addEventListener("click",()=>timer.running?stopTimer():startTimer());
$("#resetTimer").addEventListener("click",resetTimer);
$("#focusCategory").addEventListener("change",()=>$("#rewardSubject").textContent=$("#focusCategory").value);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&timer.running)updateTimer();});

$("#previousMonth").addEventListener("click",()=>{calendarMonth.setMonth(calendarMonth.getMonth()-1);renderCalendar();});
$("#nextMonth").addEventListener("click",()=>{calendarMonth.setMonth(calendarMonth.getMonth()+1);renderCalendar();});
$("#calendarGrid").addEventListener("click",event=>{
  const button=event.target.closest("[data-date]");
  if(!button)return;
  selectedDate=button.dataset.date;
  const date=safeDate(selectedDate);
  calendarMonth=new Date(date.getFullYear(),date.getMonth(),1);
  agendaFilter="all";
  $$("[data-agenda-filter]").forEach(filter=>filter.classList.toggle("active",filter.dataset.agendaFilter==="all"));
  renderAgenda();
});
$$("[data-agenda-filter]").forEach(button=>button.addEventListener("click",()=>{
  agendaFilter=button.dataset.agendaFilter;
  $$("[data-agenda-filter]").forEach(item=>item.classList.toggle("active",item===button));
  renderAgenda();
}));
$("#clearCompletedAgenda").addEventListener("click",()=>{
  const count=state.agenda.filter(item=>item.date===selectedDate&&item.done).length;
  if(!count)return;
  state.agenda=state.agenda.filter(item=>item.date!==selectedDate||!item.done);
  saveState(); renderToday(); renderAgenda();
  toast(`${count} görev temizlendi`);
});
$("#agendaForm").addEventListener("submit",event=>{
  event.preventDefault();
  if(addAgendaItem({text:$("#agendaTextInput").value,date:selectedDate,time:$("#agendaTimeInput").value,category:$("#agendaCategorySelect").value})){
    $("#agendaTextInput").value=""; $("#agendaTimeInput").value="";
    renderToday(); renderAgenda();
    toast("Ajandaya eklendi");
  }
});
$("#agendaList").addEventListener("change",event=>{
  const id=event.target.dataset.toggleAgenda;
  if(!id)return;
  toggleAgenda(id,event.target.checked);
  renderToday(); renderAgenda();
});
$("#agendaList").addEventListener("click",event=>{
  const button=event.target.closest("[data-delete-agenda]");
  if(!button)return;
  deleteAgenda(button.dataset.deleteAgenda);
  renderToday(); renderAgenda();
});

$("#shopGrid").addEventListener("click",event=>{
  const button=event.target.closest("[data-buy-item]");
  if(!button)return;
  buyRoomItem(button.dataset.buyItem);
});

$("#openSettings").addEventListener("click",()=>{renderSettings(); $("#settingsDialog").showModal();});
$("#closeSettings").addEventListener("click",()=>$("#settingsDialog").close());
$("#themeOptions").addEventListener("click",event=>{
  const button=event.target.closest("[data-theme]");
  if(!button)return;
  state.settings.theme=button.dataset.theme;
  applyTheme();
  renderSettings();
});
$("#saveSettings").addEventListener("click",()=>{
  state.settings.focus=clamp($("#settingFocus").value,1,120);
  state.settings.short=clamp($("#settingShort").value,1,30);
  state.settings.long=clamp($("#settingLong").value,1,60);
  state.settings.dailyGoal=clamp($("#settingGoal").value,10,600);
  saveState();
  resetTimer();
  renderAll();
  $("#settingsDialog").close();
  toast("Ayarlar kaydedildi");
});
$("#resetAllData").addEventListener("click",()=>{
  if(!confirm("Tüm veriler sıfırlansın mı?"))return;
  localStorage.removeItem(STORAGE_KEY);
  state=createDefaultState();
  saveState();
  applyTheme();
  resetTimer();
  renderAll();
  $("#settingsDialog").close();
  toast("Tüm veriler sıfırlandı");
});

$("#exportData").addEventListener("click",exportData);
$("#importData").addEventListener("change",event=>{
  const file=event.target.files[0];
  if(file)importData(file);
  event.target.value="";
});

applyTheme();
renderCategories();
renderTimer();
renderAll();
addEventListener("load",registerServiceWorker);
