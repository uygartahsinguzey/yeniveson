(() => {
  "use strict";

  const KEY = "bernaV14State";
  const OLD_KEY = "bernaV11State";
  const QUOTES = [
    "Mükemmel olmak zorunda değilsin; başlaman yeterli.",
    "Bugünün küçük emeği yarının rahatlığıdır.",
    "Dikkatini tek bir işe ver; gerisi sırayla gelir.",
    "Yavaş ilerlemek de ilerlemektir.",
    "Bir Pomodoro, düşündüğünden daha fazlasını değiştirebilir.",
    "Kendinle yarış, kendine karşı değil.",
    "Küçük rutinler zamanla güçlü bir hayat kurar."
  ];
  const SHOP = [
    {id:"wallpaper",name:"Duvar Kağıdı",icon:"▤",price:50,type:"room",level:1},
    {id:"floor",name:"Ahşap Zemin",icon:"▥",price:50,type:"room",level:1},
    {id:"window",name:"Pencere",icon:"▣",price:60,type:"room",level:1},
    {id:"bed",name:"Kedi Yatağı",icon:"🛏",price:120,type:"room",level:1},
    {id:"rug",name:"Cozy Halı",icon:"◉",price:60,type:"room",level:1},
    {id:"plant",name:"Oda Bitkisi",icon:"♣",price:90,type:"room",level:1},
    {id:"shelf",name:"Kitaplık",icon:"▦",price:180,type:"room",level:2},
    {id:"lamp",name:"Masa Lambası",icon:"💡",price:140,type:"room",level:2},
    {id:"toy",name:"Oyuncak Seti",icon:"⚽",price:35,type:"room",level:1},
    {id:"desk",name:"Çalışma Masası",icon:"🪑",price:220,type:"room",level:3},
    {id:"bow",name:"Pembe Fiyonk",icon:"🎀",price:80,type:"style",level:1},
    {id:"glasses",name:"Çalışma Gözlüğü",icon:"👓",price:110,type:"style",level:2},
    {id:"crown",name:"Altın Taç",icon:"♛",price:150,type:"style",level:4}
  ];
  const ACHIEVEMENTS = [
    {id:"first-focus",icon:"🍅",name:"İlk Adım",desc:"İlk Pomodoro'nu tamamla",test:s=>s.totalPomodoros>=1},
    {id:"focus-10",icon:"🔥",name:"Ritim Buldu",desc:"10 Pomodoro tamamla",test:s=>s.totalPomodoros>=10},
    {id:"focus-50",icon:"🏆",name:"Derin Çalışan",desc:"50 Pomodoro tamamla",test:s=>s.totalPomodoros>=50},
    {id:"task-10",icon:"✓",name:"İşi Bitiren",desc:"10 görev tamamla",test:s=>completedTasks(s)>=10},
    {id:"habit-7",icon:"🌱",name:"Yedi Gün",desc:"Bir alışkanlıkta 7 günlük seri",test:s=>bestHabitStreak(s)>=7},
    {id:"journal-3",icon:"📖",name:"İç Ses",desc:"3 günlük sayfası kaydet",test:s=>Object.keys(s.journal).length>=3},
    {id:"miki-3",icon:"🐾",name:"Büyüyen Dost",desc:"Miki'yi 3. seviyeye getir",test:s=>levelOf(s)>=3},
    {id:"decorator",icon:"🛋",name:"Dekoratör",desc:"5 eşya satın al",test:s=>s.purchased.length>=5},
    {id:"focus-streak",icon:"⚡",name:"İstikrar",desc:"7 gün odak serisi",test:s=>focusStreak(s)>=7},
    {id:"all-rounder",icon:"✨",name:"Dengeli Gün",desc:"Aynı gün görev, alışkanlık ve odak tamamla",test:s=>hasBalancedDay(s)},
    {id:"exam-planner",icon:"🎓",name:"Hazırlık Başladı",desc:"İlk sınav geri sayımını ekle",test:s=>(s.exams||[]).length>=1},
    {id:"card-maker",icon:"◫",name:"Kart Ustası",desc:"10 flashcard oluştur",test:s=>(s.flashcards||[]).length>=10},
    {id:"quiz-ace",icon:"⚡",name:"Quiz Ası",desc:"Bir quizi hatasız tamamla",test:s=>(s.quizHistory||[]).some(q=>q.total>=2&&q.correct===q.total)},
    {id:"room-designer",icon:"✥",name:"İç Mimar",desc:"Odada 3 eşyayı yeniden yerleştir",test:s=>Object.keys(s.room?.positions||{}).length>=3},
    {id:"real-friend",icon:"♧",name:"Odak Arkadaşı",desc:"Bir arkadaşla çevrim içi eşleş",test:s=>(s.friends||[]).some(f=>f.synced)}
  ];

  const $ = (q,p=document)=>p.querySelector(q);
  const $$ = (q,p=document)=>[...p.querySelectorAll(q)];
  const clone = obj => JSON.parse(JSON.stringify(obj));
  const todayKey = () => dateKey(new Date());
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const fromKey = key => { const [y,m,d]=key.split("-").map(Number); return new Date(y,m-1,d); };
  const uid = p => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const clamp = (n,min=0,max=100)=>Math.min(max,Math.max(min,n));
  const esc = value => String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const fmtDate = d => new Intl.DateTimeFormat("tr-TR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(d);
  const fmtShort = d => new Intl.DateTimeFormat("tr-TR",{day:"numeric",month:"short"}).format(d);
  const fmtTime = iso => new Intl.DateTimeFormat("tr-TR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));

  const defaults = {
    version:15,appName:"Berna",mikiName:"Miki",coins:125,xp:0,totalPomodoros:0,
    tasks:[],habits:[],subjects:[],studyBlocks:[],journal:{},friends:[],sessions:[],exams:[],flashcards:[],quizHistory:[],
    purchased:["window","rug"],equipped:["window","rug"],achievements:[],
    selectedPlannerDate:"",selectedTaskFilter:"all",shopFilter:"all",
    lastRewardDate:"",questRewards:{},challenge:{goal:10,startCount:0},
    login:{lastDate:"",streak:0,best:0},
    pet:{hunger:82,happy:82,energy:82,clean:82,lastDecayDate:"",lastCareDate:""},
    room:{season:"spring",weather:"sunny",positions:{},editMode:false},
    settings:{focus:25,shortBreak:5,longBreak:15,sound:true,theme:"blush",breed:"gray",largeText:false,highContrast:false,reduceMotion:false,ambientVolume:35},
    timer:{mode:"focus",running:false,remaining:1500,endAt:null,subjectId:"",intention:""},
    initialized:false,installDismissed:false
  };

  function merge(base,incoming){
    const out=clone(base);
    Object.entries(incoming||{}).forEach(([k,v])=>{
      if(v&&typeof v==="object"&&!Array.isArray(v)&&out[k]&&typeof out[k]==="object"&&!Array.isArray(out[k])) out[k]={...out[k],...v};
      else out[k]=v;
    });
    return out;
  }
  function migrateOld(){
    try{
      const old=JSON.parse(localStorage.getItem(OLD_KEY)||"null");
      if(!old) return null;
      const migrated=merge(defaults,{
        appName:old.appName||"Berna",coins:Number(old.coins)||125,xp:Number(old.xp)||0,totalPomodoros:Number(old.totalPomodoros)||0,
        tasks:(old.tasks||[]).map(t=>({...t,category:t.category||"personal",priority:t.priority||"medium",rewarded:!!t.done})),
        friends:old.friends||[],sessions:old.sessions||[],purchased:old.purchased||[],equipped:old.equipped||[],settings:{...defaults.settings,...old.settings},timer:{...defaults.timer,...old.timer},initialized:false
      });
      return migrated;
    }catch{return null;}
  }
  function load(){
    try{const saved=JSON.parse(localStorage.getItem(KEY)||"null");return saved?merge(defaults,saved):(migrateOld()||clone(defaults));}
    catch{return clone(defaults);}
  }
  let state=load();
  let timerLoop=null,deferredInstall=null,journalMood=0,journalTagSet=new Set(),audio=null;

  function save(){localStorage.setItem(KEY,JSON.stringify(state));window.dispatchEvent(new CustomEvent("berna:state-saved"));}
  function init(){
    if(!state.initialized){
      const t=todayKey();
      state.tasks.length||(state.tasks=[
        {id:uid("task"),title:"Psikoloji makalesi oku",icon:"🧠",minutes:25,date:t,done:false,category:"study",priority:"high",rewarded:false},
        {id:uid("task"),title:"Staj raporuna 25 dakika ayır",icon:"📚",minutes:25,date:t,done:false,category:"work",priority:"medium",rewarded:false},
        {id:uid("task"),title:"Kısa bir yürüyüş yap",icon:"🌿",minutes:20,date:t,done:false,category:"personal",priority:"low",rewarded:false}
      ]);
      state.habits.length||(state.habits=[
        {id:uid("habit"),title:"Su iç",icon:"💧",color:"blue",completions:[]},
        {id:uid("habit"),title:"10 dakika oku",icon:"📚",color:"yellow",completions:[]},
        {id:uid("habit"),title:"Hareket et",icon:"🏃",color:"green",completions:[]}
      ]);
      state.subjects.length||(state.subjects=[
        {id:uid("sub"),name:"Genel Odak",icon:"⭐"},
        {id:uid("sub"),name:"Psikoloji",icon:"🧠"},
        {id:uid("sub"),name:"Dil Çalışması",icon:"🌍"}
      ]);
      state.selectedPlannerDate=t;
      state.pet.lastDecayDate=t;
      state.timer.subjectId=state.subjects[0]?.id||"";
      state.initialized=true;
    }
    applyPetDecay();
    normalizeState();
    save();
  }
  function normalizeState(){
    state.tasks=Array.isArray(state.tasks)?state.tasks:[];state.habits=Array.isArray(state.habits)?state.habits:[];state.subjects=Array.isArray(state.subjects)?state.subjects:[];state.studyBlocks=Array.isArray(state.studyBlocks)?state.studyBlocks:[];state.sessions=Array.isArray(state.sessions)?state.sessions:[];state.friends=Array.isArray(state.friends)?state.friends:[];state.purchased=Array.isArray(state.purchased)?state.purchased:[];state.equipped=Array.isArray(state.equipped)?state.equipped:[];state.achievements=Array.isArray(state.achievements)?state.achievements:[];state.exams=Array.isArray(state.exams)?state.exams:[];state.flashcards=Array.isArray(state.flashcards)?state.flashcards:[];state.quizHistory=Array.isArray(state.quizHistory)?state.quizHistory:[];state.room.positions=state.room.positions&&typeof state.room.positions==="object"?state.room.positions:{};state.pet.clean=Number.isFinite(Number(state.pet.clean))?Number(state.pet.clean):82;
    state.timer.remaining=Number(state.timer.remaining)||modeSeconds(state.timer.mode);
  }
  function applyPetDecay(){
    const last=state.pet.lastDecayDate?fromKey(state.pet.lastDecayDate):new Date();
    const now=fromKey(todayKey());
    const days=Math.max(0,Math.floor((now-last)/86400000));
    if(days){state.pet.hunger=clamp(state.pet.hunger-days*8);state.pet.happy=clamp(state.pet.happy-days*5);state.pet.energy=clamp(state.pet.energy-days*4);state.pet.clean=clamp((state.pet.clean??82)-days*6);state.pet.lastDecayDate=todayKey();}
  }

  const refs={
    appName:$("#appName"),heroName:$("#heroName"),mikiNameTitle:$("#mikiNameTitle"),heroMikiName:$("#heroMikiName"),todayDate:$("#todayDate"),dailyQuote:$("#dailyQuote"),greeting:$("#greeting"),
    headerCoins:$("#headerCoins"),taskList:$("#taskList"),taskEmpty:$("#taskEmpty"),taskProgressText:$("#taskProgressText"),taskProgressPercent:$("#taskProgressPercent"),taskProgressBar:$("#taskProgressBar"),taskSectionTitle:$("#taskSectionTitle"),
    statLevel:$("#statLevel"),statXp:$("#statXp"),statCoins:$("#statCoins"),statStreak:$("#statStreak"),heroLevel:$("#heroLevel"),heroXpBar:$("#heroXpBar"),xpText:$("#xpText"),xpBar:$("#xpBar"),levelText:$("#levelText"),petStage:$("#petStage"),
    timerDisplay:$("#timerDisplay"),timerModeLabel:$("#timerModeLabel"),timerToggleBtn:$("#timerToggleBtn"),timerRing:$(".timer-ring"),focusSubjectSelect:$("#focusSubjectSelect"),focusIntention:$("#focusIntention"),
    todayHabitList:$("#todayHabitList"),questList:$("#questList"),weekStrip:$("#weekStrip"),studyBlockList:$("#studyBlockList"),selectedDayTitle:$("#selectedDayTitle"),subjectList:$("#subjectList"),habitGrid:$("#habitGrid"),
    journalDate:$("#journalDate"),journalText:$("#journalText"),gratitudeText:$("#gratitudeText"),tomorrowText:$("#tomorrowText"),journalHistory:$("#journalHistory"),journalSaveStatus:$("#journalSaveStatus"),
    hungerBar:$("#hungerBar"),happyBar:$("#happyBar"),energyBar:$("#energyBar"),cleanBar:$("#cleanBar"),hungerText:$("#hungerText"),happyText:$("#happyText"),energyText:$("#energyText"),cleanText:$("#cleanText"),petBubble:$("#petBubble"),
    seasonSelect:$("#seasonSelect"),weatherSelect:$("#weatherSelect"),pixelRoom:$("#pixelRoom"),shopGrid:$("#shopGrid"),achievementGrid:$("#achievementGrid"),achievementCount:$("#achievementCount"),
    weekChart:$("#weekChart"),subjectStats:$("#subjectStats"),sessionHistory:$("#sessionHistory"),friendList:$("#friendList"),friendCount:$("#friendCount"),userCode:$("#userCode"),challengeProgress:$("#challengeProgress"),
    toastRegion:$("#toastRegion"),installBtn:$("#installBtn"),installBanner:$("#installBanner")
  };

  function levelOf(s=state){return Math.floor(s.xp/100)+1;}
  function levelXp(){return state.xp%100;}
  function petStage(){const l=levelOf();return l>=8?"Bilge":l>=5?"Yetişkin":l>=3?"Genç":"Yavru";}
  function completedTasks(s=state){return s.tasks.filter(t=>t.done).length;}
  function totalHabitChecks(s=state){return s.habits.reduce((n,h)=>n+(h.completions?.length||0),0);}
  function sessionsOn(key,s=state){return s.sessions.filter(x=>x.date===key&&x.mode!=="break");}
  function tasksOn(key,s=state){return s.tasks.filter(x=>x.date===key&&x.done);}
  function habitChecksOn(key,s=state){return s.habits.filter(h=>h.completions?.includes(key)).length;}
  function focusStreak(s=state){
    let cursor=fromKey(todayKey()),streak=0;
    if(!sessionsOn(dateKey(cursor),s).length)cursor.setDate(cursor.getDate()-1);
    while(sessionsOn(dateKey(cursor),s).length){streak++;cursor.setDate(cursor.getDate()-1);}return streak;
  }
  function habitStreak(h){
    let cursor=fromKey(todayKey()),streak=0;
    if(!(h.completions||[]).includes(dateKey(cursor)))cursor.setDate(cursor.getDate()-1);
    while((h.completions||[]).includes(dateKey(cursor))){streak++;cursor.setDate(cursor.getDate()-1);}return streak;
  }
  function bestHabitStreak(s=state){return Math.max(0,...s.habits.map(h=>habitStreak(h)));}
  function hasBalancedDay(s=state){
    const days=new Set([...s.sessions.map(x=>x.date),...s.tasks.filter(t=>t.done).map(t=>t.date),...s.habits.flatMap(h=>h.completions||[])]);
    return [...days].some(d=>sessionsOn(d,s).length&&tasksOn(d,s).length&&habitChecksOn(d,s));
  }
  function toast(msg){const n=document.createElement("div");n.className="toast";n.textContent=msg;refs.toastRegion.append(n);setTimeout(()=>n.remove(),3200);}
  function currentTaskDate(){return document.body.dataset.view==="planner"?(state.selectedPlannerDate||todayKey()):todayKey();}
  function subjectById(id){return state.subjects.find(s=>s.id===id);}
  function getUserCode(){let c=localStorage.getItem("bernaV14UserCode");if(!c){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";c="MIKI-"+Array.from({length:4},()=>chars[Math.floor(Math.random()*chars.length)]).join("");localStorage.setItem("bernaV14UserCode",c);}return c;}

  function renderHeader(){
    refs.appName.textContent=state.appName;refs.heroName.textContent=state.appName;refs.mikiNameTitle.textContent=state.mikiName;refs.heroMikiName.textContent=state.mikiName;refs.headerCoins.textContent=state.coins;
    const h=new Date().getHours();refs.greeting.textContent=h<6?"İyi geceler":h<12?"Günaydın":h<18?"İyi günler":"İyi akşamlar";
    refs.todayDate.textContent=fmtDate(new Date());const seed=Math.floor(fromKey(todayKey())/86400000);refs.dailyQuote.textContent=QUOTES[Math.abs(seed)%QUOTES.length];
  }
  function renderStats(){
    const level=levelOf(),lx=levelXp(),streak=focusStreak();
    refs.headerCoins.textContent=state.coins;refs.statLevel.textContent=level;refs.statXp.textContent=state.xp;refs.statCoins.textContent=state.coins;refs.statStreak.textContent=`${streak} gün`;refs.heroLevel.textContent=`Seviye ${level}`;refs.heroXpBar.style.width=`${lx}%`;refs.xpText.textContent=`XP: ${lx} / 100`;refs.xpBar.style.width=`${lx}%`;refs.levelText.textContent=`Seviye ${level}`;refs.petStage.textContent=petStage();
    const texts=state.pet.happy<35?["Biraz ilgiye ihtiyacım var…"]:streak>=3?["Serimiz harika gidiyor!","Bugün de ritmi koruyalım."]:["Bugün birlikte güzel ilerleyeceğiz!","Bir odak turuna ne dersin?"];
    $("#heroMikiText").textContent=texts[state.totalPomodoros%texts.length];
  }
  function renderTasks(){
    const date=currentTaskDate(),filter=state.selectedTaskFilter;
    refs.taskSectionTitle.textContent=date===todayKey()?"Bugünün Görevleri":`${fmtShort(fromKey(date))} Görevleri`;
    const all=state.tasks.filter(t=>t.date===date);const shown=all.filter(t=>filter==="all"||t.category===filter).sort((a,b)=>Number(a.done)-Number(b.done)||({high:0,medium:1,low:2}[a.priority]-({high:0,medium:1,low:2}[b.priority])));
    refs.taskList.innerHTML=shown.map(t=>`<li class="task-item ${t.done?"done":""}" data-id="${t.id}"><span class="task-priority ${t.priority}"></span><input class="task-check" type="checkbox" ${t.done?"checked":""}><div class="task-main"><span class="task-title">${esc(t.title)}</span><span class="task-meta">🍅 ${t.minutes} dk <i class="task-category">${{study:"Ders",work:"İş",personal:"Kişisel"}[t.category]||"Kişisel"}</i>${t.rewarded?'<i class="task-rewarded"> · ödül alındı</i>':""}</span></div><span class="task-icon">${t.icon}</span><button class="task-delete" title="Sil">×</button></li>`).join("");
    refs.taskEmpty.hidden=shown.length>0;refs.taskList.hidden=!shown.length;
    const done=all.filter(t=>t.done).length,pct=all.length?Math.round(done/all.length*100):0;refs.taskProgressText.textContent=`${done} / ${all.length} tamamlandı`;refs.taskProgressPercent.textContent=`${pct}%`;refs.taskProgressBar.style.width=`${pct}%`;
  }
  function renderTodayHabits(){
    const t=todayKey();refs.todayHabitList.innerHTML=state.habits.length?state.habits.slice(0,5).map(h=>{const done=h.completions.includes(t);return `<div class="compact-habit" data-id="${h.id}"><button class="habit-check-btn ${done?"done":""}">${done?"✓":h.icon}</button><div><strong>${esc(h.title)}</strong><small>🔥 ${habitStreak(h)} günlük seri</small></div><span>${done?"Tamam":"Bekliyor"}</span></div>`}).join(""):`<div class="empty-state"><span>🌱</span><strong>Henüz alışkanlık yok.</strong></div>`;
  }
  function questData(){const t=todayKey();return [{id:"tasks",name:"2 görev tamamla",current:Math.min(2,tasksOn(t).length),goal:2},{id:"focus",name:"1 Pomodoro tamamla",current:Math.min(1,sessionsOn(t).length),goal:1},{id:"habits",name:"3 alışkanlık işaretle",current:Math.min(3,habitChecksOn(t)),goal:3},{id:"care",name:`${state.mikiName} ile ilgilen`,current:state.pet.lastCareDate===t?1:0,goal:1}];}
  function renderQuests(){
    const qs=questData(),complete=qs.every(q=>q.current>=q.goal),claimed=!!state.questRewards[todayKey()];
    refs.questList.innerHTML=qs.map(q=>`<div class="quest-item"><button class="quest-check ${q.current>=q.goal?"done":""}">${q.current>=q.goal?"✓":"○"}</button><div><strong>${q.name}</strong><small>${q.current} / ${q.goal}</small></div><span>${q.current>=q.goal?"Hazır":""}</span></div>`).join("")+`<button class="${complete&&!claimed?"primary":"secondary"}" id="claimQuestBtn" ${!complete||claimed?"disabled":""}>${claimed?"Günlük ödül alındı":complete?"+30 coin ödülünü al":"Tümünü tamamla"}</button>`;
    $("#claimQuestBtn")?.addEventListener("click",()=>{if(!complete||claimed)return;state.questRewards[todayKey()]=true;state.coins+=30;state.xp+=10;save();checkAchievements();renderAll();toast("Günlük görev ödülü: +30 coin, +10 XP!");});
  }

  function modeSeconds(mode=state.timer.mode){return Math.max(1,Number({focus:state.settings.focus,shortBreak:state.settings.shortBreak,longBreak:state.settings.longBreak}[mode])||1)*60;}
  function renderTimer(){
    if(state.timer.running&&state.timer.endAt)state.timer.remaining=Math.max(0,Math.ceil((state.timer.endAt-Date.now())/1000));
    const m=Math.floor(state.timer.remaining/60),s=state.timer.remaining%60;refs.timerDisplay.textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;refs.timerToggleBtn.textContent=state.timer.running?"Ⅱ Duraklat":"▶ Başlat";
    refs.timerModeLabel.textContent={focus:"Odaklanma zamanı",shortBreak:"Kısa mola",longBreak:"Uzun mola"}[state.timer.mode];$$('.mode-btn').forEach(b=>b.classList.toggle("active",b.dataset.mode===state.timer.mode));
    const total=modeSeconds(),deg=Math.min(360,Math.round((total-state.timer.remaining)/total*360));refs.timerRing.style.background=`conic-gradient(var(--pink) ${deg}deg,#f3e7e1 ${deg}deg)`;document.title=state.timer.running?`${refs.timerDisplay.textContent} · ${state.appName}`:`${state.appName} V15 · Miki Edition`;
  }
  function startTimer(){if(state.timer.remaining<=0)state.timer.remaining=modeSeconds();state.timer.subjectId=refs.focusSubjectSelect.value;state.timer.intention=refs.focusIntention.value.trim();state.timer.running=true;state.timer.endAt=Date.now()+state.timer.remaining*1000;save();ensureTimerLoop();renderTimer();}
  function pauseTimer(){if(state.timer.endAt)state.timer.remaining=Math.max(0,Math.ceil((state.timer.endAt-Date.now())/1000));state.timer.running=false;state.timer.endAt=null;save();stopTimerLoop();renderTimer();}
  function resetTimer(){state.timer.running=false;state.timer.endAt=null;state.timer.remaining=modeSeconds();save();stopTimerLoop();renderTimer();}
  function setTimerMode(mode){state.timer.mode=mode;state.timer.running=false;state.timer.endAt=null;state.timer.remaining=modeSeconds(mode);save();stopTimerLoop();renderTimer();}
  function ensureTimerLoop(){stopTimerLoop();timerLoop=setInterval(()=>{if(!state.timer.running)return;state.timer.remaining=Math.max(0,Math.ceil((state.timer.endAt-Date.now())/1000));renderTimer();if(state.timer.remaining<=0)completeTimer();},250);}
  function stopTimerLoop(){if(timerLoop)clearInterval(timerLoop);timerLoop=null;}
  function completeTimer(){
    const mode=state.timer.mode;stopTimerLoop();state.timer.running=false;state.timer.endAt=null;
    if(mode==="focus"){
      state.xp+=15;state.coins+=10;state.totalPomodoros++;state.pet.happy=clamp(state.pet.happy+4);state.sessions.unshift({id:uid("session"),date:todayKey(),completedAt:new Date().toISOString(),minutes:state.settings.focus,subjectId:state.timer.subjectId,intention:state.timer.intention,mode:"focus"});state.sessions=state.sessions.slice(0,500);
      state.timer.mode=state.totalPomodoros%4===0?"longBreak":"shortBreak";state.timer.remaining=modeSeconds(state.timer.mode);toast("Pomodoro tamamlandı! +15 XP ve +10 coin.");
    }else{state.timer.mode="focus";state.timer.remaining=modeSeconds("focus");toast("Mola bitti. Yeni odak turuna hazırsın.");}
    if(state.settings.sound)beep();save();checkAchievements();renderAll();
  }
  function beep(){try{const C=window.AudioContext||window.webkitAudioContext,c=new C(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.setValueAtTime(660,c.currentTime);o.frequency.setValueAtTime(880,c.currentTime+.16);g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.14,c.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.42);o.start();o.stop(c.currentTime+.45);}catch{}}

  function renderSubjects(){
    const options=state.subjects.map(s=>`<option value="${s.id}">${s.icon} ${esc(s.name)}</option>`).join("");refs.focusSubjectSelect.innerHTML=options;$("#studySubjectInput").innerHTML=options;refs.focusSubjectSelect.value=state.timer.subjectId||state.subjects[0]?.id||"";refs.focusIntention.value=state.timer.intention||"";
    refs.subjectList.innerHTML=state.subjects.map(s=>`<div class="subject-entry" data-id="${s.id}"><span class="subject-dot">${s.icon}</span><strong>${esc(s.name)}</strong><button class="task-delete subject-delete">×</button></div>`).join("");
  }
  function weekDates(anchor=new Date()){const monday=new Date(anchor),off=(monday.getDay()+6)%7;monday.setDate(monday.getDate()-off);monday.setHours(0,0,0,0);return Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d;});}
  function renderPlanner(){
    const days=weekDates();state.selectedPlannerDate||=todayKey();refs.weekStrip.innerHTML=days.map(d=>{const k=dateKey(d),n=new Intl.DateTimeFormat("tr-TR",{weekday:"short"}).format(d).replace(".","");return `<button class="day-button ${k===state.selectedPlannerDate?"active":""}" data-date="${k}"><span>${n}</span><strong>${d.getDate()}</strong></button>`}).join("");
    refs.selectedDayTitle.textContent=state.selectedPlannerDate===todayKey()?"Bugünün Programı":`${fmtShort(fromKey(state.selectedPlannerDate))} Programı`;
    const blocks=state.studyBlocks.filter(b=>b.date===state.selectedPlannerDate).sort((a,b)=>a.time.localeCompare(b.time));refs.studyBlockList.innerHTML=blocks.length?blocks.map(b=>{const sub=subjectById(b.subjectId);return `<div class="study-block" data-id="${b.id}"><div class="study-time">${b.time}</div><div><strong>${esc(b.title)}</strong><small>${sub?sub.icon+" "+esc(sub.name):"Genel"} · ${b.duration} dk</small></div><button class="task-delete study-delete">×</button></div>`}).join(""):`<div class="empty-state"><span>▦</span><strong>Bu gün için çalışma bloğu yok.</strong><small>Programına bir blok ekleyebilirsin.</small></div>`;
  }

  function renderHabits(){
    const t=todayKey(),done=habitChecksOn(t),pct=state.habits.length?Math.round(done/state.habits.length*100):0;$("#habitTodayPercent").textContent=`${pct}%`;$("#habitBestStreak").textContent=bestHabitStreak();$("#habitTotalChecks").textContent=totalHabitChecks();
    const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return d;});
    refs.habitGrid.innerHTML=state.habits.length?state.habits.map(h=>`<article class="habit-card color-${h.color}" data-id="${h.id}"><div class="habit-top"><span class="habit-icon">${h.icon}</span><div><strong>${esc(h.title)}</strong><small>🔥 ${habitStreak(h)} günlük seri</small></div><button class="task-delete habit-delete">×</button></div><div class="habit-week">${days.map(d=>{const k=dateKey(d),done=h.completions.includes(k);return `<button class="habit-day ${done?"done":""}" data-date="${k}" title="${fmtShort(d)}">${done?"✓":new Intl.DateTimeFormat("tr-TR",{weekday:"narrow"}).format(d)}</button>`}).join("")}</div></article>`).join(""):`<div class="empty-state"><span>🌱</span><strong>İlk alışkanlığını ekle.</strong></div>`;
  }
  function toggleHabit(id,key=todayKey()){
    const h=state.habits.find(x=>x.id===id);if(!h)return;const idx=h.completions.indexOf(key);
    if(idx>=0)h.completions.splice(idx,1);else{h.completions.push(key);if(key===todayKey()){state.xp+=5;state.coins+=3;toast("Alışkanlık tamamlandı: +5 XP, +3 coin.");}}
    save();checkAchievements();renderAll();
  }

  function renderJournal(){
    const key=refs.journalDate.value||todayKey(),entry=state.journal[key]||{};journalMood=entry.mood||0;journalTagSet=new Set(entry.tags||[]);refs.journalText.value=entry.text||"";refs.gratitudeText.value=entry.gratitude||"";refs.tomorrowText.value=entry.tomorrow||"";$$('#moodRow button').forEach(b=>b.classList.toggle("active",Number(b.dataset.mood)===journalMood));$$('#journalTags button').forEach(b=>b.classList.toggle("active",journalTagSet.has(b.dataset.tag)));refs.journalSaveStatus.textContent=entry.updatedAt?`Son kayıt: ${fmtTime(entry.updatedAt)}`:"Henüz kaydedilmedi";
    const entries=Object.entries(state.journal).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,8);refs.journalHistory.innerHTML=entries.length?`<div class="journal-history-list">${entries.map(([k,e])=>`<button class="journal-history-entry" data-date="${k}"><span>${["","😞","😕","😐","🙂","🥰"][e.mood||0]}</span><div><strong>${fmtShort(fromKey(k))}</strong><small>${esc((e.text||e.gratitude||"Boş sayfa").slice(0,80))}</small></div><span>→</span></button>`).join("")}</div>`:`<div class="empty-state"><span>📖</span><strong>Henüz günlük sayfası yok.</strong></div>`;
  }
  function markJournalDirty(){refs.journalSaveStatus.textContent="Kaydedilmemiş değişiklikler";}
  function saveJournal(){
    const key=refs.journalDate.value||todayKey(),isNew=!state.journal[key];state.journal[key]={mood:journalMood,text:refs.journalText.value.trim(),gratitude:refs.gratitudeText.value.trim(),tomorrow:refs.tomorrowText.value.trim(),tags:[...journalTagSet],updatedAt:new Date().toISOString()};if(isNew){state.xp+=5;state.coins+=2;toast("Günlük sayfası kaydedildi: +5 XP, +2 coin.");}save();checkAchievements();renderJournal();renderStats();
  }

  function renderPet(){
    [["hunger",refs.hungerBar,refs.hungerText],["happy",refs.happyBar,refs.happyText],["energy",refs.energyBar,refs.energyText],["clean",refs.cleanBar,refs.cleanText]].forEach(([k,bar,text])=>{if(!bar||!text)return;bar.style.width=`${state.pet[k]}%`;text.textContent=Math.round(state.pet[k]);});
    refs.petBubble.textContent=state.pet.hunger<30?"Karnım biraz acıktı…":state.pet.energy<25?"Biraz uyusam iyi olacak.":state.pet.clean<30?"Tüylerimi biraz tarar mısın?":state.pet.happy<35?"Birlikte oynayalım mı?":"Yanındayım. Küçük bir adım atalım!";
    refs.seasonSelect.value=state.room.season;refs.weatherSelect.value=state.room.weather;
  }
  function care(action){
    if(action==="feed"){if(state.coins<5){toast("Beslemek için 5 coin gerekiyor.");return;}state.coins-=5;state.pet.hunger=clamp(state.pet.hunger+28);state.pet.happy=clamp(state.pet.happy+5);toast(`${state.mikiName} afiyetle yedi.`);}
    if(action==="play"){if(state.pet.energy<10){toast(`${state.mikiName} şu an çok yorgun.`);return;}state.pet.energy=clamp(state.pet.energy-10);state.pet.happy=clamp(state.pet.happy+25);state.pet.hunger=clamp(state.pet.hunger-4);state.xp+=2;toast(`${state.mikiName} çok eğlendi! +2 XP.`);}
    if(action==="sleep"){state.pet.energy=100;state.pet.hunger=clamp(state.pet.hunger-5);toast(`${state.mikiName} dinlendi.`);}
    if(action==="groom"){state.pet.clean=100;state.pet.happy=clamp(state.pet.happy+8);state.xp+=1;toast(`${state.mikiName} pırıl pırıl oldu! +1 XP.`);}
    state.pet.lastCareDate=todayKey();state.pet.lastDecayDate=todayKey();save();renderAll();
  }
  function renderRoomAndShop(){
    document.body.dataset.season=state.room.season;document.body.dataset.weather=state.room.weather;
    const roomIds=SHOP.filter(i=>i.type==="room").map(i=>i.id);roomIds.forEach(id=>{refs.pixelRoom.classList.toggle(`no-${id}`,!state.equipped.includes(id));refs.pixelRoom.classList.toggle(`${id}-equipped`,state.equipped.includes(id));});
    document.body.classList.remove("cat-accessory-bow","cat-accessory-crown","cat-accessory-glasses");["bow","crown","glasses"].forEach(id=>document.body.classList.toggle(`cat-accessory-${id}`,state.equipped.includes(id)));
    const filter=state.shopFilter,level=levelOf();refs.shopGrid.innerHTML=SHOP.filter(i=>filter==="all"||i.type===filter).map(item=>{const bought=state.purchased.includes(item.id),equipped=state.equipped.includes(item.id),locked=level<item.level;let text=locked?`Seviye ${item.level}`:bought?(equipped?"Kaldır":"Yerleştir"):`● ${item.price}`;return `<article class="shop-item ${equipped?"equipped":""} ${locked?"locked":""}" data-id="${item.id}"><span class="item-icon">${item.icon}</span><strong>${item.name}</strong><span class="rarity">${item.type==="room"?"ODA":"STİL"} · SV ${item.level}</span><button class="${bought?"secondary":"primary"}" ${locked?"disabled":""}>${text}</button></article>`}).join("");
  }
  function buyToggle(id){const item=SHOP.find(i=>i.id===id);if(!item||levelOf()<item.level)return;const bought=state.purchased.includes(id);if(!bought){if(state.coins<item.price){toast("Yeterli coinin yok.");return;}state.coins-=item.price;state.purchased.push(id);state.equipped.push(id);toast(`${item.name} satın alındı.`);}else{const i=state.equipped.indexOf(id);if(i>=0)state.equipped.splice(i,1);else{if(item.type==="style")state.equipped=state.equipped.filter(x=>!SHOP.some(s=>s.type==="style"&&s.id===x));state.equipped.push(id);}}save();checkAchievements();renderAll();}

  function checkAchievements(){
    let newCount=0;ACHIEVEMENTS.forEach(a=>{if(!state.achievements.includes(a.id)&&a.test(state)){state.achievements.push(a.id);state.coins+=10;newCount++;toast(`Başarım açıldı: ${a.name} · +10 coin`);}});if(newCount)save();
  }
  function renderAchievements(){refs.achievementCount.textContent=`${state.achievements.length} / ${ACHIEVEMENTS.length}`;refs.achievementGrid.innerHTML=ACHIEVEMENTS.map(a=>{const open=state.achievements.includes(a.id);return `<article class="achievement ${open?"":"locked"}"><span class="achievement-icon">${open?a.icon:"?"}</span><div><strong>${a.name}</strong><small>${a.desc}</small></div></article>`}).join("");}

  function renderProgress(){
    const range=Number($("#progressRange").value||7),days=Array.from({length:range},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(range-1-i));return d;}),counts=Object.fromEntries(days.map(d=>[dateKey(d),sessionsOn(dateKey(d)).length])),max=Math.max(1,...Object.values(counts));
    refs.weekChart.innerHTML=days.map(d=>{const k=dateKey(d),count=counts[k]||0,h=count?Math.max(12,Math.round(count/max*135)):4,label=range===7?new Intl.DateTimeFormat("tr-TR",{weekday:"short"}).format(d).replace(".",""):d.getDate();return `<div class="chart-day"><div class="chart-bar-wrap"><div class="chart-bar" style="height:${h}px"><b>${count}</b></div></div><span>${label}</span></div>`}).join("");
    const start=days[0],startKey=dateKey(start),selectedSessions=state.sessions.filter(s=>s.date>=startKey);$("#kpiPomodoros").textContent=selectedSessions.length;$("#kpiMinutes").textContent=selectedSessions.reduce((n,s)=>n+Number(s.minutes||0),0);$("#kpiTasks").textContent=state.tasks.filter(t=>t.done&&t.date>=startKey).length;$("#kpiHabits").textContent=state.habits.reduce((n,h)=>n+h.completions.filter(k=>k>=startKey).length,0);
    const bySub={};selectedSessions.forEach(s=>{const sub=subjectById(s.subjectId),name=sub?`${sub.icon} ${sub.name}`:"⭐ Genel";bySub[name]=(bySub[name]||0)+Number(s.minutes||0);});const maxMin=Math.max(1,...Object.values(bySub));refs.subjectStats.innerHTML=Object.keys(bySub).length?Object.entries(bySub).sort((a,b)=>b[1]-a[1]).map(([name,min])=>`<div class="subject-stat"><span>${esc(name)}</span><div class="progress-track"><span style="width:${Math.round(min/maxMin*100)}%"></span></div><strong>${min} dk</strong></div>`).join(""):`<div class="empty-state"><span>⏱</span><strong>Henüz veri yok.</strong></div>`;
    refs.sessionHistory.innerHTML=state.sessions.length?state.sessions.slice(0,10).map(s=>{const sub=subjectById(s.subjectId);return `<div class="session-entry"><span class="session-icon">🍅</span><div><strong>${sub?esc(sub.name):"Odak oturumu"}</strong><small>${fmtTime(s.completedAt)}${s.intention?" · "+esc(s.intention):""}</small></div><strong>${s.minutes} dk</strong></div>`}).join(""):`<div class="empty-state"><span>🍅</span><strong>İlk Pomodoro'nu tamamla.</strong></div>`;
  }

  function renderFriends(){
    refs.userCode.textContent=getUserCode();refs.friendCount.textContent=state.friends.length;refs.friendList.innerHTML=state.friends.length?state.friends.map(f=>`<div class="friend-entry" data-id="${f.id}"><div class="friend-avatar">ᓚᘏᗢ</div><div><strong>${esc(f.code)}</strong><small>Yerel odak arkadaşı</small></div><button class="task-delete friend-delete">×</button></div>`).join(""):`<div class="empty-state"><span>♥</span><strong>Henüz arkadaş kodu eklenmedi.</strong></div>`;
    $("#challengeGoal").value=state.challenge.goal||10;const gained=Math.max(0,state.totalPomodoros-(state.challenge.startCount||0)),pct=Math.min(100,Math.round(gained/(state.challenge.goal||10)*100));refs.challengeProgress.innerHTML=`<div class="challenge-progress"><div class="progress-copy"><span>${gained} / ${state.challenge.goal} Pomodoro</span><strong>${pct}%</strong></div><div class="progress-track"><span style="width:${pct}%"></span></div></div>`;
  }

  function applyAppearance(){
    document.body.dataset.theme=state.settings.theme;document.body.classList.toggle("large-text",state.settings.largeText);document.body.classList.toggle("high-contrast",state.settings.highContrast);document.body.classList.toggle("reduce-motion",state.settings.reduceMotion);document.body.classList.remove("cat-gray","cat-orange","cat-black","cat-cream");document.body.classList.add(`cat-${state.settings.breed}`);
    const meta=$("meta[name=theme-color]");if(meta)meta.content={blush:"#f58ca7",lavender:"#b69ae6",forest:"#7eaf83",midnight:"#232535"}[state.settings.theme]||"#f58ca7";
  }
  function renderAll(){applyAppearance();renderHeader();renderStats();renderTasks();renderTodayHabits();renderQuests();renderSubjects();renderTimer();renderPlanner();renderHabits();renderJournal();renderPet();renderRoomAndShop();renderAchievements();renderProgress();renderFriends();}
  function renderView(view){document.body.dataset.view=view;$$('.nav-btn').forEach(b=>b.classList.toggle("active",b.dataset.view===view));$$('[data-views]').forEach(s=>s.classList.toggle("is-hidden",!s.dataset.views.split(/\s+/).includes(view)));if(view==="planner"&&!state.selectedPlannerDate)state.selectedPlannerDate=todayKey();renderTasks();window.scrollTo({top:0,behavior:state.settings.reduceMotion?"auto":"smooth"});}

  function openDialog(id){$(id).showModal();}
  function openTask(date=currentTaskDate()){$("#taskForm").reset();$("#taskDateInput").value=date;$("#taskMinutesInput").value="25";$("#taskDialog").showModal();setTimeout(()=>$("#taskTitleInput").focus(),30);}
  function openStudy(){$("#studyForm").reset();$("#studyDateInput").value=state.selectedPlannerDate||todayKey();$("#studyTimeInput").value="18:00";$("#studyDurationInput").value=50;renderSubjects();$("#studyDialog").showModal();}
  function openSettings(){
    $("#appNameInput").value=state.appName;$("#mikiNameInput").value=state.mikiName;$("#catBreedInput").value=state.settings.breed;$("#soundToggle").checked=state.settings.sound;$("#focusMinutesInput").value=state.settings.focus;$("#shortBreakInput").value=state.settings.shortBreak;$("#longBreakInput").value=state.settings.longBreak;$("#themeInput").value=state.settings.theme;$("#largeTextToggle").checked=state.settings.largeText;$("#contrastToggle").checked=state.settings.highContrast;$("#motionToggle").checked=state.settings.reduceMotion;openDialog("#settingsDialog");
  }
  function showReward(){const claimed=state.lastRewardDate===todayKey();$("#rewardTitle").textContent=claimed?"Bugünün ödülünü aldın":"Bugünün hediyesi hazır!";$("#rewardText").textContent=claimed?`Giriş serin: ${state.login.streak} gün`:`+20 coin ve +10 XP`;$("#claimRewardBtn").disabled=claimed;$("#claimRewardBtn").textContent=claimed?"Yarın tekrar gel":"Ödülü al";openDialog("#rewardDialog");}
  function claimReward(){if(state.lastRewardDate===todayKey())return;const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);state.login.streak=state.login.lastDate===dateKey(yesterday)?state.login.streak+1:1;state.login.best=Math.max(state.login.best,state.login.streak);state.login.lastDate=todayKey();state.lastRewardDate=todayKey();state.coins+=20;state.xp+=10;save();checkAchievements();$("#rewardDialog").close();renderAll();toast(`Günlük ödül alındı! ${state.login.streak} günlük giriş serisi.`);}

  function setupAudio(type){
    stopAudio();if(type==="off")return;
    try{
      const C=window.AudioContext||window.webkitAudioContext,ctx=new C(),master=ctx.createGain();master.gain.value=(state.settings.ambientVolume||35)/100*.22;master.connect(ctx.destination);const len=ctx.sampleRate*2,buf=ctx.createBuffer(1,len,ctx.sampleRate),data=buf.getChannelData(0);let last=0;for(let i=0;i<len;i++){const white=Math.random()*2-1;last=(last+.02*white)/1.02;data[i]=type==="rain"?white*.55:type==="cafe"?last*3.2:last*2.2;}const source=ctx.createBufferSource();source.buffer=buf;source.loop=true;const filter=ctx.createBiquadFilter();filter.type=type==="rain"?"highpass":"lowpass";filter.frequency.value=type==="rain"?900:type==="cafe"?850:380;source.connect(filter);filter.connect(master);source.start();audio={ctx,master,source,type};if(type==="fire"){audio.crackle=setInterval(()=>{const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=80+Math.random()*90;g.gain.setValueAtTime(.04,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.08);o.connect(g);g.connect(master);o.start();o.stop(ctx.currentTime+.09);},500+Math.random()*500);}
      $("#ambientLabel").textContent={rain:"Yağmur",cafe:"Kafe",fire:"Şömine"}[type];$$('.sound-btn').forEach(b=>b.classList.toggle("active",b.dataset.sound===type));
    }catch{toast("Bu tarayıcı ortam sesini başlatamadı.");}
  }
  function stopAudio(){if(audio){try{clearInterval(audio.crackle);audio.source?.stop();audio.ctx?.close();}catch{}audio=null;}$("#ambientLabel").textContent="Kapalı";$$('.sound-btn').forEach(b=>b.classList.toggle("active",b.dataset.sound==="off"));}

  function bind(){
    $$('.nav-btn').forEach(b=>b.addEventListener("click",()=>renderView(b.dataset.view)));$$('[data-go]').forEach(b=>b.addEventListener("click",()=>renderView(b.dataset.go)));$("#brandBtn").addEventListener("click",openSettings);$("#settingsBtn").addEventListener("click",openSettings);$("#timerSettingsBtn").addEventListener("click",openSettings);$("#dailyRewardBtn").addEventListener("click",showReward);$("#claimRewardBtn").addEventListener("click",claimReward);
    $$('[data-close]').forEach(b=>b.addEventListener("click",()=>b.closest("dialog")?.close()));
    $("#quickTaskBtn").addEventListener("click",()=>openTask());$("#addTaskBtn").addEventListener("click",()=>openTask());$("#quickFocusBtn").addEventListener("click",()=>{renderView("focus");setTimerMode("focus");setTimeout(startTimer,250);});
    $("#taskForm").addEventListener("submit",e=>{e.preventDefault();state.tasks.push({id:uid("task"),title:$("#taskTitleInput").value.trim(),date:$("#taskDateInput").value,minutes:Number($("#taskMinutesInput").value),category:$("#taskCategoryInput").value,priority:$("#taskPriorityInput").value,icon:$("#taskIconInput").value,done:false,rewarded:false});save();$("#taskDialog").close();renderTasks();renderPlanner();toast("Görev eklendi.");});
    refs.taskList.addEventListener("change",e=>{if(!e.target.matches(".task-check"))return;const t=state.tasks.find(x=>x.id===e.target.closest(".task-item").dataset.id);if(!t)return;t.done=e.target.checked;t.completedAt=t.done?new Date().toISOString():null;if(t.done&&!t.rewarded){t.rewarded=true;state.xp+=5;state.coins+=2;toast("Görev tamamlandı: +5 XP, +2 coin.");}save();checkAchievements();renderAll();});
    refs.taskList.addEventListener("click",e=>{const b=e.target.closest(".task-delete");if(!b)return;state.tasks=state.tasks.filter(x=>x.id!==b.closest(".task-item").dataset.id);save();renderAll();});
    $("#taskFilters").addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;state.selectedTaskFilter=b.dataset.filter;$$('[data-filter]').forEach(x=>x.classList.toggle("active",x===b));save();renderTasks();});
    refs.todayHabitList.addEventListener("click",e=>{const c=e.target.closest(".compact-habit");if(c)toggleHabit(c.dataset.id);});

    refs.timerToggleBtn.addEventListener("click",()=>state.timer.running?pauseTimer():startTimer());$("#timerResetBtn").addEventListener("click",resetTimer);$$('.mode-btn').forEach(b=>b.addEventListener("click",()=>setTimerMode(b.dataset.mode)));refs.focusSubjectSelect.addEventListener("change",()=>{state.timer.subjectId=refs.focusSubjectSelect.value;save();});refs.focusIntention.addEventListener("input",()=>{state.timer.intention=refs.focusIntention.value;save();});
    $$('.sound-btn').forEach(b=>b.addEventListener("click",()=>setupAudio(b.dataset.sound)));$("#ambientVolume").value=state.settings.ambientVolume;$("#ambientVolume").addEventListener("input",e=>{state.settings.ambientVolume=Number(e.target.value);if(audio)audio.master.gain.value=state.settings.ambientVolume/100*.22;save();});

    refs.weekStrip.addEventListener("click",e=>{const b=e.target.closest(".day-button");if(!b)return;state.selectedPlannerDate=b.dataset.date;save();renderPlanner();if(document.body.dataset.view==="planner")renderTasks();});$("#addStudyBlockBtn").addEventListener("click",openStudy);$("#studyForm").addEventListener("submit",e=>{e.preventDefault();state.studyBlocks.push({id:uid("block"),title:$("#studyTitleInput").value.trim(),date:$("#studyDateInput").value,time:$("#studyTimeInput").value,duration:Number($("#studyDurationInput").value),subjectId:$("#studySubjectInput").value});state.selectedPlannerDate=$("#studyDateInput").value;save();$("#studyDialog").close();renderPlanner();toast("Çalışma bloğu eklendi.");});refs.studyBlockList.addEventListener("click",e=>{const b=e.target.closest(".study-delete");if(!b)return;state.studyBlocks=state.studyBlocks.filter(x=>x.id!==b.closest(".study-block").dataset.id);save();renderPlanner();});
    $("#addSubjectBtn").addEventListener("click",()=>openDialog("#subjectDialog"));$("#subjectForm").addEventListener("submit",e=>{e.preventDefault();state.subjects.push({id:uid("sub"),name:$("#subjectNameInput").value.trim(),icon:$("#subjectIconInput").value});save();$("#subjectDialog").close();renderSubjects();renderPlanner();});refs.subjectList.addEventListener("click",e=>{const b=e.target.closest(".subject-delete");if(!b||state.subjects.length<=1){if(state.subjects.length<=1)toast("En az bir ders/proje kalmalı.");return;}const id=b.closest(".subject-entry").dataset.id;state.subjects=state.subjects.filter(s=>s.id!==id);if(state.timer.subjectId===id)state.timer.subjectId=state.subjects[0].id;save();renderAll();});

    $("#addHabitBtn").addEventListener("click",()=>openDialog("#habitDialog"));$("#habitForm").addEventListener("submit",e=>{e.preventDefault();state.habits.push({id:uid("habit"),title:$("#habitTitleInput").value.trim(),icon:$("#habitIconInput").value,color:$("#habitColorInput").value,completions:[]});save();$("#habitDialog").close();renderAll();toast("Alışkanlık eklendi.");});refs.habitGrid.addEventListener("click",e=>{const card=e.target.closest(".habit-card");if(!card)return;if(e.target.closest(".habit-delete")){state.habits=state.habits.filter(h=>h.id!==card.dataset.id);save();renderAll();return;}const day=e.target.closest(".habit-day");if(day)toggleHabit(card.dataset.id,day.dataset.date);});

    refs.journalDate.value=todayKey();refs.journalDate.addEventListener("change",renderJournal);$$('#moodRow button').forEach(b=>b.addEventListener("click",()=>{journalMood=Number(b.dataset.mood);$$('#moodRow button').forEach(x=>x.classList.toggle("active",x===b));markJournalDirty();}));$$('#journalTags button').forEach(b=>b.addEventListener("click",()=>{journalTagSet.has(b.dataset.tag)?journalTagSet.delete(b.dataset.tag):journalTagSet.add(b.dataset.tag);b.classList.toggle("active");markJournalDirty();}));[refs.journalText,refs.gratitudeText,refs.tomorrowText].forEach(x=>x.addEventListener("input",markJournalDirty));$("#saveJournalBtn").addEventListener("click",saveJournal);refs.journalHistory.addEventListener("click",e=>{const b=e.target.closest("[data-date]");if(!b)return;refs.journalDate.value=b.dataset.date;renderJournal();window.scrollTo({top:0,behavior:"smooth"});});

    $$('[data-care]').forEach(b=>b.addEventListener("click",()=>care(b.dataset.care)));refs.seasonSelect.addEventListener("change",()=>{state.room.season=refs.seasonSelect.value;save();renderRoomAndShop();});refs.weatherSelect.addEventListener("change",()=>{state.room.weather=refs.weatherSelect.value;save();renderRoomAndShop();});$(".shop-tabs").addEventListener("click",e=>{const b=e.target.closest("[data-shop-filter]");if(!b)return;state.shopFilter=b.dataset.shopFilter;$$('[data-shop-filter]').forEach(x=>x.classList.toggle("active",x===b));renderRoomAndShop();});refs.shopGrid.addEventListener("click",e=>{const b=e.target.closest("button"),card=e.target.closest(".shop-item");if(b&&card)buyToggle(card.dataset.id);});

    $("#progressRange").addEventListener("change",renderProgress);$("#clearHistoryBtn").addEventListener("click",()=>{if(!state.sessions.length||!confirm("Oturum geçmişi temizlensin mi?"))return;state.sessions=[];state.totalPomodoros=0;save();renderAll();toast("Oturum geçmişi temizlendi.");});
    $("#copyCodeBtn").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(getUserCode());toast("Arkadaş kodun kopyalandı.");}catch{toast(`Kodun: ${getUserCode()}`);}});$("#friendForm").addEventListener("submit",e=>{e.preventDefault();let code=$("#friendCodeInput").value.toUpperCase().replace(/[^A-Z0-9-]/g,"");if(/^[A-Z0-9]{8}$/.test(code))code=`${code.slice(0,4)}-${code.slice(4)}`;if(!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)){toast("Kod biçimi MIKI-AB12 gibi olmalı.");return;}if(code===getUserCode()||state.friends.some(f=>f.code===code)){toast("Bu kod eklenemedi.");return;}state.friends.push({id:uid("friend"),code});$("#friendCodeInput").value="";save();renderFriends();toast("Arkadaş kodu eklendi.");});refs.friendList.addEventListener("click",e=>{const b=e.target.closest(".friend-delete");if(!b)return;state.friends=state.friends.filter(f=>f.id!==b.closest(".friend-entry").dataset.id);save();renderFriends();});$("#saveChallengeBtn").addEventListener("click",()=>{state.challenge={goal:clamp(Number($("#challengeGoal").value)||10,1,100),startCount:state.totalPomodoros};save();renderFriends();toast("Yeni yerel meydan okuma başladı.");});

    $$('.settings-tabs [data-settings-tab]').forEach(b=>b.addEventListener("click",()=>{$$('.settings-tabs [data-settings-tab]').forEach(x=>x.classList.toggle("active",x===b));$$('.settings-pane').forEach(p=>p.classList.toggle("active",p.dataset.pane===b.dataset.settingsTab));}));$("#settingsForm").addEventListener("submit",e=>{e.preventDefault();state.appName=$("#appNameInput").value.trim()||"Berna";state.mikiName=$("#mikiNameInput").value.trim()||"Miki";state.settings.breed=$("#catBreedInput").value;state.settings.sound=$("#soundToggle").checked;state.settings.focus=clamp(Number($("#focusMinutesInput").value)||25,1,120);state.settings.shortBreak=clamp(Number($("#shortBreakInput").value)||5,1,60);state.settings.longBreak=clamp(Number($("#longBreakInput").value)||15,1,90);state.settings.theme=$("#themeInput").value;state.settings.largeText=$("#largeTextToggle").checked;state.settings.highContrast=$("#contrastToggle").checked;state.settings.reduceMotion=$("#motionToggle").checked;if(!state.timer.running)state.timer.remaining=modeSeconds();save();$("#settingsDialog").close();renderAll();toast("Ayarlar kaydedildi.");});
    $("#exportBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({app:"Berna V15",exportedAt:new Date().toISOString(),state},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`berna-v15-yedek-${todayKey()}.json`;a.click();URL.revokeObjectURL(url);toast("Yedek indirildi.");});$("#importInput").addEventListener("change",e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result),incoming=data.state||data;if(!incoming||typeof incoming!=="object")throw 0;state=merge(defaults,incoming);normalizeState();save();location.reload();}catch{toast("Yedek dosyası okunamadı.");}};r.readAsText(file);});$("#resetDataBtn").addEventListener("click",()=>{if(!confirm("Tüm Berna verileri silinsin mi? Bu işlem geri alınamaz."))return;localStorage.removeItem(KEY);location.reload();});

    window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;refs.installBtn.hidden=false;if(!state.installDismissed)refs.installBanner.hidden=false;});const install=async()=>{if(!deferredInstall){toast("Tarayıcı menüsündeki ‘Uygulamayı yükle’ seçeneğini kullanabilirsin.");return;}deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;refs.installBtn.hidden=true;refs.installBanner.hidden=true;};refs.installBtn.addEventListener("click",install);$("#bannerInstallBtn").addEventListener("click",install);$("#closeInstallBanner").addEventListener("click",()=>{state.installDismissed=true;save();refs.installBanner.hidden=true;});
    document.addEventListener("visibilitychange",()=>{if(!document.hidden&&state.timer.running){state.timer.remaining=Math.max(0,Math.ceil((state.timer.endAt-Date.now())/1000));state.timer.remaining<=0?completeTimer():renderTimer();}});
  }

  function registerSW(){if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));}

  init();bind();applyAppearance();renderView("today");renderAll();checkAchievements();
  window.BernaApp={getState:()=>state,save,renderAll,renderFriends,renderStats,renderRoomAndShop,checkAchievements,toast,todayKey,subjectById,levelOf};
  if(state.timer.running&&state.timer.endAt){state.timer.remaining=Math.max(0,Math.ceil((state.timer.endAt-Date.now())/1000));state.timer.remaining<=0?completeTimer():ensureTimerLoop();}
  registerSW();
})();
