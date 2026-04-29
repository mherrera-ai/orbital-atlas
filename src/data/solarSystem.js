// Static content and calibrated UI choices for the Orbital Atlas scene.
// Keeping these values separate makes the renderer easier to scan and review.

export const AU_KM = 149_597_870.7;
export const SIM_DAYS_PER_SECOND = 18;
export const SPEED_PRESETS = [
  { speed: 0.25, label: "Study", rate: "4.5 days/s", strength: "20%" },
  { speed: 1, label: "Cruise", rate: "18 days/s", strength: "42%" },
  { speed: 4, label: "Survey", rate: "72 days/s", strength: "70%" },
  { speed: 12, label: "Scan", rate: "216 days/s", strength: "100%" }
];
export const CAMERA_VIEWS = [
  { id: "free", label: "Free", icon: "maximize-2" },
  { id: "map", label: "Map", icon: "compass" },
  { id: "chase", label: "Chase", icon: "target" }
];
export const SYSTEM_ZONES = [
  {
    id: "temperate",
    label: "Temperate Band",
    inner: 8.35,
    outer: 10.75,
    color: "#9effb6",
    opacity: 0.12,
    edgeOpacity: 0.28
  },
  {
    id: "frost",
    label: "Frost Line",
    inner: 13.35,
    outer: 13.7,
    color: "#76e4ff",
    opacity: 0.17,
    edgeOpacity: 0.38
  },
  {
    id: "kuiper",
    label: "Kuiper Field",
    inner: 38,
    outer: 50,
    color: "#8eb7ff",
    opacity: 0.055,
    edgeOpacity: 0.16
  }
];
export const PLANET_SIGNATURES = {
  mercury: ["Iron core", "Polar ice", "176-day sunrise"],
  venus: ["Runaway greenhouse", "Retrograde spin", "Crushing pressure"],
  earth: ["Known life", "Ocean surface", "Moon-stabilized"],
  mars: ["Ancient water", "Rover world", "Doomed Phobos"],
  jupiter: ["Fastest day", "Great Red Spot", "Europa ocean"],
  saturn: ["Thin rings", "Titan lakes", "Enceladus plumes"],
  uranus: ["Sideways seasons", "Methane color", "13 faint rings"],
  neptune: ["Math discovery", "900x dimmer sun", "Triton geysers"]
};
export const DWARF_OBJECTS = [
  {
    id: "ceres",
    name: "Ceres",
    region: "Main Belt",
    distance: 14.45,
    au: 2.77,
    radius: 0.13,
    orbitDays: 1682,
    inclination: 10.6,
    phase: 0.78,
    color: "#c9b18c"
  },
  {
    id: "pluto",
    name: "Pluto",
    region: "Kuiper",
    distance: 39.4,
    au: 39.48,
    radius: 0.16,
    orbitDays: 90560,
    inclination: 17.2,
    phase: 2.15,
    color: "#d2b59a"
  },
  {
    id: "haumea",
    name: "Haumea",
    region: "Kuiper",
    distance: 43.1,
    au: 43.13,
    radius: 0.115,
    orbitDays: 103410,
    inclination: 28.2,
    phase: 3.34,
    color: "#dfe9f4"
  },
  {
    id: "makemake",
    name: "Makemake",
    region: "Kuiper",
    distance: 45.2,
    au: 45.79,
    radius: 0.13,
    orbitDays: 111850,
    inclination: 29,
    phase: 4.3,
    color: "#c98566"
  },
  {
    id: "eris",
    name: "Eris",
    region: "Scattered Disc",
    distance: 51.5,
    au: 67.78,
    radius: 0.15,
    orbitDays: 203600,
    inclination: 44,
    phase: 5.38,
    color: "#eef7ff"
  }
];
export const PLANETS = [
  {
    id: "mercury",
    name: "Mercury",
    type: "Swift iron world",
    distance: 5.2,
    au: 0.39,
    radius: 0.32,
    orbitDays: 88,
    rotationHours: 1407.6,
    inclination: 7,
    axialTilt: 0.03,
    color: "#b8aa94",
    texture: "rock",
    palette: ["#312c26", "#817362", "#c1b49f", "#ebe1cd"],
    stats: {
      "Orbital period": "88 days",
      "Diameter": "4,879 km",
      "Day-night swing": "-180 to 430 C",
      "Sunlight": "Up to 7x Earth"
    },
    copy:
      "Mercury is the smallest planet and the closest to the Sun, racing through a year in 88 Earth days while rotating so slowly that sunrise can repeat itself.",
    details: [
      "Its oversized metallic core spans about 85% of the planet's radius.",
      "A full sunrise-to-sunrise cycle on Mercury lasts about 176 Earth days.",
      "Deep polar craters can preserve water ice because their floors stay in permanent shadow."
    ],
    source: {
      label: "NASA Mercury Facts",
      url: "https://science.nasa.gov/mercury/facts/"
    }
  },
  {
    id: "venus",
    name: "Venus",
    type: "Cloud-wrapped furnace",
    distance: 7.1,
    au: 0.72,
    radius: 0.58,
    orbitDays: 224.7,
    rotationHours: -5832.5,
    inclination: 3.4,
    axialTilt: 177.4,
    color: "#e8bb73",
    texture: "venus",
    palette: ["#7d4d27", "#c47c3d", "#f2c475", "#fff1b5"],
    stats: {
      "Orbital period": "224.7 days",
      "Diameter": "12,104 km",
      "Atmosphere": "Mostly CO2",
      "Surface temp": "About 467 C"
    },
    copy:
      "Venus is nearly Earth's size, but its dense carbon dioxide atmosphere traps heat so efficiently that it is the hottest planet.",
    details: [
      "It rotates backward compared with most planets, and one Venus day is longer than one Venus year.",
      "Surface pressure is about 93 times Earth's sea-level pressure.",
      "Its sulfuric-acid cloud tops carry dark ultraviolet streaks that scientists still cannot fully explain."
    ],
    source: {
      label: "NASA Venus Facts",
      url: "https://science.nasa.gov/venus/venus-facts/"
    }
  },
  {
    id: "earth",
    name: "Earth",
    type: "Ocean planet",
    distance: 9.3,
    au: 1,
    radius: 0.64,
    orbitDays: 365.25,
    rotationHours: 23.93,
    inclination: 0,
    axialTilt: 23.44,
    color: "#4da3ff",
    texture: "earth",
    palette: ["#0b3265", "#125b97", "#3c8f5c", "#dfd6a5"],
    stats: {
      "Orbital period": "365.25 days",
      "Equatorial diameter": "12,756 km",
      "Surface water": "About 71%",
      "Moon": "1 large companion"
    },
    copy:
      "Earth is the only world known to host life, with long-lived surface oceans, a breathable atmosphere, and a large Moon that steadies its tilt.",
    details: [
      "Liquid water covers most of the surface and helps move heat through the climate system.",
      "The Moon stabilizes Earth's wobble, which has helped keep climate less variable over thousands of years.",
      "Earth's atmosphere, oceans, crust, and magnetic field work together to make a durable home for life."
    ],
    source: {
      label: "NASA Earth Facts",
      url: "https://science.nasa.gov/earth/facts/"
    },
    moons: [
      {
        name: "Moon",
        distance: 2.45,
        radius: 0.27,
        speed: 0.72,
        spin: 0.45,
        phase: 0.25,
        inclination: 5.1,
        color: "#d8d9d8"
      }
    ],
    atmosphere: "#6cbcff"
  },
  {
    id: "mars",
    name: "Mars",
    type: "Dusty frontier",
    distance: 11.6,
    au: 1.52,
    radius: 0.41,
    orbitDays: 687,
    rotationHours: 24.62,
    inclination: 1.85,
    axialTilt: 25.19,
    color: "#d96a46",
    texture: "mars",
    palette: ["#3e211a", "#8d3924", "#ce6d43", "#f0a267"],
    stats: {
      "Orbital period": "687 days",
      "Diameter": "6,779 km",
      "Moons": "Phobos, Deimos",
      "Day length": "24.6 hours"
    },
    copy:
      "Mars is a cold desert world with seasons, polar ice caps, weather, extinct volcanoes, giant canyons, and evidence of a wetter past.",
    details: [
      "NASA has driven rovers across Mars, making it the only planet with human-made vehicles roaming its surface.",
      "Ancient valleys, deltas, and lakebeds show that liquid water once shaped the landscape.",
      "Phobos is slowly spiraling inward and may break apart or crash into Mars in about 50 million years."
    ],
    source: {
      label: "NASA Mars Facts",
      url: "https://science.nasa.gov/mars/facts/"
    },
    moons: [
      {
        name: "Phobos",
        distance: 1.9,
        radius: 0.12,
        speed: 1.45,
        spin: 0.62,
        phase: 0.4,
        inclination: 1.1,
        color: "#b79a82"
      },
      {
        name: "Deimos",
        distance: 2.55,
        radius: 0.08,
        speed: 0.98,
        spin: 0.44,
        phase: 2.1,
        inclination: 1.8,
        color: "#9c8c7e"
      }
    ]
  },
  {
    id: "jupiter",
    name: "Jupiter",
    type: "Storm king",
    distance: 16.6,
    au: 5.2,
    radius: 1.55,
    orbitDays: 4332.6,
    rotationHours: 9.93,
    inclination: 1.3,
    axialTilt: 3.13,
    color: "#d8af79",
    texture: "gas",
    palette: ["#5f3b23", "#b06c35", "#dfb986", "#f6e2bf"],
    stats: {
      "Orbital period": "11.86 years",
      "Diameter": "139,820 km",
      "Day length": "9h 56m",
      "Galilean moons": "Io to Callisto"
    },
    copy:
      "Jupiter is the largest and oldest planet, a hydrogen-helium giant whose short day drives striped cloud bands and enormous storms.",
    details: [
      "The Great Red Spot is a long-lived storm wider than Earth.",
      "Europa likely hides a global ocean beneath its icy crust, making it one of the solar system's most compelling ocean worlds.",
      "Ganymede is the largest moon in the solar system and is even bigger than Mercury."
    ],
    source: {
      label: "NASA Jupiter Facts",
      url: "https://science.nasa.gov/jupiter/jupiter-facts/"
    },
    storm: true,
    moons: [
      {
        name: "Io",
        distance: 1.85,
        radius: 0.12,
        speed: 0.92,
        spin: 0.56,
        phase: 0.2,
        inclination: 0.1,
        color: "#f4d17e"
      },
      {
        name: "Europa",
        distance: 2.35,
        radius: 0.1,
        speed: 0.72,
        spin: 0.48,
        phase: 1.4,
        inclination: 0.5,
        color: "#d9e8ef"
      },
      {
        name: "Ganymede",
        distance: 2.95,
        radius: 0.15,
        speed: 0.52,
        spin: 0.34,
        phase: 2.6,
        inclination: 0.2,
        color: "#b7a58e"
      },
      {
        name: "Callisto",
        distance: 3.65,
        radius: 0.14,
        speed: 0.38,
        spin: 0.28,
        phase: 4.2,
        inclination: 0.4,
        color: "#8c8177"
      }
    ]
  },
  {
    id: "saturn",
    name: "Saturn",
    type: "Ringed giant",
    distance: 22.4,
    au: 9.58,
    radius: 1.33,
    orbitDays: 10759,
    rotationHours: 10.7,
    inclination: 2.49,
    axialTilt: 26.73,
    color: "#f3d28f",
    texture: "gas",
    palette: ["#7a5833", "#c79a59", "#ebcf98", "#fff0be"],
    stats: {
      "Orbital period": "29.45 years",
      "Equatorial diameter": "120,500 km",
      "Rings": "Ice and rock",
      "Density": "Less than water"
    },
    copy:
      "Saturn is a hydrogen-helium giant with the solar system's most spectacular rings and moons that carry methane lakes and water plumes.",
    details: [
      "The main rings stretch up to about 282,000 km from Saturn but are often only about 10 meters thick.",
      "Titan has a thick atmosphere and lakes and seas of liquid methane and ethane.",
      "Enceladus sprays water-rich plumes from a subsurface ocean."
    ],
    source: {
      label: "NASA Saturn Facts",
      url: "https://science.nasa.gov/saturn/facts/"
    },
    rings: {
      inner: 1.65,
      outer: 2.55,
      color: "#ffe3a3"
    },
    moons: [
      {
        name: "Rhea",
        distance: 2.9,
        radius: 0.07,
        speed: 0.56,
        spin: 0.4,
        phase: 0.8,
        inclination: 0.3,
        color: "#d8d0be"
      },
      {
        name: "Titan",
        distance: 3.55,
        radius: 0.13,
        speed: 0.38,
        spin: 0.26,
        phase: 2.35,
        inclination: 0.4,
        color: "#d9a15d",
        haze: "#ffcb72"
      },
      {
        name: "Iapetus",
        distance: 4.35,
        radius: 0.06,
        speed: 0.24,
        spin: 0.2,
        phase: 4.3,
        inclination: 1.2,
        color: "#bfb4a4"
      }
    ]
  },
  {
    id: "uranus",
    name: "Uranus",
    type: "Tilted ice giant",
    distance: 28.2,
    au: 19.2,
    radius: 0.92,
    orbitDays: 30687,
    rotationHours: -17.2,
    inclination: 0.77,
    axialTilt: 97.77,
    color: "#8fe7e8",
    texture: "ice",
    palette: ["#315a71", "#4da9b6", "#8fe7e8", "#d2ffff"],
    stats: {
      "Orbital period": "84 years",
      "Equatorial diameter": "51,118 km",
      "Axial tilt": "97.8 degrees",
      "Rings": "13 faint rings"
    },
    copy:
      "Uranus is an ice giant that rotates almost on its side, giving it extreme seasons where each pole can face decades of sunlight or darkness.",
    details: [
      "The tilt may come from a giant impact early in the solar system.",
      "Methane in the upper atmosphere absorbs red light and creates its blue-green color.",
      "It was the first planet discovered with a telescope, after William Herschel spotted it in 1781."
    ],
    source: {
      label: "NASA Uranus Facts",
      url: "https://science.nasa.gov/uranus/facts/"
    },
    rings: {
      inner: 1.18,
      outer: 1.44,
      color: "#9df5f3",
      opacity: 0.28
    },
    moons: [
      {
        name: "Titania",
        distance: 2.05,
        radius: 0.08,
        speed: 0.42,
        spin: 0.24,
        phase: 0.7,
        inclination: 0.8,
        color: "#c8dadc"
      },
      {
        name: "Oberon",
        distance: 2.65,
        radius: 0.075,
        speed: 0.32,
        spin: 0.22,
        phase: 2.8,
        inclination: 1.1,
        color: "#b4c0c4"
      }
    ]
  },
  {
    id: "neptune",
    name: "Neptune",
    type: "Blue wind world",
    distance: 33.8,
    au: 30.05,
    radius: 0.9,
    orbitDays: 60190,
    rotationHours: 16.11,
    inclination: 1.77,
    axialTilt: 28.32,
    color: "#4d79ff",
    texture: "ice",
    palette: ["#182f8f", "#2852ca", "#4d79ff", "#a9cbff"],
    stats: {
      "Orbital period": "164.8 years",
      "Equatorial diameter": "49,528 km",
      "Winds": "Over 2,000 km/h",
      "Sun distance": "About 30 AU"
    },
    copy:
      "Neptune is the most distant planet, a dark and cold ice giant found by mathematics before it was observed through a telescope.",
    details: [
      "High noon on Neptune is about 900 times dimmer than sunlight on Earth.",
      "Triton orbits backward and may be a captured Kuiper Belt object.",
      "Voyager 2 saw geysers on Triton, even though its surface is around -235 C."
    ],
    source: {
      label: "NASA Neptune Facts",
      url: "https://science.nasa.gov/neptune/neptune-facts/"
    },
    moons: [
      {
        name: "Triton",
        distance: 2.25,
        radius: 0.12,
        speed: -0.46,
        spin: -0.24,
        phase: 1.1,
        inclination: 23,
        color: "#d9edf5"
      },
      {
        name: "Nereid",
        distance: 3.15,
        radius: 0.045,
        speed: 0.16,
        spin: 0.14,
        phase: 3.8,
        inclination: 7,
        color: "#aab8c8"
      }
    ]
  }
];
