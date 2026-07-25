window.Berna = window.Berna || {};

Berna.Constants = Object.freeze({
  STORAGE_KEY: "berna-v16-state",
  STATE_VERSION: 1,
  TIMER_RING_LENGTH: 703.72,
  MOOD: {
    HAPPY: "happy",
    NORMAL: "normal",
    SAD: "sad",
    SLEEPING: "sleeping"
  },
  STARTER_ITEMS: ["bed", "plant", "bookshelf", "window", "rug"],
  STORE_ITEMS: [
    { id: "desk", name: "Çalışma masası", category: "Mobilya", price: 40, preview: "▰" },
    { id: "lamp", name: "Zemin lambası", category: "Aydınlatma", price: 30, preview: "⌁" },
    { id: "art", name: "Duvar resmi", category: "Dekor", price: 25, preview: "▧" },
    { id: "cushion", name: "Yumuşak minder", category: "Dekor", price: 20, preview: "◈" }
  ]
});
