/** A picture for a word, found from its English meaning (for the Cseppek / Drops-style mode). */

const E: Record<string, string> = {
  // food and drink
  apple: "🍎", apricot: "🍑", aubergine: "🍆", banana: "🍌", beans: "🫘", beer: "🍺", biscuit: "🍪", blueberry: "🫐", bread: "🍞",
  "bread roll": "🥖", breakfast: "🍳", broccoli: "🥦", butter: "🧈", cabbage: "🥬", cake: "🍰", candy: "🍬", carrot: "🥕", cheese: "🧀",
  cherry: "🍒", "sour cherry": "🍒", chestnut: "🌰", chicken: "🍗", chocolate: "🍫", coffee: "☕", cookie: "🍪", corn: "🌽", courgette: "🥒",
  cucumber: "🥒", dinner: "🍽️", drink: "🥤", egg: "🥚", fish: "🐟", food: "🍲", fruit: "🍓", garlic: "🧄", grapes: "🍇", ham: "🍖",
  hazelnut: "🌰", honey: "🍯", "ice cream": "🍦", jam: "🍓", juice: "🧃", lemon: "🍋", lettuce: "🥬", lunch: "🥪", meat: "🥩", melon: "🍈",
  milk: "🥛", "mineral water": "💧", mushroom: "🍄", oil: "🫗", onion: "🧅", orange: "🍊", pancake: "🥞", pasta: "🍝", pear: "🍐", peas: "🫛",
  pepper: "🫑", pineapple: "🍍", plum: "🫐", potato: "🥔", pumpkin: "🎃", raspberry: "🍓", rice: "🍚", salad: "🥗", salami: "🍕", soup: "🍲",
  "goulash soup": "🍲", "fisherman's soup": "🍲", spinach: "🥬", strawberry: "🍓", sugar: "🍬", tea: "🍵", tomato: "🍅", vegetable: "🥕",
  walnut: "🌰", water: "💧", wine: "🍷", "mulled wine": "🍷", yogurt: "🥛", whisky: "🥃", stew: "🥘", strudel: "🥐", "chimney cake": "🥐",
  "fried dough with toppings": "🫓", "stuffed cabbage": "🥬", "chicken paprikash": "🍗", "curd cheese": "🧀", "fruit brandy": "🥃", cordial: "🧃",
  glass: "🥛", plate: "🍽️", fork: "🍴", knife: "🔪", spoon: "🥄", mug: "☕", "wine spritzer": "🍷", delicious: "😋", yummy: "😋", "yum yum": "😋",
  hungry: "🤤", thirsty: "🥤", restaurant: "🍽️", café: "☕", pub: "🍻", patisserie: "🧁", market: "🧺",
  // animals
  ant: "🐜", bat: "🦇", bear: "🐻", bee: "🐝", bird: "🐦", bunny: "🐰", butterfly: "🦋", cat: "🐱", cow: "🐄", crow: "🐦‍⬛", deer: "🦌",
  "roe deer": "🦌", dog: "🐶", doggy: "🐶", duck: "🦆", eagle: "🦅", elephant: "🐘", fox: "🦊", frog: "🐸", giraffe: "🦒", goat: "🐐",
  goldfish: "🐠", goose: "🪿", hamster: "🐹", hedgehog: "🦔", hen: "🐔", horse: "🐴", kitty: "🐱", "little kitten": "🐱", ladybird: "🐞",
  lion: "🦁", monkey: "🐒", mouse: "🐭", owl: "🦉", parrot: "🦜", pig: "🐷", pet: "🐾", rabbit: "🐇", ram: "🐏", rooster: "🐓", sheep: "🐑",
  snail: "🐌", snake: "🐍", spider: "🕷️", squirrel: "🐿️", tiger: "🐯", wolf: "🐺", zebra: "🦓", puli: "🐕", pumi: "🐕", komondor: "🐕",
  kuvasz: "🐕", vizsla: "🐕",
  // animal sounds and noises
  woof: "🐶", meow: "🐱", moo: "🐄", oink: "🐷", baa: "🐑", neigh: "🐴", quack: "🦆", cluck: "🐔", "cock-a-doodle-doo": "🐓", ribbit: "🐸",
  tweet: "🐦", cheep: "🐤", hoot: "🦉", buzz: "🐝", bark: "🐶", achoo: "🤧", boom: "💥", knock: "🚪", "knock knock": "🚪", "tick-tock": "⏰",
  "drip drop": "💧", shh: "🤫", whoosh: "💨", ouch: "🤕", wow: "😮", thud: "💥", snap: "🫰", whisper: "🤫", smooch: "😘", kiss: "😘",
  // family and people
  baby: "👶", brother: "👦", "older brother": "👦", "younger brother": "👦", "older sister": "👧", "younger sister": "👧", child: "🧒",
  dad: "👨", father: "👨", mum: "👩", mother: "👩", daughter: "👧", son: "👦", family: "👨‍👩‍👧", grandfather: "👴", grandmother: "👵",
  grandparents: "👵", grandchild: "🧒", husband: "🤵", wife: "👰", parents: "👫", friend: "🧑‍🤝‍🧑", "female friend": "👭", boyfriend: "💑",
  partner: "💑", aunt: "👩", uncle: "👨", cousin: "🧑", sibling: "🧑‍🤝‍🧑", person: "🧑", everyone: "👥", group: "👥", king: "👑",
  teacher: "🧑‍🏫", "english teacher": "🧑‍🏫", student: "🧑‍🎓", doctor: "🧑‍⚕️", patient: "🤒", engineer: "🧑‍💻", driver: "🧑‍✈️",
  astronaut: "🧑‍🚀", cook: "🧑‍🍳", baker: "🧑‍🍳", waiter: "🧑‍🍳", priest: "⛪", director: "💼", "shop assistant": "🛍️", secretary: "🗂️",
  boss: "💼", colleague: "🧑‍💼", businessman: "🧑‍💼", psychologist: "🧠", tourist: "📸", foreigner: "🌍", shepherd: "🐑", witch: "🧙‍♀️",
  ghost: "👻", skeleton: "💀", snowman: "⛄", "saint nicholas": "🎅", "baby jesus": "👼", coach: "📣", locksmith: "🔑", masseur: "💆",
  // body and health
  arm: "💪", back: "🧍", belly: "🫃", brain: "🧠", ear: "👂", eye: "👁️", face: "🙂", finger: "☝️", hair: "💇", hand: "✋", head: "🗣️",
  heart: "❤️", knee: "🦵", leg: "🦵", mouth: "👄", neck: "🧣", nose: "👃", shoulder: "🤷", tooth: "🦷", "sole of the foot": "🦶", fever: "🤒",
  ill: "🤒", hurt: "🤕", medicine: "💊", pharmacy: "💊", hospital: "🏥", "doctor's office": "🩺",
  // feelings
  angry: "😠", "be afraid": "😨", "be bored": "🥱", calm: "😌", cheerful: "😄", excited: "🤩", happy: "😊", "in love": "😍", nervous: "😬",
  proud: "😌", sad: "😢", scary: "😱", sleepy: "😴", surprised: "😲", tired: "😫", worry: "😟", "i'm glad": "😊", "be glad": "😊", love: "❤️",
  crazy: "🤪", cute: "🥰", sweet: "🍬", good: "👍", ok: "👌", super: "🌟", "cool!": "😎", "cheers!": "🥂", "of course!": "✅", yes: "✅", sorry: "🙏",
  please: "🙏", hello: "👋", hi: "👋", hey: "👋", "bye-bye": "👋", "saying goodbye": "👋", greeting: "👋",
  // colours
  black: "⚫", blue: "🔵", brown: "🟤", green: "🟢", grey: "🩶", orange_colour: "🟠", pink: "🩷", purple: "🟣", red: "🔴", white: "⚪",
  yellow: "🟡", gold: "🥇", silver: "🥈", colour: "🎨", "red-white-green": "🇭🇺",
  // weather and seasons
  cloud: "☁️", cold: "🥶", fog: "🌫️", heatwave: "🥵", ice: "🧊", lightning: "⚡", rain: "🌧️", snow: "❄️", storm: "⛈️", sun: "☀️",
  warm: "🌤️", weather: "🌦️", wind: "🌬️", spring: "🌷", summer: "🏖️", autumn: "🍂", winter: "❄️", "in spring": "🌷", "in summer": "🏖️",
  "in autumn": "🍂", "in winter": "❄️", leaf: "🍂", star: "⭐", season: "🗓️", umbrella: "☂️", "sun cream": "🧴", sunglasses: "🕶️",
  christmas: "🎄", "christmas tree": "🎄", "christmas eve": "🎄", easter: "🐣", "easter egg": "🥚", "new year's eve": "🎆", birthday: "🎂",
  "valentine's day": "💘", present: "🎁", party: "🎉", costume: "🎭", "jack-o'-lantern": "🎃", "pussy willow": "🌿", "name day": "🎉",
  sledge: "🛷", "ice skates": "⛸️", holiday: "🏝️", carnival: "🎭",
  // home
  armchair: "🛋️", balcony: "🏙️", bathroom: "🛁", bed: "🛏️", bedroom: "🛏️", chair: "🪑", cupboard: "🗄️", desk: "🖥️", dishwasher: "🍽️",
  door: "🚪", fridge: "🧊", garden: "🌳", house: "🏠", kitchen: "🍳", lamp: "💡", "living room": "🛋️", mirror: "🪞", oven: "🔥",
  room: "🚪", shelf: "📚", sofa: "🛋️", stove: "🔥", table: "🪑", toilet: "🚽", vase: "🏺", window: "🪟", key: "🔑", flat: "🏢",
  hallway: "🚪", stairwell: "🪜",
  // town, travel, shopping
  airport: "✈️", bag: "👜", bank: "🏦", bakery: "🥐", bicycle: "🚲", bookshop: "📚", bridge: "🌉", building: "🏢", bus: "🚌", car: "🚗",
  church: "⛪", city: "🏙️", "flower shop": "💐", hotel: "🏨", library: "📚", metro: "🚇", museum: "🏛️", office: "🏢", park: "🌳",
  "police station": "🚓", "post office": "📮", "railway station": "🚉", road: "🛣️", school: "🏫", "secondary school": "🏫", shop: "🏪",
  station: "🚉", street: "🛣️", suitcase: "🧳", taxi: "🚕", ticket: "🎫", train: "🚆", tram: "🚋", trolleybus: "🚎", plane: "✈️", ship: "🚢",
  map: "🗺️", passport: "🛂", money: "💶", cash: "💵", card: "💳", forint: "💰", price: "🏷️", cheap: "🏷️", expensive: "💎", "travel pass": "🎫",
  gym: "🏋️", university: "🎓", world: "🌍", country: "🗺️", island: "🏝️", space: "🌌", machine: "⚙️", computer: "💻", calculator: "🧮",
  hall: "🏛️", shrine: "🛕", "outdoor pool": "🏊", square: "⛲",
  // clothes
  boots: "👢", clothes: "👕", coat: "🧥", gloves: "🧤", hat: "👒", jeans: "👖", scarf: "🧣", shirt: "👔", shoes: "👟", skirt: "👗",
  slippers: "🥿", socks: "🧦", sweater: "🧶", "t-shirt": "👕", trousers: "👖",
  // work and school
  book: "📖", chapter: "📖", clock: "🕰️", data: "📊", database: "🗄️", deadline: "⏳", document: "📄", file: "📁", folder: "📁",
  homework: "📝", internet: "🌐", keyboard: "⌨️", laptop: "💻", letter: "✉️", "mobile phone": "📱", telephone: "☎️", newspaper: "📰",
  password: "🔒", picture: "🖼️", project: "📋", question: "❓", answer: "💬", quiz: "❓", radio: "📻", read: "📖", write: "✍️", word: "🔤",
  sentence: "💬", language: "🗣️", screen: "🖥️", meeting: "🤝", salary: "💶", task: "✅", list: "📋", map_: "🗺️", work: "💼", "working from home": "🏡",
  // hobbies and sport
  basketball: "🏀", dance: "💃", football: "⚽", "go hiking": "🥾", guitar: "🎸", handball: "🤾", "listen to music": "🎧", running: "🏃",
  sing: "🎤", sport: "🏅", swim: "🏊", swimming: "🏊", tennis: "🎾", "tennis racket": "🎾", "take photos": "📷", "watch a film": "🎬",
  "water polo": "🤽", yoga: "🧘", paint: "🎨", draw: "✏️", play: "🎲", travel: "🧳", excursion: "🥾", walk: "🚶", sunbathe: "😎",
  jazz: "🎷", jungle: "🌴", jeep: "🚙", xylophone: "🎶", "shepherd's flute": "🎶", sound: "🔊",
  // time and numbers
  day: "📅", today: "📅", tomorrow: "📅", yesterday: "📅", morning: "🌅", afternoon: "🌇", evening: "🌆", night: "🌙", "at night": "🌙",
  hour: "⏰", minute: "⏱️", second: "⏱️", week: "📅", weekend: "🎉", year: "📆", monday: "📅", tuesday: "📅", wednesday: "📅",
  thursday: "📅", friday: "📅", saturday: "📅", sunday: "📅",
  zero: "0️⃣", one: "1️⃣", two: "2️⃣", three: "3️⃣", four: "4️⃣", five: "5️⃣", six: "6️⃣", seven: "7️⃣", eight: "8️⃣", nine: "9️⃣", ten: "🔟",
  hundred: "💯", thousand: "🔢", million: "🔢", half: "½",
  // misc
  flower: "🌸", rose: "🌹", tree: "🌳", wood: "🪵", sun_: "☀️", light: "💡", dark: "🌑", big: "🐘", small: "🐭", little: "🐭", tiny: "🐜",
  slow: "🐢", slowly: "🐢", fast: "🐇", high: "⛰️", deep: "🌊", hole: "🕳️", up: "⬆️", left: "⬅️", right_dir: "➡️", "the left": "⬅️",
  "the right": "➡️", "straight on": "⬆️", near: "📍", far: "🔭", here: "📍", there: "👉", stop: "🛑", dagger: "🗡️", ring: "💍", gift: "🎁",
  salt: "🧂", "king (cool)": "👑", "letter y": "🔤", vowel: "🔤", consonant: "🔤", "capital city": "🏛️", continent: "🌍", europe: "🌍",
  asia: "🌏", africa: "🌍", australia: "🇦🇺", america: "🌎", alarm: "⏰",
  // countries
  hungary: "🇭🇺", hungarian: "🇭🇺", romania: "🇷🇴", romanian: "🇷🇴", germany: "🇩🇪", german: "🇩🇪", austria: "🇦🇹", austrian: "🇦🇹",
  france: "🇫🇷", french: "🇫🇷", italy: "🇮🇹", italian: "🇮🇹", spain: "🇪🇸", spanish: "🇪🇸", portugal: "🇵🇹", portuguese: "🇵🇹",
  england: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", english: "🇬🇧", "united kingdom": "🇬🇧", "great britain": "🇬🇧", ireland: "🇮🇪", poland: "🇵🇱", polish: "🇵🇱",
  "czech republic": "🇨🇿", czech: "🇨🇿", slovakia: "🇸🇰", slovak: "🇸🇰", slovenia: "🇸🇮", croatia: "🇭🇷", serbia: "🇷🇸", bulgaria: "🇧🇬",
  greece: "🇬🇷", greek: "🇬🇷", albania: "🇦🇱", ukraine: "🇺🇦", russia: "🇷🇺", russian: "🇷🇺", turkey: "🇹🇷", turkish: "🇹🇷", cyprus: "🇨🇾",
  malta: "🇲🇹", iceland: "🇮🇸", norway: "🇳🇴", sweden: "🇸🇪", swedish: "🇸🇪", finland: "🇫🇮", finnish: "🇫🇮", denmark: "🇩🇰", estonia: "🇪🇪",
  latvia: "🇱🇻", lithuania: "🇱🇹", netherlands: "🇳🇱", dutch: "🇳🇱", belgium: "🇧🇪", switzerland: "🇨🇭", swiss: "🇨🇭", egypt: "🇪🇬",
  israel: "🇮🇱", india: "🇮🇳", china: "🇨🇳", chinese: "🇨🇳", japan: "🇯🇵", japanese: "🇯🇵", mongolia: "🇲🇳", indonesia: "🇮🇩",
  canada: "🇨🇦", usa: "🇺🇸", american: "🇺🇸", brazil: "🇧🇷", "bosnia and herzegovina": "🇧🇦",
};

function key(en: string) {
  return en
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .split(/[,;/]/)[0]
    .trim()
    .replace(/^(a|an|the|to) /, "")
    .replace(/[!?.]+$/, "")
    .trim();
}

const memo = new Map<string, string | null>();

/** An emoji for this meaning, or null if none fits. */
export function emojiFor(en: string): string | null {
  if (memo.has(en)) return memo.get(en)!;
  const k = key(en);
  let hit: string | null = E[k] ?? null;
  if (!hit) {
    // "in the bakery" → bakery, "my kitten" → kitten
    const words = k.split(/\s+/);
    for (let i = 1; i < words.length && !hit; i++) hit = E[words.slice(i).join(" ")] ?? null;
    if (!hit) for (const w of words.reverse()) if (E[w]) { hit = E[w]; break; }
  }
  memo.set(en, hit);
  return hit;
}

/** A stable pastel colour for a word without a picture. */
export function hueFor(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
