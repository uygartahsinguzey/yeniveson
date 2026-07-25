window.Berna = window.Berna || {};

Berna.Today = (() => {
  const refs = {};

  function todaySessions() {
    const key = Berna.Utils.localDateKey();
    return Berna.Storage.getState().sessions.filter((session) => session.dateKey === key);
  }

  function renderGreeting() {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
    const name = Berna.Storage.getState().profile.name.trim();
    refs.title.textContent = name ? `${greeting}, ${name}` : greeting;
    refs.date.textContent = new Intl.DateTimeFormat("tr-TR", {
      weekday: "long", day: "numeric", month: "long"
    }).format(now);
  }

  function renderGoal() {
    const state = Berna.Storage.getState();
    const completed = todaySessions().reduce((sum, item) => sum + item.minutes, 0);
    const target = state.today.goalMinutes;
    refs.goalDone.textContent = completed;
    refs.goalTarget.textContent = target;
    refs.goalBar.style.width = `${Berna.Utils.clamp((completed / target) * 100, 0, 100)}%`;
  }

  function renderExam() {
    const exam = Berna.Storage.getState().today.exam;
    if (!exam.name || !exam.date) {
      refs.examName.textContent = "Sınav eklenmedi";
      refs.examCountdown.textContent = "Hazır olduğunda ekleyebilirsin.";
      return;
    }

    const diff = Berna.Utils.dayDiff(exam.date);
    refs.examName.textContent = exam.name;
    refs.examCountdown.textContent =
      diff < 0 ? "Sınav tarihi geçti." :
      diff === 0 ? "Bugün." :
      diff === 1 ? "Yarın." :
      `${diff} gün kaldı.`;
  }

  function renderTasks() {
    const tasks = Berna.Storage.getState().today.tasks;
    refs.taskList.innerHTML = "";
    refs.taskEmpty.hidden = tasks.length > 0;

    tasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = `task-item${task.done ? " is-done" : ""}`;

      const check = document.createElement("button");
      check.className = "task-check";
      check.type = "button";
      check.setAttribute("aria-label", task.done ? "Tamamlanmadı olarak işaretle" : "Tamamlandı olarak işaretle");
      check.innerHTML = '<svg aria-hidden="true"><use href="#icon-check"></use></svg>';
      check.addEventListener("click", () => toggleTask(task.id));

      const name = document.createElement("span");
      name.className = "task-name";
      name.textContent = task.name;

      const remove = document.createElement("button");
      remove.className = "icon-button subtle";
      remove.type = "button";
      remove.setAttribute("aria-label", "Görevi sil");
      remove.innerHTML = '<svg aria-hidden="true"><use href="#icon-trash"></use></svg>';
      remove.addEventListener("click", () => removeTask(task.id));

      li.append(check, name, remove);
      refs.taskList.append(li);
    });
  }

  function toggleTask(id) {
    Berna.Storage.update((state) => {
      const task = state.today.tasks.find((item) => item.id === id);
      if (task) task.done = !task.done;
    });
    renderTasks();
  }

  function removeTask(id) {
    Berna.Storage.update((state) => {
      state.today.tasks = state.today.tasks.filter((item) => item.id !== id);
    });
    renderTasks();
  }

  function render() {
    renderGreeting();
    renderGoal();
    renderExam();
    renderTasks();
  }

  function rollTodayTasks() {
    const key = Berna.Utils.localDateKey();
    const state = Berna.Storage.getState();
    if (state.today.taskDate === key) return;
    Berna.Storage.update((next) => {
      next.today.taskDate = key;
      next.today.tasks = [];
    });
  }

  function init() {
    rollTodayTasks();
    refs.title = document.getElementById("today-title");
    refs.date = document.getElementById("today-date");
    refs.goalDone = document.getElementById("goal-progress-minutes");
    refs.goalTarget = document.getElementById("goal-target-minutes");
    refs.goalBar = document.getElementById("goal-progress-bar");
    refs.examName = document.getElementById("exam-name");
    refs.examCountdown = document.getElementById("exam-countdown");
    refs.taskList = document.getElementById("task-list");
    refs.taskEmpty = document.getElementById("task-empty");

    document.getElementById("edit-goal-button").addEventListener("click", () => {
      document.getElementById("goal-input").value = Berna.Storage.getState().today.goalMinutes;
      Berna.UI.openDialog("goal-modal");
    });

    document.getElementById("goal-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const minutes = Number(document.getElementById("goal-input").value);
      if (!Number.isFinite(minutes)) return;
      Berna.Storage.update((state) => { state.today.goalMinutes = Berna.Utils.clamp(minutes, 10, 720); });
      Berna.UI.closeDialog("goal-modal");
      renderGoal();
    });

    document.getElementById("edit-exam-button").addEventListener("click", () => {
      const exam = Berna.Storage.getState().today.exam;
      document.getElementById("exam-name-input").value = exam.name;
      document.getElementById("exam-date-input").value = exam.date;
      Berna.UI.openDialog("exam-modal");
    });

    document.getElementById("exam-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const name = document.getElementById("exam-name-input").value.trim();
      const date = document.getElementById("exam-date-input").value;
      if (!name || !date) return;
      Berna.Storage.update((state) => { state.today.exam = { name, date }; });
      Berna.UI.closeDialog("exam-modal");
      renderExam();
    });

    document.getElementById("add-task-button").addEventListener("click", () => {
      document.getElementById("task-input").value = "";
      Berna.UI.openDialog("task-modal");
    });

    document.getElementById("task-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.getElementById("task-input");
      const name = input.value.trim();
      if (!name) return;
      Berna.Storage.update((state) => {
        state.today.tasks.push({ id: Berna.Utils.uid("task"), name, done: false });
      });
      Berna.UI.closeDialog("task-modal");
      renderTasks();
    });

    document.getElementById("quick-focus-button").addEventListener("click", () => {
      Berna.Router.go("focus");
      Berna.Pomodoro.prepare(25);
      if (!Berna.Subjects.getSubjects().length) {
        Berna.UI.openDialog("subjects-modal");
        Berna.UI.toast("Önce bir ders oluştur.");
      }
    });

    document.addEventListener("berna:state-changed", render);
    render();
  }

  return { init, render, todaySessions };
})();
