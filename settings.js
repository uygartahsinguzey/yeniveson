window.Berna = window.Berna || {};

Berna.Settings = (() => {
  function applyTheme(theme) {
    const safe = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = safe;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    themeMeta?.setAttribute("content", safe === "dark" ? "#151914" : "#7f9273");
  }

  function open() {
    const state = Berna.Storage.getState();
    document.getElementById("profile-name-input").value = state.profile.name;
    document.querySelectorAll('input[name="theme"]').forEach((input) => {
      input.checked = input.value === state.settings.theme;
    });
    Berna.UI.openDialog("settings-modal");
  }

  function init() {
    document.getElementById("settings-button").addEventListener("click", open);
    document.getElementById("settings-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const name = document.getElementById("profile-name-input").value.trim();
      const theme = document.querySelector('input[name="theme"]:checked')?.value || "light";

      Berna.Storage.update((state) => {
        state.profile.name = name;
        state.settings.theme = theme;
      });
      applyTheme(theme);
      Berna.Progress?.render();
      Berna.UI.closeDialog("settings-modal");
      Berna.UI.toast("Ayarlar kaydedildi.");
    });

    applyTheme(Berna.Storage.getState().settings.theme);
  }

  return { init, applyTheme };
})();
