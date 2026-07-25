window.Berna = window.Berna || {};

Berna.Friends = (() => {
  let ownStatus = "Dinleniyor";
  let channel = null;
  const presence = new Map();

  function ownStats() {
    const state = Berna.Storage.getState();
    const todayKey = Berna.Utils.localDateKey();
    const weekStart = Berna.Utils.startOfWeek();
    const daily = state.sessions.filter((session) => session.dateKey === todayKey);
    const weekly = state.sessions.filter((session) => new Date(session.completedAt) >= weekStart);
    return {
      daily: Berna.Progress.sumMinutes(daily),
      weekly: Berna.Progress.sumMinutes(weekly),
      total: Berna.Progress.sumMinutes(state.sessions),
      pomodoros: state.sessions.length,
      streak: Berna.Progress.streak(state.sessions)
    };
  }

  function broadcastPresence() {
    if (!channel) return;
    const state = Berna.Storage.getState();
    channel.postMessage({
      type: "presence",
      profile: {
        name: state.profile.name || "Berna kullanıcısı",
        code: state.profile.code,
        status: ownStatus,
        stats: ownStats(),
        updatedAt: Date.now()
      }
    });
  }

  function setOwnStatus(status) {
    ownStatus = status;
    document.getElementById("own-live-status").textContent = status;
    broadcastPresence();
  }

  function render() {
    const state = Berna.Storage.getState();
    document.getElementById("own-profile-name").textContent = state.profile.name || "Berna kullanıcısı";
    document.getElementById("own-profile-code").textContent = state.profile.code;
    document.getElementById("own-live-status").textContent = ownStatus;

    const list = document.getElementById("friends-list");
    const empty = document.getElementById("friends-empty");
    list.innerHTML = "";
    empty.hidden = state.friends.length > 0;

    state.friends.forEach((friend) => {
      const live = presence.get(friend.code);
      const stats = live?.stats || friend.stats || { daily: 0, weekly: 0, total: 0, pomodoros: 0, streak: 0 };
      const status = live?.status || "Çevrimdışı";
      const name = live?.name || friend.name;

      const card = document.createElement("article");
      card.className = "card friend-card";

      const top = document.createElement("div");
      top.className = "friend-card-top";

      const identity = document.createElement("div");
      identity.className = "friend-identity";
      const avatar = document.createElement("div");
      avatar.className = "friend-avatar";
      avatar.textContent = name.slice(0, 1).toLocaleUpperCase("tr-TR");
      const copy = document.createElement("div");
      const title = document.createElement("h2");
      title.textContent = name;
      const code = document.createElement("p");
      code.className = "muted";
      code.textContent = friend.code;
      copy.append(title, code);
      identity.append(avatar, copy);

      const badge = document.createElement("span");
      badge.className = "live-badge";
      badge.textContent = status;
      top.append(identity, badge);

      const statsEl = document.createElement("div");
      statsEl.className = "friend-stats";
      statsEl.innerHTML = `
        <div><span>Günlük</span><strong>${Berna.Utils.formatMinutes(stats.daily)}</strong></div>
        <div><span>Haftalık</span><strong>${Berna.Utils.formatMinutes(stats.weekly)}</strong></div>
        <div><span>Toplam</span><strong>${Berna.Utils.formatMinutes(stats.total)}</strong></div>
      `;

      const achievementNames = [];
      if (stats.pomodoros >= 1) achievementNames.push("İlk Adım");
      if (stats.pomodoros >= 5) achievementNames.push("Ritim");
      if (stats.pomodoros >= 25) achievementNames.push("Derin Odak");
      if (stats.streak >= 7) achievementNames.push("7 Gün Seri");

      const achievements = document.createElement("p");
      achievements.className = "friend-achievements";
      achievements.textContent = achievementNames.length
        ? `Başarımlar: ${achievementNames.join(" · ")}`
        : "Henüz başarım yok";

      const remove = document.createElement("button");
      remove.className = "text-button";
      remove.type = "button";
      remove.textContent = "Arkadaşı kaldır";
      remove.addEventListener("click", () => removeFriend(friend.id));

      card.append(top, statsEl, achievements, remove);
      list.append(card);
    });
  }

  function removeFriend(id) {
    Berna.Storage.update((state) => {
      state.friends = state.friends.filter((friend) => friend.id !== id);
    });
    render();
  }

  function initChannel() {
    if (!("BroadcastChannel" in window)) return;
    channel = new BroadcastChannel("berna-v16-presence");
    channel.addEventListener("message", (event) => {
      if (event.data?.type !== "presence") return;
      const profile = event.data.profile;
      if (!profile?.code || profile.code === Berna.Storage.getState().profile.code) return;
      presence.set(profile.code, profile);
      render();
    });
    window.setInterval(broadcastPresence, 5000);
    window.addEventListener("beforeunload", () => channel?.close());
    broadcastPresence();
  }

  function init() {
    document.getElementById("add-friend-button").addEventListener("click", () => {
      document.getElementById("friend-name-input").value = "";
      document.getElementById("friend-code-input").value = "";
      Berna.UI.openDialog("friend-modal");
    });

    document.getElementById("friend-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const name = document.getElementById("friend-name-input").value.trim();
      const code = document.getElementById("friend-code-input").value.trim().toUpperCase();
      const ownCode = Berna.Storage.getState().profile.code;

      if (!name || !code) return;
      if (code === ownCode) {
        Berna.UI.toast("Kendi profil kodunu ekleyemezsin.");
        return;
      }

      Berna.Storage.update((state) => {
        if (!state.friends.some((friend) => friend.code === code)) {
          state.friends.push({
            id: Berna.Utils.uid("friend"),
            name,
            code,
            stats: { daily: 0, weekly: 0, total: 0, pomodoros: 0, streak: 0 }
          });
        }
      });
      Berna.UI.closeDialog("friend-modal");
      render();
      broadcastPresence();
    });

    document.addEventListener("berna:state-changed", () => {
      render();
      broadcastPresence();
    });

    initChannel();
    render();
  }

  return { init, render, broadcastPresence, setOwnStatus };
})();
