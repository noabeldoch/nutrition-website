import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase, supabaseConfigured } from './lib/supabase';
import './styles.css';

const DEMO_FOODS = [
  { id:'demo-egg', name:'ביצה', unit:'גרם', kcal:143, protein:12.6, carbs:0.7, fat:9.5 },
  { id:'demo-cottage5', name:'קוטג׳ 5%', unit:'גרם', kcal:98, protein:11, carbs:3, fat:5 },
  { id:'demo-yellow-cheese', name:'גבינה צהובה 28%', unit:'גרם', kcal:356, protein:25, carbs:1.5, fat:28 },
  { id:'demo-chicken', name:'חזה עוף, מבושל', unit:'גרם', kcal:165, protein:31, carbs:0, fat:3.6 },
  { id:'demo-tofu', name:'טופו', unit:'גרם', kcal:144, protein:15.7, carbs:2.8, fat:8.7 },
  { id:'demo-rice', name:'אורז לבן, מבושל', unit:'גרם', kcal:130, protein:2.7, carbs:28.2, fat:0.3 },
  { id:'demo-zucchini', name:'קישוא', unit:'גרם', kcal:17, protein:1.2, carbs:3.1, fat:0.3 },
  { id:'demo-tomato', name:'עגבנייה', unit:'גרם', kcal:18, protein:0.9, carbs:3.9, fat:0.2 },
  { id:'demo-cucumber', name:'מלפפון', unit:'גרם', kcal:15, protein:0.7, carbs:3.6, fat:0.1 },
  { id:'demo-olive-oil', name:'שמן זית', unit:'גרם', kcal:884, protein:0, carbs:0, fat:100 },
  { id:'demo-flour', name:'קמח לבן', unit:'גרם', kcal:364, protein:10.3, carbs:76.3, fat:1 },
  { id:'demo-potato', name:'תפוח אדמה', unit:'גרם', kcal:77, protein:2, carbs:17.5, fat:0.1 },
  { id:'demo-apple', name:'תפוח', unit:'גרם', kcal:52, protein:0.3, carbs:13.8, fat:0.2 },
  { id:'demo-yogurt-protein', name:'יוגורט חלבון', unit:'גרם', kcal:70, protein:10, carbs:5, fat:0.5 }
];
const nutrientKeys=['kcal','protein','carbs','fat'];
const emptyNutrition=()=>({kcal:0,protein:0,carbs:0,fat:0});
const round=n=>Math.round((Number(n)||0)*10)/10;
const todayKey=()=>new Date().toISOString().slice(0,10);
const calcIngredient=(food,g)=>{const f=Number(g)/100;return {kcal:food.kcal*f,protein:food.protein*f,carbs:food.carbs*f,fat:food.fat*f}};
const calcRecipe=recipe=>recipe.ingredients.reduce((a,i)=>{const n=calcIngredient(i.food,i.grams);nutrientKeys.forEach(k=>a[k]+=n[k]);return a},emptyNutrition());

function offProductToFood(p){
  const n=p.nutriments||{};
  const kcal=Number(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0);
  const protein=Number(n.proteins_100g ?? 0);
  const carbs=Number(n.carbohydrates_100g ?? 0);
  const fat=Number(n.fat_100g ?? 0);
  if(!p.code || !p.product_name || ![kcal,protein,carbs,fat].some(Number.isFinite)) return null;
  return {
    id:null, source:'openfoodfacts', source_id:String(p.code),
    name:(p.product_name_he || p.product_name || '').trim(),
    name_en:p.product_name || null,
    brands:p.brands || '',
    kcal, protein, carbs, fat,
    fiber:Number(n.fiber_100g ?? 0),
    sugar:Number(n.sugars_100g ?? 0),
    raw_data:p
  };
}

async function searchFoodApi(q){
  // Search-a-licious is Open Food Facts' current full-text search service.
  const response=await fetch('/api/search-food',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({q})
  });
  if(!response.ok) throw new Error('Food API returned '+response.status);
  const data=await response.json();
  const hits=data.hits || data.products || [];
  return hits.map(hit=>offProductToFood(hit._source || hit)).filter(Boolean);
}

