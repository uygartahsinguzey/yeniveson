window.Berna = window.Berna || {};

Berna.Utils = {
  uid(prefix = "id") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  },

  profileCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  },

  localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },

  startOfWeek(date = new Date()) {
    const copy = new Date(date);
    const day = (copy.getDay() + 6) % 7;
    copy.setHours(0, 0, 0, 0);
    copy.setDate(copy.getDate() - day);
    return copy;
  },

  formatMinutes(minutes) {
    const total = Math.max(0, Math.round(Number(minutes) || 0));
    if (total < 60) return `${total} dk`;
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
  },

  formatTimer(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    const min = Math.floor(safe / 60);
    const sec = safe % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  },

  dayDiff(dateString) {
    if (!dateString) return null;
    const target = new Date(`${dateString}T12:00:00`);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return Math.ceil((target - today) / 86400000);
  },

  escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },

  clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
};
