/* ==========================================================================
   FORM — local food database
   ---------------------------------------------------------------------------
   PROVENANCE & HONESTY NOTE
   Values below are *approximate, rounded* references assembled from public
   composition tables (IFCT 2017 for Indian foods, USDA FoodData Central for
   international foods) and rounded for planning use. They are NOT measured
   values, and a real cooked portion depends on the recipe, oil, brand, and
   how it was weighed. Every entry is therefore presented in the UI as
   "approximate per serving".

   Prices are *editable assumptions per kilogram* in base currency (INR) —
   not live prices. The user can override any of them in Settings.
   ========================================================================== */

import type { Allergen, DietPreference, Food, FoodCategory, FoodStyle } from '@/types'

type Use = NonNullable<Food['use']>[number]

interface FoodSeed {
  id: string
  name: string
  localName?: string
  cat: FoodCategory
  /** diets this food is compatible with; omitted means "all" */
  diet?: DietPreference[]
  al?: Allergen[]
  /** [serving label, grams] */
  serve: [string, number]
  kcal: number
  p: number
  c: number
  f: number
  fib?: number
  /** assumed price per kg, base currency */
  inr: number
  prep?: number
  cook?: Food['cook']
  styles?: FoodStyle[]
  use?: Use[]
  note?: string
}

/**
 * `diet` lists every diet a food is **offered to**, and a vegan or vegetarian
 * ingredient is obviously available to a non-vegetarian, so the plant-based
 * sets expand outward from `vegan`. An egg or a piece of chicken narrows the
 * list instead. Getting this backwards silently starves higher-protein diets
 * of entire food groups, so it is asserted in the test suite.
 */
const ALL: DietPreference[] = ['vegetarian', 'vegan', 'eggs', 'non-vegetarian']
/** no meat or fish, but dairy is fine */
const VEG: DietPreference[] = ['vegetarian', 'eggs', 'non-vegetarian']
/** no animal products at all — available to everyone */
const VEGAN: DietPreference[] = ALL
/** meat or fish */
const NONVEG: DietPreference[] = ['non-vegetarian']
/** eggs but no meat or fish */
const EGGS: DietPreference[] = ['eggs', 'non-vegetarian']

const INDIAN: FoodStyle[] = ['south-indian', 'north-indian', 'mughlai', 'street-food', 'global']
const SOUTH: FoodStyle[] = ['south-indian', 'global']
const NORTH: FoodStyle[] = ['north-indian', 'mughlai', 'global']
const STREET: FoodStyle[] = ['street-food', 'global']
const CONT: FoodStyle[] = ['continental', 'global']
const MED: FoodStyle[] = ['mediterranean', 'global']
const ASIAN: FoodStyle[] = ['east-asian', 'global']