async function ensureFoodRow(food){
  if(!supabase || !food) return null;
  const payload={
    source:food.source||'openfoodfacts',
    source_id:food.source_id||null,
    name_he:food.name,
    name_en:food.name_en||null,
    kcal_per_100g:food.kcal,
    protein_per_100g:food.protein,
    carbs_per_100g:food.carbs,
    fat_per_100g:food.fat,
    fiber_per_100g:food.fiber??null,
    sugar_per_100g:food.sugar??null,
    raw_data:food.raw_data||null,
    updated_at:new Date().toISOString()
  };
  const {data,error}=await supabase.from('foods').upsert(payload,{onConflict:'source,source_id'}).select('id').single();
  if(error) throw error;
  return data.id;
}

async function getSession(){
  if(!supabaseConfigured || !supabase) return null;
  const {data:{session}}=await supabase.auth.getSession();
  if(session) return session;
  const {data,error}=await supabase.auth.signInAnonymously();
  if(error) throw error;
  return data.session;
}

function App(){
  const [tab,setTab]=useState('היום');
  const [user,setUser]=useState(null);
  const [foods,setFoods]=useState(DEMO_FOODS);
  const [recipes,setRecipes]=useState([]);
  const [diary,setDiary]=useState([]);
  const [weight,setWeight]=useState('');
  const [weightHistory,setWeightHistory]=useState([]);
  const [showRecipe,setShowRecipe]=useState(false);
  const [showFood,setShowFood]=useState(false);
  const [toast,setToast]=useState('');
  const [photo,setPhoto]=useState(null);
  const [loading,setLoading]=useState(true);
  const [dbError,setDbError]=useState('');
  const today=todayKey();

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      try{
        const session=await getSession();
        if(!mounted)return;
        setUser(session?.user||null);
        if(session?.user && supabase){
          const [foodsRes,recipesRes,diaryRes,weightRes]=await Promise.all([
            supabase.from('foods').select('*').order('name_he').limit(200),
            supabase.from('recipes').select('id,name,final_weight_g,recipe_ingredients(id,quantity_g,food_id,foods(*))').order('created_at',{ascending:false}),
            supabase.from('diary_entries').select('id,eaten_at,quantity_g,calories,protein_g,carbs_g,fat_g,food_id,recipe_id,foods(name_he)').gte('eaten_at',today+'T00:00:00').order('eaten_at',{ascending:false}),
            supabase.from('weight_entries').select('id,measured_at,weight_kg').order('measured_at',{ascending:false}).limit(100)
          ]);
          for(const r of [foodsRes,recipesRes,diaryRes,weightRes]) if(r.error) throw r.error;
          if(foodsRes.data?.length){
            setFoods(foodsRes.data.map(f=>({id:f.id,name:f.name_he,name_en:f.name_en,kcal:Number(f.kcal_per_100g),protein:Number(f.protein_per_100g),carbs:Number(f.carbs_per_100g),fat:Number(f.fat_per_100g)})));
          }
          setRecipes((recipesRes.data||[]).map(r=>({
            id:r.id,name:r.name,finalWeight:Number(r.final_weight_g),
            ingredients:(r.recipe_ingredients||[]).map(i=>({id:i.id,grams:Number(i.quantity_g),food:i.foods?{id:i.foods.id,name:i.foods.name_he,kcal:Number(i.foods.kcal_per_100g),protein:Number(i.foods.protein_per_100g),carbs:Number(i.foods.carbs_per_100g),fat:Number(i.foods.fat_per_100g)}:null})).filter(i=>i.food)
          })));
          setDiary(diaryRes.data||[]);
          setWeightHistory(weightRes.data||[]);
          setWeight(weightRes.data?.[0]?.weight_kg?.toString()||'');
        }
      }catch(e){
        console.error(e);
        if(mounted)setDbError(supabaseConfigured?'לא הצלחתי להתחבר למסד הנתונים. בדקי את הגדרות Supabase.':'החיבור ל-Supabase עדיין לא הוגדר.');
      }finally{if(mounted)setLoading(false)}
    })();
    return()=>{mounted=false};
  },[]);

  function notify(t){setToast(t);setTimeout(()=>setToast(''),2500)}

  async function addDiary(entry){
    try{
      if(supabase && user){
        const foodId=entry.foodId || await ensureFoodRow(entry.food);
        const {data,error}=await supabase.from('diary_entries').insert({
          user_id:user.id,eaten_at:new Date().toISOString(),food_id:foodId,recipe_id:entry.recipeId||null,
          quantity_g:entry.grams,calories:entry.kcal,protein_g:entry.protein,carbs_g:entry.carbs,fat_g:entry.fat
        }).select('id,eaten_at,quantity_g,calories,protein_g,carbs_g,fat_g,food_id,recipe_id,foods(name_he)').single();
        if(error)throw error;
        setDiary(d=>[data,...d]);
      }else{
        setDiary(d=>[{id:crypto.randomUUID(),...entry,calories:entry.kcal,protein_g:entry.protein,carbs_g:entry.carbs,fat_g:entry.fat},...d]);
      }
      notify('נוסף ליומן ✓');
    }catch(e){console.error(e);notify('לא הצלחתי לשמור את המזון');}
  }

  async function saveWeight(){
    const value=Number(weight);
    if(!value)return;
    try{
      if(supabase && user){
        const {data,error}=await supabase.from('weight_entries').insert({user_id:user.id,weight_kg:value}).select().single();
        if(error)throw error;
        setWeightHistory(h=>[data,...h]);
      }else setWeightHistory(h=>[{id:crypto.randomUUID(),weight_kg:value,measured_at:new Date().toISOString()},...h]);
      notify('המשקל נשמר ✓');
    }catch(e){console.error(e);notify('לא הצלחתי לשמור את המשקל');}
  }

  async function saveRecipe(recipe){
    try{
      if(supabase && user){
        const {data,error}=await supabase.from('recipes').insert({user_id:user.id,name:recipe.name,final_weight_g:recipe.finalWeight}).select().single();
        if(error)throw error;
        const rows=[];
        for(const i of recipe.ingredients){
          const foodId=i.food.id?.startsWith('demo-')?await seedDemoFood(i.food):i.food.id||await ensureFoodRow(i.food);
          rows.push({recipe_id:data.id,food_id:foodId,quantity_g:i.grams});
        }
        const {error:ingredientError}=await supabase.from('recipe_ingredients').insert(rows);
        if(ingredientError)throw ingredientError;
        setRecipes(r=>[{...recipe,id:data.id},...r]);
      }else setRecipes(r=>[{...recipe,id:crypto.randomUUID()},...r]);
      setShowRecipe(false);notify('המתכון נשמר ✓');
    }catch(e){console.error(e);notify('לא הצלחתי לשמור את המתכון');}
  }

  async function seedDemoFood(food){
    if(!supabase)return food.id;
    const {data,error}=await supabase.from('foods').upsert({
      source:'demo',source_id:food.id,name_he:food.name,name_en:food.name,
      kcal_per_100g:food.kcal,protein_per_100g:food.protein,carbs_per_100g:food.carbs,fat_per_100g:food.fat
    },{onConflict:'source,source_id'}).select('id').single();
    if(error)throw error;
    return data.id;
  }

  const todayEntries=diary;
  const totals=useMemo(()=>todayEntries.reduce((a,e)=>{a.kcal+=Number(e.calories||e.kcal||0);a.protein+=Number(e.protein_g||e.protein||0);a.carbs+=Number(e.carbs_g||e.carbs||0);a.fat+=Number(e.fat_g||e.fat||0);return a},emptyNutrition()),[todayEntries]);

  return <div className="app">
    <header><div><div className="eyebrow">הַתְּזוֹנָאִית שֶׁלִּי</div><h1>{tab==='היום'?'ערב טוב, נועה':tab}</h1></div><div className="avatar">נ</div></header>
    {dbError&&<div className="card" style={{margin:'0 16px 12px',padding:'12px'}}>{dbError}</div>}
    {loading&&<div className="card" style={{margin:'0 16px 12px',padding:'12px'}}>מתחברת לנתונים…</div>}
    {tab==='היום'&&<Today totals={totals} entries={todayEntries} onAdd={()=>setShowFood(true)} onRecipe={()=>setShowRecipe(true)} weight={weight} setWeight={setWeight} saveWeight={saveWeight} photo={photo} addPhoto={e=>{const f=e.target.files?.[0];if(f){setPhoto(URL.createObjectURL(f));notify('התמונה נוספה')}}}/>}
    {tab==='מתכונים'&&<Recipes recipes={recipes} onNew={()=>setShowRecipe(true)} onLog={addDiary}/>}
    {tab==='יומן'&&<Diary entries={todayEntries}/>}
    {tab==='התקדמות'&&<Progress weight={weight} history={weightHistory}/>}
    {tab==='הגדרות'&&<Settings connected={Boolean(user)}/>}
    {showRecipe&&<RecipeModal foods={foods} onClose={()=>setShowRecipe(false)} onSave={saveRecipe}/>}
    {showFood&&<FoodModal foods={foods} recipes={recipes} onClose={()=>setShowFood(false)} onAdd={e=>{addDiary(e);setShowFood(false)}}/>}
    {toast&&<div className="toast">{toast}</div>}
    <nav>{[['היום','⌂'],['מתכונים','🍲'],['יומן','☷'],['התקדמות','↗'],['הגדרות','⚙']].map(([x,icon])=><button className={tab===x?'active':''} onClick={()=>setTab(x)} key={x}><span>{icon}</span><small>{x}</small></button>)}</nav>
  </div>
}

