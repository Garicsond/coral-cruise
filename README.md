# Coral Cruise

A family-friendly open-world drive through **Coral Vista**, a sunny original beach city. Cruise the shore, run three small jobs, collect seashells, and spend the cash on cars and paint.

Play it: [https://garicsond.github.io/coral-cruise/](https://garicsond.github.io/coral-cruise/)

There is no account, no ads, and no analytics. Progress stays in `localStorage` on this device.

## How to play

Open the link on an iPhone in landscape, or add it to the Home Screen. Tap **Play** (that tap also starts the music, which iOS requires).

- **Steer** with the left wheel, or A / D / left and right arrows.
- **Gas** is the coral pedal, or W / up arrow.
- **Brake and reverse** with the gray pedal. Space brakes; S / down arrow reverses.
- Drive into a **glowing ring** to start a job.
- The arrow and minimap point at the current goal.
- **Seaglass Sprint** is a checkpoint run against the clock.
- **Scoop Run** picks up a cooler and drops it at The Pink Marlin.
- **Pier Postcard** asks you to stop at the end of Pelican Pier and tap the camera.
- Floating seashells add a little cash. The **Garage** unlocks the Sundart and the Palmetto, plus extra paint colors.
- **Sound** / **Muted** is remembered.

Portrait shows a rotate-your-phone hint. The page does not scroll or pinch-zoom while you play.

## Cars

All names are original. Nothing here is a real car brand.

| Car | Price | Feel |
| --- | --- | --- |
| Breeze | free | Open-air cruiser |
| Sundart | $400 | Quicker fastback |
| Palmetto | $800 | Family wagon with a surfboard |

Sand Dollar and Foam paint are free. The other colors cost cash.

## Local development

```bash
npm install
npm run dev
```

The dev server uses the same `/coral-cruise/` base path as GitHub Pages, so open `http://127.0.0.1:5173/coral-cruise/`.

```bash
npm run build
npm run preview
```

`npm run audit` checks that the job routes are not blocked by buildings or rails.

## Deploy

Pushes to `main` run `.github/workflows/pages.yml`, which builds the static site and deploys it with GitHub Pages (source: GitHub Actions). The site is a Vite build of plain ES modules. There is no backend.

## Credits

- City, cars, props, and interface are original procedural low-poly geometry. No ripped models, logos, or brand assets.
- All audio (engine, music loop, UI blips, bump) is synthesized with the Web Audio API. No audio files are shipped.
- [Three.js](https://threejs.org/) (MIT) renders the scene and is bundled at build time.
