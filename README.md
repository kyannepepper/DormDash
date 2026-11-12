# Dorm Dash

Healthy $3–$5 microwave meal kits for college students. Pick up to 14 meals a week, then grab your box at the campus store or have a student dasher deliver it to your dorm.

This is a clickable prototype: a static site (HTML/CSS/JS, no build step). Orders, plans and dasher progress are saved in the browser's localStorage.

## Run locally
Open `index.html` in a browser, or serve the folder:

```
npx serve .
```

## Deploy
Deployed on Vercel as a static site. Framework preset: **Other**, no build command, output directory: root.

## Files
- `index.html`: page shell
- `styles.css`: styles
- `data.js`: menu (25 meals), dorms, dasher pay
- `app.js`: app logic and pages
