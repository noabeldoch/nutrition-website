import React, {useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const DEMO_FOODS = [
  {id:'egg',name:'ביצה',unit:'גרם',kcal:143,protein:12.6,carbs:0.7,fat:9.5},
  {id:'cottage5',name:'קוטג׳ 5%',unit:'גרם',kcal:98,protein:11,carbs:3,fat:5},
  {id:'yellow-cheese',name:'גבינה צהובה 28%',unit:'גרם',kcal:356,protein:25,carbs:1.5,fat:28},
  {id:'chicken',name:'חזה עוף, מבושל',unit:'גרם',kcal:165,protein:31,carbs:0,fat:3.6},
  {id:'tofu',name:'טופו',unit:'גרם',kcal:144,protein:15.7,carbs:2.8,fat:8.7},
  {id:'rice',name:'אורז לבן, מבושל',unit:'גרם',kcal:130,protein:2.7,carbs:28.2,fat:0.3},
  {id:'zucchini',name:'קישוא',unit:'גרם',kcal:17,protein:1.2,carbs:3.1,fat:0.3},
  {id:'tomato',name:'עגבנייה',unit:'גרם',kcal:18,protein:0.9,carbs:3.9,fat:0.2},
  {id:'cucumber',name:'מלפפון',unit:'גרם',kcal:15,protein:0.7,carbs:3.6,fat:0.1},
  {id:'olive-oil',name:'שמן זית',unit:'גרם',kcal:884,protein:0,carbs:0,fat:100},
  {id:'flour',name:'קמח לבן',unit:'גרם',kcal:364,protein:10.3,carbs:76.3,fat:1},
  {id:'potato',name:'תפוח אדמה',unit:'גרם',kcal:77,protein:2,carbs:17.5,fat:0.1},
  {id:'apple',name:'תפוח',unit:'גרם',kcal:52,protein:0.3,carbs:13.8,fat:0.2},
  {id:'yogurt-protein',name:'יוגורט חלבון',unit:'גרם',kcal:70,protein:10,carbs:5,fat:0.5}
];
const initialMeals=[{id:'breakfast',name:'ארוחת בוקר'},{id:'lunch',name:'ארוחת צהריים'},{id:'dinner',name:'ארוחת ערב'},{id:'snack',name:'ארוחת ביניים'}];
const nutrientKeys=['kcal','protein','carbs','fat'];
const emptyNutrition=()=>({kcal:0,protein:0,carbs:0,fat:0});
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)) ?? fallback}catch{return fallback}}
function save(key,value){localStorage.setItem(key,JSON.stringify(value))}
function calcIngredient(food,g){const f=g/100;return {kcal:food.kcal*f,protein:food.protein*f,carbs:food.carbs*f,fat:food.fat*f}}
function calcRecipe(recipe){return recipe.ingredients.reduce((a,i)=>{const n=calcIngredient(i.food,i.grams); nutrientKeys.forEach(k=>a[k]+=n[k]); return a},emptyNutrition())}
function round(n){return Math.round(n*10)/10}

function App(){
 const [tab,setTab]=useState('היום');
 const [foods]=useState(DEMO_FOODS);
 const [recipes,setRecipes]=useState(()=>read('recipes',[]));
 const [diary,setDiary]=useState(()=>read('diary',{}));
 const [weight,setWeight]=useState(()=>read('weight',''));
 const [showRecipe,setShowRecipe]=useState(false);
 const [showFood,setShowFood]=useState(false);
 const [toast,setToast]=useState('');
 const [photo,setPhoto]=useState(null);
 const today=new Date().toISOString().slice(0,10);
 const todayEntries=diary[today]||[];
 const totals=useMemo(()=>todayEntries.reduce((a,e)=>{nutrientKeys.forEach(k=>a[k]+=e[k]||0);return a},emptyNutrition()),[todayEntries]);
 function notify(t){setToast(t);setTimeout(()=>setToast(''),2200)}
 function addDiary(entry){const next={...diary,[today]:[...(diary[today]||[]),entry]};setDiary(next);save('diary',next);notify('נוסף ליומן ✓')}
 function saveWeight(){if(!weight)return;save('weight',weight);notify('המשקל נשמר')}
 function addPhoto(e){const f=e.target.files?.[0];if(!f)return;setPhoto(URL.createObjectURL(f));notify('התמונה נוספה — ניתוח AI יתווסף בהמשך')}
 return <div className="app">
  <header><div><div className="eyebrow">הַתְּזוֹנָאִית שֶׁלִּי</div><h1>{tab==='היום'?'ערב טוב, נועה':tab}</h1></div><div className="avatar">נ</div></header>
  {tab==='היום'&&<Today totals={totals} entries={todayEntries} recipes={recipes} onAdd={()=>setShowFood(true)} onRecipe={()=>setShowRecipe(true)} weight={weight} setWeight={setWeight} saveWeight={saveWeight} photo={photo} addPhoto={addPhoto}/>} 
  {tab==='מתכונים'&&<Recipes recipes={recipes} onNew={()=>setShowRecipe(true)} onLog={addDiary}/>} 
  {tab==='יומן'&&<Diary entries={todayEntries}/>} 
  {tab==='התקדמות'&&<Progress weight={weight}/>} 
  {tab==='הגדרות'&&<Settings/>}
  {showRecipe&&<RecipeModal foods={foods} onClose={()=>setShowRecipe(false)} onSave={r=>{const next=[...recipes,r];setRecipes(next);save('recipes',next);setShowRecipe(false);notify('המתכון נשמר')}}/>}
  {showFood&&<FoodModal foods={foods} recipes={recipes} onClose={()=>setShowFood(false)} onAdd={e=>{addDiary(e);setShowFood(false)}}/>}
  {toast&&<div className="toast">{toast}</div>}
  <nav>{[['היום','⌂'],['מתכונים','🍲'],['יומן','☷'],['התקדמות','↗'],['הגדרות','⚙']].map(([x,icon])=><button className={tab===x?'active':''} onClick={()=>setTab(x)} key={x}><span>{icon}</span><small>{x}</small></button>)}</nav>
 </div>
}

