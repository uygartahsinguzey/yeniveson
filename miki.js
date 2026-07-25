window.Berna = window.Berna || {};

Berna.Miki = (() => {
  let forcedFocusMood = false;

  const copy = {
    happy: {
      label: "Mutlu",
      message: "Miki ritmini seviyor.",
      detail: "Yakın zamanda çalıştığın için enerjik ve yanında yürümeye hazır."
    },
    normal: {
      label: "Normal",
      message: "Birlikte başlamak için burada.",
      detail: "İlk Pomodoro tamamlandığında Miki mutlu olacak."
    },
    sad: {
      label: "Üzgün",
      message: "Miki seni biraz özlemiş.",
      detail: "Yeni bir Pomodoro başladığında uyanıp yeniden mutlu olacak."
    },
    sleeping: {
      label: "Uyuyor",
      message: "Miki uzun bir uykuya dalmış.",
      detail: "Çalışmaya başladığında esneyip seninle birlikte yola koyulacak."
    }
  };

  function mood() {
    if (forcedFocusMood) return Berna.Constants.MOOD.HAPPY;
    const sessions = Berna.Storage.getState().sessions;
    if (!sessions.length) return Berna.Constants.MOOD.NORMAL;

    const latest = Math.max(...sessions.map((session) => new Date(session.completedAt).getTime()));
    const elapsedHours = (Date.now() - latest) / 3600000;

    if (elapsedHours < 24) return Berna.Constants.MOOD.HAPPY;
    if (elapsedHours < 72) return Berna.Constants.MOOD.SAD;
    return Berna.Constants.MOOD.SLEEPING;
  }

  function render() {
    const current = mood();
    document.querySelectorAll("[data-miki]").forEach((el) => {
      el.classList.remove("mood-happy", "mood-normal", "mood-sad", "mood-sleeping");
      el.classList.add(`mood-${current}`);
    });

    const text = copy[current];
    document.getElementById("mini-miki-mood").textContent = text.label;
    document.getElementById("mini-miki-message").textContent = text.detail;
    document.getElementById("miki-mood-pill").textContent = text.label;
    document.getElementById("miki-message").textContent = text.message;
    document.getElementById("miki-detail").textContent = text.detail;
  }

  function focusStart() {
    forcedFocusMood = true;
    render();
    document.querySelectorAll("[data-miki]").forEach((el) => {
      el.classList.add("is-yawning");
      window.setTimeout(() => {
        el.classList.remove("is-yawning");
        el.classList.add("is-walking");
      }, 850);
    });
  }

  function focusEnd() {
    forcedFocusMood = false;
    document.querySelectorAll("[data-miki]").forEach((el) => el.classList.remove("is-walking", "is-yawning"));
    render();
  }

  function init() {
    render();
    document.addEventListener("berna:state-changed", render);
  }

  return { init, render, mood, focusStart, focusEnd };
})();
