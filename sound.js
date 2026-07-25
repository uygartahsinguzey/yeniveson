window.Berna = window.Berna || {};

Berna.Sound = (() => {
  let active = "";

  function stopAll() {
    document.querySelectorAll("audio[id^='audio-']").forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    document.querySelectorAll(".sound-button").forEach((button) => button.classList.remove("is-active"));
    active = "";
  }

  async function toggle(name) {
    const audio = document.getElementById(`audio-${name}`);
    const button = document.querySelector(`[data-sound="${name}"]`);
    if (!audio || !button) return;

    if (active === name) {
      stopAll();
      return;
    }

    stopAll();
    audio.volume = 0.46;
    try {
      await audio.play();
      active = name;
      button.classList.add("is-active");
    } catch {
      Berna.UI.toast("Ses başlatılamadı.");
    }
  }

  function init() {
    document.querySelectorAll(".sound-button").forEach((button) => {
      button.addEventListener("click", () => toggle(button.dataset.sound));
    });
  }

  return { init, toggle, stopAll };
})();
