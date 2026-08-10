# Silver Bull Radio Control Board v5

Static GitHub Pages control board for the 9 AM–1 PM ET Silver Bull Radio show.

## v5 additions
- GO LIVE now starts `audio/welcome-to-the-bullpen.mp3` automatically.
- When the 3:30 opener ends, the board automatically cues a 1:30 live Morning Rundown.
- At the end of the 5-minute opening block, the board advances to GM Get Money.
- Editable Morning Rundown teleprompter script.
- News Desk fed by `data/news.json`.
- Queue / unqueue stories for the live news block and mark stories used.
- Sample `data/news.json` is seeded from the supplied Google Alerts Daily Digest.

## GitHub upload
Upload the complete contents of this folder to the repository root, preserving these folders:

- `index.html`
- `audio/`
- `data/news.json`

GitHub Pages should continue publishing from `main` / root.

## Tomorrow workflow
1. Before 9 AM, review the Morning Rundown script.
2. Review the News Desk and queue the strongest stories.
3. At 9 AM, click GO LIVE once.
4. Opener starts automatically.
5. At 3:30 the board cues the Morning Rundown and switches the live read panel.
6. At 5:00 the board advances into GM Get Money.

## Future news automation
Keep the public website static. Use a scheduled GitHub Action or another server-side job to refresh `data/news.json` before the show. Do not put Gmail or API credentials in `index.html`.
