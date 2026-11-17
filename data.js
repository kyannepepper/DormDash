// Dorm Dash — menu + campus data
// Concept menu: prices are suggestions, not verified costs. Nutrition numbers are estimates.
// category: "breakfast" | "lunch" | "dinner" | "snack"
// method:   "nocook" | "microwave" | "blender" | "ready"
// storage:  "fridge" | "freezer" | "pantry"
// minutes:  prep time (0 = ready to eat)

const IMG = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

const MEALS = [
  // ---------- Breakfast kits ----------
  {
    id: "overnight-oats", name: "Overnight Oats", price: 3.5, category: "breakfast", method: "nocook",
    minutes: 5, storage: "fridge", keepsDays: 5,
    tags: ["Popular", "Vegetarian"], img: IMG("1517673400267-0251440c45dc"),
    desc: "Oats, milk, berries & honey",
    nutrition: { cal: 380, protein: 13, carbs: 62, fat: 9 },
    ingredients: ["Rolled oats + chia (½ cup)", "Milk (single-serve carton)", "Mixed berries cup", "Honey packet", "Lidded jar"],
    steps: [
      "Pour the oats into the jar.",
      "Add the milk, stir well, and seal the lid.",
      "Put it in the fridge overnight (at least 6 hours).",
      "In the morning, top with berries and drizzle the honey. Eat cold, or microwave 1 minute if you like it warm.",
    ],
  },
  {
    id: "yogurt-parfait", name: "Yogurt Parfait", price: 3.75, category: "breakfast", method: "nocook",
    minutes: 3, storage: "fridge", keepsDays: 4,
    tags: ["Vegetarian"], img: IMG("1488477181946-6428a0291777"),
    desc: "Greek yogurt, granola & fruit",
    nutrition: { cal: 340, protein: 18, carbs: 46, fat: 9 },
    ingredients: ["Greek yogurt cup", "Granola pouch (kept separate so it stays crunchy)", "Fresh fruit cup", "Parfait cup"],
    steps: [
      "Spoon half the yogurt into the parfait cup.",
      "Add half the fruit and half the granola.",
      "Repeat the layers with the rest.",
      "Eat right away so the granola stays crunchy.",
    ],
  },
  {
    id: "pb-banana-toast", name: "PB Banana Toast", price: 2.75, category: "breakfast", method: "nocook",
    minutes: 5, storage: "pantry", keepsDays: 4,
    tags: ["Vegetarian"], img: IMG("1584776296944-ab6fb57b0bdd"),
    desc: "Whole wheat toast, peanut butter & banana",
    nutrition: { cal: 410, protein: 14, carbs: 56, fat: 16 },
    ingredients: ["Whole wheat bread (2 slices)", "Peanut butter cup", "Banana", "Cinnamon packet (optional)"],
    steps: [
      "Toast the bread in a toaster if your dorm allows one. It's also good untoasted.",
      "Spread the peanut butter evenly on both slices.",
      "Slice the banana into thin rounds and lay them on top.",
      "Sprinkle with cinnamon if you like.",
    ],
  },
  {
    id: "egg-bowl", name: "Breakfast Egg Bowl", price: 4.25, category: "breakfast", method: "microwave",
    minutes: 7, storage: "fridge", keepsDays: 4,
    tags: ["Vegetarian", "High protein"], img: IMG("1510693206972-df098062cb71"),
    desc: "Eggs, spinach, cheese & potatoes",
    nutrition: { cal: 420, protein: 22, carbs: 30, fat: 23 },
    ingredients: ["2 eggs (in a sealed cup)", "Pre-roasted diced potatoes", "Baby spinach", "Shredded cheddar", "Microwave-safe bowl"],
    steps: [
      "Put the potatoes in the bowl and microwave for 1 minute.",
      "Crack the eggs over the potatoes, whisk with a fork, and stir in the spinach.",
      "Microwave 45 seconds, stir, then 45–60 seconds more until the eggs are fully set.",
      "Top with cheese and let it melt for 30 seconds.",
    ],
  },
  {
    id: "protein-smoothie", name: "Protein Smoothie", price: 4.5, category: "breakfast", method: "blender",
    minutes: 5, storage: "freezer", keepsDays: 30,
    tags: ["Vegetarian", "High protein"], img: IMG("1553530666-ba11a7da3888"),
    desc: "Greek yogurt, banana, strawberries & milk",
    nutrition: { cal: 360, protein: 24, carbs: 52, fat: 6 },
    ingredients: ["Frozen banana + strawberry pack", "Greek yogurt cup (fridge)", "Milk carton (fridge)"],
    steps: [
      "Take the fruit pack out of the freezer and let it thaw for 5 minutes.",
      "Add the fruit, yogurt and milk to a blender or personal blender cup.",
      "Blend 45–60 seconds until smooth.",
      "No blender? Let the fruit thaw longer, mash it with a fork, and shake everything hard in a lidded cup.",
    ],
  },

  // ---------- Lunch kits ----------
  {
    id: "chicken-wrap", name: "Chicken Wrap", price: 5.5, category: "lunch", method: "nocook",
    minutes: 5, storage: "fridge", keepsDays: 3,
    tags: ["Popular", "High protein"], img: IMG("1626700051175-6818013e1d4f"),
    desc: "Chicken, tortilla, lettuce & dressing",
    nutrition: { cal: 490, protein: 32, carbs: 42, fat: 20 },
    ingredients: ["Large tortilla", "Sliced cooked chicken", "Chopped lettuce", "Dressing cup"],
    steps: [
      "Lay the tortilla flat. Warm it 15 seconds in the microwave if you like.",
      "Lay the chicken down the middle, then add the lettuce.",
      "Drizzle the dressing over the filling.",
      "Fold in the sides, roll it up tight, and cut in half.",
    ],
  },
  {
    id: "turkey-avocado", name: "Turkey Avocado Sandwich", price: 4.75, category: "lunch", method: "nocook",
    minutes: 5, storage: "fridge", keepsDays: 3,
    tags: ["High protein"], img: IMG("1553909489-cd47e0907980"),
    desc: "Turkey, avocado, whole grain bread & tomato",
    nutrition: { cal: 450, protein: 26, carbs: 40, fat: 19 },
    ingredients: ["Whole grain bread (2 slices)", "Sliced turkey", "Avocado cup", "Tomato slices"],
    steps: [
      "Spread the avocado on one slice of bread.",
      "Layer the turkey and tomato on top.",
      "Close with the second slice and press down gently.",
      "Cut diagonally and eat.",
    ],
  },
  {
    id: "caesar-salad", name: "Chicken Caesar Salad", price: 5.25, category: "lunch", method: "nocook",
    minutes: 5, storage: "fridge", keepsDays: 3,
    tags: ["Popular", "High protein"], img: IMG("1512852939750-1305098529bf"),
    desc: "Chicken, romaine, parmesan & croutons",
    nutrition: { cal: 470, protein: 33, carbs: 20, fat: 28 },
    ingredients: ["Chopped romaine", "Sliced cooked chicken", "Shaved parmesan", "Croutons pouch", "Caesar dressing cup", "Lidded salad bowl"],
    steps: [
      "Put the romaine in the salad bowl.",
      "Add the chicken and parmesan.",
      "Pour on the dressing, close the lid, and shake to coat.",
      "Add the croutons last so they stay crunchy.",
    ],
  },
  {
    id: "tuna-sandwich", name: "Tuna Sandwich", price: 4.25, category: "lunch", method: "nocook",
    minutes: 5, storage: "fridge", keepsDays: 3,
    tags: ["High protein"], img: IMG("1509722747041-616f39b57569"),
    desc: "Tuna, light mayo, wheat bread & lettuce",
    nutrition: { cal: 410, protein: 27, carbs: 38, fat: 15 },
    ingredients: ["Tuna pouch", "Light mayo packet", "Wheat bread (2 slices)", "Lettuce leaves", "Mixing cup"],
    steps: [
      "Empty the tuna into the mixing cup.",
      "Add the mayo and stir with a fork until creamy.",
      "Spread the tuna on one slice of bread and add the lettuce.",
      "Close the sandwich and cut in half.",
    ],
  },
  {
    id: "hummus-wrap", name: "Veggie Hummus Wrap", price: 4.5, category: "lunch", method: "nocook",
    minutes: 5, storage: "fridge", keepsDays: 4,
    tags: ["Vegetarian"], img: IMG("1600850056064-a8b380df8395"),
    desc: "Hummus, spinach, cucumber & carrots",
    nutrition: { cal: 380, protein: 12, carbs: 50, fat: 15 },
    ingredients: ["Large tortilla", "Hummus cup", "Baby spinach", "Sliced cucumber", "Shredded carrots"],
    steps: [
      "Spread the hummus over the tortilla, leaving a small border.",
      "Layer the spinach, cucumber and carrots.",
      "Roll it up tightly.",
      "Cut in half and enjoy.",
    ],
  },

  // ---------- Dinner kits ----------
  {
    id: "chicken-rice-bowl", name: "Chicken Rice Bowl", price: 5.5, category: "dinner", method: "microwave",
    minutes: 7, storage: "fridge", keepsDays: 4,
    tags: ["Popular", "High protein"], img: IMG("1604908176997-125f25cc6f3d"),
    desc: "Chicken, rice, broccoli & teriyaki",
    nutrition: { cal: 560, protein: 34, carbs: 70, fat: 12 },
    ingredients: ["Cooked rice", "Cooked chicken pieces", "Broccoli florets", "Teriyaki sauce cup", "Microwave-safe bowl"],
    steps: [
      "Put the rice in the bowl and sprinkle with 1 tablespoon of water.",
      "Add the broccoli and chicken on top and cover loosely.",
      "Microwave 2 minutes, stir, then 1–2 minutes more until steaming.",
      "Pour on the teriyaki sauce and toss.",
    ],
  },
  {
    id: "pasta-kit", name: "Pasta Kit", price: 5.0, category: "dinner", method: "microwave",
    minutes: 8, storage: "fridge", keepsDays: 4,
    tags: ["Vegetarian"], img: IMG("1621996346565-e3dbc646d9a9"),
    desc: "Pasta, marinara, spinach & parmesan",
    nutrition: { cal: 520, protein: 18, carbs: 80, fat: 13 },
    ingredients: ["Cooked penne", "Marinara cup", "Baby spinach", "Parmesan packet", "Microwave-safe bowl"],
    steps: [
      "Put the pasta and marinara in the bowl, stir, and cover loosely.",
      "Microwave 2 minutes, then stir.",
      "Add the spinach and microwave 1 minute more until it wilts.",
      "Stir, top with parmesan, and let it sit 1 minute.",
    ],
  },
  {
    id: "burrito-bowl", name: "Burrito Bowl", price: 5.25, category: "dinner", method: "microwave",
    minutes: 7, storage: "fridge", keepsDays: 4,
    tags: ["Vegetarian"], img: IMG("1623428187969-5da2dcea5ebf"),
    desc: "Rice, beans, corn, salsa & cheese",
    nutrition: { cal: 540, protein: 19, carbs: 86, fat: 13 },
    ingredients: ["Cooked rice", "Black beans", "Roasted corn", "Salsa cup", "Shredded cheese", "Microwave-safe bowl"],
    steps: [
      "Add the rice, beans and corn to the bowl and cover loosely.",
      "Microwave 2 minutes, stir, then 1 minute more.",
      "Sprinkle on the cheese and let it melt.",
      "Spoon the cold salsa on top.",
    ],
  },
  {
    id: "fajita-bowl", name: "Chicken Fajita Bowl", price: 5.75, category: "dinner", method: "microwave",
    minutes: 8, storage: "fridge", keepsDays: 4,
    tags: ["Popular", "High protein"], img: IMG("1546069901-ba9599a7e63c"),
    desc: "Chicken, rice, peppers, onions & salsa",
    nutrition: { cal: 580, protein: 33, carbs: 68, fat: 16 },
    ingredients: ["Cooked rice", "Seasoned fajita chicken", "Sliced peppers + onions", "Salsa cup", "Microwave-safe bowl"],
    steps: [
      "Put the rice in the bowl and add the peppers, onions and chicken on top.",
      "Cover loosely and microwave 2½ minutes.",
      "Stir, then microwave 1½ minutes more until hot all the way through.",
      "Top with salsa.",
    ],
  },
  {
    id: "sweet-potato", name: "Loaded Sweet Potato", price: 4.75, category: "dinner", method: "microwave",
    minutes: 10, storage: "fridge", keepsDays: 5,
    tags: ["Vegetarian"], img: IMG("1540189549336-e6e99c3679fe"),
    desc: "Sweet potato, black beans, cheese & salsa",
    nutrition: { cal: 450, protein: 16, carbs: 74, fat: 10 },
    ingredients: ["Whole sweet potato (washed)", "Black beans", "Shredded cheese", "Salsa cup", "Microwave-safe plate"],
    steps: [
      "Poke the sweet potato 6–8 times with a fork.",
      "Microwave on the plate for 4 minutes, flip it, then 3–4 minutes more until a fork slides in easily.",
      "Split it open, add the beans, and microwave 1 minute.",
      "Top with cheese and salsa.",
    ],
  },
  {
    id: "teriyaki-noodles", name: "Teriyaki Noodle Bowl", price: 5.5, category: "dinner", method: "microwave",
    minutes: 8, storage: "fridge", keepsDays: 4,
    tags: ["High protein"], img: IMG("1585032226651-759b368d7246"),
    desc: "Chicken, noodles, veggies & teriyaki",
    nutrition: { cal: 560, protein: 30, carbs: 72, fat: 14 },
    ingredients: ["Cooked noodles", "Cooked chicken pieces", "Stir-fry veggie mix", "Teriyaki sauce cup", "Microwave-safe bowl"],
    steps: [
      "Put the noodles in the bowl and add 2 tablespoons of water.",
      "Add the veggies and chicken on top and cover loosely.",
      "Microwave 2 minutes, stir, then 1–2 minutes more.",
      "Toss with the teriyaki sauce.",
    ],
  },

  // ---------- Snack kits ----------
  {
    id: "apple-pb", name: "Apple & Peanut Butter", price: 2.0, category: "snack", method: "ready",
    minutes: 0, storage: "fridge", keepsDays: 5,
    tags: ["Vegetarian"], img: IMG("1570913149827-d2ac84ab3f9a"),
    desc: "Fresh apple slices & peanut butter",
    nutrition: { cal: 250, protein: 7, carbs: 28, fat: 14 },
    ingredients: ["Apple slices (treated with lemon so they don't brown)", "Peanut butter cup"],
    steps: ["Open the apple slices and the peanut butter cup.", "Dip and eat."],
  },
  {
    id: "protein-snack", name: "Protein Snack Kit", price: 3.25, category: "snack", method: "ready",
    minutes: 0, storage: "fridge", keepsDays: 5,
    tags: ["Vegetarian"], img: IMG("1452195100486-9cc805987862"),
    desc: "Cheese, crackers & almonds",
    nutrition: { cal: 330, protein: 14, carbs: 20, fat: 22 },
    ingredients: ["Cheese cubes", "Whole grain crackers", "Almonds"],
    steps: ["Keep it in the fridge until you're ready to eat.", "Open it up and snack."],
  },
  {
    id: "cottage-cheese", name: "Cottage Cheese & Fruit", price: 2.75, category: "snack", method: "ready",
    minutes: 0, storage: "fridge", keepsDays: 4,
    tags: ["Vegetarian"], img: IMG("1550258987-190a2d41a8ba"),
    desc: "Cottage cheese & pineapple",
    nutrition: { cal: 200, protein: 14, carbs: 22, fat: 5 },
    ingredients: ["Cottage cheese cup", "Pineapple chunks"],
    steps: ["Stir the pineapple into the cottage cheese, or eat them side by side.", "Eat cold."],
  },
  {
    id: "trail-mix", name: "Trail Mix", price: 2.5, category: "snack", method: "ready",
    minutes: 0, storage: "pantry", keepsDays: 30,
    tags: ["Vegetarian"], img: IMG("1508061253366-f7da158b6d46"),
    desc: "Almonds, raisins, cranberries & chocolate",
    nutrition: { cal: 290, protein: 7, carbs: 30, fat: 17 },
    ingredients: ["Almonds", "Raisins", "Dried cranberries", "Chocolate chips"],
    steps: ["Shake the bag and snack.", "Reseal it to keep the rest fresh."],
  },
  {
    id: "hummus-cup", name: "Hummus & Veggie Cup", price: 3.0, category: "snack", method: "ready",
    minutes: 0, storage: "fridge", keepsDays: 4,
    tags: ["Vegetarian"], img: IMG("1637949385162-e416fb15b2ce"),
    desc: "Hummus with carrots, cucumber & snap peas",
    nutrition: { cal: 180, protein: 7, carbs: 20, fat: 9 },
    ingredients: ["Hummus cup", "Carrot sticks", "Cucumber slices", "Snap peas"],
    steps: ["Peel off the lid.", "Dip the veggies in the hummus."],
  },
];

const CATEGORIES = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

const METHODS = {
  nocook: { label: "No cook" },
  microwave: { label: "Microwave" },
  blender: { label: "Blender" },
  ready: { label: "Ready to eat" },
};

const DORMS = [
  "Maple Hall", "Cedar Hall", "Aspen Hall", "Juniper Hall",
  "Birch Tower", "Willow Commons", "Summit Village", "Riverside Apartments",
];

const MAX_MEALS = 14;
const DASHER_PAY = { perBox: 2.25, routeBase: 4 };
