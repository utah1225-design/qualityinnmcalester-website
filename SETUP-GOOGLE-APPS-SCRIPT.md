# Google Apps Script Setup Guide
## Quality Inn McAlester — CC Authorization Form → Google Drive PDF

Estimated time: 10 minutes. Free. No ongoing cost.

---

## STEP 1 — Open Google Apps Script

1. Go to: https://script.google.com
2. Click **New project** (top left)
3. Name the project: `QI McAlester CC Auth`
4. Delete everything in the editor (the default `function myFunction(){}`)
5. Open the file `google-apps-script.js` from this zip
6. Copy ALL content → paste into the Apps Script editor
7. Click **Save** (disk icon or Ctrl+S)

---

## STEP 2 — Configure your email

At the top of the script, confirm this line matches your email:

```javascript
var HOTEL_EMAIL = 'QualityMcAlester@gmail.com';
```

Change if needed, then save again.

---

## STEP 3 — Test it first (optional but recommended)

1. In the function dropdown (top center of editor), select **testForm**
2. Click **Run**
3. Click **Review permissions** → Choose your Google account → Allow
4. Wait 10–15 seconds
5. Check: your Gmail inbox should have a CC auth email with PDF attached
6. Check: Google Drive should have a new folder called "CC Authorization Forms" with a PDF inside

If this works, proceed to Step 4.

---

## STEP 4 — Deploy as Web App

1. Click **Deploy** (top right) → **New deployment**
2. Click the gear icon next to "Type" → select **Web app**
3. Set:
   - Description: `CC Auth Form v1`
   - Execute as: **Me** (your Google account)
   - Who has access: **Anyone**
4. Click **Deploy**
5. Click **Authorize access** → choose your account → Allow
6. **COPY the Web App URL** — looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

---

## STEP 5 — Paste URL into ccform.html

1. Open `ccform.html` in any text editor
2. Find this line near the bottom of the file:
   ```javascript
   var APPS_SCRIPT_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```
3. Replace `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` with your URL:
   ```javascript
   var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
4. Save ccform.html
5. Upload to GitHub → Netlify auto-deploys

---

## STEP 6 — Test the live form

1. Go to your live site → /ccform.html
2. Fill in all fields, draw a signature
3. Click Submit
4. Within 30 seconds:
   - Check your Gmail: email with PDF attached
   - Check Google Drive → "CC Authorization Forms" folder: PDF saved
   - If cardholder email was entered: they also receive a confirmation with PDF

---

## WHAT THE PDF CONTAINS

✅ Guest name, confirmation number, dates, phone, email
✅ Charges authorized (checkboxes)
✅ Total amount + hotel note
✅ Cardholder name, card type, card number (LAST 4 ONLY)
✅ Expiration date
✅ Billing address
✅ Authorization statement + agreement confirmation
✅ Signature image (drawn on screen)
❌ CVC is NOT stored — not in PDF, not in email (PCI guideline)
❌ Full card number is NOT stored — only last 4 digits appear in PDF

---

## IF YOU NEED TO UPDATE THE SCRIPT LATER

Any changes to the Apps Script require a NEW deployment:
Deploy → New deployment → (same settings) → Deploy → copy the NEW URL → update ccform.html

The old URL stops working after redeployment.

---

## FOLDER STRUCTURE IN GOOGLE DRIVE

After first submission:
```
My Drive/
  └── CC Authorization Forms/
        ├── CC_Auth_John_Smith_20260601.pdf
        ├── CC_Auth_Jane_Doe_20260615.pdf
        └── ...
```

---

Questions? The form POSTs to Apps Script regardless of CORS warnings in console.
"no-cors" mode means the browser can't read the response, but the POST still reaches Google.
