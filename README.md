# Walking reach in central Weimar

A 3D map of central Weimar (about 1.3 × 2 km, west of and including the Markt) that shows how far you can walk from any point in 5, 10 and 15 minutes, and about how many people live in that reach.

- **The city.** Every building is raised from its footprint to its measured height. A thin line network shows the pedestrian streets. Orbit, pan and zoom with the mouse.
- **The reach.** Click the ground. The walk starts at the nearest street junction and spreads along the pedestrian network. Three nested areas, in three shades of red, show 5, 10 and 15 minutes. Buildings that touch an area take its shade. A panel lists, for each time, how many buildings are reached and about how many residents live there.
- **Colour layer (Homework 1).** A "Colour by" switch repaints the city by:
  - **Use**: the main use of each building, grouped into housing; shops, work and hotels; public buildings; and other or unknown.
  - **Height**: metres from the ground to the highest point of the roof, in 5 steps.
  - **Floors**: floors above ground, in 5 steps.
  - **Density**: all floor area in a building divided by its footprint, so 3.0 means three times the footprint is built as floor space.
  - **Residents**: the Zensus 2022 100 m squares on the ground, light to dark by residents. Squares without a published figure are hatched grey, not shown as zero.

  Each mode has its own legend. "Colour buildings by walk time" switches the red walk shades on the buildings on or off, so the colour layer and the walk areas can be seen together.
- **Inspect.** Click a building to see its id, main use, height, floors, footprint, floor area (in total and by use) and density, and whether it lies in the walk. In Residents mode, click a census square to see its residents, average age, rent, share of empty flats and main heating type. Figures the census marks as uncertain are labelled.

## Weimar Historic & Cultural Treasure Hunt

A ghost leads a hunt through 15 landmarks in five categories, each with its own colour and icon on the map: Culture & History (gold 🏛️), Parks & Public Spaces (green 🌳), Museums & Design (purple 🖼️), Transit & Hubs (blue 🚉) and Cafés & Dining (orange ☕).

- **Green parks.** Every park, garden and cemetery plot (land use "recreation" and "cemetery" in `plots.geojson`, 58 plots, about 21 ha) is drawn in emerald green with a darker edge, so open space stands out from buildings and streets.
- **Two ways to play.** The **Ordered hunt** gives one riddle at a time. It follows a walkable loop from the Hauptbahnhof south through the old town and the palace quarter to the Bauhaus-Universität and the Museum für Ur- und Frühgeschichte. **Free explore** lets you discover any landmark in any order. A clue carousel pages through all 15 riddles; in the ordered hunt, later clues stay locked until the current one is solved.
- **Hot & cold.** The ghost's soft glow changes colour with the distance to the target. In the ordered hunt that is the current clue; in free explore it is the nearest undiscovered landmark.
  - cold, neon cyan beyond 150 m, breathing gently;
  - warmer, amethyst turning amber-gold from 150 to 80 m, with one slow ring;
  - hot, coral-orange from 80 to 35 m, with three concentric rings;
  - discovered, ruby red within 35 m, with a bloom and a burst of golden sparkles.

  The glows stay at 0.25–0.35 opacity so buildings, streets and parks underneath remain readable.
- **Discovery.** A see-through card shows the name, category badge, a "Discovered!" check, the lore, and the progress ("Landmark 4 of 15 Discovered"). The landmark's pin fills with its colour and gets its name. The **Discovered landmarks** drawer lists everything found so far with its history and a "Show on map" link. Progress is saved in the browser.
- **Building proximity.** Beyond the landmarks, the ghost also notices every building in `buildings.geojson`. From 25 m to 15 m from a facade, a red-orange glow blends in at the base of the nearest building. Within 10 m, a small toast shows "Nearby Building: [Main Use] • [Floors] Floors • [Height]m". Buildings are filed once in a 25 m grid, so each frame only the few buildings around the ghost are measured, not all 4,316. In the old town's narrow streets you are almost always within 25 m of a building, so the toast stays at least 2 seconds before it changes, and "Building alerts" can be switched off.
- **Filter by category** hides or shows the pins of each category. In free explore, hidden categories are also left out of the hunt.
- **My location** follows your real position with `navigator.geolocation.watchPosition`, at high accuracy. A faint blue circle shows how precise the fix is. Location needs a secure page, which GitHub Pages and localhost both are. If permission is refused, no position is found, or you are outside the map area, the panel says so in plain words.
- **Test walk / Teleport.** A bar at the bottom right has a drop-down of all 15 landmarks. **Walk there** follows the streets at 1×, 5× or 20× walking pace and runs through every colour on the way; **Teleport** jumps straight there. **Simulate walk near building** walks to a spot 6 m outside a random building nearby, to try the building glow and toast. Clicking a street on the map also walks the ghost there.
- **Plain** colour mode greys out the buildings so the hunt colours stand out. It is chosen when the ghost is switched on. In Use mode, public buildings are green too.

The landmark coordinates, riddles and lore are not part of the city kit. They are entered by hand in `src/lib/landmarks.js`, and the coordinates are approximate. Distances to landmarks are measured in a straight line, not along the streets. Goethe's Residence and the Gasthaus Zum Weißen Schwan are only 36 m apart, so standing between them can discover both at once.

## Run it

```
npm install     install the packages
npm run dev     start the app at http://localhost:5173
npm run build   build the site into dist/
```

