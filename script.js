// ---------- Page navigation ----------
const pages = {
  intro: document.getElementById("introPage"),
  home: document.getElementById("homePage"),
  result: document.getElementById("resultPage"),
};
function showPage(name) {
  Object.values(pages).forEach(p => p.classList.remove("active"));
  pages[name].classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const form = document.getElementById("studentForm");
const errorMsg = document.getElementById("errorMsg");

document.getElementById("startBtn").addEventListener("click", () => showPage("home"));
document.getElementById("backBtn").addEventListener("click", () => showPage("intro"));
document.getElementById("againBtn").addEventListener("click", () => { form.reset(); showPage("home"); });

// ---------- Prediction model (rule-based estimator) ----------
function predictMarks(d) {
  let score = 10.5;
  const factors = [];
  const add = (value, text) => {
    score += value;
    if (Math.abs(value) >= 0.25) factors.push({ text, value });
  };

  // Past failures
  if (d.failures === 0) add(0.6, "No past failures");
  else add(-1.8 * d.failures, `${d.failures} past failure(s)`);

  // Study time
  add(0.7 * (d.studytime - 2), d.studytime >= 3 ? "Good weekly study time" : "Low weekly study time");

  // Higher education
  add(d.higher === "yes" ? 1.2 : -2.2,
      d.higher === "yes" ? "Wants higher education" : "Does not plan higher education");

  // Absences
  add(-Math.min(d.absences * 0.07, 2), "High number of absences");

  // Parents' education
  add(0.3 * (d.Medu - 2), d.Medu >= 3 ? "Mother's higher education" : "Mother's lower education level");
  add(0.2 * (d.Fedu - 2), d.Fedu >= 3 ? "Father's higher education" : "Father's lower education level");

  // Social life & alcohol
  add(-0.4 * (d.goout - 3), d.goout >= 4 ? "Goes out a lot" : "Balanced social life");
  add(-0.5 * (d.Dalc - 1), "Workday alcohol consumption");
  add(-0.1 * (d.freetime - 3), "Lots of free time");

  // Support & environment
  add(d.schoolsup === "yes" ? -0.5 : 0.1, "Needs extra school support");
  add(d.famsup === "yes" ? 0.2 : -0.1, "Family educational support");
  add(d.internet === "yes" ? 0.4 : -0.5,
      d.internet === "yes" ? "Internet access" : "No internet access");

  // Personal
  add(-0.4 * Math.max(0, d.age - 17), "Older than typical for the year");
  add(0.2 * (d.famrel - 3), d.famrel >= 4 ? "Good family relationships" : "Weak family relationships");
  add(0.08 * (d.health - 3), "General health");

  // Blend in previous grades (very predictive)
  const prior = 0.3 * d.G1 + 0.7 * d.G2;
  const before = score;
  score = 0.2 * score + 0.8 * prior;
  factors.push({ text: `Previous grades (G1 ${d.G1}, G2 ${d.G2})`, value: prior - before });

  score = Math.max(0, Math.min(20, score));
  return { score: Math.round(score * 10) / 10, factors };
}

function gradeInfo(s) {
  if (s >= 16) return { label: "Excellent 🌟", msg: "Outstanding performance expected.", color: "#16a34a" };
  if (s >= 14) return { label: "Very Good 👏", msg: "Strong results expected.", color: "#22a06b" };
  if (s >= 12) return { label: "Good 🙂", msg: "Solid, above-average performance.", color: "#4f46e5" };
  if (s >= 10) return { label: "Pass ✅", msg: "Likely to pass, with room to improve.", color: "#f59e0b" };
  return { label: "At Risk ⚠️", msg: "May struggle. Extra support is recommended.", color: "#dc2626" };
}

// ---------- Form handling ----------
form.addEventListener("submit", e => {
  e.preventDefault();
  errorMsg.textContent = "";

  let missing = false;
  form.querySelectorAll("[required]").forEach(el => {
    const empty = el.value.trim() === "";
    el.classList.toggle("invalid", empty);
    if (empty) missing = true;
  });
  if (missing) {
    errorMsg.textContent = "Fill in all fields highlighted in red.";
    return;
  }

  const raw = Object.fromEntries(new FormData(form).entries());
  const numeric = ["age", "studytime", "failures", "Medu", "Fedu", "famrel",
                   "freetime", "goout", "Dalc", "health", "absences", "G1", "G2"];
  const data = { ...raw };
  numeric.forEach(k => (data[k] = Number(raw[k])));

  if (data.G1 < 0 || data.G1 > 20 || data.G2 < 0 || data.G2 > 20) {
    errorMsg.textContent = "G1 and G2 must be between 0 and 20.";
    return;
  }
  showResult(predictMarks(data));
});
form.addEventListener("input", e => e.target.classList.remove("invalid"));

// ---------- Result display ----------
function showResult({ score, factors }) {
  const info = gradeInfo(score);
  document.getElementById("gradeLabel").textContent = info.label;
  document.getElementById("gradeMsg").textContent = info.msg;

  const good = factors.filter(f => f.value > 0).sort((a, b) => b.value - a.value).slice(0, 4);
  const bad = factors.filter(f => f.value < 0).sort((a, b) => a.value - b.value).slice(0, 4);
  fillList("goodList", good, "Nothing notable");
  fillList("badList", bad, "No major concerns");

  showPage("result");

  const bar = document.getElementById("gaugeBar");
  const circ = 326.7;
  bar.style.stroke = info.color;
  bar.style.strokeDashoffset = circ;
  setTimeout(() => { bar.style.strokeDashoffset = circ * (1 - score / 20); }, 100);

  const num = document.getElementById("scoreNum");
  let cur = 0;
  const step = score / 40 || 1;
  const timer = setInterval(() => {
    cur += step;
    if (cur >= score) { cur = score; clearInterval(timer); }
    num.textContent = cur.toFixed(1);
  }, 25);
}

function fillList(id, items, emptyText) {
  const ul = document.getElementById(id);
  ul.innerHTML = "";
  if (!items.length) { ul.innerHTML = `<li>${emptyText}</li>`; return; }
  items.forEach(f => {
    const li = document.createElement("li");
    li.textContent = f.text;
    ul.appendChild(li);
  });
}