function Today({totals,entries,onAdd,onRecipe,weight,setWeight,saveWeight,photo,addPhoto}){return <main>
  <section className="hero"><div><span className="muted">היום</span><div className="big-number">{round(totals.kcal)}<small> קל׳</small></div><div className="muted">חלבון {round(totals.protein)} גרם</div></div><div className="ring"><span>{Math.min(100,Math.round(totals.kcal/1800*100))}%</span></div></section>
  <div className="section-title"><h2>מה אכלתי היום?</h2><span>{entries.length} פריטים</span></div>
  <section className="card meal-list">{entries.length===0?<div className="empty">עדיין לא הוספת אוכל להיום.</div>:entries.map(e=><div className="entry" key={e.id}><div className="meal-icon">🍽️</div><div className="meal-copy"><strong>{e.foods?.name_he||e.name||'מזון'}</strong><span>{e.quantity_g||e.grams} גרם</span></div><div className="meal-right">{round(e.calories??e.kcal)} קל׳</div></div>)}</section>
  <div className="quick-grid"><button className="quick" onClick={onAdd}><span className="quick-icon">＋</span><strong>הוספת מזון</strong><span>חיפוש במאגר מזון אמיתי והוספה לפי גרמים</span></button><button className="quick" onClick={onRecipe}><span className="quick-icon">🍲</span><strong>מתכון חדש</strong><span>צרי מתכון וחישוב אוטומטי למנה</span></button></div>
  <section className="quick-grid lower"><label className="quick"><span className="quick-icon">📷</span><strong>צילום אוכל</strong><span>ניתוח AI בהמשך</span><input type="file" accept="image/*" capture="environment" onChange={addPhoto}/></label><form className="quick" onSubmit={e=>{e.preventDefault();saveWeight()}}><span className="quick-icon">⚖️</span><strong>משקל</strong><div className="weight-row"><input inputMode="decimal" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="ק״ג"/><button>שמור</button></div></form></section>
  {photo&&<div className="card photo-card"><img src={photo}/><div><strong>התמונה מוכנה</strong><p>בגרסה הבאה נוכל לשלוח אותה לניתוח AI.</p></div></div>}
</main>}

