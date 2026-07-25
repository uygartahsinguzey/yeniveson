window.Berna = window.Berna || {};

Berna.Room = (() => {
  let category = "Tümü";

  function renderRoom() {
    const equipped = Berna.Storage.getState().room.equipped;
    document.querySelectorAll("[data-room-item]").forEach((item) => {
      item.classList.toggle("is-hidden", !equipped.includes(item.dataset.roomItem));
    });
  }

  function categories() {
    return ["Tümü", ...new Set(Berna.Constants.STORE_ITEMS.map((item) => item.category))];
  }

  function renderStore() {
    const state = Berna.Storage.getState();
    document.getElementById("store-coins").textContent = state.wallet.coins;

    const categoryContainer = document.getElementById("store-categories");
    categoryContainer.innerHTML = "";
    categories().forEach((name) => {
      const button = document.createElement("button");
      button.className = `store-category${category === name ? " is-active" : ""}`;
      button.type = "button";
      button.textContent = name;
      button.addEventListener("click", () => {
        category = name;
        renderStore();
      });
      categoryContainer.append(button);
    });

    const grid = document.getElementById("store-grid");
    grid.innerHTML = "";

    Berna.Constants.STORE_ITEMS
      .filter((item) => category === "Tümü" || item.category === category)
      .forEach((item) => {
        const owned = state.room.owned.includes(item.id);
        const equipped = state.room.equipped.includes(item.id);

        const card = document.createElement("article");
        card.className = "store-item";

        const preview = document.createElement("div");
        preview.className = "store-preview";
        preview.textContent = item.preview;

        const copy = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = item.name;
        const meta = document.createElement("p");
        meta.className = "muted";
        meta.textContent = owned ? (equipped ? "Odada" : "Satın alındı") : `${item.price} coin`;
        copy.append(title, meta);

        const button = document.createElement("button");
        button.className = owned ? "secondary-button" : "primary-button";
        button.type = "button";
        button.textContent = owned ? (equipped ? "Kaldır" : "Yerleştir") : "Satın al";
        button.addEventListener("click", () => owned ? toggleEquip(item.id) : buy(item));

        card.append(preview, copy, button);
        grid.append(card);
      });
  }

  function buy(item) {
    const state = Berna.Storage.getState();
    if (state.wallet.coins < item.price) {
      Berna.UI.toast("Yeterli coin yok.");
      return;
    }

    Berna.Storage.update((next) => {
      next.wallet.coins -= item.price;
      next.room.owned.push(item.id);
      next.room.equipped.push(item.id);
    });
    renderRoom();
    renderStore();
    Berna.UI.toast(`${item.name} odaya eklendi.`);
  }

  function toggleEquip(id) {
    Berna.Storage.update((state) => {
      if (state.room.equipped.includes(id)) {
        state.room.equipped = state.room.equipped.filter((item) => item !== id);
      } else {
        state.room.equipped.push(id);
      }
    });
    renderRoom();
    renderStore();
  }

  function init() {
    document.getElementById("open-store-button").addEventListener("click", () => {
      renderStore();
      Berna.UI.openDialog("store-modal");
    });
    document.addEventListener("berna:state-changed", renderRoom);
    renderRoom();
  }

  return { init, renderRoom, renderStore };
})();