function Today({totals,entries,recipes,onAdd,onRecipe,weight,setWeight,saveWeight,photo,addPhoto}){return <main>
 <section className="hero"><div><span className="muted">היום</span><div className="big-number">{round(totals.kcal)}<small> קל׳</small></div><div className="muted">חלבון {round(totals.protein)} גרם</div></div><div className="ring"><span>{Math.min(100,Math.round(totals.kcal/1800*100))}%</span></div></section>
 <div className="section-title"><h2>מה אכלתי היום?</h2><span>{entries.length} פריטים</span></div>
 <section className="card meal-list">{entries.length===0?<div className="empty">עדיין לא הוספת אוכל להיום.</div>:entries.map((e,i)=><div className="entry" key={i}><div className="meal-icon">🍽️</div><div className="meal-copy"><strong>{e.name}</strong><span>{e.grams} גרם</span></div><div className="meal-right">{round(e.kcal)} קל׳</div></div>)}</section>
 <div className="quick-grid"><button className="quick" onClick={onAdd}><span className="quick-icon">＋</span><strong>הוספת מזון</strong><span>חיפוש במאגר והוספה לפי גרמים</span></button><button className="quick" onClick={onRecipe}><span className="quick-icon">🍲</span><strong>מתכון חדש</strong><span>צרי מתכון וחישוב אוטומטי למנה</span></button></div>
 <section className="quick-grid lower"><label className="quick"><span className="quick-icon">📷</span><strong>צילום אוכל</strong><span>ניתוח AI בהמשך</span><input type="file" accept="image/*" capture="environment" onChange={addPhoto}/></label><form className="quick" onSubmit={e=>{e.preventDefault();saveWeight()}}><span className="quick-icon">⚖️</span><strong>משקל</strong><div className="weight-row"><input inputMode="decimal" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="ק״ג"/><button>שמור</button></div></form></section>
 {photo&&<div className="card photo-card"><img src={photo}/><div><strong>התמונה מוכנה</strong><p>בגרסה הבאה נוכל לשלוח אותה לניתוח AI.</p></div></div>}
 </main>}

function Recipes({recipes,onNew,onLog}){return <main><div className="intro"><span className="muted">המתכונים שלי</span><h2>המתכונים שלי</h2><p>שמרי מתכון פעם אחת, ואז הוסיפי ליומן כל כמות שתרצי.</p></div><button className="primary full" onClick={onNew}>＋ יצירת מתכון חדש</button><div className="stack">{recipes.length===0?<div className="empty card">עדיין אין מתכונים. צרי את הראשון.</div>:recipes.map(r=>{const n=calcRecipe(r);const per=r.finalWeight?Object.fromEntries(nutrientKeys.map(k=>[k,n[k]/r.finalWeight*100])):n;return <div className="recipe-card card" key={r.id}><div><strong>{r.name}</strong><p>{r.ingredients.length} מרכיבים · משקל סופי {r.finalWeight} גרם</p></div><div className="nutrition-mini"><b>{round(per.kcal)} קל׳</b><span>{round(per.protein)}g חלבון ל־100g</span></div><button className="secondary" onClick={()=>onLog({name:r.name,grams:100,kcal:per.kcal,protein:per.protein,carbs:per.carbs,fat:per.fat})}>＋ 100 גרם ליומן</button></div>})}</div></main>}
function Diary({entries}){return <main><div className="intro"><span className="muted">היומן</span><h2>מה אכלתי היום</h2></div><div className="stack">{entries.length?entries.map((e,i)=><div className="card entry" key={i}><div className="meal-icon">🍽️</div><div className="meal-copy"><strong>{e.name}</strong><span>{e.grams} גרם · {round(e.protein)} גרם חלבון</span></div><b>{round(e.kcal)} קל׳</b></div>):<div className="empty card">אין עדיין רישומים.</div>}</div></main>}
function Progress({weight}){return <main><div className="intro"><span className="muted">התקדמות</span><h2>ההתקדמות שלי</h2><p>כאן נוכל להציג בהמשך היסטוריית משקל, מגמות וניתוח AI.</p></div><div className="card progress-card"><span className="muted">משקל אחרון</span><strong>{weight?weight+' ק״ג':'—'}</strong><div className="fake-chart">{[35,48,44,63,55,72].map((h,i)=><i style={{height:h+'%'}} key={i}/>)}</div></div></main>}
function Settings(){return <main><div className="intro"><span className="muted">הגדרות</span><h2>הגדרות</h2><p>בגרסאות הבאות: יעדים, העדפות, חיבור למאגר, חשבון וגיבוי.</p></div>{['יעד קלורי','יעד חלבון','משקל יעד','התראות'].map(x=><div className="setting card" key={x}><span>{x}</span><b>›</b></div>)}</main>}

