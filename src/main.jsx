import React, {useEffect, useState} from "react";
import {createRoot} from "react-dom/client";
import "./styles.css";

const initialMeals = [
  {id: 1, name: "Breakfast", detail: "Not logged", calories: 0, protein: 0},
  {id: 2, name: "Lunch", detail: "Not logged", calories: 0, protein: 0},
  {id: 3, name: "Dinner", detail: "Not logged", calories: 0, protein: 0},
  {id: 4, name: "Snack", detail: "Optional", calories: 0, protein: 0},
];

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function App() {
  const [tab, setTab] = useState("Today");
  const [weight, setWeight] = useState(() => load("weight", ""));
  const [meals, setMeals] = useState(() => load("meals", initialMeals));
  const [photo, setPhoto] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => localStorage.setItem("weight", JSON.stringify(weight)), [weight]);
  useEffect(() => localStorage.setItem("meals", JSON.stringify(meals)), [meals]);

  const calories = meals.reduce((s,m)=>s+m.calories,0);
  const protein = meals.reduce((s,m)=>s+m.protein,0);

  function saveWeight(e) {
    e.preventDefault();
    if (!weight) return;
    setMessage(`Weight saved: ${weight} kg`);
    setTimeout(()=>setMessage(""), 2200);
  }

  function addPhoto(e) {
    const file=e.target.files?.[0];
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
    setMessage("Photo added. AI analysis can be connected next.");
    setTimeout(()=>setMessage(""), 2500);
  }

  function logMeal(id) {
    const name = prompt("What did you eat?");
    if (!name) return;
    const kcal = Number(prompt("Estimated calories (optional)", "400")) || 0;
    const prot = Number(prompt("Protein in grams (optional)", "25")) || 0;
    setMeals(ms=>ms.map(m=>m.id===id ? {...m, detail:name, calories:kcal, protein:prot} : m));
  }

  return <div className="app">
    <header>
      <div>
        <div className="eyebrow">NUTRITION COACH</div>
        <h1>{tab === "Today" ? "Good evening, Noa" : tab}</h1>
      </div>
      <div className="avatar">N</div>
    </header>

    <main>
      {tab==="Today" && <>
        <section className="hero">
          <div>
            <span className="muted">Today's overview</span>
            <div className="big-number">{calories}<small> kcal</small></div>
            <div className="muted">Protein {protein} g</div>
          </div>
          <div className="ring"><span>{Math.min(100, Math.round(calories/1800*100))}%</span></div>
        </section>

        <div className="section-title"><h2>Today's meals</h2><span>Tap to log</span></div>
        <section className="card meal-list">
          {meals.map(m=><button className="meal" key={m.id} onClick={()=>logMeal(m.id)}>
            <div className="meal-icon">{m.id===4 ? "＋" : ["☀","◷","☾"][m.id-1]}</div>
            <div className="meal-copy"><strong>{m.name}</strong><span>{m.detail}</span></div>
            <div className="meal-right">{m.calories ? `${m.calories} kcal` : "Add"} <b>›</b></div>
          </button>)}
        </section>

        <div className="section-title"><h2>Quick log</h2></div>
        <section className="quick-grid">
          <label className="quick">
            <span className="quick-icon">📷</span>
            <strong>Food photo</strong>
            <span>Analyze later with AI</span>
            <input type="file" accept="image/*" capture="environment" onChange={addPhoto}/>
          </label>
          <form className="quick weight" onSubmit={saveWeight}>
            <span className="quick-icon">⚖️</span>
            <strong>Weight</strong>
            <div><input inputMode="decimal" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="kg"/><button>Save</button></div>
          </form>
        </section>

        {photo && <section className="card photo-card"><img src={photo} alt="Food preview"/><div><strong>Photo ready</strong><p>AI food recognition is the next integration.</p></div></section>}
      </>}

      {tab==="Meal Plan" && <section className="stack">
        <div className="intro"><span className="muted">YOUR PLAN</span><h2>Dietitian meal plan</h2><p>Add your PDF plan here later and turn it into searchable meals and portions.</p></div>
        {["Breakfast","Lunch","Dinner","Snacks"].map((x,i)=><div className="plan-row card" key={x}><div className="meal-icon">{["☀","◷","☾","＋"][i]}</div><div><strong>{x}</strong><p>{i===0?"Choose one breakfast option":"Add your options from the plan"}</p></div><b>›</b></div>)}
      </section>}

      {tab==="Log" && <section className="stack">
        <div className="intro"><span className="muted">LOG</span><h2>Track your day</h2><p>Use the quick actions on Today, or add meals here.</p></div>
        <button className="primary" onClick={()=>setTab("Today")}>＋ Add a meal</button>
        <label className="upload card"><strong>📷 Take a food photo</strong><span>Choose a photo from your iPhone camera or library</span><input type="file" accept="image/*" capture="environment" onChange={addPhoto}/></label>
      </section>}

      {tab==="Progress" && <section className="stack">
        <div className="intro"><span className="muted">PROGRESS</span><h2>Your progress</h2><p>Weight history and trends will appear here as you log more entries.</p></div>
        <div className="card progress-card"><span className="muted">CURRENT WEIGHT</span><strong>{weight ? `${weight} kg` : "—"}</strong><div className="fake-chart"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
      </section>}

      {tab==="Settings" && <section className="stack">
        <div className="intro"><span className="muted">SETTINGS</span><h2>Your preferences</h2></div>
        {["Daily calorie target","Protein target","Weight goal","Notifications"].map(x=><div className="setting card" key={x}><span>{x}</span><b>›</b></div>)}
      </section>}
    </main>

    {message && <div className="toast">{message}</div>}

    <nav>
      {["Today","Meal Plan","Log","Progress","Settings"].map(x=><button key={x} className={tab===x?"active":""} onClick={()=>setTab(x)}>
        <span>{({Today:"⌂","Meal Plan":"☷",Log:"＋",Progress:"↗",Settings:"⚙"}[x])}</span><small>{x}</small>
      </button>)}
    </nav>
  </div>
}

createRoot(document.getElementById("root")).render(<App />);