const SEEDS: FoodSeed[] = [
  /* ---------------- GRAINS & STARCHES ---------------- */
  {
    id: 'roti-wheat', name: 'Whole wheat roti', localName: 'रोटी / Chapati', cat: 'grain',
    al: ['gluten'], serve: ['1 medium (40 g)', 40],
    kcal: 120, p: 3.5, c: 22, f: 1.5, fib: 3, inr: 55, prep: 15, cook: 'cook',
    styles: INDIAN, use: ['lunch', 'dinner'], note: 'Weight varies a lot with size — this assumes ~40 g.',
  },
  {
    id: 'roti-bajra', name: 'Bajra roti', localName: 'बाजरा रोटी', cat: 'grain', diet: VEGAN,
    al: ['gluten'], serve: ['1 medium (50 g)', 50],
    kcal: 130, p: 3.5, c: 24, f: 1.5, fib: 4, inr: 70, prep: 20, cook: 'cook', styles: NORTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'roti-jowar', name: 'Jowar roti', localName: 'ज्वार रोटी', cat: 'grain', diet: VEGAN,
    al: ['gluten'], serve: ['1 medium (50 g)', 50],
    kcal: 120, p: 3, c: 24, f: 1, fib: 3.5, inr: 65, prep: 20, cook: 'cook', styles: NORTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'rice-brown', name: 'Brown rice, cooked', cat: 'grain', diet: VEGAN,
    serve: ['1 cup (195 g)', 195], kcal: 216, p: 5, c: 44.8, f: 1.8, fib: 3.5, inr: 90,
    prep: 30, cook: 'cook', styles: INDIAN, use: ['lunch', 'dinner'],
  },
  {
    id: 'rice-white', name: 'White rice, cooked', cat: 'grain', diet: VEGAN,
    serve: ['1 cup (158 g)', 158], kcal: 205, p: 4.3, c: 44.5, f: 0.4, fib: 0.6, inr: 60,
    prep: 25, cook: 'cook', styles: INDIAN, use: ['lunch', 'dinner'],
  },
  {
    id: 'jeera-rice', name: 'Jeera rice', localName: 'जीरा चावल', cat: 'grain', diet: VEG,
    serve: ['1 cup (200 g)', 200], kcal: 250, p: 5, c: 50, f: 4, fib: 1.5, inr: 70,
    prep: 25, cook: 'cook', styles: INDIAN, use: ['lunch', 'dinner'],
  },
  {
    id: 'oats-rolled', name: 'Rolled oats, dry', cat: 'grain', diet: VEGAN, al: ['gluten'],
    serve: ['50 g (about ½ cup)', 50], kcal: 190, p: 6.6, c: 33, f: 3.4, fib: 5, inr: 180,
    prep: 5, cook: 'heat', styles: CONT, use: ['breakfast', 'pre-workout'],
  },
  {
    id: 'idli', name: 'Idli', localName: 'इडली', cat: 'grain', diet: VEGAN,
    serve: ['2 medium (100 g)', 100], kcal: 120, p: 4, c: 25, f: 1, fib: 3, inr: 50,
    prep: 20, cook: 'cook', styles: SOUTH, use: ['breakfast'],
  },
  {
    id: 'dosa-plain', name: 'Plain dosa', localName: 'डोसा', cat: 'grain', diet: VEGAN, al: ['gluten'],
    serve: ['1 medium (100 g)', 100], kcal: 170, p: 3.5, c: 30, f: 4, fib: 1.5, inr: 70,
    prep: 20, cook: 'heat', styles: SOUTH, use: ['breakfast', 'dinner'],
  },
  {
    id: 'dosa-masala', name: 'Masala dosa with sambar', localName: 'मसाला डोसा', cat: 'grain', diet: VEG,
    al: ['gluten', 'soy'], serve: ['1 plate (200 g)', 200], kcal: 330, p: 8, c: 52, f: 9, fib: 4, inr: 90,
    prep: 30, cook: 'heat', styles: SOUTH, use: ['breakfast'],
  },
  {
    id: 'rava-dosa', name: 'Rava dosa', localName: 'रवा डोसा', cat: 'grain', diet: VEGAN, al: ['gluten'],
    serve: ['1 (100 g)', 100], kcal: 250, p: 5.5, c: 40, f: 8, fib: 1, inr: 80,
    prep: 25, cook: 'heat', styles: SOUTH, use: ['breakfast', 'dinner'],
  },
  {
    id: 'uttapam', name: 'Uttapam', localName: 'उत्तपम', cat: 'grain', diet: VEGAN, al: ['gluten'],
    serve: ['1 (80 g)', 80], kcal: 130, p: 3.5, c: 25, f: 2, fib: 2, inr: 70,
    prep: 20, cook: 'heat', styles: SOUTH, use: ['breakfast'],
  },
  {
    id: 'appam', name: 'Appam', localName: 'अप्पम', cat: 'grain', diet: VEGAN, al: ['gluten'],
    serve: ['1 (40 g)', 40], kcal: 90, p: 2, c: 17, f: 2, fib: 0.5, inr: 70,
    prep: 25, cook: 'heat', styles: SOUTH, use: ['breakfast', 'dinner'],
  },
  {
    id: 'poha', name: 'Vegetable poha', localName: 'पोहा', cat: 'grain', diet: VEG,
    serve: ['1 plate (200 g)', 200], kcal: 270, p: 5, c: 52, f: 5, fib: 3, inr: 60,
    prep: 20, cook: 'heat', styles: STREET, use: ['breakfast'],
  },
  {
    id: 'upma', name: 'Rava upma', localName: 'उपमा', cat: 'grain', diet: VEGAN, al: ['gluten'],
    serve: ['1 plate (200 g)', 200], kcal: 280, p: 7, c: 46, f: 8, fib: 3, inr: 55,
    prep: 20, cook: 'heat', styles: SOUTH, use: ['breakfast'],
  },
  {
    id: 'paratha', name: 'Whole wheat paratha', localName: 'पराठा', cat: 'grain', diet: VEG, al: ['gluten'],
    serve: ['1 (80 g)', 80], kcal: 230, p: 6, c: 32, f: 9, fib: 3, inr: 60,
    prep: 25, cook: 'heat', styles: NORTH, use: ['breakfast'],
  },
  {
    id: 'puri', name: 'Puri', localName: 'पूरी', cat: 'grain', diet: VEGAN, al: ['gluten'],
    serve: ['2 small (60 g)', 60], kcal: 220, p: 5, c: 30, f: 8, fib: 1, inr: 55,
    prep: 25, cook: 'heat', styles: NORTH, use: ['breakfast'],
  },
  {
    id: 'bread-brown', name: 'Brown bread', cat: 'grain', diet: VEGAN, al: ['gluten'],
    serve: ['2 slices (60 g)', 60], kcal: 150, p: 6, c: 28, f: 1.5, fib: 3.5, inr: 80,
    prep: 3, cook: 'none', styles: CONT, use: ['breakfast', 'snack'],
  },
  {
    id: 'pasta-cooked', name: 'Pasta, cooked', cat: 'grain', diet: VEGAN, al: ['gluten'],
    serve: ['1 cup (140 g)', 140], kcal: 220, p: 8, c: 43, f: 1.3, fib: 2.5, inr: 120,
    prep: 20, cook: 'cook', styles: CONT, use: ['lunch', 'dinner'],
  },
  {
    id: 'quinoa', name: 'Quinoa, cooked', cat: 'grain', diet: VEGAN,
    serve: ['1 cup (185 g)', 185], kcal: 222, p: 8.1, c: 39.4, f: 3.6, fib: 5.2, inr: 400,
    prep: 20, cook: 'cook', styles: MED, use: ['lunch', 'dinner'],
  },
  {
    id: 'sweet-potato', name: 'Sweet potato, roasted', cat: 'vegetable', diet: VEGAN,
    serve: ['1 medium (130 g)', 130], kcal: 115, p: 2, c: 27, f: 0.1, fib: 4, inr: 40,
    prep: 40, cook: 'cook', styles: CONT, use: ['snack', 'pre-workout', 'lunch'],
  },
  {
    id: 'potato', name: 'Potato, boiled', cat: 'vegetable', diet: VEGAN,
    serve: ['1 medium (150 g)', 150], kcal: 130, p: 3, c: 30, f: 0.1, fib: 2.5, inr: 30,
    prep: 15, cook: 'cook', styles: INDIAN, use: ['lunch', 'dinner'],
  },

  /* ---------------- PROTEINS ---------------- */
  {
    id: 'chicken-breast', name: 'Chicken breast, grilled', cat: 'protein', diet: NONVEG,
    serve: ['100 g', 100], kcal: 165, p: 31, c: 0, f: 3.6, inr: 320,
    prep: 20, cook: 'heat', styles: CONT, use: ['lunch', 'dinner', 'post-workout'],
  },
  {
    id: 'chicken-curry', name: 'Home-style chicken curry', localName: 'मुर्ग़ी करी', cat: 'protein', diet: NONVEG,
    serve: ['1 cup (200 g)', 200], kcal: 280, p: 28, c: 8, f: 15, inr: 300,
    prep: 35, cook: 'cook', styles: INDIAN, use: ['lunch', 'dinner'],
  },
  {
    id: 'tandoori-chicken', name: 'Tandoori chicken', localName: 'तंदूरी चिकन', cat: 'protein', diet: NONVEG,
    serve: ['2 pieces (150 g)', 150], kcal: 250, p: 35, c: 3, f: 11, inr: 340,
    prep: 20, cook: 'heat', styles: NORTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'fish-curry', name: 'Fish curry', localName: 'मछली करी', cat: 'protein', diet: NONVEG,
    al: ['fish'], serve: ['1 cup (200 g)', 200], kcal: 220, p: 24, c: 6, f: 11, inr: 240,
    prep: 35, cook: 'cook', styles: INDIAN, use: ['lunch', 'dinner'],
  },
  {
    id: 'tandoori-fish', name: 'Tandoori fish', cat: 'protein', diet: NONVEG,
    al: ['fish'], serve: ['1 fillet (150 g)', 150], kcal: 210, p: 30, c: 3, f: 8, inr: 400,
    prep: 20, cook: 'heat', styles: NORTH, use: ['dinner'],
  },
  {
    id: 'egg-whole', name: 'Egg, whole', cat: 'protein', diet: EGGS, al: ['egg'],
    serve: ['1 large (50 g)', 50], kcal: 72, p: 6.3, c: 0.4, f: 4.8, inr: 180,
    prep: 12, cook: 'heat', styles: INDIAN, use: ['breakfast', 'lunch', 'post-workout'],
  },
  {
    id: 'egg-white', name: 'Egg white', cat: 'protein', diet: EGGS, al: ['egg'],
    serve: ['1 large (33 g)', 33], kcal: 17, p: 3.6, c: 0.2, f: 0.1, inr: 180,
    prep: 2, cook: 'none', styles: CONT, use: ['breakfast', 'post-workout'],
  },
  {
    id: 'egg-bhurji', name: 'Masala egg bhurji', cat: 'protein', diet: EGGS, al: ['egg'],
    serve: ['2 eggs with onion (120 g)', 120], kcal: 200, p: 13, c: 6, f: 14, inr: 200,
    prep: 15, cook: 'heat', styles: STREET, use: ['breakfast'],
  },
  {
    id: 'paneer', name: 'Paneer', localName: 'पनीर', cat: 'protein', diet: VEG, al: ['milk'],
    serve: ['100 g', 100], kcal: 265, p: 18, c: 3.6, f: 20, inr: 320,
    prep: 5, cook: 'none', styles: INDIAN, use: ['lunch', 'dinner', 'snack'],
  },
  {
    id: 'paneer-tikka', name: 'Paneer tikka', cat: 'protein', diet: VEG, al: ['milk'],
    serve: ['1 skewer (150 g)', 150], kcal: 300, p: 26, c: 8, f: 18, inr: 340,
    prep: 30, cook: 'heat', styles: NORTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'tofu', name: 'Firm tofu', cat: 'protein', diet: VEGAN, al: ['soy'],
    serve: ['100 g', 100], kcal: 145, p: 17, c: 2.8, f: 8.7, inr: 200,
    prep: 10, cook: 'none', styles: ASIAN, use: ['lunch', 'dinner'],
  },
  {
    id: 'soya-chunks', name: 'Soya chunks, cooked', localName: 'सोया चंक्स', cat: 'protein', diet: VEGAN, al: ['soy'],
    serve: ['1 cup (150 g)', 150], kcal: 195, p: 21, c: 15, f: 7.5, fib: 4, inr: 90,
    prep: 25, cook: 'cook', styles: NORTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'tempeh', name: 'Tempeh', cat: 'protein', diet: VEGAN, al: ['soy'],
    serve: ['100 g', 100], kcal: 195, p: 20, c: 8, f: 11, fib: 5, inr: 400,
    prep: 20, cook: 'heat', styles: ASIAN, use: ['lunch', 'dinner'],
  },
  {
    id: 'whey-protein', name: 'Whey protein powder', cat: 'protein', diet: VEG, al: ['milk'],
    serve: ['1 scoop (30 g)', 30], kcal: 120, p: 24, c: 3, f: 1.5, inr: 3000,
    prep: 2, cook: 'none', styles: CONT, use: ['post-workout', 'snack'],
    note: 'A convenience food, not a requirement — whole foods can cover the same protein.',
  },
  {
    id: 'chana-boiled', name: 'Boiled chickpeas', localName: 'चना', cat: 'legume', diet: VEGAN, al: [],
    serve: ['1 cup (164 g)', 164], kcal: 270, p: 14.5, c: 45, f: 2.7, fib: 12, inr: 90,
    prep: 60, cook: 'cook', styles: STREET, use: ['lunch', 'snack'],
  },
  {
    id: 'rajma', name: 'Rajma, cooked', localName: 'राजमा', cat: 'legume', diet: VEGAN,
    serve: ['1 cup (200 g)', 200], kcal: 250, p: 15, c: 45, f: 1.5, fib: 13, inr: 120,
    prep: 45, cook: 'cook', styles: NORTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'dal-moong', name: 'Moong dal, cooked', localName: 'मूंग दाल', cat: 'legume', diet: VEGAN,
    serve: ['1 cup (200 g)', 200], kcal: 230, p: 16, c: 40, f: 1, fib: 12, inr: 120,
    prep: 35, cook: 'cook', styles: NORTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'dal-toor', name: 'Toor dal, cooked', localName: 'तूर दाल', cat: 'legume', diet: VEGAN,
    serve: ['1 cup (200 g)', 200], kcal: 220, p: 14, c: 40, f: 1, fib: 11, inr: 140,
    prep: 40, cook: 'cook', styles: SOUTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'dal-masoor', name: 'Masoor dal, cooked', localName: 'मसूर दाल', cat: 'legume', diet: VEGAN,
    serve: ['1 cup (200 g)', 200], kcal: 230, p: 15, c: 40, f: 1, fib: 12, inr: 110,
    prep: 30, cook: 'cook', styles: NORTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'dal-chana', name: 'Chana dal, cooked', localName: 'चना दाल', cat: 'legume', diet: VEGAN,
    serve: ['1 cup (200 g)', 200], kcal: 250, p: 16, c: 45, f: 2, fib: 13, inr: 110,
    prep: 40, cook: 'cook', styles: NORTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'sprouts', name: 'Mixed sprouts salad', localName: 'स्प्राउट्स', cat: 'legume', diet: VEGAN,
    serve: ['1 cup (100 g)', 100], kcal: 100, p: 8, c: 18, f: 0.5, fib: 6, inr: 80,
    prep: 10, cook: 'none', styles: STREET, use: ['lunch', 'snack'],
  },

  /* ---------------- DAIRY & ALTERNATIVES ---------------- */
  {
    id: 'milk-toned', name: 'Toned milk', localName: 'टोन्ड मिल्क', cat: 'dairy', diet: VEG, al: ['milk'],
    serve: ['1 glass (250 ml)', 250], kcal: 150, p: 8, c: 12, f: 6, inr: 56,
    prep: 2, cook: 'none', styles: INDIAN, use: ['breakfast', 'snack', 'post-workout'],
  },
  {
    id: 'milk-full', name: 'Full-fat milk', localName: 'फुल फैट मिल्क', cat: 'dairy', diet: VEG, al: ['milk'],
    serve: ['1 glass (250 ml)', 250], kcal: 170, p: 7.5, c: 12, f: 10, inr: 60,
    prep: 2, cook: 'none', styles: INDIAN, use: ['breakfast', 'snack'],
  },
  {
    id: 'curd', name: 'Curd / dahi', localName: 'दही', cat: 'dairy', diet: VEG, al: ['milk'],
    serve: ['1 cup (200 g)', 200], kcal: 120, p: 7, c: 9, f: 7, inr: 90,
    prep: 3, cook: 'none', styles: INDIAN, use: ['breakfast', 'snack', 'lunch'],
  },
  {
    id: 'greek-yogurt', name: 'Greek yogurt', cat: 'dairy', diet: VEG, al: ['milk'],
    serve: ['1 cup (200 g)', 200], kcal: 130, p: 20, c: 9, f: 0.7, inr: 300,
    prep: 3, cook: 'none', styles: CONT, use: ['breakfast', 'snack', 'post-workout'],
  },
  {
    id: 'buttermilk', name: 'Chaas', localName: 'छाछ / मट्ठा', cat: 'dairy', diet: VEG, al: ['milk'],
    serve: ['1 glass (250 ml)', 250], kcal: 60, p: 3, c: 6, f: 2.5, inr: 45,
    prep: 3, cook: 'none', styles: NORTH, use: ['lunch', 'snack'],
  },
  {
    id: 'cheese-slice', name: 'Processed cheese slice', cat: 'dairy', diet: VEG, al: ['milk'],
    serve: ['1 slice (30 g)', 30], kcal: 100, p: 6, c: 1, f: 8, inr: 400,
    prep: 2, cook: 'none', styles: CONT, use: ['breakfast', 'snack'],
  },
  {
    id: 'soymilk', name: 'Soy milk, unsweetened', cat: 'dairy', diet: VEGAN, al: ['soy'],
    serve: ['1 glass (250 ml)', 250], kcal: 80, p: 7, c: 4, f: 4, inr: 120,
    prep: 2, cook: 'none', styles: CONT, use: ['breakfast', 'snack'],
  },

  /* ---------------- VEGETABLES ---------------- */
  {
    id: 'broccoli', name: 'Broccoli, steamed', cat: 'vegetable', diet: VEGAN,
    serve: ['1 cup (156 g)', 156], kcal: 55, p: 3.7, c: 11.2, f: 0.6, fib: 5.1, inr: 60,
    prep: 12, cook: 'heat', styles: CONT, use: ['lunch', 'dinner'],
  },
  {
    id: 'spinach', name: 'Spinach, cooked', localName: 'पालक', cat: 'vegetable', diet: VEGAN,
    serve: ['1 cup (180 g)', 180], kcal: 40, p: 4.2, c: 6.5, f: 0.5, fib: 3.6, inr: 30,
    prep: 12, cook: 'heat', styles: INDIAN, use: ['lunch', 'dinner'],
  },
  {
    id: 'mixed-veg', name: 'Mixed vegetable sabzi', localName: 'मिक्स सब्ज़ी', cat: 'vegetable', diet: VEGAN,
    serve: ['1 cup (200 g)', 200], kcal: 120, p: 4, c: 16, f: 5, fib: 5, inr: 45,
    prep: 25, cook: 'cook', styles: INDIAN, use: ['lunch', 'dinner'],
  },
  {
    id: 'palak-sabzi', name: 'Palak sabzi', cat: 'vegetable', diet: VEGAN,
    serve: ['1 cup (200 g)', 200], kcal: 100, p: 4, c: 8, f: 6, fib: 4, inr: 35,
    prep: 25, cook: 'cook', styles: NORTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'bhindi', name: 'Bhindi (okra)', cat: 'vegetable', diet: VEGAN,
    serve: ['1 cup (100 g)', 100], kcal: 35, p: 2, c: 7, f: 0.2, fib: 3, inr: 50,
    prep: 20, cook: 'cook', styles: NORTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'lauki', name: 'Lauki sabzi', cat: 'vegetable', diet: VEGAN,
    serve: ['1 cup (200 g)', 200], kcal: 60, p: 2, c: 9, f: 2.5, fib: 4, inr: 30,
    prep: 25, cook: 'cook', styles: NORTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'baingan', name: 'Baingan bharta', cat: 'vegetable', diet: VEGAN,
    serve: ['1 cup (200 g)', 200], kcal: 90, p: 3, c: 10, f: 5, fib: 5, inr: 35,
    prep: 30, cook: 'cook', styles: NORTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'cabbage', name: 'Cabbage, cooked', cat: 'vegetable', diet: VEGAN,
    serve: ['1 cup (150 g)', 150], kcal: 40, p: 1.5, c: 8.5, f: 0.2, fib: 3, inr: 25,
    prep: 15, cook: 'cook', styles: INDIAN, use: ['lunch', 'dinner'],
  },
  {
    id: 'carrot', name: 'Carrot', cat: 'vegetable', diet: VEGAN,
    serve: ['1 medium (61 g)', 61], kcal: 25, p: 0.6, c: 6, f: 0.1, fib: 1.7, inr: 45,
    prep: 3, cook: 'none', styles: CONT, use: ['snack'],
  },
  {
    id: 'beetroot', name: 'Beetroot, boiled', cat: 'vegetable', diet: VEGAN,
    serve: ['1 cup (136 g)', 136], kcal: 75, p: 3, c: 17, f: 0.2, fib: 3, inr: 45,
    prep: 15, cook: 'cook', styles: CONT, use: ['lunch', 'snack'],
  },
  {
    id: 'mushroom', name: 'Mushrooms, sautéed', cat: 'vegetable', diet: VEGAN,
    serve: ['1 cup (180 g)', 180], kcal: 80, p: 6, c: 8, f: 2, fib: 3, inr: 120,
    prep: 15, cook: 'heat', styles: CONT, use: ['lunch', 'dinner'],
  },
  {
    id: 'salad-bowl', name: 'Mixed salad bowl', cat: 'vegetable', diet: VEGAN,
    serve: ['1 bowl (150 g)', 150], kcal: 35, p: 2, c: 6, f: 0.5, fib: 3, inr: 40,
    prep: 8, cook: 'none', styles: CONT, use: ['lunch', 'dinner', 'snack'],
  },
  {
    id: 'onion', name: 'Onion', cat: 'vegetable', diet: VEGAN,
    serve: ['1 medium (100 g)', 100], kcal: 40, p: 1.2, c: 9, f: 0.1, fib: 1.6, inr: 35,
    prep: 3, cook: 'none', styles: INDIAN, use: ['lunch', 'dinner'],
  },
  {
    id: 'tomato', name: 'Tomato', cat: 'vegetable', diet: VEGAN,
    serve: ['1 medium (120 g)', 120], kcal: 22, p: 1.1, c: 4.7, f: 0.2, fib: 1.2, inr: 40,
    prep: 3, cook: 'none', styles: INDIAN, use: ['lunch', 'dinner'],
  },

  /* ---------------- FRUITS ---------------- */
  {
    id: 'banana', name: 'Banana', cat: 'fruit', diet: VEGAN,
    serve: ['1 medium (118 g)', 118], kcal: 105, p: 1.3, c: 27, f: 0.4, fib: 3.1, inr: 60,
    prep: 2, cook: 'none', styles: CONT, use: ['pre-workout', 'snack'],
  },
  {
    id: 'apple', name: 'Apple', cat: 'fruit', diet: VEGAN,
    serve: ['1 medium (182 g)', 182], kcal: 95, p: 0.5, c: 25, f: 0.3, fib: 4.4, inr: 180,
    prep: 2, cook: 'none', styles: CONT, use: ['snack'],
  },
  {
    id: 'guava', name: 'Guava', localName: 'अमरूद', cat: 'fruit', diet: VEGAN,
    serve: ['1 medium (150 g)', 150], kcal: 68, p: 2.6, c: 14, f: 0.9, fib: 5.4, inr: 80,
    prep: 2, cook: 'none', styles: INDIAN, use: ['snack', 'pre-workout'],
  },
  {
    id: 'papaya', name: 'Papaya', localName: 'पपीता', cat: 'fruit', diet: VEGAN,
    serve: ['1 cup (152 g)', 152], kcal: 60, p: 0.8, c: 15, f: 0.3, fib: 2.8, inr: 50,
    prep: 3, cook: 'none', styles: INDIAN, use: ['snack', 'breakfast'],
  },
  {
    id: 'orange', name: 'Orange', cat: 'fruit', diet: VEGAN,
    serve: ['1 medium (131 g)', 131], kcal: 62, p: 1.2, c: 15.4, f: 0.2, fib: 3.1, inr: 80,
    prep: 3, cook: 'none', styles: CONT, use: ['snack'],
  },
  {
    id: 'pomegranate', name: 'Pomegranate seeds', localName: 'अनार', cat: 'fruit', diet: VEGAN,
    serve: ['1 cup (174 g)', 174], kcal: 183, p: 3.7, c: 31, f: 4, fib: 6.3, inr: 140,
    prep: 5, cook: 'none', styles: INDIAN, use: ['snack'],
  },
  {
    id: 'watermelon', name: 'Watermelon', cat: 'fruit', diet: VEGAN,
    serve: ['1 cup (152 g)', 152], kcal: 46, p: 0.9, c: 11.6, f: 0.2, fib: 0.4, inr: 25,
    prep: 4, cook: 'none', styles: INDIAN, use: ['snack', 'post-workout'],
  },
  {
    id: 'mango', name: 'Mango', localName: 'आम', cat: 'fruit', diet: VEGAN,
    serve: ['1 cup (165 g)', 165], kcal: 99, p: 1.4, c: 25, f: 0.6, fib: 2.6, inr: 120,
    prep: 4, cook: 'none', styles: INDIAN, use: ['snack'],
  },
  {
    id: 'pineapple', name: 'Pineapple', cat: 'fruit', diet: VEGAN,
    serve: ['1 cup (165 g)', 165], kcal: 82, p: 0.9, c: 21.6, f: 0.2, fib: 2.3, inr: 60,
    prep: 5, cook: 'none', styles: CONT, use: ['snack'],
  },
  {
    id: 'blueberries', name: 'Blueberries', cat: 'fruit', diet: VEGAN,
    serve: ['1 cup (148 g)', 148], kcal: 84, p: 1.1, c: 21, f: 0.5, fib: 3.6, inr: 800,
    prep: 2, cook: 'none', styles: CONT, use: ['snack', 'breakfast'],
  },
  {
    id: 'strawberries', name: 'Strawberries', cat: 'fruit', diet: VEGAN,
    serve: ['1 cup (152 g)', 152], kcal: 49, p: 1, c: 12, f: 0.5, fib: 3, inr: 250,
    prep: 2, cook: 'none', styles: CONT, use: ['snack', 'breakfast'],
  },
  {
    id: 'fruit-bowl', name: 'Mixed fruit bowl', cat: 'fruit', diet: VEGAN,
    serve: ['1 cup (150 g)', 150], kcal: 75, p: 1, c: 19, f: 0.4, fib: 3, inr: 90,
    prep: 6, cook: 'none', styles: CONT, use: ['snack', 'breakfast'],
  },

  /* ---------------- NUTS, SEEDS & FATS ---------------- */
  {
    id: 'peanuts', name: 'Roasted peanuts', localName: 'मूंगफली', cat: 'nuts', diet: VEGAN, al: ['peanut'],
    serve: ['30 g (small katori)', 30], kcal: 170, p: 7.3, c: 6, f: 15, fib: 2.5, inr: 120,
    prep: 2, cook: 'none', styles: STREET, use: ['snack', 'pre-workout'],
  },
  {
    id: 'almonds', name: 'Almonds', cat: 'nuts', diet: VEGAN, al: ['tree-nut'],
    serve: ['10 almonds (12 g)', 12], kcal: 70, p: 2.5, c: 2.4, f: 6, fib: 1.5, inr: 700,
    prep: 2, cook: 'none', styles: CONT, use: ['snack'],
  },
  {
    id: 'walnuts', name: 'Walnuts', cat: 'nuts', diet: VEGAN, al: ['tree-nut'],
    serve: ['30 g (small katori)', 30], kcal: 196, p: 4.6, c: 4.1, f: 19.6, fib: 2, inr: 900,
    prep: 2, cook: 'none', styles: CONT, use: ['snack'],
  },
  {
    id: 'cashews', name: 'Cashews', cat: 'nuts', diet: VEGAN, al: ['tree-nut'],
    serve: ['30 g (small katori)', 30], kcal: 165, p: 5.4, c: 9.2, f: 13.1, fib: 1, inr: 800,
    prep: 2, cook: 'none', styles: SOUTH, use: ['snack'],
  },
  {
    id: 'pumpkin-seeds', name: 'Pumpkin seeds', cat: 'nuts', diet: VEGAN,
    serve: ['30 g', 30], kcal: 170, p: 9, c: 2.8, f: 14.5, fib: 1.8, inr: 500,
    prep: 2, cook: 'none', styles: CONT, use: ['snack'],
  },
  {
    id: 'peanut-butter', name: 'Peanut butter', cat: 'fat', diet: VEGAN, al: ['peanut'],
    serve: ['1 tbsp (16 g)', 16], kcal: 95, p: 4, c: 3, f: 8, fib: 1, inr: 400,
    prep: 2, cook: 'none', styles: CONT, use: ['snack', 'pre-workout'],
  },
  {
    id: 'ghee', name: 'Ghee', localName: 'घी', cat: 'fat', diet: VEG, al: ['milk'],
    serve: ['1 tsp (5 g)', 5], kcal: 45, p: 0, c: 0, f: 5, inr: 600,
    prep: 1, cook: 'none', styles: INDIAN, use: ['lunch', 'dinner'],
  },
  {
    id: 'cooking-oil', name: 'Cooking oil', cat: 'fat', diet: VEGAN,
    serve: ['1 tbsp (15 g)', 15], kcal: 120, p: 0, c: 0, f: 14, inr: 180,
    prep: 1, cook: 'none', styles: INDIAN, use: ['lunch', 'dinner'],
  },
  {
    id: 'coconut', name: 'Fresh coconut, grated', localName: 'नारियल', cat: 'fat', diet: VEGAN,
    serve: ['1 cup (100 g)', 100], kcal: 354, p: 3.3, c: 15, f: 33, fib: 9, inr: 60,
    prep: 10, cook: 'none', styles: SOUTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'coconut-oil', name: 'Coconut oil', cat: 'fat', diet: VEGAN,
    serve: ['1 tbsp (15 g)', 15], kcal: 120, p: 0, c: 0, f: 13, inr: 300,
    prep: 1, cook: 'none', styles: SOUTH, use: ['lunch', 'dinner'],
  },
  {
    id: 'tahini', name: 'Tahini / sesame paste', cat: 'fat', diet: VEGAN, al: ['sesame'],
    serve: ['1 tbsp (15 g)', 15], kcal: 90, p: 2.6, c: 3.2, f: 8, inr: 500,
    prep: 2, cook: 'none', styles: MED, use: ['snack'],
  },

  /* ---------------- PANTRY ---------------- */
  {
    id: 'sugar', name: 'Sugar', cat: 'pantry', diet: VEGAN,
    serve: ['1 tsp (5 g)', 5], kcal: 20, p: 0, c: 5, f: 0, inr: 45,
    prep: 1, cook: 'none', styles: INDIAN,
  },
  {
    id: 'honey', name: 'Honey', cat: 'pantry', diet: VEGAN,
    serve: ['1 tbsp (21 g)', 21], kcal: 64, p: 0.2, c: 17, f: 0, inr: 500,
    prep: 1, cook: 'none', styles: INDIAN, use: ['breakfast'],
  },
  {
    id: 'jam', name: 'Fruit jam', cat: 'pantry', diet: VEGAN,
    serve: ['1 tbsp (20 g)', 20], kcal: 52, p: 0.3, c: 13, f: 0, inr: 200,
    prep: 1, cook: 'none', styles: CONT, use: ['breakfast'],
  },
  {
    id: 'dark-chocolate', name: 'Dark chocolate, 85%', cat: 'pantry', diet: VEGAN, al: ['milk', 'soy'],
    serve: ['20 g (about 2 squares)', 20],
    kcal: 120, p: 2, c: 7, f: 10, fib: 2, inr: 600,
    prep: 1, cook: 'none', styles: CONT, use: ['snack'],
  },
  {
    id: 'soy-sauce', name: 'Soy sauce', cat: 'pantry', diet: VEGAN, al: ['soy', 'gluten'],
    serve: ['1 tbsp (16 g)', 16], kcal: 10, p: 1, c: 1, f: 0, inr: 200,
    prep: 1, cook: 'none', styles: ASIAN, use: ['lunch', 'dinner'],
  },
  {
    id: 'coconut-water', name: 'Coconut water', localName: 'नारियल पानी', cat: 'drink', diet: VEGAN,
    serve: ['1 glass (250 ml)', 250], kcal: 45, p: 1, c: 9, f: 0.5, inr: 80,
    prep: 2, cook: 'none', styles: SOUTH, use: ['post-workout'],
  },
  {
    id: 'green-tea', name: 'Green tea', localName: 'हरी चाय', cat: 'drink', diet: VEGAN,
    serve: ['1 cup (200 ml)', 200], kcal: 2, p: 0, c: 0, f: 0, inr: 300,
    prep: 4, cook: 'heat', styles: INDIAN, use: ['snack'],
  },
  {
    id: 'coffee', name: 'Black coffee', cat: 'drink', diet: VEGAN,
    serve: ['1 cup (200 ml)', 200], kcal: 2, p: 0.2, c: 0, f: 0, inr: 700,
    prep: 4, cook: 'heat', styles: INDIAN, use: ['pre-workout', 'snack'],
  },
  {
    id: 'sports-drink', name: 'Electrolyte drink', cat: 'drink', diet: VEGAN,
    serve: ['1 bottle (500 ml)', 500], kcal: 130, p: 0, c: 32, f: 0, inr: 200,
    prep: 1, cook: 'none', styles: CONT, use: ['post-workout'],
  },
  {
    id: 'lassi-sweet', name: 'Sweet lassi', localName: 'लस्सी', cat: 'drink', diet: VEG, al: ['milk'],
    serve: ['1 glass (200 ml)', 200], kcal: 130, p: 5, c: 22, f: 3.5, inr: 90,
    prep: 5, cook: 'none', styles: NORTH, use: ['snack'],
  },
  {
    id: 'coconut-milk', name: 'Coconut milk, canned', cat: 'fat', diet: VEGAN,
    serve: ['1 cup (240 ml)', 240], kcal: 200, p: 2, c: 6, f: 20, inr: 220,
    prep: 2, cook: 'none', styles: ASIAN, use: ['lunch', 'dinner'],
  },
]

