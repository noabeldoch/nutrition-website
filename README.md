# התזונאית שלי — Nutrition Coach Hebrew MVP

גרסה עובדת של האתר, בעברית וב־RTL, עם מערכת Food → Recipe → Portion → Diary.

## מה כבר עובד
- ממשק מלא בעברית ו־RTL.
- חיפוש מזונות מתוך מאגר דמו ישראלי מובנה.
- הוספת מזון ליומן לפי גרמים.
- יצירת מתכון עם מרכיבים וכמויות.
- חישוב קלוריות, חלבון, פחמימות ושומן לכל המתכון.
- הזנת משקל סופי אחרי בישול.
- חישוב אוטומטי של ערכים ל־100 גרם.
- הוספת חלק מהמתכון ליומן לפי גרמים.
- שמירת מתכונים, יומן ומשקל ב־localStorage כדי שהאתר יעבוד מיד בלי שרת.
- צילום אוכל מהמכשיר כבסיס לחיבור AI עתידי.

## הרצת הפרויקט
```bash
npm install
npm run dev
```

לבניית production:
```bash
npm run build
```

## חשוב לגבי מאגר המזון הישראלי
המאגר המובנה כרגע הוא נתוני דמו כדי שהאתר יעבוד מיד. השלב הבא הוא לייבא את קובץ הנתונים הרשמי של משרד הבריאות ל־PostgreSQL/Supabase ולחבר את החיפוש אליו. אין להעתיק נתוני מקור לא ידועים או להסתמך על ערכי הדמו כמאגר רפואי/תזונתי רשמי.

## ארכיטקטורת production מתוכננת
- Frontend: React + Vite + Vercel
- Database: PostgreSQL / Supabase
- `foods`: מזונות ממקורות חיצוניים
- `recipes`: מתכוני משתמש
- `recipe_ingredients`: מרכיבי מתכון
- `diary_entries`: רישומי אכילה עם snapshot של הערכים בזמן ההוספה
- בהמשך: branded foods, barcode, auth, AI image analysis


## iPhone app (PWA)

The site can be installed on iPhone as a web app, without a Mac or Apple Developer account.

1. Open the deployed site in Safari on the iPhone.
2. Tap Share → Add to Home Screen.
3. Keep "Open as Web App" enabled if iOS offers the option, then tap Add.

### Local and cloud data

- The app stores foods, recipes, diary entries, and weight history in IndexedDB on the device (via Dexie).
- Diary, recipe, and weight changes are added to a local outbox and synced to the existing Supabase tables when online.
- The app retries queued writes when connectivity returns or the app becomes active.
- The service worker precaches the app shell so the installed app can reopen offline. Food search still needs a connection; previously loaded data and offline logging remain available.
- iOS may suspend background work. Pending changes sync when the app is opened/foregrounded or connectivity returns; background sync is not guaranteed.
- Browser storage can be cleared by iOS or by deleting website data. Cloud sync is the backup, so open the app online periodically.

### Deploying

The GitHub repository is connected to Vercel. Pull requests create preview deployments; merging to `main` triggers production deployment. Supabase environment variables remain in Vercel and are not committed to the repository.