function Recipes({recipes,onNew,onLog}){return <main><div className="intro"><span className="muted">המתכונים שלי</span><h2>המתכונים שלי</h2><p>שמרי מתכון פעם אחת, ואז הוסיפי ליומן כל כמות שתרצי.</p></div><button className="primary full" onClick={onNew}>＋ יצירת מתכון חדש</button><div className="stack">{recipes.length===0?<div className="empty card">עדיין אין מתכונים. צרי את הראשון.</div>:recipes.map(r=>{const n=calcRecipe(r);const per=r.finalWeight?Object.fromEntries(nutrientKeys.map(k=>[k,n[k]/r.finalWeight*100])):n;return <div className="recipe-card card" key={r.id}><div><strong>{r.name}</strong><p>{r.ingredients.length} מרכיבים · משקל סופי {r.finalWeight} גרם</p></div><div className="nutrition-mini"><b>{round(per.kcal)} קל׳</b><span>{round(per.protein)}g חלבון ל־100g</span></div><button className="secondary" onClick={()=>onLog({name:r.name,recipeId:r.id,grams:100,kcal:per.kcal,protein:per.protein,carbs:per.carbs,fat:per.fat})}>＋ 100 גרם ליומן</button></div>})}</div></main>}

function Diary({entries}){return <main><div className="intro"><span className="muted">היומן</span><h2>מה אכלתי היום</h2></div><div className="stack">{entries.length?entries.map(e=><div className="card entry" key={e.id}><div className="meal-icon">🍽️</div><div className="meal-copy"><strong>{e.foods?.name_he||e.name||'מזון'}</strong><span>{e.quantity_g||e.grams} גרם · {round(e.protein_g??e.protein)} גרם חלבון</span></div><b>{round(e.calories??e.kcal)} קל׳</b></div>):<div className="empty card">אין עדיין רישומים.</div>}</div></main>}

