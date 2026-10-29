# 🌙 LuaHub — Full Setup Guide ($0 Budget)

## What you need (all free, no card required)
- GitHub account → github.com
- Supabase account → supabase.com
- Vercel account → vercel.com
- Node.js installed on your PC → nodejs.org

---

## STEP 1 — Create your Supabase project

1. Go to https://supabase.com → Sign up → New Project
2. Name it `luahub`, pick any region, set a DB password (save it)
3. Wait ~2 min for it to spin up
4. Go to **SQL Editor** (left sidebar) → **New Query**
5. Open `schema.sql` from this folder, paste the entire thing → **Run**
6. You should see "Success" — tables are created

Now grab your keys:
- Go to **Settings → API**
- Copy **Project URL** → this is your `SUPABASE_URL`
- Copy **service_role secret** → this is your `SUPABASE_SERVICE_KEY`
  ⚠️ Never expose the service key on the frontend — it's server-side only

---

## STEP 2 — Push to GitHub

1. Go to https://github.com → New repository → name it `luahub` → Create
2. On your PC, open terminal in this folder and run:

```bash
git init
git add .
git commit -m "initial luahub"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/luahub.git
git push -u origin main
```

---

## STEP 3 — Deploy to Vercel

1. Go to https://vercel.com → Sign up with GitHub
2. Click **Add New Project** → Import your `luahub` repo
3. Leave all settings default → click **Deploy**
4. It will fail the first time — that's fine, we need to add env vars

Go to your project on Vercel → **Settings → Environment Variables**
Add these three:

| Name                  | Value                          |
|-----------------------|--------------------------------|
| SUPABASE_URL          | https://xxxx.supabase.co       |
| SUPABASE_SERVICE_KEY  | your service_role secret key   |
| JWT_SECRET            | any long random string you make up |

5. Go to **Deployments** → click the 3 dots on latest → **Redeploy**
6. Wait ~30 sec → your site is live at `luahub.vercel.app` (or similar)

---

## STEP 4 — Test your site

1. Open your Vercel URL
2. Click **Get Started** or **Login** → Register an account
3. Go to Dashboard → paste some Lua code → Upload
4. Copy the loader URL that appears

---

## STEP 5 — Use in executor

Open `lib/loader.lua`, change:
- `SLUG` → your script's slug (shown after upload)
- `BASE` → your Vercel URL (e.g. `https://luahub.vercel.app`)

Paste the full loader.lua into your executor and run it.

Or just copy the one-liner from the dashboard:
```lua
loadstring(game:HttpGet("https://luahub.vercel.app/api/loader/your-slug"))()
```

---

## OPTIONAL — Local obfuscation before upload

If you want extra obfuscation before uploading:

```bash
python3 lib/obf.py myscript.lua myscript.enc
```

Then paste the contents of `myscript.enc` as the script content when uploading.
The server also applies XOR — so it's double encoded.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 500 error on API | Check Vercel env vars are set, redeploy |
| "script not found" in executor | Make sure slug is correct and script is public |
| Supabase RLS error | Re-run schema.sql — the policies may not have saved |
| loadstring fails | Your script has a syntax error — test it locally first |

---

## File map

```
luahub/
├── frontend/
│   ├── index.html       ← landing page
│   ├── dashboard.html   ← upload + manage scripts
│   ├── scripts.html     ← public browse page
│   └── assets/
│       ├── style.css    ← all styles
│       └── app.js       ← auth + API helpers
├── api/
│   ├── _supabase.js     ← shared DB client
│   ├── auth.js          ← register / login
│   ├── scripts.js       ← upload / list / delete
│   └── loader/
│       └── [slug].js    ← serves encoded blobs to executors
├── lib/
│   ├── obf.py           ← local obfuscator (optional)
│   └── loader.lua       ← paste in executor
├── schema.sql           ← paste in Supabase SQL editor
├── vercel.json          ← routing config
└── package.json         ← dependencies
```
