window.Berna = window.Berna || {};

Berna.Subjects = (() => {
  const refs = {};

  function getSubjects() {
    return Berna.Storage.getState().subjects;
  }

  function render() {
    const subjects = getSubjects();
    refs.select.innerHTML = "";

    if (!subjects.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Önce ders oluştur";
      refs.select.append(option);
    } else {
      subjects.forEach((subject) => {
        const option = document.createElement("option");
        option.value = subject.id;
        option.textContent = subject.name;
        refs.select.append(option);
      });
    }

    refs.list.innerHTML = "";
    refs.empty.hidden = subjects.length > 0;

    subjects.forEach((subject) => {
      const li = document.createElement("li");
      li.className = "manage-item";

      const name = document.createElement("span");
      name.textContent = subject.name;

      const actions = document.createElement("div");
      actions.className = "manage-item-actions";

      const edit = document.createElement("button");
      edit.className = "icon-button subtle";
      edit.type = "button";
      edit.setAttribute("aria-label", "Dersi düzenle");
      edit.innerHTML = '<svg aria-hidden="true"><use href="#icon-edit"></use></svg>';
      edit.addEventListener("click", () => rename(subject.id));

      const remove = document.createElement("button");
      remove.className = "icon-button subtle";
      remove.type = "button";
      remove.setAttribute("aria-label", "Dersi sil");
      remove.innerHTML = '<svg aria-hidden="true"><use href="#icon-trash"></use></svg>';
      remove.addEventListener("click", () => deleteSubject(subject.id));

      actions.append(edit, remove);
      li.append(name, actions);
      refs.list.append(li);
    });

    const noSubjects = subjects.length === 0;
    document.getElementById("timer-start-button").disabled = noSubjects;
  }

  function add(name) {
    const clean = name.trim();
    if (!clean) return;

    Berna.Storage.update((state) => {
      state.subjects.push({ id: Berna.Utils.uid("subject"), name: clean });
    });
    render();
  }

  function rename(id) {
    const subject = getSubjects().find((item) => item.id === id);
    if (!subject) return;
    const next = window.prompt("Ders adı", subject.name);
    if (!next?.trim()) return;

    Berna.Storage.update((state) => {
      const target = state.subjects.find((item) => item.id === id);
      if (target) target.name = next.trim();
    });
    render();
  }

  function deleteSubject(id) {
    const hasSessions = Berna.Storage.getState().sessions.some((session) => session.subjectId === id);
    const message = hasSessions
      ? "Bu dersin geçmiş çalışma kayıtları korunacak. Dersi silmek istiyor musun?"
      : "Bu dersi silmek istiyor musun?";
    if (!window.confirm(message)) return;

    Berna.Storage.update((state) => {
      state.subjects = state.subjects.filter((item) => item.id !== id);
    });
    render();
  }

  function init() {
    refs.select = document.getElementById("subject-select");
    refs.list = document.getElementById("subjects-list");
    refs.empty = document.getElementById("subjects-empty");
    refs.form = document.getElementById("subject-form");
    refs.input = document.getElementById("subject-name-input");

    document.getElementById("manage-subjects-button").addEventListener("click", () => {
      render();
      Berna.UI.openDialog("subjects-modal");
      window.setTimeout(() => refs.input.focus(), 80);
    });

    refs.form.addEventListener("submit", (event) => {
      event.preventDefault();
      add(refs.input.value);
      refs.input.value = "";
      refs.input.focus();
    });

    render();
  }

  return { init, render, getSubjects, add };
})();