function RecipeModal({foods,onClose,onSave}){const [name,setName]=useState('');const [finalWeight,setFinalWeight]=useState('');const [ingredients,setIngredients]=useState([]);const [foodId,setFoodId]=useState(foods[0].id);const [grams,setGrams]=useState('100');const total=calcRecipe({ingredients});const per=finalWeight?Object.fromEntries(nutrientKeys.map(k=>[k,total[k]/Number(finalWeight)*100])):null;return <Modal title="מתכון חדש" onClose={onClose}><label>שם המתכון<input value={name} onChange={e=>setName(e.target.value)} placeholder="למשל: פשטידת קישואים"/></label><div className="ingredient-add"><select value={foodId} onChange={e=>setFoodId(e.target.value)}>{foods.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><input inputMode="decimal" value={grams} onChange={e=>setGrams(e.target.value)} placeholder="גרם"/><button className="secondary" onClick={()=>{const food=foods.find(f=>f.id===foodId);setIngredients([...ingredients,{food,grams:Number(grams)||0}])}}>הוסף</button></div><div className="ingredient-list">{ingredients.map((i,idx)=><div key={idx}><span>{i.food.name}</span><b>{i.grams}g</b></div>)}</div><div className="calc-box"><b>סה״כ המתכון</b><span>{round(total.kcal)} קל׳ · {round(total.protein)}g חלבון</span></div><label>משקל סופי אחרי הכנה (גרם)<input inputMode="decimal" value={finalWeight} onChange={e=>setFinalWeight(e.target.value)} placeholder="למשל 500"/></label>{per&&<div className="calc-box highlight"><b>ל־100 גרם</b><span>{round(per.kcal)} קל׳ · {round(per.protein)}g חלבון · {round(per.carbs)}g פחמימות · {round(per.fat)}g שומן</span></div>}<button className="primary full" disabled={!name||!ingredients.length||!Number(finalWeight)} onClick={()=>onSave({id:crypto.randomUUID(),name,finalWeight:Number(finalWeight),ingredients})}>שמור מתכון</button></Modal>}
function FoodModal({foods,recipes,onClose,onAdd}){const [q,setQ]=useState('');const [selected,setSelected]=useState(null);const [grams,setGrams]=useState('100');const results=foods.filter(f=>f.name.includes(q));return <Modal title="הוספת מזון" onClose={onClose}>{!selected?<><input className="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="חפשי מזון בעברית..."/><div className="food-results">{results.map(f=><button key={f.id} onClick={()=>setSelected(f)}><span><strong>{f.name}</strong><small>{f.kcal} קל׳ · {f.protein}g חלבון ל־100g</small></span><b>›</b></button>)}</div>{recipes.length>0&&<><h3>המתכונים שלי</h3>{recipes.map(r=>{const n=calcRecipe(r);const p=n.kcal/r.finalWeight*100;return <button className="recipe-result" key={r.id} onClick={()=>setSelected({recipe:r,custom:true,kcal:p,protein:n.protein/r.finalWeight*100,carbs:n.carbs/r.finalWeight*100,fat:n.fat/r.finalWeight*100})}><strong>🍲 {r.name}</strong><small>{round(p)} קל׳ ל־100g</small></button>})}</>}</>:<div className="selected-food"><h3>{selected.custom?'🍲 ':''}{selected.custom?selected.recipe.name:selected.name}</h3><label>כמה אכלת? (גרם)<input inputMode="decimal" value={grams} onChange={e=>setGrams(e.target.value)}/></label><div className="calc-box"><b>{round(selected.kcal*Number(grams)/100)} קל׳</b><span>{round(selected.protein*Number(grams)/100)}g חלבון · {round(selected.carbs*Number(grams)/100)}g פחמימות · {round(selected.fat*Number(grams)/100)}g שומן</span></div><button className="primary full" onClick={()=>onAdd({name:selected.custom?selected.recipe.name:selected.name,grams:Number(grams),kcal:selected.kcal*Number(grams)/100,protein:selected.protein*Number(grams)/100,carbs:selected.carbs*Number(grams)/100,fat:selected.fat*Number(grams)/100})}>הוספה ליומן</button></div>}</Modal>}
function Modal({title,onClose,children}){return <div className="overlay"><div className="modal"><div className="modal-head"><h2>{title}</h2><button onClick={onClose}>×</button></div>{children}</div></div>}
createRoot(document.getElementById('root')).render(<App/>);
