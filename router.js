window.Berna = window.Berna || {};

Berna.Router = (() => {
  let current = "today";

  function go(route) {
    const page = document.querySelector(`[data-page="${route}"]`);
    const tab = document.querySelector(`[data-route="${route}"]`);
    if (!page || !tab) return;

    current = route;
    document.querySelectorAll("[data-page]").forEach((el) => el.classList.toggle("is-active", el === page));
    document.querySelectorAll("[data-route]").forEach((el) => {
      const active = el === tab;
      el.classList.toggle("is-active", active);
      el.setAttribute("aria-current", active ? "page" : "false");
    });

    history.replaceState(null, "", `#${route}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.dispatchEvent(new CustomEvent("berna:route", { detail: { route } }));
  }

  function init() {
    document.querySelectorAll("[data-route]").forEach((button) => {
      button.addEventListener("click", () => go(button.dataset.route));
    });
    const initial = location.hash.replace("#", "");
    go(document.querySelector(`[data-page="${initial}"]`) ? initial : "today");
  }

  return { init, go, get current() { return current; } };
})();
