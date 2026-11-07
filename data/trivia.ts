export type Trivia = {
  question: string;
  answer: string;
  aliases: string[];
  explanation: string;
  source: string;
};
const venus = "https://science.nasa.gov/venus/venus-facts/";
const mars = "https://science.nasa.gov/mars/facts/";
const jupiter = "https://science.nasa.gov/jupiter/jupiter-facts/";
const mercury = "https://science.nasa.gov/mercury/facts/";
const diwali =
  "https://www.incredibleindia.gov.in/en/festivals-and-events/diwali";
const octopus =
  "https://www.nhm.ac.uk/discover/octopuses-keep-surprising-us-here-are-eight-examples-how.html";
const raw: [string, string, string[], string, string][] = [
  [
    "Which Australian marsupial produces cube-shaped poo?",
    "Wombat",
    ["wombats"],
    "The cubes form inside the intestine. Nature has a surprisingly geometric sense of humour.",
    "https://hu.gatech.edu/wp-content/uploads/2021/01/Hu21-wombat.pdf",
  ],
  [
    "Which mythical creature is Scotland’s national animal?",
    "Unicorn",
    ["a unicorn"],
    "Scotland chose a creature from legend as its national animal.",
    "https://www.rct.uk/resources/unicorns",
  ],
  [
    "Which family of pigments in a flamingo’s food makes its feathers pink?",
    "Carotenoids",
    ["carotenoid pigments", "carotenoid"],
    "Their pink colour comes from pigments in the food they eat.",
    "https://nationalzoo.si.edu/animals/news/why-are-flamingos-pink-and-other-flamingo-facts",
  ],
  [
    "Thousands of which small rodents live at Rajasthan’s Karni Mata Temple?",
    "Rats",
    ["rat"],
    "The temple at Deshnok is famous for its resident rats.",
    "https://www.tourism.rajasthan.gov.in/karni-mata-temple.html",
  ],
  [
    "Which sport settles the tax dispute in the Bollywood film Lagaan?",
    "Cricket",
    [],
    "The villagers take on the British team in a high-stakes cricket match.",
    "https://www.bfi.org.uk/lists/best-cricket-films-first-xi",
  ],
  [
    "Cloves are the dried unopened buds of which part of a plant?",
    "Flowers",
    ["flower", "flower buds", "flower bud"],
    "The tiny spice is an unopened flower bud.",
    "https://www.indianspices.com/sites/default/files/spices%20list%20under%20purview%20of%20spices%20board.pdf",
  ],
  [
    "Which spice is the seed of the same tree that gives us mace?",
    "Nutmeg",
    [],
    "Nutmeg is the seed; mace is its aril covering.",
    "https://www.indianspices.com/sites/default/files/spices%20list%20under%20purview%20of%20spices%20board.pdf",
  ],
  [
    "In which Indian state can you visit the double-decker living root bridge at Nongriat?",
    "Meghalaya",
    [],
    "The region is famous for bridges grown from living roots.",
    "https://www.meghalayatourism.in/explore/destinations/by-interest/living-root-bridges/",
  ],
  [
    "Which planet takes longer to rotate once than to orbit the Sun?",
    "Venus",
    [],
    "Venus takes about 243 Earth days to rotate and 225 to orbit.",
    venus,
  ],
  [
    "On which planet, the closest to Earth in size, would the Sun rise in the west?",
    "Venus",
    [],
    "Its retrograde rotation reverses the familiar sunrise direction.",
    venus,
  ],
  [
    "Which planet is the hottest in our solar system, despite not being closest to the Sun?",
    "Venus",
    [],
    "A thick atmosphere traps heat in an extreme greenhouse effect.",
    venus,
  ],
  [
    "What is the main gas in the atmosphere of Venus?",
    "Carbon dioxide",
    ["CO2"],
    "Its atmosphere is mostly carbon dioxide.",
    venus,
  ],
  [
    "What acid forms the thick clouds surrounding Venus?",
    "Sulfuric acid",
    ["sulphuric acid"],
    "Those bright clouds are made of sulfuric acid droplets.",
    venus,
  ],
  [
    "Which planet hosts Olympus Mons, the largest volcano in the solar system?",
    "Mars",
    [],
    "Olympus Mons is a gigantic shield volcano.",
    mars,
  ],
  [
    "What are the names of the two moons of Mars?",
    "Phobos and Deimos",
    ["Deimos and Phobos"],
    "Both moons are small and irregularly shaped.",
    mars,
  ],
  [
    "Which chemical element gives Mars its rusty red appearance?",
    "Iron",
    ["Fe"],
    "Iron minerals oxidise, giving the surface its reddish colour.",
    mars,
  ],
  [
    "What is the name of the enormous canyon system on Mars?",
    "Valles Marineris",
    [],
    "The canyon system stretches thousands of kilometres.",
    mars,
  ],
  [
    "What is the main gas in the atmosphere of Mars?",
    "Carbon dioxide",
    ["CO2"],
    "The thin Martian atmosphere is mostly carbon dioxide.",
    mars,
  ],
  [
    "Which planet has a giant storm called the Great Red Spot?",
    "Jupiter",
    [],
    "The Great Red Spot is a vast, long-lived storm.",
    jupiter,
  ],
  [
    "Which planet has the shortest day in our solar system?",
    "Jupiter",
    [],
    "Jupiter rotates in about ten hours.",
    jupiter,
  ],
  [
    "Which planet is named after the Roman messenger god?",
    "Mercury",
    [],
    "The small planet races around the Sun.",
    mercury,
  ],
  [
    "How many Earth days does Mercury take to orbit the Sun, rounded to the nearest whole day?",
    "88",
    ["88 days", "eighty eight"],
    "Mercury completes an orbit in about 88 Earth days.",
    mercury,
  ],
  [
    "What is the smallest planet in our solar system?",
    "Mercury",
    [],
    "Mercury is a little larger than Earth’s Moon.",
    mercury,
  ],
  [
    "How many hearts does an octopus have?",
    "Three",
    ["3", "three hearts", "3 hearts"],
    "Two hearts serve the gills; one circulates blood around the body.",
    octopus,
  ],
  [
    "What colour is octopus blood?",
    "Blue",
    [],
    "Its copper-based oxygen-carrying protein makes the blood blue.",
    octopus,
  ],
  [
    "What shape is an octopus brain commonly compared to?",
    "A doughnut",
    ["doughnut", "donut", "a donut"],
    "Its oesophagus passes through its ring-shaped brain.",
    "https://www.visitsealife.com/brighton/explore/creatures/octopus/",
  ],
  [
    "Which expensive spice is made from the dried stigmas of Crocus sativus?",
    "Saffron",
    ["kesar"],
    "The red stigmas are harvested from crocus flowers.",
    "https://indianspices.com/spice-catalog/saffron.html",
  ],
  [
    "Which part of the plant is harvested to make cinnamon?",
    "Bark",
    ["inner bark", "the bark"],
    "Cinnamon comes from the bark, rather than the seed or fruit.",
    "https://indianspices.com/spice-catalog/cinnamon.html",
  ],
  [
    "In the Ramayana tradition celebrated at Diwali, to which city does Rama return?",
    "Ayodhya",
    [],
    "Lamps welcome Rama home to Ayodhya.",
    diwali,
  ],
  [
    "What are the small clay oil lamps traditionally lit at Diwali called?",
    "Diyas",
    ["diya", "deepa", "deepam"],
    "The little lamps bring a warm glow to homes and doorways.",
    diwali,
  ],
  [
    "Which Hindu goddess of wealth is honoured in the main Diwali puja?",
    "Lakshmi",
    ["Laxmi", "goddess Lakshmi"],
    "Lakshmi is associated with prosperity.",
    diwali,
  ],
  [
    "What was India’s first sound feature film, released in 1931?",
    "Alam Ara",
    [],
    "Alam Ara marked the arrival of the Indian talkie.",
    "https://www.mib.gov.in/sites/default/files/2026-03/efc-of-dcdfc-scheme-fy-2021-22-to-2025-26.pdf",
  ],
  [
    "The Bollywood song “Na Tum Jaano Na Hum” in Kaho Naa... Pyaar Hai features locations in which country outside India?",
    "New Zealand",
    ["NZ"],
    "The film brought New Zealand locations to a broad Bollywood audience.",
    "https://www.ngataonga.org.nz/search-use-collection/search/F210474/",
  ],
  [
    "Which Indian state is especially associated with dhokla, fafda and khandvi?",
    "Gujarat",
    [],
    "These are celebrated Gujarati snacks.",
    "https://cdnbbsr.s3waas.gov.in/s3kv01beaf162aa111f4d4f4f006d5949f/uploads/2024/02/2024020282.pdf",
  ],
];
// source links are revealed only with the answer. keep answers short and unique.
export const trivia: Trivia[] = raw.map(
  ([question, answer, aliases, explanation, source]) => ({
    question,
    answer,
    aliases,
    explanation,
    source,
  }),
);
