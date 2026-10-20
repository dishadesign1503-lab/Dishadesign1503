// The 15 waypoints of the treasure hunt, in five categories.
// Coordinates are [longitude, latitude], WGS84, entered by hand (not part of the city kit)
// and approximate.

export const CATEGORIES = {
  culture: { label: 'Culture & History', short: 'Culture', color: '#eab308', icon: '🏛️' },
  parks: { label: 'Parks & Public Spaces', short: 'Parks', color: '#10b981', icon: '🌳' },
  museums: { label: 'Museums & Design', short: 'Museums', color: '#8b5cf6', icon: '🖼️' },
  transit: { label: 'Transit & Hubs', short: 'Transit', color: '#3b82f6', icon: '🚉' },
  dining: { label: 'Cafés & Dining', short: 'Dining', color: '#f97316', icon: '☕' },
}

const RAW = [
  {
    id: 'bauhaus',
    name: 'Bauhaus-Universität Weimar (Main Building)',
    category: 'culture',
    lonlat: [11.3298, 50.974],
    clue: 'Where Walter Gropius and modern design took flight. Look for the cradle of radical form and function.',
    lore: "Founded in 1919, Van de Velde's building became the birthplace of the worldwide Bauhaus modernist movement.",
  },
  {
    id: 'goethe',
    name: "Goethe's Residence / Frauenplan",
    category: 'culture',
    lonlat: [11.3283, 50.9774],
    clue: 'A warm yellow house on a historic square where Faust was drafted and colors were scientifically studied.',
    lore: 'Johann Wolfgang von Goethe lived here for nearly 50 years, surrounded by classical art and extensive mineral collections.',
  },
  {
    id: 'schiller',
    name: "Schiller's House",
    category: 'culture',
    lonlat: [11.3263, 50.9791],
    clue: 'A quiet yellow home along a bustling pedestrian lane where William Tell came alive.',
    lore: 'Friedrich Schiller spent his final, immensely productive years here in deep literary friendship with Goethe.',
  },
  {
    id: 'amalia',
    name: 'Duchess Anna Amalia Library',
    category: 'culture',
    lonlat: [11.332, 50.9781],
    clue: 'An iconic oval Rococo hall that rose like a phoenix after surviving a devastating 2004 fire.',
    lore: 'Home to a world-renowned collection of German literature, including thousands of historic Shakespeare and Faust editions.',
  },
  {
    id: 'schloss',
    name: 'Stadtschloss Weimar (City Castle)',
    category: 'culture',
    lonlat: [11.3323, 50.9804],
    clue: 'A grand palace bordering the river that once housed dukes, grand duchesses, and courtly classical culture.',
    lore: "Rebuilt multiple times under Goethe's artistic supervision, it served as the political seat of Saxe-Weimar-Eisenach.",
  },
  {
    id: 'theater',
    name: 'Deutsches Nationaltheater & Goethe-Schiller Monument',
    category: 'culture',
    lonlat: [11.3255, 50.9797],
    clue: "Two bronze literary giants stand watch before the stage where Germany's first democracy was born.",
    lore: 'The National Assembly adopted the historic Weimar Constitution here in 1919, giving birth to the Weimar Republic.',
  },
  {
    id: 'ilm',
    name: 'Park an der Ilm (West Gate / Sternbrücke)',
    category: 'parks',
    lonlat: [11.333, 50.977],
    clue: 'The scenic gateway leading into a lush English landscape garden sculpted by poets along a winding river.',
    lore: 'Designed by Goethe and Duke Carl August, this UNESCO park blends classical temples, lush meadows, and winding paths.',
  },
  {
    id: 'markt',
    name: 'Weimarer Marktplatz & Cranachhaus',
    category: 'parks',
    lonlat: [11.329, 50.979],
    clue: 'The bustling core surrounded by renaissance facades, street performers, and the rich aroma of Thuringian market stalls.',
    lore: 'Renaissance masters Lucas Cranach the Elder and Younger lived and painted along this historic market square.',
  },
  {
    id: 'bhmuseum',
    name: 'Bauhaus Museum Weimar (Stéphane-Hessel-Platz)',
    category: 'museums',
    lonlat: [11.326, 50.9835],
    clue: 'A sleek, glowing concrete monolith dedicated to modernism, standing adjacent to the historic Weimarhallenpark.',
    lore: 'Opened for the Bauhaus centenary in 2019, showcasing the earliest design experiments and student workshops.',
  },
  {
    id: 'urgeschichte',
    name: 'Museum für Ur- und Frühgeschichte Thüringens',
    category: 'museums',
    lonlat: [11.3225, 50.9748],
    clue: 'Where flint tools, ancient fossils, and primeval human history across Thuringia are preserved.',
    lore: 'Features regional archaeology spanning from the Palaeolithic period and Neanderthals through early medieval tribes.',
  },
  {
    id: 'zob',
    name: 'Goetheplatz Central Bus Station (Goetheplatz ZOB)',
    category: 'transit',
    lonlat: [11.3262, 50.9808],
    clue: 'The transit pulse of Weimar where green city buses cross paths beneath towering old trees.',
    lore: 'The city’s main public transit artery, connecting student commuters, residents, and visitors across the region.',
  },
  {
    id: 'hbf',
    name: 'Weimar Hauptbahnhof (Station Forecourt)',
    category: 'transit',
    lonlat: [11.3275, 50.989],
    clue: 'The historic northern neo-Renaissance portal where express trains from Berlin, Erfurt, and Frankfurt arrive.',
    lore: 'First opened in 1846, serving as the primary railway gateway into the European capital of culture.',
  },
  {
    id: 'frauentor',
    name: 'Café Frauentor',
    category: 'dining',
    lonlat: [11.3288, 50.9782],
    clue: 'A cozy, sunlit corner café near the old city gate famous for fresh cakes and afternoon intellectual chatter.',
    lore: 'A beloved local haunt for students and scholars enjoying traditional Thuringian sheet cakes and espresso.',
  },
  {
    id: 'schwan',
    name: 'Gasthaus Zum Weißen Schwan',
    category: 'dining',
    lonlat: [11.3287, 50.9772],
    clue: "An ancient culinary tavern opposite Goethe's house where historic writers and thinkers dined on hearty regional fare.",
    lore: 'Dating back to the 16th century, this historic inn frequently served Goethe himself.',
  },
  {
    id: 'creperie',
    name: 'Creperie du Palais',
    category: 'dining',
    lonlat: [11.3308, 50.9796],
    clue: 'A charming historic hideaway serving delicate savory galettes and sweet cider near the castle grounds.',
    lore: 'A cozy Weimar culinary favorite tucked beside historic brick walls and quiet cobblestone alleys.',
  },
]

// The ordered hunt follows a walkable loop: arrive at the station, head south through the
// old town and the palace quarter, and finish at the university and the museum to the west.
export const HUNT_ORDER = [
  'hbf', 'bhmuseum', 'zob', 'theater', 'schiller', 'frauentor', 'markt', 'creperie',
  'schloss', 'amalia', 'ilm', 'goethe', 'schwan', 'bauhaus', 'urgeschichte',
]

export const LANDMARKS = HUNT_ORDER.map((id) => {
  const l = RAW.find((r) => r.id === id)
  return { ...l, color: CATEGORIES[l.category].color }
})
