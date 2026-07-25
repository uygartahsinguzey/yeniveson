window.Berna = window.Berna || {};

Berna.UI = (() => {
  let toastTimer = 0;

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog || dialog.open) return;
    dialog.showModal();
    document.body.classList.add("modal-open");
  }

  function closeDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog || !dialog.open) return;
    dialog.close();
    document.body.classList.remove("modal-open");
  }

  function toast(message) {
    const el = document.getElementById("toast");
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = message;
    el.classList.add("is-visible");
    toastTimer = window.setTimeout(() => el.classList.remove("is-visible"), 2400);
  }

  function celebrate() {
    const el = document.getElementById("celebration");
    if (!el) return;
    el.classList.remove("is-active");
    void el.offsetWidth;
    el.classList.add("is-active");
    window.setTimeout(() => el.classList.remove("is-active"), 1500);
  }

  function init() {
    document.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => closeDialog(button.dataset.closeDialog));
    });

    document.querySelectorAll("dialog").forEach((dialog) => {
      dialog.addEventListener("close", () => document.body.classList.remove("modal-open"));
      dialog.addEventListener("click", (event) => {
        const rect = dialog.getBoundingClientRect();
        const isBackdrop = (
          event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom
        );
        if (isBackdrop) dialog.close();
      });
    });
  }

  return { init, openDialog, closeDialog, toast, celebrate };
})();
