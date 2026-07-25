window.Berna = window.Berna || {};

Berna.Progress = (() => {
  function sumMinutes(sessions) {
    return sessions.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  }

  function streak(sessions) {
    const dates = new Set(sessions.map((session) => session.dateKey));
    let count = 0;
    const cursor = new Date();

    while (dates.has(Berna.Utils.localDateKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  function drawWeekly(sessions) {
    const canvas = document.getElementById("weekly-chart");
    const ctx = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || 700;
    const cssHeight = Math.max(220, cssWidth * 0.42);

    canvas.width = cssWidth * ratio;
    canvas.height = cssHeight * ratio;
    canvas.style.height = `${cssHeight}px`;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const days = [];
    const formatter = new Intl.DateTimeFormat("tr-TR", { weekday: "short" });
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = Berna.Utils.localDateKey(date);
      days.push({
        label: formatter.format(date).replace(".", ""),
        minutes: sumMinutes(sessions.filter((session) => session.dateKey === key))
      });
    }

    const max = Math.max(30, ...days.map((day) => day.minutes));
    const padding = { top: 18, right: 10, bottom: 34, left: 10 };
    const width = cssWidth - padding.left - padding.right;
    const height = cssHeight - padding.top - padding.bottom;
    const slot = width / days.length;
    const barWidth = Math.min(42, slot * .54);

    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue("--accent").trim();
    const muted = style.getPropertyValue("--muted").trim();
    const surface = style.getPropertyValue("--surface-muted").trim();

    ctx.textAlign = "center";
    ctx.font = "12px Inter, sans-serif";

    days.forEach((day, index) => {
      const x = padding.left + slot * index + (slot - barWidth) / 2;
      const barHeight = Math.max(4, (day.minutes / max) * height);
      const y = padding.top + height - barHeight;

      ctx.fillStyle = surface;
      roundRect(ctx, x, padding.top, barWidth, height, 10);
      ctx.fill();

      ctx.fillStyle = accent;
      roundRect(ctx, x, y, barWidth, barHeight, 10);
      ctx.fill();

      ctx.fillStyle = muted;
      ctx.fillText(day.label, x + barWidth / 2, cssHeight - 10);
    });
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function renderBreakdown(sessions) {
    const container = document.getElementById("subject-breakdown");
    const totals = {};

    sessions.forEach((session) => {
      const name = session.subjectName || "Silinmiş ders";
      totals[name] = (totals[name] || 0) + session.minutes;
    });

    const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...rows.map(([, minutes]) => minutes));
    container.innerHTML = "";

    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Henüz çalışma kaydı yok.";
      container.append(empty);
      return;
    }

    rows.forEach(([name, minutes]) => {
      const row = document.createElement("div");
      row.className = "breakdown-row";

      const label = document.createElement("span");
      label.className = "breakdown-name";
      label.textContent = name;

      const track = document.createElement("span");
      track.className = "breakdown-track";
      const bar = document.createElement("span");
      bar.style.width = `${(minutes / max) * 100}%`;
      track.append(bar);

      const value = document.createElement("strong");
      value.textContent = Berna.Utils.formatMinutes(minutes);

      row.append(label, track, value);
      container.append(row);
    });
  }

  function render() {
    const state = Berna.Storage.getState();
    const now = new Date();
    const todayKey = Berna.Utils.localDateKey(now);
    const weekStart = Berna.Utils.startOfWeek(now);
    const month = now.getMonth();
    const year = now.getFullYear();

    const daily = state.sessions.filter((session) => session.dateKey === todayKey);
    const weekly = state.sessions.filter((session) => new Date(session.completedAt) >= weekStart);
    const monthly = state.sessions.filter((session) => {
      const date = new Date(session.completedAt);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    document.getElementById("stat-daily").textContent = Berna.Utils.formatMinutes(sumMinutes(daily));
    document.getElementById("stat-weekly").textContent = Berna.Utils.formatMinutes(sumMinutes(weekly));
    document.getElementById("stat-monthly").textContent = Berna.Utils.formatMinutes(sumMinutes(monthly));
    document.getElementById("stat-total").textContent = Berna.Utils.formatMinutes(sumMinutes(state.sessions));
    document.getElementById("stat-xp").textContent = state.wallet.xp;
    document.getElementById("stat-coins").textContent = state.wallet.coins;
    document.getElementById("stat-pomodoros").textContent = state.sessions.length;
    document.getElementById("stat-streak").textContent = `${streak(state.sessions)} gün`;

    drawWeekly(state.sessions);
    renderBreakdown(state.sessions);
  }

  function init() {
    document.addEventListener("berna:state-changed", render);
    document.addEventListener("berna:route", (event) => {
      if (event.detail.route === "progress") requestAnimationFrame(render);
    });
    window.addEventListener("resize", () => {
      if (Berna.Router.current === "progress") drawWeekly(Berna.Storage.getState().sessions);
    });
    render();
  }

  return { init, render, sumMinutes, streak };
})();
