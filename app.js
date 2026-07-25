window.Berna = window.Berna || {};

document.addEventListener("DOMContentLoaded", () => {
  Berna.Storage.load();
  Berna.UI.init();
  Berna.Settings.init();
  Berna.Subjects.init();
  Berna.Miki.init();
  Berna.Sound.init();
  Berna.Today.init();
  Berna.Progress.init();
  Berna.Room.init();
  Berna.Friends.init();
  Berna.Pomodoro.init();
  Berna.Summary.init();
  Berna.Router.init();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      Berna.UI.toast("Offline desteği başlatılamadı.");
    });
  }
});
