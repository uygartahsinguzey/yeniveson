window.Berna = window.Berna || {};

Berna.Summary = (() => {
  function data() {
    const key = Berna.Utils.localDateKey();
    const sessions = Berna.Storage.getState().sessions.filter((session) => session.dateKey === key);
    const totals = {};
    sessions.forEach((session) => {
      totals[session.subjectName] = (totals[session.subjectName] || 0) + session.minutes;
    });
    const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    return {
      total: Berna.Progress.sumMinutes(sessions),
      count: sessions.length,
      subject: top
    };
  }

  function render() {
    const summary = data();
    document.getElementById("summary-total").textContent = Berna.Utils.formatMinutes(summary.total);
    document.getElementById("summary-count").textContent = summary.count;
    document.getElementById("summary-subject").textContent = summary.subject;
  }

  function show(force = false) {
    const now = new Date();
    const today = Berna.Utils.localDateKey(now);
    const state = Berna.Storage.getState();
    const shouldShow = force || (now.getHours() >= 20 && state.summary.lastShownDate !== today);
    if (!shouldShow || !data().count) return;

    render();
    Berna.UI.openDialog("summary-modal");
    Berna.Storage.update((next) => { next.summary.lastShownDate = today; });
  }

  function init() {
    window.setTimeout(() => show(false), 900);
  }

  return { init, render, show };
})();
