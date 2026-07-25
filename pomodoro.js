window.Berna = window.Berna || {};

Berna.Pomodoro = (() => {
  let durationMinutes = 25;
  let remainingSeconds = durationMinutes * 60;
  let startedAt = 0;
  let targetEnd = 0;
  let interval = 0;
  let bounceInterval = 0;
  let running = false;

  const refs = {};

  function updateDisplay() {
    refs.display.textContent = Berna.Utils.formatTimer(remainingSeconds);
    const total = durationMinutes * 60;
    const progress = total ? remainingSeconds / total : 0;
    refs.ring.style.strokeDashoffset = String(Berna.Constants.TIMER_RING_LENGTH * (1 - progress));
    document.title = running ? `${refs.display.textContent} · Berna` : "Berna";
  }

  function setDuration(minutes) {
    if (running) return;
    durationMinutes = Number(minutes);
    remainingSeconds = durationMinutes * 60;
    document.querySelectorAll(".duration-button").forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.minutes) === durationMinutes);
    });
    updateDisplay();
  }

  function prepare(minutes = 25) {
    setDuration(minutes);
  }

  function tick() {
    remainingSeconds = Math.max(0, Math.ceil((targetEnd - Date.now()) / 1000));
    updateDisplay();
    Berna.Friends.broadcastPresence?.();
    if (remainingSeconds <= 0) complete();
  }

  function start() {
    if (running) return;
    const subjectId = refs.subject.value;
    if (!subjectId) {
      Berna.UI.openDialog("subjects-modal");
      Berna.UI.toast("Pomodoro için bir ders oluştur.");
      return;
    }

    running = true;
    startedAt = Date.now();
    targetEnd = startedAt + remainingSeconds * 1000;
    refs.start.disabled = true;
    refs.status.textContent = "Odaklanıyor";
    refs.orbit.classList.add("is-running");
    Berna.Miki.focusStart();
    Berna.Friends.setOwnStatus?.("Odaklanıyor");

    interval = window.setInterval(tick, 500);
    bounceInterval = window.setInterval(bounce, 30000);
    tick();
  }

  function bounce() {
    refs.orbit.classList.remove("is-running");
    refs.orbit.classList.add("is-bouncing");
    window.setTimeout(() => {
      refs.orbit.classList.remove("is-bouncing");
      if (running) refs.orbit.classList.add("is-running");
    }, 1300);
  }

  function complete() {
    if (!running) return;
    running = false;
    clearInterval(interval);
    clearInterval(bounceInterval);

    const subjectId = refs.subject.value;
    const subject = Berna.Subjects.getSubjects().find((item) => item.id === subjectId);
    const completedAt = new Date();

    Berna.Storage.update((state) => {
      state.sessions.push({
        id: Berna.Utils.uid("session"),
        subjectId,
        subjectName: subject?.name || "Silinmiş ders",
        minutes: durationMinutes,
        completedAt: completedAt.toISOString(),
        dateKey: Berna.Utils.localDateKey(completedAt)
      });
      state.wallet.xp += durationMinutes * 2;
      state.wallet.coins += Math.max(1, Math.round(durationMinutes / 5));
    });

    refs.start.disabled = false;
    refs.status.textContent = "Tamamlandı";
    refs.orbit.classList.remove("is-running", "is-bouncing");
    remainingSeconds = durationMinutes * 60;
    updateDisplay();

    Berna.Sound.stopAll();
    Berna.Miki.focusEnd();
    Berna.Friends.setOwnStatus?.("Dinleniyor");
    Berna.UI.celebrate();
    Berna.UI.toast("Pomodoro tamamlandı.");
    Berna.Summary.show(false);
  }

  function init() {
    refs.display = document.getElementById("timer-display");
    refs.status = document.getElementById("timer-status");
    refs.ring = document.getElementById("timer-ring-progress");
    refs.start = document.getElementById("timer-start-button");
    refs.subject = document.getElementById("subject-select");
    refs.orbit = document.getElementById("miki-orbit");

    document.querySelectorAll(".duration-button").forEach((button) => {
      button.addEventListener("click", () => setDuration(button.dataset.minutes));
    });
    refs.start.addEventListener("click", start);
    updateDisplay();

    document.addEventListener("visibilitychange", () => {
      if (running && document.visibilityState === "visible") tick();
    });
  }

  return {
    init,
    prepare,
    start,
    isRunning: () => running,
    getRemaining: () => remainingSeconds
  };
})();
