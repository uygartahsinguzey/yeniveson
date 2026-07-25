window.Berna = window.Berna || {};

Berna.Storage = (() => {
  const { STORAGE_KEY, STATE_VERSION, STARTER_ITEMS } = Berna.Constants;
  let state = null;

  function defaultState() {
    return {
      version: STATE_VERSION,
      profile: {
        name: "",
        code: Berna.Utils.profileCode()
      },
      settings: {
        theme: "light"
      },
      subjects: [],
      today: {
        goalMinutes: 60,
        exam: { name: "", date: "" },
        taskDate: Berna.Utils.localDateKey(),
        tasks: []
      },
      sessions: [],
      wallet: {
        xp: 0,
        coins: 0
      },
      room: {
        owned: [...STARTER_ITEMS],
        equipped: [...STARTER_ITEMS]
      },
      friends: [],
      summary: {
        lastShownDate: ""
      }
    };
  }

  function normalize(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;

    return {
      ...base,
      ...raw,
      profile: { ...base.profile, ...(raw.profile || {}) },
      settings: { ...base.settings, ...(raw.settings || {}) },
      today: {
        ...base.today,
        ...(raw.today || {}),
        exam: { ...base.today.exam, ...(raw.today?.exam || {}) },
        tasks: Array.isArray(raw.today?.tasks) ? raw.today.tasks : []
      },
      subjects: Array.isArray(raw.subjects) ? raw.subjects : [],
      sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
      wallet: { ...base.wallet, ...(raw.wallet || {}) },
      room: {
        ...base.room,
        ...(raw.room || {}),
        owned: Array.isArray(raw.room?.owned) ? raw.room.owned : [...STARTER_ITEMS],
        equipped: Array.isArray(raw.room?.equipped) ? raw.room.equipped : [...STARTER_ITEMS]
      },
      friends: Array.isArray(raw.friends) ? raw.friends : [],
      summary: { ...base.summary, ...(raw.summary || {}) }
    };
  }

  function load() {
    try {
      state = normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch {
      state = defaultState();
    }
    save();
    return state;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.dispatchEvent(new CustomEvent("berna:state-changed", { detail: state }));
  }

  function getState() {
    if (!state) load();
    return state;
  }

  function update(mutator) {
    const next = mutator(getState());
    if (next && next !== state) state = normalize(next);
    save();
    return state;
  }

  return { load, save, getState, update };
})();