Every push to `main` publishes the site to GitHub Pages at `https://<user>.github.io/<repo>/`. All data files load through `import.meta.env.BASE_URL`, so they are found both there and on localhost.

## Method and limits

- **Walking speed.** 4.8 km/h, which is 80 m per minute, along the walkable edges of the pedestrian network, using each edge's length in metres. 5, 10 and 15 minutes are 400, 800 and 1,200 m of walking.
- **Start.** The nearest junction of the network to the click. If no walkable street is within 100 m, the app says so and draws nothing.
- **The areas.** Each area is the street pieces reached in that time, including the reachable part of the last street, with a band of 25 m on each side, joined into one shape. It is not a circle and not a convex hull. A building counts as reached if it touches the area.
- **Residents.** For every census square that overlaps an area: its residents times the share of the square's area inside the area. These are added up and rounded to the nearest 10.
- **Squares without a figure.** Where the census published no resident count, the square is not counted as zero. It is left out of the sum, and the panel says how many such squares overlap the area.
- **Limits.** Everyone is assumed to walk at the same speed, with no waiting at crossings, slopes or steps. Census squares are 100 m wide and their small counts are changed slightly at random for privacy, so resident numbers are approximate. Shares assume residents are spread evenly across each square. Floor areas, and so density, are estimates for the whole building, not surveyed per floor. Census squares are only drawn where the census lists them, and they continue beyond the kit edge, where the map has no buildings or streets.

## Data

All data is in `public/data/`; see `public/data/SOURCES.md`.

| File | What it holds |
| --- | --- |
| `buildings.geojson` | 4,316 footprints with height (m), floors, main use and floor area per use (m²) |
| `streets.geojson`, `streets.graph.json` | the pedestrian network: 962 junctions, 1,186 walkable edges with length (m) |
| `plots.geojson` | 2,750 plots with their land use; the 58 recreation and cemetery plots are drawn as green parks |
| `zensus.geojson` | 245 Zensus 2022 squares of 100 m: residents, average age, rent (€/m²), empty flats (%), main heating |
| `kit.json` | the kit area: centre, bounding box, size |

Buildings: 3D building models LoD2 © GDI-Th (dl-de/by-2-0). Land use and pedestrian network: Egor Gaydukov, InfAU, Bauhaus-Universität Weimar. Census grid: Zensus 2022, © Statistische Ämter des Bundes und der Länder (dl-de/by-2-0).

## Code

| Path | What it does |
| --- | --- |
| `src/App.jsx` | loads the data and connects the map, panel and info card |
| `src/components/City.jsx` | the 3D scene (React Three Fiber) |
| `src/components/Panel.jsx` | colour modes, legends, walk results and method |
| `src/components/InfoCard.jsx` | the card for a clicked building or census square |
| `src/lib/geo.js` | turns longitude and latitude into metres, and picks the green plots |
| `src/lib/graph.js`, `src/lib/walk.js` | the network, the walk, the 25 m band, and the counts of buildings and residents |
| `src/lib/reachWorker.js` | runs the walk in the background so the map keeps moving |
| `src/lib/colors.js` | colour modes and legends |
| `src/lib/settings.js` | walking speed, band width, times |
| `src/lib/landmarks.js` | the 15 landmarks and five categories: colour, icon, clue, lore and the order of the hunt |
| `src/lib/hunt.js` | the hot & cold colour spectrum, distance bands and saved progress |
| `src/lib/sim.js`, `src/lib/useGeolocation.js` | the test walk and teleport, and the live GPS position |
| `src/components/Ghost.jsx`, `Landmarks.jsx` | the ghost with its glow, rings and sparkles, and the category pins |
| `src/lib/nearBuildings.js`, `src/components/BuildingToast.jsx` | the 25 m building grid, distance to the nearest facade, and the "Nearby Building" toast |
| `src/components/HuntSection.jsx`, `QuickBar.jsx`, `DiscoveryCard.jsx` | the hunt panel (modes, clue carousel, filter, discovered drawer), the test bar and the discovery card |

## Reflection: the hot & cold colours

Instead of a single alert colour, the ghost's glow runs through a continuous spectrum, from cold cyan through purple and gold to hot coral and ruby red, so the distance to the next landmark can be read at a glance without a number. Because the glow stays translucent and the colours blend smoothly between the distance bands, the map underneath stays readable and the search feels like warming up rather than a series of jumps.

## How this was made

1. Tools: Claude Code, with the model Claude Opus 5.5 (`claude-opus-5-5`).
2. I decided: I turned the walking map into a gamified hunt through 15 Weimar landmarks in five colour-coded categories, with my own riddles and lore, an ordered and a free mode, green parks so open space reads at a glance, and a glow and toast for every building the ghost walks past. I chose a hot & cold colour spectrum (cyan, purple to gold, coral, ruby) with soft transparency instead of a single alert colour, so the distance to a landmark shows without numbers while the city stays readable.
3. The agent did: built the 3D walking-reach map from `prompt.md`, added the colour layer with legends and click-to-inspect cards, and the Weimar Historic & Cultural Treasure Hunt with GPS, green parks, hot & cold colours, building proximity alerts and a test walk, checking each step in a browser.
4. I checked: [DRAFT, keep only what you really checked] I walked the ordered hunt with Test walk and Teleport and watched the glow pass through all four colour bands before each discovery card, and used "Simulate walk near building" to compare the building toast with the building's info card. I compared the green park areas and the landmark positions with a map of Weimar, and tried My location on my phone on the GitHub Pages site.