function Progress({weight,history}){return <main><div className="intro"><span className="muted">התקדמות</span><h2>ההתקדמות שלי</h2><p>המשקלים נשמרים עכשיו במסד הנתונים שלך.</p></div><div className="card progress-card"><span className="muted">משקל אחרון</span><strong>{weight?weight+' ק״ג':'—'}</strong><div className="fake-chart">{history.slice(0,6).reverse().map((x,i)=><i style={{height:Math.max(20,Math.min(100,Number(x.weight_kg)||20))+'%'}} key={i}/>)}</div></div></main>}

function Settings({connected}){return <main><div className="intro"><span className="muted">הגדרות</span><h2>הגדרות</h2><p>{connected?'הנתונים שלך נשמרים ב-Supabase.':'מצב מקומי — הגדירי Supabase כדי לסנכרן נתונים.'}</p></div>{['יעד קלורי','יעד חלבון','משקל יעד','התראות'].map(x=><div className="setting card" key={x}><span>{x}</span><b>›</b></div>)}</main>}

function RecipeModal({foods,onClose,onSave}){const [name,setName]=useState('');const [finalWeight,setFinalWeight]=useState('');const [ingredients,setIngredients]=useState([]);const [foodId,setFoodId]=useState(foods[0]?.id);const [grams,setGrams]=useState('100');const total=calcRecipe({ingredients});const per=finalWeight?Object.fromEntries(nutrientKeys.map(k=>[k,total[k]/Number(finalWeight)*100])):null;return <Modal title="מתכון חדש" onClose={onClose}><label>שם המתכון<input value={name} onChange={e=>setName(e.target.value)} placeholder="למשל: פשטידת קישואים"/></label><div className="ingredient-add"><select value={foodId} onChange={e=>setFoodId(e.target.value)}>{foods.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><input inputMode="decimal" value={grams} onChange={e=>setGrams(e.target.value)} placeholder="גרם"/><button className="secondary" onClick={()=>{const food=foods.find(f=>f.id===foodId);if(food)setIngredients([...ingredients,{food,grams:Number(grams)||0}])}}>הוסף</button></div><div className="ingredient-list">{ingredients.map((i,idx)=><div key={idx}><span>{i.food.name}</span><b>{i.grams}g</b></div>)}</div><div className="calc-box"><b>סה״כ המתכון</b><span>{round(total.kcal)} קל׳ · {round(total.protein)}g חלבון</span></div><label>משקל סופי אחרי הכנה (גרם)<input inputMode="decimal" value={finalWeight} onChange={e=>setFinalWeight(e.target.value)} placeholder="למשל 500"/></label>{per&&<div className="calc-box highlight"><b>ל־100 גרם</b><span>{round(per.kcal)} קל׳ · {round(per.protein)}g חלבון · {round(per.carbs)}g פחמימות · {round(per.fat)}g שומן</span></div>}<button className="primary full" disabled={!name||!ingredients.length||!Number(finalWeight)} onClick={()=>onSave({id:crypto.randomUUID(),name,finalWeight:Number(finalWeight),ingredients})}>שמור מתכון</button></Modal>}

function FoodModal({foods,recipes,onClose,onAdd}){
  const [q,setQ]=useState('');const [selected,setSelected]=useState(null);const [grams,setGrams]=useState('100');const [results,setResults]=useState([]);const [searching,setSearching]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{const timer=setTimeout(async()=>{if(q.trim().length<2){setResults(foods.filter(f=>f.name.includes(q)).slice(0,20));return}setSearching(true);setError('');try{const local=foods.filter(f=>(f.name||'').toLowerCase().includes(q.toLowerCase()));const remote=await searchFoodApi(q.trim());setResults([...local,...remote.filter(r=>!local.some(l=>l.source_id&&l.source_id===r.source_id))]);}catch(e){console.error(e);setResults(foods.filter(f=>(f.name||'').includes(q)));setError('חיפוש המאגר החיצוני נכשל כרגע — מוצגים המזונות המקומיים.')}finally{setSearching(false)}},450);return()=>clearTimeout(timer)},[q,foods]);
  return <Modal title="הוספת מזון" onClose={onClose}>{!selected?<><input className="search" autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="חפשי מזון, מוצר או מותג…"/>{searching&&<div className="empty">מחפשת במאגר המזון…</div>}{error&&<div className="empty">{error}</div>}<div className="food-results">{results.map((f,i)=><button key={(f.source_id||f.id||'food')+'-'+i} onClick={()=>setSelected(f)}><span><strong>{f.name}</strong><small>{f.kcal} קל׳ · {f.protein}g חלבון ל־100g{f.brands?' · '+f.brands:''}</small></span><b>›</b></button>)}</div>{recipes.length>0&&<><h3>המתכונים שלי</h3>{recipes.map(r=>{const n=calcRecipe(r);const p=n.kcal/r.finalWeight*100;return <button className="recipe-result" key={r.id} onClick={()=>setSelected({recipe:r,custom:true,kcal:p,protein:n.protein/r.finalWeight*100,carbs:n.carbs/r.finalWeight*100,fat:n.fat/r.finalWeight*100})}><strong>🍲 {r.name}</strong><small>{round(p)} קל׳ ל־100g</small></button>})}</>}</>:<div className="selected-food"><h3>{selected.custom?'🍲 ':''}{selected.custom?selected.recipe.name:selected.name}</h3><label>כמה אכלת? (גרם)<input inputMode="decimal" value={grams} onChange={e=>setGrams(e.target.value)}/></label><div className="calc-box"><b>{round(selected.kcal*Number(grams)/100)} קל׳</b><span>{round(selected.protein*Number(grams)/100)}g חלבון · {round(selected.carbs*Number(grams)/100)}g פחמימות · {round(selected.fat*Number(grams)/100)}g שומן</span></div><button className="primary full" onClick={()=>onAdd({name:selected.custom?selected.recipe.name:selected.name,food:selected.custom?null:selected,foodId:selected.custom?null:selected.id,recipeId:selected.custom?selected.recipe.id:null,grams:Number(grams),kcal:selected.kcal*Number(grams)/100,protein:selected.protein*Number(grams)/100,carbs:selected.carbs*Number(grams)/100,fat:selected.fat*Number(grams)/100})}>הוספה ליומן</button></div>}</Modal>
}

function Modal({title,onClose,children}){return <div className="overlay"><div className="modal"><div className="modal-head"><h2>{title}</h2><button onClick={onClose}>×</button></div>{children}</div></div>}

createRoot(document.getElementById('root')).render(<App/>);
