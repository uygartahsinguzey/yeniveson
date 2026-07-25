(() => {
  "use strict";

  const app = window.BernaApp;
  if (!app) return;

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);
  const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const state = () => app.getState();
  const save = () => app.save();
  const toast = message => app.toast(message);

  let currentCardId = null;
  let cardRevealed = false;
  let quiz = null;
  let peer = null;
  let peerReady = false;
  let peerLoading = null;
  const connections = new Map();

  function ensureState() {
    const s = state();
    s.version = 15;
    s.exams = Array.isArray(s.exams) ? s.exams : [];
    s.flashcards = Array.isArray(s.flashcards) ? s.flashcards : [];
    s.quizHistory = Array.isArray(s.quizHistory) ? s.quizHistory : [];
    s.room = s.room && typeof s.room === "object" ? s.room : {};
    s.room.positions = s.room.positions && typeof s.room.positions === "object" ? s.room.positions : {};
    s.room.editMode = Boolean(s.room.editMode);
    s.pet.clean = Number.isFinite(Number(s.pet.clean)) ? Number(s.pet.clean) : 82;
    s.pet.lastCareDate ||= "";
    s.friends = Array.isArray(s.friends) ? s.friends : [];
    save();
  }

  function fillSubjectSelect(select, includeAll = false) {
    if (!select) return;
    const previous = select.value;
    const options = state().subjects.map(subject => `<option value="${subject.id}">${subject.icon} ${esc(subject.name)}</option>`).join("");
    select.innerHTML = (includeAll ? '<option value="all">Tüm dersler</option>' : "") + options;
    if ([...select.options].some(option => option.value === previous)) select.value = previous;
  }

  // Exams ------------------------------------------------------------------
  function examRemaining(exam) {
    return new Date(exam.date).getTime() - Date.now();
  }

  function countdownParts(ms) {
    if (ms <= 0) return { expired: true, days: 0, hours: 0, minutes: 0 };
    const totalMinutes = Math.floor(ms / 60000);
    return {
      expired: false,
      days: Math.floor(totalMinutes / 1440),
      hours: Math.floor((totalMinutes % 1440) / 60),
      minutes: totalMinutes % 60
    };
  }

  function renderExams() {
    const hero = $("#examHero");
    const list = $("#examList");
    if (!hero || !list) return;
    const exams = [...state().exams].sort((a, b) => new Date(a.date) - new Date(b.date));
    const active = exams.find(exam => examRemaining(exam) > 0) || exams[0];

    if (!active) {
      hero.innerHTML = '<div class="empty-state"><span>🎓</span><strong>Henüz sınav eklenmedi.</strong><small>Tarih eklediğinde geri sayım burada başlayacak.</small></div>';
      list.innerHTML = "";
      return;
    }

    const remaining = countdownParts(examRemaining(active));
    const subject = state().subjects.find(item => item.id === active.subjectId);
    hero.innerHTML = `
      <div class="exam-icon">${subject?.icon || "🎓"}</div>
      <div class="exam-main">
        <span class="exam-kicker">${remaining.expired ? "SINAV TARİHİ GELDİ" : "SIRADAKİ SINAV"}</span>
        <h3>${esc(active.name)}</h3>
        <p>${subject ? esc(subject.name) + " · " : ""}Hedef not: ${Number(active.target) || 0}</p>
      </div>
      <div class="countdown-grid">
        <div><strong>${remaining.days}</strong><span>gün</span></div>
        <div><strong>${String(remaining.hours).padStart(2, "0")}</strong><span>saat</span></div>
        <div><strong>${String(remaining.minutes).padStart(2, "0")}</strong><span>dk</span></div>
      </div>`;

    list.innerHTML = exams.map(exam => {
      const parts = countdownParts(examRemaining(exam));
      const label = parts.expired ? "Tarihi geldi" : `${parts.days} gün ${parts.hours} saat`;
      return `<article class="exam-entry" data-id="${exam.id}">
        <span>${state().subjects.find(item => item.id === exam.subjectId)?.icon || "🎓"}</span>
        <div><strong>${esc(exam.name)}</strong><small>${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(exam.date))}</small></div>
        <b>${label}</b><button class="task-delete exam-delete" title="Sınavı sil">×</button>
      </article>`;
    }).join("");
  }

  function openExamDialog() {
    fillSubjectSelect($("#examSubjectInput"));
    $("#examForm").reset();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    tomorrow.setHours(10, 0, 0, 0);
    const local = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    $("#examDateInput").value = local;
    $("#examTargetInput").value = 80;
    $("#examDialog").showModal();
    setTimeout(() => $("#examNameInput").focus(), 30);
  }

  // Flashcards --------------------------------------------------------------
  function cardsForFilter() {
    const filter = $("#flashSubjectFilter")?.value || "all";
    return state().flashcards.filter(card => filter === "all" || card.subjectId === filter);
  }

  function pickStudyCard(preferNext = false) {
    const cards = cardsForFilter();
    if (!cards.length) {
      currentCardId = null;
      return null;
    }
    const sorted = [...cards].sort((a, b) => (a.box || 0) - (b.box || 0) || (a.lastReviewed || "").localeCompare(b.lastReviewed || ""));
    if (!currentCardId || preferNext) {
      const currentIndex = sorted.findIndex(card => card.id === currentCardId);
      currentCardId = sorted[(currentIndex + 1 + sorted.length) % sorted.length].id;
    }
    return sorted.find(card => card.id === currentCardId) || sorted[0];
  }

  function renderStudyCard() {
    const card = pickStudyCard(false);
    const question = $("#studyQuestion");
    const answer = $("#studyAnswer");
    const label = $("#studyLabel");
    const hint = $("#studyHint");
    const again = $("#flashAgainBtn");
    const know = $("#flashKnowBtn");
    const flip = $("#flashFlipBtn");
    if (!question) return;

    if (!card) {
      question.textContent = "İlk kartını ekleyerek başla.";
      answer.hidden = true;
      hint.textContent = "Kart eklemek için sağ üstteki düğmeyi kullan.";
      again.disabled = know.disabled = true;
      flip.disabled = true;
      return;
    }

    flip.disabled = false;
    question.textContent = card.question;
    answer.textContent = card.answer;
    answer.hidden = !cardRevealed;
    label.textContent = cardRevealed ? "CEVAP" : "SORU";
    hint.textContent = cardRevealed ? "Kendini değerlendir." : "Cevabı görmek için karta dokun.";
    again.disabled = know.disabled = !cardRevealed;
  }

  function renderFlashcards() {
    const filter = $("#flashSubjectFilter");
    if (!filter) return;
    fillSubjectSelect(filter, true);
    const cards = cardsForFilter();
    const totalAnswers = cards.reduce((sum, card) => sum + (card.correct || 0) + (card.wrong || 0), 0);
    const correct = cards.reduce((sum, card) => sum + (card.correct || 0), 0);
    $("#flashTotal").textContent = cards.length;
    $("#flashMastered").textContent = cards.filter(card => (card.box || 0) >= 3).length;
    $("#flashAccuracy").textContent = `${totalAnswers ? Math.round(correct / totalAnswers * 100) : 0}%`;
    $("#flashcardList").innerHTML = cards.length ? cards.map(card => {
      const subject = state().subjects.find(item => item.id === card.subjectId);
      return `<article class="flashcard-entry" data-id="${card.id}">
        <span class="flash-box">${card.box || 0}</span>
        <div><strong>${esc(card.question)}</strong><small>${subject ? subject.icon + " " + esc(subject.name) : "Genel"} · ${card.correct || 0} doğru / ${card.wrong || 0} tekrar</small></div>
        <button class="task-delete flashcard-delete" title="Kartı sil">×</button>
      </article>`;
    }).join("") : '<div class="empty-state"><span>◫</span><strong>Bu destede kart yok.</strong><small>Soru-cevap kartları ekleyerek çalışmaya başla.</small></div>';
    if (!cards.some(card => card.id === currentCardId)) currentCardId = cards[0]?.id || null;
    renderStudyCard();
  }

  function flipCard() {
    if (!currentCardId) return;
    cardRevealed = !cardRevealed;
    renderStudyCard();
  }

  function gradeCard(known) {
    const card = state().flashcards.find(item => item.id === currentCardId);
    if (!card || !cardRevealed) return;
    if (known) {
      card.correct = (card.correct || 0) + 1;
      card.box = Math.min(5, (card.box || 0) + 1);
      state().xp += 1;
      toast("Kart öğrenildi: +1 XP");
    } else {
      card.wrong = (card.wrong || 0) + 1;
      card.box = Math.max(0, (card.box || 0) - 1);
    }
    card.lastReviewed = new Date().toISOString();
    save();
    app.checkAchievements();
    cardRevealed = false;
    pickStudyCard(true);
    renderFlashcards();
    app.renderStats();
  }

  function shuffle(values) {
    const array = [...values];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function startQuiz() {
    const cards = cardsForFilter();
    if (cards.length < 2) {
      toast("Quiz için aynı destede en az 2 kart gerekiyor.");
      return;
    }
    quiz = { cards: shuffle(cards).slice(0, Math.min(10, cards.length)), index: 0, correct: 0, locked: false };
    $("#quizResult").hidden = true;
    $("#quizOptions").hidden = false;
    $("#quizDialog").showModal();
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    if (!quiz) return;
    if (quiz.index >= quiz.cards.length) {
      finishQuiz();
      return;
    }
    const card = quiz.cards[quiz.index];
    const otherAnswers = state().flashcards.filter(item => item.id !== card.id && item.answer !== card.answer).map(item => item.answer);
    const options = shuffle([card.answer, ...shuffle([...new Set(otherAnswers)]).slice(0, 3)]);
    $("#quizTitle").textContent = `Soru ${quiz.index + 1} / ${quiz.cards.length}`;
    $("#quizQuestion").textContent = card.question;
    $("#quizScore").textContent = `${quiz.correct} doğru`;
    $("#quizProgressBar").style.width = `${Math.round(quiz.index / quiz.cards.length * 100)}%`;
    $("#quizOptions").innerHTML = options.map(option => `<button data-answer="${esc(option)}">${esc(option)}</button>`).join("");
  }

  function answerQuiz(button) {
    if (!quiz || quiz.locked) return;
    quiz.locked = true;
    const card = quiz.cards[quiz.index];
    const answer = button.dataset.answer;
    const correct = answer === card.answer;
    if (correct) {
      quiz.correct += 1;
      button.classList.add("correct");
      card.correct = (card.correct || 0) + 1;
      card.box = Math.min(5, (card.box || 0) + 1);
    } else {
      button.classList.add("wrong");
      card.wrong = (card.wrong || 0) + 1;
      $$("#quizOptions button").find(item => item.dataset.answer === card.answer)?.classList.add("correct");
    }
    card.lastReviewed = new Date().toISOString();
    setTimeout(() => {
      quiz.index += 1;
      quiz.locked = false;
      renderQuizQuestion();
    }, 700);
  }

  function finishQuiz() {
    const total = quiz.cards.length;
    const correct = quiz.correct;
    const reward = Math.max(3, correct * 2);
    state().quizHistory.unshift({ id: uid("quiz"), date: app.todayKey(), completedAt: new Date().toISOString(), correct, total });
    state().quizHistory = state().quizHistory.slice(0, 100);
    state().xp += reward;
    state().coins += Math.floor(correct / 2);
    save();
    app.checkAchievements();
    app.renderStats();
    $("#quizProgressBar").style.width = "100%";
    $("#quizOptions").hidden = true;
    const result = $("#quizResult");
    result.hidden = false;
    result.innerHTML = `<span>${correct === total ? "🏆" : correct / total >= .7 ? "✨" : "🌱"}</span><h3>${correct} / ${total} doğru</h3><p>+${reward} XP ve +${Math.floor(correct / 2)} coin kazandın.</p><button class="primary" id="quizFinishBtn">Tamam</button>`;
    $("#quizFinishBtn").addEventListener("click", () => $("#quizDialog").close(), { once: true });
    quiz = null;
    renderFlashcards();
  }

  // Miki animation and draggable room --------------------------------------
  function animateMiki(action) {
    const className = `miki-${action}`;
    $$(".miki-art-wrap").forEach(node => {
      node.classList.remove("miki-feed", "miki-play", "miki-sleep", "miki-groom", "miki-happy");
      void node.offsetWidth;
      node.classList.add(className);
      setTimeout(() => node.classList.remove(className), action === "sleep" ? 2500 : 1200);
    });
    const scene = $(".large-scene");
    if (scene) {
      const effect = document.createElement("span");
      effect.className = `miki-effect effect-${action}`;
      effect.textContent = ({ feed: "🍎", play: "♥", sleep: "Zzz", groom: "✨" })[action] || "♥";
      scene.append(effect);
      setTimeout(() => effect.remove(), 1500);
    }
  }

  function applyRoomPositions() {
    const positions = state().room.positions || {};
    $$("[data-room-item]").forEach(item => {
      const position = positions[item.dataset.roomItem];
      if (!position) return;
      item.style.left = `${position.left}%`;
      item.style.top = `${position.top}%`;
      item.style.right = "auto";
      item.style.bottom = "auto";
      item.style.transform = "none";
    });
    document.body.classList.toggle("room-editing", Boolean(state().room.editMode));
    const button = $("#roomEditBtn");
    if (button) button.textContent = state().room.editMode ? "✓ Yerleşimi bitir" : "✥ Yerleşimi düzenle";
  }

  function toggleRoomEdit() {
    state().room.editMode = !state().room.editMode;
    save();
    applyRoomPositions();
    toast(state().room.editMode ? "Eşyaları sürükleyerek yerleştirebilirsin." : "Oda yerleşimi kaydedildi.");
  }

  function bindRoomDragging() {
    $$("[data-room-item]").forEach(item => {
      item.addEventListener("pointerdown", event => {
        if (!state().room.editMode) return;
        event.preventDefault();
        const parent = item.parentElement;
        const parentRect = parent.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        const offsetX = event.clientX - itemRect.left;
        const offsetY = event.clientY - itemRect.top;
        item.setPointerCapture(event.pointerId);
        item.classList.add("dragging");

        const move = moveEvent => {
          const maxX = Math.max(0, parentRect.width - item.offsetWidth);
          const maxY = Math.max(0, parentRect.height - item.offsetHeight);
          const x = Math.min(maxX, Math.max(0, moveEvent.clientX - parentRect.left - offsetX));
          const y = Math.min(maxY, Math.max(0, moveEvent.clientY - parentRect.top - offsetY));
          item.style.left = `${x / parentRect.width * 100}%`;
          item.style.top = `${y / parentRect.height * 100}%`;
          item.style.right = "auto";
          item.style.bottom = "auto";
          item.style.transform = "none";
        };

        const end = () => {
          item.classList.remove("dragging");
          item.removeEventListener("pointermove", move);
          item.removeEventListener("pointerup", end);
          item.removeEventListener("pointercancel", end);
          state().room.positions[item.dataset.roomItem] = {
            left: parseFloat(item.style.left) || 0,
            top: parseFloat(item.style.top) || 0
          };
          save();
          app.checkAchievements();
        };
        item.addEventListener("pointermove", move);
        item.addEventListener("pointerup", end);
        item.addEventListener("pointercancel", end);
      });

      item.addEventListener("dblclick", () => {
        if (!state().room.editMode) return;
        delete state().room.positions[item.dataset.roomItem];
        item.removeAttribute("style");
        save();
        toast("Eşya varsayılan yerine döndü.");
      });
    });
  }

  // Peer-to-peer friend sync ------------------------------------------------
  function userCode() {
    return $("#userCode")?.textContent.trim() || localStorage.getItem("bernaV14UserCode") || "";
  }

  function peerIdFromCode(code) {
    return `berna-${code.toLowerCase().replace(/[^a-z0-9-]/g, "")}`;
  }

  function codeFromPeerId(id) {
    const clean = id.replace(/^berna-/, "").toUpperCase();
    return clean.startsWith("MIKI-") ? clean : clean.replace(/^MIKI/, "MIKI-");
  }

  function ownProfile() {
    return {
      code: userCode(),
      name: state().appName,
      mikiName: state().mikiName,
      pomodoros: state().totalPomodoros,
      level: app.levelOf(),
      updatedAt: new Date().toISOString()
    };
  }

  function upsertFriend(profile, synced = false) {
    if (!profile?.code || profile.code === userCode()) return null;
    let friend = state().friends.find(item => item.code === profile.code);
    if (!friend) {
      friend = { id: uid("friend"), code: profile.code };
      state().friends.push(friend);
    }
    Object.assign(friend, {
      name: profile.name || friend.name || "Odak arkadaşı",
      mikiName: profile.mikiName || friend.mikiName || "Miki",
      pomodoros: Number(profile.pomodoros ?? friend.pomodoros ?? 0),
      level: Number(profile.level ?? friend.level ?? 1),
      lastSeen: profile.updatedAt || new Date().toISOString(),
      synced: synced || friend.synced,
      online: synced,
      pending: !synced
    });
    save();
    if (synced) app.checkAchievements();
    renderFriendsEnhanced();
    return friend;
  }

  let friendObserver = null;
  function renderFriendsEnhanced() {
    const list = $("#friendList");
    if (!list) return;
    if (friendObserver) friendObserver.disconnect();
    $("#friendCount").textContent = state().friends.length;
    list.innerHTML = state().friends.length ? state().friends.map(friend => {
      const status = friend.online ? "Çevrim içi" : friend.pending ? "Bağlantı bekleniyor" : "Çevrim dışı";
      return `<div class="friend-entry friend-v15" data-id="${friend.id}">
        <div class="friend-avatar"><img src="./miki-v15.png" alt=""></div>
        <div><strong>${esc(friend.name || friend.code)}</strong><small>${esc(friend.code)} · ${status}</small><span class="friend-progress">Seviye ${friend.level || 1} · ${friend.pomodoros || 0} Pomodoro</span></div>
        <span class="friend-presence ${friend.online ? "online" : ""}"></span><button class="task-delete friend-delete">×</button>
      </div>`;
    }).join("") : '<div class="empty-state"><span>♥</span><strong>Henüz arkadaş kodu eklenmedi.</strong><small>İki uygulama aynı anda açık olduğunda iki tarafa da otomatik düşer.</small></div>';
    if (friendObserver) friendObserver.observe(list, { childList: true, subtree: true });
  }

  function setSyncStatus(mode, text) {
    const dot = $("#friendSyncDot");
    const label = $("#friendSyncStatus");
    if (dot) dot.className = `sync-dot ${mode}`;
    if (label) label.textContent = text;
  }

  function loadPeerJS() {
    if (window.Peer) return Promise.resolve();
    if (peerLoading) return peerLoading;
    peerLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.5/peerjs.min.js";
      script.integrity = "sha512-XEKeWX+mI3Ov+tg2evDlVQFzVOIp4T8J3cNcCEPaEUGpxJV3eZaN8rHuvnFPvQpGJBHPmrozJDMpm2xcDvtmyQ==";
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = () => reject(new Error("PeerJS yüklenemedi"));
      document.head.append(script);
    });
    return peerLoading;
  }

  function setupConnection(connection, requestedCode = "") {
    const remoteCode = connection.metadata?.code || requestedCode || codeFromPeerId(connection.peer);
    connections.set(remoteCode, connection);

    connection.on("open", () => {
      connection.send({ type: "friend-request", profile: ownProfile() });
      const friend = state().friends.find(item => item.code === remoteCode);
      if (friend) {
        friend.online = true;
        friend.pending = false;
        save();
        renderFriendsEnhanced();
      }
    });

    connection.on("data", data => {
      if (!data || typeof data !== "object") return;
      if (["friend-request", "friend-accepted", "profile"].includes(data.type)) {
        const friend = upsertFriend(data.profile, true);
        if (data.type === "friend-request") connection.send({ type: "friend-accepted", profile: ownProfile() });
        if (friend) setSyncStatus("online", "Arkadaş senkronizasyonu açık");
      }
    });

    const offline = () => {
      const friend = state().friends.find(item => item.code === remoteCode);
      if (friend) {
        friend.online = false;
        save();
        renderFriendsEnhanced();
      }
      connections.delete(remoteCode);
    };
    connection.on("close", offline);
    connection.on("error", offline);
  }

  function connectFriend(code) {
    if (!peerReady || !peer || !code || code === userCode()) return;
    const existing = connections.get(code);
    if (existing?.open) {
      existing.send({ type: "profile", profile: ownProfile() });
      return;
    }
    try {
      const connection = peer.connect(peerIdFromCode(code), { reliable: true, metadata: { code: userCode() } });
      setupConnection(connection, code);
    } catch {
      const friend = state().friends.find(item => item.code === code);
      if (friend) friend.online = false;
    }
  }

  function reconnectFriends() {
    state().friends.forEach(friend => connectFriend(friend.code));
  }

  async function initFriendSync(force = false) {
    if (peer && !force) return;
    if (force && peer) {
      try { peer.destroy(); } catch {}
      peer = null;
      peerReady = false;
    }
    setSyncStatus("loading", "Arkadaş sistemi bağlanıyor…");
    try {
      await loadPeerJS();
      peer = new window.Peer(peerIdFromCode(userCode()), { debug: 0 });
      peer.on("open", () => {
        peerReady = true;
        setSyncStatus("online", "Arkadaş senkronizasyonu açık");
        reconnectFriends();
      });
      peer.on("connection", connection => setupConnection(connection));
      peer.on("disconnected", () => {
        peerReady = false;
        setSyncStatus("offline", "Bağlantı kesildi; yeniden bağlanılıyor…");
        setTimeout(() => { try { peer.reconnect(); } catch {} }, 3000);
      });
      peer.on("error", error => {
        peerReady = false;
        const text = error?.type === "unavailable-id" ? "Arkadaş kodu çakıştı; verileri sıfırlamadan kodu yenile." : "Arkadaş sistemi çevrim dışı";
        setSyncStatus("offline", text);
      });
    } catch {
      setSyncStatus("offline", "İnternet yok; arkadaşlar bağlanınca eşleşecek");
    }
  }

  function addFriendOnline(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    let code = $("#friendCodeInput").value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (/^[A-Z0-9]{8}$/.test(code)) code = `${code.slice(0, 4)}-${code.slice(4)}`;
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      toast("Kod biçimi MIKI-AB12 gibi olmalı.");
      return;
    }
    if (code === userCode()) {
      toast("Kendi kodunu ekleyemezsin.");
      return;
    }
    upsertFriend({ code, name: code, level: 1, pomodoros: 0 }, false);
    $("#friendCodeInput").value = "";
    connectFriend(code);
    toast("Arkadaş isteği gönderildi. İkinizin uygulaması aynı anda açık olduğunda iki tarafa da düşecek.");
  }

  function broadcastProfile() {
    for (const connection of connections.values()) {
      if (connection.open) connection.send({ type: "profile", profile: ownProfile() });
    }
  }

  // Bind -------------------------------------------------------------------
  function bind() {
    $("#addExamBtn")?.addEventListener("click", openExamDialog);
    $("#examForm")?.addEventListener("submit", event => {
      event.preventDefault();
      state().exams.push({
        id: uid("exam"), name: $("#examNameInput").value.trim(), date: $("#examDateInput").value,
        target: Number($("#examTargetInput").value) || 0, subjectId: $("#examSubjectInput").value
      });
      save();
      app.checkAchievements();
      $("#examDialog").close();
      renderExams();
      toast("Sınav geri sayımı eklendi.");
    });
    $("#examList")?.addEventListener("click", event => {
      const button = event.target.closest(".exam-delete");
      if (!button) return;
      state().exams = state().exams.filter(exam => exam.id !== button.closest(".exam-entry").dataset.id);
      save();
      renderExams();
    });

    $("#addFlashcardBtn")?.addEventListener("click", () => {
      fillSubjectSelect($("#flashcardSubjectInput"));
      $("#flashcardForm").reset();
      $("#flashcardDialog").showModal();
      setTimeout(() => $("#flashcardQuestionInput").focus(), 30);
    });
    $("#flashcardForm")?.addEventListener("submit", event => {
      event.preventDefault();
      state().flashcards.push({
        id: uid("card"), subjectId: $("#flashcardSubjectInput").value,
        question: $("#flashcardQuestionInput").value.trim(), answer: $("#flashcardAnswerInput").value.trim(),
        box: 0, correct: 0, wrong: 0, createdAt: new Date().toISOString(), lastReviewed: ""
      });
      save();
      app.checkAchievements();
      $("#flashcardDialog").close();
      currentCardId = state().flashcards.at(-1).id;
      cardRevealed = false;
      renderFlashcards();
      toast("Flashcard eklendi.");
    });
    $("#flashSubjectFilter")?.addEventListener("change", () => { currentCardId = null; cardRevealed = false; renderFlashcards(); });
    $("#studyCard")?.addEventListener("click", flipCard);
    $("#flashFlipBtn")?.addEventListener("click", flipCard);
    $("#flashAgainBtn")?.addEventListener("click", () => gradeCard(false));
    $("#flashKnowBtn")?.addEventListener("click", () => gradeCard(true));
    $("#startQuizBtn")?.addEventListener("click", startQuiz);
    $("#quizOptions")?.addEventListener("click", event => {
      const button = event.target.closest("button[data-answer]");
      if (button) answerQuiz(button);
    });
    $("#flashcardList")?.addEventListener("click", event => {
      const button = event.target.closest(".flashcard-delete");
      if (!button) return;
      const id = button.closest(".flashcard-entry").dataset.id;
      state().flashcards = state().flashcards.filter(card => card.id !== id);
      if (currentCardId === id) currentCardId = null;
      save();
      renderFlashcards();
    });

    $("#roomEditBtn")?.addEventListener("click", toggleRoomEdit);
    bindRoomDragging();
    $$('[data-care]').forEach(button => button.addEventListener("click", () => animateMiki(button.dataset.care)));
    $("#timerToggleBtn")?.addEventListener("click", () => animateMiki("happy"));

    const friendForm = $("#friendForm");
    friendForm?.addEventListener("submit", addFriendOnline, true);
    $("#friendReconnectBtn")?.addEventListener("click", () => initFriendSync(true));

    window.addEventListener("berna:state-saved", () => {
      renderExams();
      renderFlashcards();
      applyRoomPositions();
      renderFriendsEnhanced();
      broadcastProfile();
    });

    friendObserver = new MutationObserver(() => {
      if (!$("#friendList .friend-v15") && state().friends.length) renderFriendsEnhanced();
    });
    if ($("#friendList")) friendObserver.observe($("#friendList"), { childList: true, subtree: true });
  }

  ensureState();
  bind();
  fillSubjectSelect($("#examSubjectInput"));
  fillSubjectSelect($("#flashcardSubjectInput"));
  renderExams();
  renderFlashcards();
  applyRoomPositions();
  renderFriendsEnhanced();
  initFriendSync();
  setInterval(renderExams, 60000);
  setInterval(reconnectFriends, 25000);
  setInterval(broadcastProfile, 15000);
  setInterval(() => {
    if (!document.hidden && !state().settings.reduceMotion) animateMiki("happy");
  }, 22000);
})();