/* ------------------------------------------------------------------------- */

function toFood(seed: FoodSeed): Food {
  return {
    id: seed.id,
    name: seed.name,
    localName: seed.localName,
    category: seed.cat,
    diet: seed.diet ?? ALL,
    allergens: seed.al ?? [],
    serving: { label: seed.serve[0], grams: seed.serve[1] },
    per: {
      kcal: seed.kcal,
      protein: seed.p,
      carbs: seed.c,
      fat: seed.f,
      fiber: seed.fib ?? 0,
    },
    costPerKg: seed.inr,
    prepMinutes: seed.prep ?? 10,
    cook: seed.cook ?? 'cook',
    styles: seed.styles ?? INDIAN,
    use: seed.use,
    note: seed.note,
  }
}

export const FOODS: Food[] = SEEDS.map(toFood)

export const FOODS_BY_ID: ReadonlyMap<string, Food> = new Map(FOODS.map((f) => [f.id, f]))

export function getFood(id: string): Food | undefined {
  return FOODS_BY_ID.get(id)
}

/** Resolve a food id against user-added custom foods first, then the built-ins. */
export function resolveFood(id: string, customFoods: Food[] = []): Food | undefined {
  return customFoods.find((f) => f.id === id) ?? FOODS_BY_ID.get(id)
}
