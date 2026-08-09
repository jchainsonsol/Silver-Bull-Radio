# Silver Bull Radio — Live Show Control Board

A no-backend control board for the Silver Bull Radio W3BC live show.

## Built for
- Monday, August 10, 2026
- 9:00 AM–1:00 PM Eastern
- 5-minute operating blocks

## Features
- Live Eastern Time clock
- Current + next segment display
- Segment countdown timer with 30 sec / 1 / 3 / 5 / 15 min presets
- 48 editable 5-minute rundown blocks
- Mark segments complete
- Sync rundown to current Eastern Time
- Producer notes with browser auto-save
- Pre-flight checklist with browser auto-save
- Quick board for station IDs, open song, hourly rundown, music bed, and fill
- Responsive mobile/tablet/desktop layout
- Runs entirely in the browser; no backend required

## Deploy free with GitHub Pages
1. Create a new GitHub repository, for example `silver-bull-radio`.
2. Upload `index.html` to the root of the repository.
3. In GitHub open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch **main** and folder **/(root)**, then Save.
6. GitHub will publish the control board at your GitHub Pages URL.

## Local testing
Open `index.html` in a browser.

## Important
Edits, notes, and checklist state are stored with `localStorage`, so they persist in the same browser/device. They are not synced across multiple devices.
