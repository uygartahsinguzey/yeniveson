const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const DEFAULTS={focus:25,short:5,long:15,dailyGoal:120,autoStart:false,ambientVolume:28,theme:"paper"};
const THEMES=[["paper","Kâğıt","#f4f1eb","#718169"],["forest","Orman","#111713","#8aa47e"],["lavender","Lavanta","#17141b","#b292c4"],["ocean","Okyanus","#111a20","#77aaba"]];
const INITIAL_SUBJECTS=["Psikoloji","İngilizce","Python","Genel tekrar"];

function loadObj(key,fallback){try{return{...fallback,...JSON.parse(localStorage.getItem(key)||"{}")}}catch{return{...fallback}}}
function loadArr(key,fallback=[]){try{const value=JSON.parse(localStorage.getItem(key));return Array.isArray(value)?value:fallback.slice()}catch{return fallback.slice()}}
function save(key,value){localStorage.setItem(key,JSON.stringify(value))}
function dateKey(d=new Date()){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function yesterdayKey(){const d=new Date();d.setDate(d.getDate()-1);return dateKey(d)}
function uid(){return`${Date.now()}-${Math.random().toString(16).slice(2)}`}
function esc(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function clamp(value,min,max){return Math.min(max,Math.max(min,+value||min))}
function formatMinutes(minutes){return minutes>=60?`${Math.floor(minutes/60)} sa ${minutes%60} dk`:`${minutes} dk`}
function toast(message){const element=$("#toast");element.textContent=message;element.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>element.classList.remove("show"),1800)}

const state={
  mode:"focus",running:false,remaining:1500,endAt:null,interval:null,
  settings:loadObj("bernaSettings",DEFAULTS),
  stats:loadObj("bernaStats",{date:dateKey(),minutes:0,pomodoros:0,streak:0,lastStudyDate:null,totalPomodoros:0}),
  history:loadObj("bernaHistory",{}),
  subjectTotals:loadObj("bernaSubjectTotals",{}),
  tasks:loadArr("bernaTasks"),
  subjects:loadArr("bernaSubjects",INITIAL_SUBJECTS),
  sessions:loadArr("bernaSessions"),
  exam:loadObj("bernaExam",{name:"",date:""}),
  agenda:loadArr("bernaAgenda")
};

let selectedDate=dateKey();
let calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
let agendaFilter="all";
let ambient={ctx:null,nodes:[],playing:false};

function ensureDay(){
  if(state.stats.date!==dateKey()){
    state.stats.date=dateKey();
    state.stats.minutes=0;
    state.stats.pomodoros=0;
    save("bernaStats",state.stats);
  }
}
function duration(mode){return Math.max(1,+state.settings[mode]||DEFAULTS[mode])*60}
function applyTheme(){
  document.body.dataset.theme=state.settings.theme;
  const theme=THEMES.find(item=>item[0]===state.settings.theme)||THEMES[0];
  document.querySelector('meta[name="theme-color"]').content=theme[2];
}
function setPage(id){
  $$(".main-tab").forEach(button=>button.classList.toggle("active",button.dataset.page===id));
  $$(".page").forEach(page=>page.classList.toggle("active",page.id===id));
  if(id==="agendaPage")renderAgenda();
  if(id==="tasksPage")renderTasks();
  if(id==="profilePage")renderProfile();
  window.scrollTo({top:0,behavior:"smooth"});
}
function setMode(mode){
  stopTimer();
  state.mode=mode;
  state.remaining=duration(mode);
  $$(".mode-tab").forEach(button=>button.classList.toggle("active",button.dataset.mode===mode));
  const copy={
    focus:["ODAK ZAMANI","Tek bir işe odaklan, süre bitince mola ver."],
    short:["KISA MOLA","Ayağa kalk, su iç ve zihnini dinlendir."],
    long:["UZUN MOLA","Biraz uzaklaş ve enerjini yenile."]
  }[mode];
  $("#modeLabel").textContent=copy[0];
  $("#sessionHint").textContent=copy[1];
  renderTimer();
}
function renderTimer(){
  const minutes=Math.floor(state.remaining/60),seconds=state.remaining%60;
  $("#timer").textContent=`${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
  document.title=`${$("#timer").textContent} · Berna`;
}
function startTimer(){
  if(state.running)return;
  state.running=true;
  state.endAt=Date.now()+state.remaining*1000;
  $("#startButton").textContent="Duraklat";
  document.body.classList.add("timer-running");
  state.interval=setInterval(tick,250);
}
function stopTimer(){
  state.running=false;
  state.endAt=null;
  clearInterval(state.interval);
  state.interval=null;
  $("#startButton").textContent="Başlat";
  document.body.classList.remove("timer-running");
}
function tick(){
  const remaining=Math.max(0,Math.ceil((state.endAt-Date.now())/1000));
  if(remaining!==state.remaining){state.remaining=remaining;renderTimer()}
  if(remaining===0)completeSession();
}
function resetTimer(){stopTimer();state.remaining=duration(state.mode);renderTimer()}
function completeSession(){
  const completedMode=state.mode;
  stopTimer();
  if(completedMode==="focus"){
    ensureDay();
    const minutes=+state.settings.focus;
    state.stats.minutes+=minutes;
    state.stats.pomodoros+=1;
    state.stats.totalPomodoros=(state.stats.totalPomodoros||0)+1;
    if(state.stats.lastStudyDate!==dateKey()){
      state.stats.streak=state.stats.lastStudyDate===yesterdayKey()?state.stats.streak+1:1;
      state.stats.lastStudyDate=dateKey();
    }
    state.history[dateKey()]=(state.history[dateKey()]||0)+minutes;
    const subject=$("#subjectSelect").value||"Genel tekrar";
    state.subjectTotals[subject]=(state.subjectTotals[subject]||0)+minutes;
    state.sessions.unshift({date:new Date().toISOString(),subject,minutes,note:$("#focusNote").value.trim()});
    state.sessions=state.sessions.slice(0,50);
    save("bernaStats",state.stats);save("bernaHistory",state.history);save("bernaSubjectTotals",state.subjectTotals);save("bernaSessions",state.sessions);
    renderStats();
    toast("Odak oturumu tamamlandı");
  }else toast("Mola tamamlandı");
  const next=completedMode==="focus"?"short":"focus";
  setMode(next);
  if(state.settings.autoStart)startTimer();
}
function renderStats(){
  ensureDay();
  $("#todayMinutes").textContent=formatMinutes(state.stats.minutes);
  $("#todaySessions").textContent=state.stats.pomodoros;
  $("#streakCount").textContent=`${state.stats.streak||0} gün`;
  $("#streakMessage").textContent=state.stats.streak?`${state.stats.streak} gündür düzenini koruyorsun.`:"İlk çalışma gününü başlat.";
  const goal=Math.max(10,+state.settings.dailyGoal||120);
  const percent=Math.min(100,Math.round(state.stats.minutes/goal*100));
  $("#goalLabel").textContent=`${state.stats.minutes} / ${goal} dk`;
  $("#goalPercent").textContent=`${percent}%`;
  $("#progressBar").style.width=`${percent}%`;
}
function renderSubjects(){
  if(!state.subjects.length)state.subjects=INITIAL_SUBJECTS.slice();
  const selected=localStorage.getItem("bernaSubject")||state.subjects[0];
  const options=state.subjects.map(subject=>`<option ${subject===selected?"selected":""}>${esc(subject)}</option>`).join("");
  $("#subjectSelect").innerHTML=options;
  $("#agendaSubject").innerHTML=options;
  $("#subjectList").innerHTML=state.subjects.map((subject,index)=>`<span class="subject-chip">${esc(subject)}<button type="button" data-del-subject="${index}" aria-label="${esc(subject)} kategorisini sil">×</button></span>`).join("");
}
function addSubject(){
  const input=$("#subjectInput"),name=input.value.trim();
  if(!name)return;
  if(state.subjects.some(subject=>subject.toLowerCase()===name.toLowerCase()))return toast("Bu kategori zaten var");
  state.subjects.push(name);save("bernaSubjects",state.subjects);input.value="";renderSubjects();toast("Kategori eklendi");
}
function renderTasks(){
  const done=state.tasks.filter(task=>task.done).length;
  $("#taskSummary").textContent=`${done} / ${state.tasks.length}`;
  $("#taskList").innerHTML=state.tasks.length?state.tasks.map((task,index)=>`<div class="task-item ${task.done?"done":""}">
    <label class="check-wrap">
      <input type="checkbox" data-toggle-task="${index}" ${task.done?"checked":""}>
      <span class="custom-check">✓</span>
    </label>
    <div class="item-copy"><strong>${esc(task.title||task.text||"Görev")}</strong></div>
    <button class="delete-button" type="button" data-del-task="${index}" aria-label="Görevi sil">×</button>
  </div>`).join(""):'<div class="empty-state">Listen henüz boş.</div>';
}
function addTask(){
  const input=$("#taskInput"),title=input.value.trim();
  if(!title)return;
  state.tasks.unshift({id:uid(),title,done:false});save("bernaTasks",state.tasks);input.value="";renderTasks();toast("Görev eklendi");
}
function renderCalendar(){
  const year=calendarMonth.getFullYear(),month=calendarMonth.getMonth();
  $("#calendarTitle").textContent=calendarMonth.toLocaleDateString("tr-TR",{month:"long",year:"numeric"}).replace(/^./,c=>c.toUpperCase());
  const firstDay=(new Date(year,month,1).getDay()+6)%7;
  const daysInMonth=new Date(year,month+1,0).getDate();
  const previousDays=new Date(year,month,0).getDate();
  const cells=[];
  for(let index=0;index<42;index++){
    let day,cellMonth=month,muted=false;
    if(index<firstDay){day=previousDays-firstDay+index+1;cellMonth=month-1;muted=true}
    else if(index>=firstDay+daysInMonth){day=index-firstDay-daysInMonth+1;cellMonth=month+1;muted=true}
    else day=index-firstDay+1;
    const d=new Date(year,cellMonth,day),key=dateKey(d);
    const hasItems=state.agenda.some(item=>item.date===key);
    cells.push(`<button type="button" class="calendar-day ${muted?"muted":""} ${key===selectedDate?"selected":""} ${hasItems?"has-items":""}" data-date="${key}">${day}</button>`);
  }
  $("#calendarGrid").innerHTML=cells.join("");
}
function selectedAgendaItems(){
  const items=state.agenda.filter(item=>item.date===selectedDate).sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99"));
  if(agendaFilter==="pending")return items.filter(item=>!item.done);
  if(agendaFilter==="done")return items.filter(item=>item.done);
  return items;
}
function renderAgendaList(){
  const date=new Date(`${selectedDate}T12:00:00`);
  $("#selectedDateTitle").textContent=selectedDate===dateKey()?"Bugün":date.toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long"}).replace(/^./,c=>c.toUpperCase());
  const all=state.agenda.filter(item=>item.date===selectedDate);
  const done=all.filter(item=>item.done).length;
  const percent=all.length?Math.round(done/all.length*100):0;
  $("#agendaSummary").textContent=`${done} / ${all.length} tamamlandı`;
  $("#agendaProgressText").textContent=`${percent}%`;
  $("#agendaProgressBar").style.width=`${percent}%`;
  $("#clearCompletedAgenda").disabled=done===0;
  const items=selectedAgendaItems();
  $("#agendaList").innerHTML=items.length?items.map(item=>`<div class="agenda-item ${item.done?"done":""}">
    <label class="check-wrap">
      <input type="checkbox" data-toggle-agenda="${item.id}" ${item.done?"checked":""}>
      <span class="custom-check">✓</span>
    </label>
    <div class="item-copy">
      <strong>${esc(item.title)}</strong>
      <small>${item.time?`${esc(item.time)} · `:""}${esc(item.subject||"Genel")}</small>
    </div>
    <button class="delete-button" type="button" data-del-agenda="${item.id}" aria-label="Maddeden sil">×</button>
  </div>`).join(""):`<div class="empty-state">${agendaFilter==="pending"?"Yapılacak madde kalmadı.":agendaFilter==="done"?"Henüz tamamlanan madde yok.":"Bu güne henüz bir yapılacak eklenmedi."}</div>`;
}
function renderAgenda(){renderCalendar();renderAgendaList()}
function addAgenda(){
  const title=$("#agendaTitle").value.trim();
  if(!title)return;
  state.agenda.push({id:uid(),title,date:selectedDate,time:$("#agendaTime").value,subject:$("#agendaSubject").value,done:false});
  save("bernaAgenda",state.agenda);
  $("#agendaTitle").value="";$("#agendaTime").value="";
  agendaFilter="all";$$("[data-agenda-filter]").forEach(button=>button.classList.toggle("active",button.dataset.agendaFilter==="all"));
  renderAgenda();toast("Yapılacaklara eklendi");
}
function lastSevenDays(){
  const days=[];
  for(let offset=6;offset>=0;offset--){const d=new Date();d.setDate(d.getDate()-offset);days.push(d)}
  return days;
}
function renderChart(){
  const days=lastSevenDays(),values=days.map(day=>state.history[dateKey(day)]||0),max=Math.max(1,...values);
  $("#weekTotal").textContent=formatMinutes(values.reduce((a,b)=>a+b,0));
  $("#weekChart").innerHTML=days.map((day,index)=>`<div class="chart-day">
    <div class="chart-bar-wrap"><div class="chart-bar" style="height:${Math.max(3,Math.round(values[index]/max*100))}%"></div></div>
    <small>${day.toLocaleDateString("tr-TR",{weekday:"short"}).slice(0,3)}</small>
  </div>`).join("");
}
function renderBadges(){
  const totalMinutes=Object.values(state.history).reduce((sum,value)=>sum+(+value||0),0);
  const completedTasks=state.tasks.filter(task=>task.done).length+state.agenda.filter(item=>item.done).length;
  const badges=[
    ["İlk adım","İlk odak oturumunu tamamla",(state.stats.totalPomodoros||0)>=1],
    ["Düzenli","3 günlük seri oluştur",(state.stats.streak||0)>=3],
    ["Bir hafta","7 günlük seri oluştur",(state.stats.streak||0)>=7],
    ["Odak 10","10 oturum tamamla",(state.stats.totalPomodoros||0)>=10],
    ["Odak 50","50 oturum tamamla",(state.stats.totalPomodoros||0)>=50],
    ["5 saat","Toplam 300 dakika çalış",totalMinutes>=300],
    ["Planlı","10 madde tamamla",completedTasks>=10],
    ["Liste ustası","25 madde tamamla",completedTasks>=25]
  ];
  const unlocked=badges.filter(badge=>badge[2]).length;
  $("#badgeCount").textContent=`${unlocked} / ${badges.length}`;
  $("#badgeGrid").innerHTML=badges.map(([name,description,isUnlocked])=>`<div class="badge-card ${isUnlocked?"":"locked"}"><strong>${isUnlocked?"✓ ":""}${name}</strong><small>${description}</small></div>`).join("");
}
function renderExam(){
  $("#examName").value=state.exam.name||"";
  $("#examDate").value=state.exam.date||"";
  if(!state.exam.date){$("#examCountdown").innerHTML='<span>Bir sınav tarihi ekle.</span>';return}
  const today=new Date();today.setHours(0,0,0,0);
  const examDate=new Date(`${state.exam.date}T00:00:00`);
  const days=Math.ceil((examDate-today)/86400000);
  $("#examCountdown").innerHTML=days<0?'<strong>Geçti</strong><small>Sınav tarihi geçmiş.</small>':days===0?'<strong>Bugün</strong><small>Başarılar.</small>':`<strong>${days} gün</strong><small>${esc(state.exam.name||"Sınav")}</small>`;
}
function saveExam(){state.exam={name:$("#examName").value.trim(),date:$("#examDate").value};save("bernaExam",state.exam);renderExam();toast("Sınav kaydedildi")}
function renderSessions(){
  $("#sessionLog").innerHTML=state.sessions.length?state.sessions.slice(0,10).map(session=>{
    const date=new Date(session.date);
    return`<div class="session-entry"><strong>${esc(session.subject||"Genel")}</strong><span>${date.toLocaleDateString("tr-TR",{day:"numeric",month:"short"})} · ${session.minutes} dk</span><small>${session.note?esc(session.note):"Not eklenmedi"}</small></div>`;
  }).join(""):'<div class="empty-state">Tamamlanan oturumlar burada görünür.</div>';
}
function renderProfile(){renderChart();renderBadges();renderExam();renderSessions()}
function renderThemes(){
  $("#themeGrid").innerHTML=THEMES.map(([id,name,a,b])=>`<button class="theme-option ${state.settings.theme===id?"active":""}" data-theme="${id}" type="button"><span class="theme-preview" style="--a:${a};--b:${b}"></span><small>${name}</small></button>`).join("");
}
function openSettings(){
  ["focus","short","long"].forEach(key=>$("#"+key+"Duration").value=state.settings[key]);
  $("#dailyGoal").value=state.settings.dailyGoal;
  $("#autoStart").checked=!!state.settings.autoStart;
  $("#ambientVolume").value=state.settings.ambientVolume;
  $("#ambientVolumeValue").textContent=`${state.settings.ambientVolume}%`;
  renderThemes();$("#settingsDialog").showModal();
}
function saveSettings(){
  state.settings={...state.settings,
    focus:clamp($("#focusDuration").value,1,120),
    short:clamp($("#shortDuration").value,1,30),
    long:clamp($("#longDuration").value,1,60),
    dailyGoal:clamp($("#dailyGoal").value,10,600),
    autoStart:$("#autoStart").checked,
    ambientVolume:+$("#ambientVolume").value
  };
  save("bernaSettings",state.settings);applyTheme();resetTimer();renderStats();$("#settingsDialog").close();toast("Ayarlar kaydedildi");
}
function stopAmbient(){
  ambient.nodes.forEach(node=>{try{node.stop?.();node.disconnect?.()}catch{}});
  ambient.nodes=[];ambient.playing=false;$("#ambientToggle").textContent="Çal";
}
function startAmbient(type){
  stopAmbient();if(type==="off")return;
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(!AudioContextClass)return toast("Tarayıcı ses özelliğini desteklemiyor");
  const context=ambient.ctx||(ambient.ctx=new AudioContextClass());context.resume();
  const master=context.createGain();master.gain.value=state.settings.ambientVolume/100*.32;master.connect(context.destination);ambient.nodes.push(master);
  const makeNoise=(filterType,frequency,volume)=>{
    const size=context.sampleRate*2,buffer=context.createBuffer(1,size,context.sampleRate),data=buffer.getChannelData(0);let last=0;
    for(let i=0;i<size;i++){const white=Math.random()*2-1;last=(last+.02*white)/1.02;data[i]=type==="brown"?last*3.5:white}
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    source.buffer=buffer;source.loop=true;filter.type=filterType;filter.frequency.value=frequency;gain.gain.value=volume;
    source.connect(filter).connect(gain).connect(master);source.start();ambient.nodes.push(source,filter,gain);
  };
  if(type==="rain"){makeNoise("lowpass",4200,.45);makeNoise("highpass",1800,.18)}
  if(type==="brown")makeNoise("lowpass",700,.75);
  if(type==="cafe")makeNoise("bandpass",900,.28);
  ambient.playing=true;$("#ambientToggle").textContent="Durdur";
}
function exportData(){
  const data={version:"5.2-lite",exportedAt:new Date().toISOString()};
  Object.keys(localStorage).filter(key=>key.startsWith("berna")).forEach(key=>data[key]=localStorage.getItem(key));
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const anchor=document.createElement("a");anchor.href=URL.createObjectURL(blob);anchor.download=`berna-v5.2-yedek-${dateKey()}.json`;anchor.click();URL.revokeObjectURL(anchor.href);toast("Yedek indirildi");
}
async function importData(file){
  try{
    const data=JSON.parse(await file.text());if(!data.version)throw new Error();
    Object.entries(data).forEach(([key,value])=>{if(key.startsWith("berna")&&value!==null)localStorage.setItem(key,value)});
    toast("Yedek yüklendi");setTimeout(()=>location.reload(),700);
  }catch{toast("Geçersiz yedek")}
}

$$(".main-tab").forEach(button=>button.addEventListener("click",()=>setPage(button.dataset.page)));
$$(".mode-tab").forEach(button=>button.addEventListener("click",()=>setMode(button.dataset.mode)));
$("#startButton").addEventListener("click",()=>state.running?stopTimer():startTimer());
$("#resetButton").addEventListener("click",resetTimer);
$("#quickAgendaButton").addEventListener("click",()=>setPage("agendaPage"));
$("#settingsButton").addEventListener("click",openSettings);
$("#closeSettingsButton").addEventListener("click",()=>$("#settingsDialog").close());
$("#saveSettingsButton").addEventListener("click",saveSettings);
$("#ambientVolume").addEventListener("input",event=>$("#ambientVolumeValue").textContent=`${event.target.value}%`);
$("#ambientToggle").addEventListener("click",()=>ambient.playing?stopAmbient():startAmbient($("#ambientSelect").value));
$("#ambientSelect").addEventListener("change",()=>{if(ambient.playing)startAmbient($("#ambientSelect").value)});
$("#subjectSelect").addEventListener("change",event=>localStorage.setItem("bernaSubject",event.target.value));

$("#addTaskButton").addEventListener("click",addTask);
$("#taskInput").addEventListener("keydown",event=>{if(event.key==="Enter")addTask()});
$("#taskList").addEventListener("click",event=>{
  const deleteButton=event.target.closest("[data-del-task]");
  if(deleteButton){state.tasks.splice(+deleteButton.dataset.delTask,1);save("bernaTasks",state.tasks);renderTasks()}
});
$("#taskList").addEventListener("change",event=>{
  if(event.target.dataset.toggleTask===undefined)return;
  const task=state.tasks[+event.target.dataset.toggleTask];if(task)task.done=event.target.checked;
  save("bernaTasks",state.tasks);renderTasks();
});
$("#addSubjectButton").addEventListener("click",addSubject);
$("#subjectInput").addEventListener("keydown",event=>{if(event.key==="Enter")addSubject()});
$("#subjectList").addEventListener("click",event=>{
  const button=event.target.closest("[data-del-subject]");if(!button)return;
  if(state.subjects.length===1)return toast("En az bir kategori kalmalı");
  state.subjects.splice(+button.dataset.delSubject,1);save("bernaSubjects",state.subjects);renderSubjects();
});

$("#prevMonth").addEventListener("click",()=>{calendarMonth.setMonth(calendarMonth.getMonth()-1);renderCalendar()});
$("#nextMonth").addEventListener("click",()=>{calendarMonth.setMonth(calendarMonth.getMonth()+1);renderCalendar()});
$("#calendarGrid").addEventListener("click",event=>{
  const button=event.target.closest("[data-date]");if(!button)return;
  selectedDate=button.dataset.date;const date=new Date(`${selectedDate}T12:00:00`);calendarMonth=new Date(date.getFullYear(),date.getMonth(),1);
  agendaFilter="all";$$("[data-agenda-filter]").forEach(item=>item.classList.toggle("active",item.dataset.agendaFilter==="all"));renderAgenda();
});
$("#addAgendaButton").addEventListener("click",addAgenda);
$("#agendaTitle").addEventListener("keydown",event=>{if(event.key==="Enter")addAgenda()});
$("#agendaList").addEventListener("click",event=>{
  const button=event.target.closest("[data-del-agenda]");if(!button)return;
  state.agenda=state.agenda.filter(item=>item.id!==button.dataset.delAgenda);save("bernaAgenda",state.agenda);renderAgenda();
});
$("#agendaList").addEventListener("change",event=>{
  const id=event.target.dataset.toggleAgenda;if(!id)return;
  const item=state.agenda.find(entry=>entry.id===id);if(item)item.done=event.target.checked;
  save("bernaAgenda",state.agenda);renderAgenda();if(item?.done)toast("Tamamlandı ✓");
});
$$("[data-agenda-filter]").forEach(button=>button.addEventListener("click",()=>{
  agendaFilter=button.dataset.agendaFilter;$$("[data-agenda-filter]").forEach(item=>item.classList.toggle("active",item===button));renderAgendaList();
}));
$("#clearCompletedAgenda").addEventListener("click",()=>{
  const count=state.agenda.filter(item=>item.date===selectedDate&&item.done).length;if(!count)return;
  state.agenda=state.agenda.filter(item=>item.date!==selectedDate||!item.done);save("bernaAgenda",state.agenda);renderAgenda();toast(`${count} tamamlanan madde temizlendi`);
});

$("#saveExamButton").addEventListener("click",saveExam);
$("#exportButton").addEventListener("click",exportData);
$("#importInput").addEventListener("change",event=>{if(event.target.files[0])importData(event.target.files[0]);event.target.value=""});
$("#clearDataButton").addEventListener("click",()=>{
  if(confirm("Tüm Berna verileri silinsin mi?")){Object.keys(localStorage).filter(key=>key.startsWith("berna")).forEach(key=>localStorage.removeItem(key));location.reload()}
});
document.addEventListener("click",event=>{
  const themeButton=event.target.closest("[data-theme]");if(!themeButton)return;
  state.settings.theme=themeButton.dataset.theme;save("bernaSettings",state.settings);applyTheme();renderThemes();
});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&state.running)tick()});

async function registerServiceWorker(){
  if(!("serviceWorker" in navigator))return;
  try{
    const registration=await navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"});
    await registration.update();
  }catch{}
}
ensureDay();applyTheme();renderSubjects();renderTasks();renderAgenda();renderProfile();setMode("focus");renderStats();
addEventListener("load",registerServiceWorker);
