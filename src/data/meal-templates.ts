/* ==========================================================================
   FORM — meal templates
   ---------------------------------------------------------------------------
   Each template is a reusable, realistic meal built from `data/foods.ts`
   entries. Nutrition is *derived* from the referenced foods at plan time, so
   changing a serving here changes the computed totals everywhere.

   `diet` lists the diets a template is valid for. A template is only offered
   to a user if every food inside it is compatible with their diet AND none of
   their allergens appear in it.
   ========================================================================== */

import type { DietPreference, FoodStyle, MealTemplate } from '@/types'

const V: DietPreference[] = ['vegetarian', 'eggs', 'non-vegetarian']
const VG: DietPreference[] = ['vegetarian', 'vegan']
const NV: DietPreference[] = ['non-vegetarian']
const EG: DietPreference[] = ['eggs', 'non-vegetarian']

const IN: FoodStyle[] = ['south-indian', 'north-indian', 'mughlai', 'street-food', 'global']
const S: FoodStyle[] = ['south-indian', 'street-food', 'global']
const N: FoodStyle[] = ['north-indian', 'mughlai', 'global']
const STREET: FoodStyle[] = ['street-food', 'global']
const C: FoodStyle[] = ['continental', 'global']
const CONT: FoodStyle[] = ['continental', 'global']
const M: FoodStyle[] = ['mediterranean', 'global']
const A: FoodStyle[] = ['east-asian', 'global']

type Seed = Omit<MealTemplate, 'allergens'> & { steps: string[] }

export const MEAL_TEMPLATES: Seed[] = [
  /* ================= BREAKFAST ================= */
  {
    id: 'bf-poha', name: 'Vegetable poha with peanuts', slot: 'breakfast', diet: V, styles: S,
    items: [
      { foodId: 'poha', servings: 1 },
      { foodId: 'onion', servings: 0.25 },
      { foodId: 'tomato', servings: 0.2 },
      { foodId: 'peanuts', servings: 0.5 },
      { foodId: 'cooking-oil', servings: 0.3 },
    ],
    prepMinutes: 15, goals: [],
    steps: [
      'Soak 60 g flattened rice in water for 10 minutes, then drain.',
      'Heat oil, soften onion and tomato for 3 minutes.',
      'Add poha and a splash of water, cover and steam for 4 minutes.',
      'Fold in roasted peanuts off the heat.',
    ],
  },
  {
    id: 'bf-idli', name: 'Idli with sambar and coconut chutney', slot: 'breakfast', diet: VG, styles: S,
    items: [
      { foodId: 'idli', servings: 1.5 },
      { foodId: 'dal-toor', servings: 0.5 },
      { foodId: 'coconut', servings: 0.35 },
      { foodId: 'ghee', servings: 0.3 },
    ],
    prepMinutes: 25, goals: [],
    steps: [
      'Steam idli batter in an idli steamer or a greased muffin tin for 12 minutes.',
      'Simmer toor dal with turmeric and a spoon of ghee for 15 minutes, then season.',
      'Grate coconut with green chilli, salt and a splash of water for the chutney.',
    ],
  },
  {
    id: 'bf-oats-milk', name: 'Oats with milk, banana and seeds', slot: 'breakfast', diet: V, styles: C,
    items: [
      { foodId: 'oats-rolled', servings: 1 },
      { foodId: 'milk-toned', servings: 1 },
      { foodId: 'banana', servings: 0.5 },
      { foodId: 'pumpkin-seeds', servings: 0.4 },
    ],
    prepMinutes: 8, goals: [], proteinBoost: true,
    steps: [
      'Simmer 50 g rolled oats in 250 ml milk for 4–5 minutes.',
      'Slice the banana over the top.',
      'Scatter pumpkin seeds just before eating.',
    ],
  },
  {
    id: 'bf-oats-soy', name: 'Oats with soy milk, banana and seeds', slot: 'breakfast', diet: VG, styles: C,
    items: [
      { foodId: 'oats-rolled', servings: 1 },
      { foodId: 'soymilk', servings: 1.2 },
      { foodId: 'banana', servings: 0.5 },
      { foodId: 'pumpkin-seeds', servings: 0.4 },
    ],
    prepMinutes: 8, goals: [], proteinBoost: true,
    steps: [
      'Simmer 50 g rolled oats in 300 ml unsweetened soy milk for 5 minutes.',
      'Top with sliced banana and pumpkin seeds.',
    ],
  },
  {
    id: 'bf-egg-bhurji', name: 'Masala egg bhurji with buttered toast', slot: 'breakfast', diet: EG, styles: S,
    items: [
      { foodId: 'egg-bhurji', servings: 1 },
      { foodId: 'bread-brown', servings: 1 },
      { foodId: 'ghee', servings: 0.3 },
      { foodId: 'green-tea', servings: 1 },
    ],
    prepMinutes: 15, goals: ['build-muscle', 'gain-weight', 'performance'], proteinBoost: true,
    steps: [
      'Beat 2 eggs with salt, chopped onion, chilli and a pinch of turmeric.',
      'Cook on medium-low, stirring, until just set — 4 minutes.',
      'Toast the bread and spread with ghee.',
    ],
  },
  {
    id: 'bf-egg-whites', name: 'Egg white scramble with toast and fruit', slot: 'breakfast', diet: EG, styles: C,
    items: [
      { foodId: 'egg-white', servings: 4 },
      { foodId: 'bread-brown', servings: 1 },
      { foodId: 'tomato', servings: 0.4 },
      { foodId: 'apple', servings: 0.5 },
    ],
    prepMinutes: 12, goals: ['build-muscle', 'recompose', 'performance'], proteinBoost: true,
    steps: [
      'Whisk 4 whites with salt and black pepper.',
      'Cook in a non-stick pan over low heat, stirring, for 3 minutes.',
      'Serve with toast and sliced apple.',
    ],
  },
  {
    id: 'bf-dosa', name: 'Plain dosa with coconut chutney', slot: 'breakfast', diet: VG, styles: S,
    items: [
      { foodId: 'dosa-plain', servings: 1.2 },
      { foodId: 'coconut', servings: 0.4 },
      { foodId: 'chana-boiled', servings: 0.3 },
    ],
    prepMinutes: 25, goals: [],
    steps: [
      'Ferment the batter overnight, then cook on a hot tawa for 2 minutes a side.',
      'Grind coconut with roasted chana, green chilli, salt and lemon.',
    ],
  },
  {
    id: 'bf-masala-dosa', name: 'Masala dosa with sambar', slot: 'breakfast', diet: V, styles: S,
    items: [
      { foodId: 'dosa-masala', servings: 1 },
      { foodId: 'buttermilk', servings: 0.5 },
    ],
    prepMinutes: 30, goals: [],
    steps: [
      'Cook the dosa on a hot tawa until crisp, folding it over.',
      'Serve with hot sambar and a small bowl of chaas.',
    ],
  },
  {
    id: 'bf-upma', name: 'Rava upma with vegetables', slot: 'breakfast', diet: VG, styles: S,
    items: [
      { foodId: 'upma', servings: 1 },
      { foodId: 'carrot', servings: 0.3 },
      { foodId: 'peanuts', servings: 0.3 },
      { foodId: 'coconut', servings: 0.25 },
    ],
    prepMinutes: 15, goals: [],
    steps: [
      'Roast 1 tsp of oil, then add rava and roast until it smells nutty.',
      'Add water and vegetables, cover and cook for 6 minutes.',
      'Finish with grated coconut and roasted peanuts.',
    ],
  },
  {
    id: 'bf-paratha', name: 'Paneer paratha with curd', slot: 'breakfast', diet: V, styles: N,
    items: [
      { foodId: 'paratha', servings: 1.2 },
      { foodId: 'paneer', servings: 0.4 },
      { foodId: 'ghee', servings: 0.4 },
      { foodId: 'curd', servings: 0.7 },
    ],
    prepMinutes: 25, goals: ['build-muscle'], proteinBoost: true,
    steps: [
      'Crumble paneer with salt and ajwain into the paratha stuffing.',
      'Roll, cook on a tawa with ghee, and serve with curd.',
    ],
  },
  {
    id: 'bf-puri-curd', name: 'Puri with potato sabzi and curd', slot: 'breakfast', diet: V, styles: N,
    items: [
      { foodId: 'puri', servings: 1 },
      { foodId: 'potato', servings: 1 },
      { foodId: 'cooking-oil', servings: 0.3 },
      { foodId: 'curd', servings: 0.5 },
    ],
    prepMinutes: 25, goals: [],
    steps: [
      'Boil and mash the potato with turmeric, salt and a little oil.',
      'Roll and fry the puris until puffed.',
    ],
  },
  {
    id: 'bf-smoothie', name: 'Banana oat smoothie with soymilk', slot: 'breakfast', diet: VG, styles: C,
    items: [
      { foodId: 'banana', servings: 1 },
      { foodId: 'oats-rolled', servings: 0.5 },
      { foodId: 'soymilk', servings: 1 },
      { foodId: 'peanut-butter', servings: 0.5 },
    ],
    prepMinutes: 5, goals: ['build-muscle', 'performance'], proteinBoost: true,
    steps: [
      'Blend banana, oats, soymilk and peanut butter until smooth.',
      'Add more liquid if you want it thinner.',
    ],
  },
  {
    id: 'bf-uttapam', name: 'Uttapam with onion and tomato', slot: 'breakfast', diet: VG, styles: S,
    items: [
      { foodId: 'uttapam', servings: 1.2 },
      { foodId: 'coconut', servings: 0.3 },
    ],
    prepMinutes: 20, goals: [],
    steps: [
      'Top the batter with onion, tomato and chilli before the lid goes on.',
      'Steam for 8 minutes and serve with coconut chutney.',
    ],
  },

  /* ================= LUNCH ================= */
  {
    id: 'ln-roti-paneer', name: 'Roti, paneer curry and salad', slot: 'lunch', diet: V, styles: IN,
    items: [
      { foodId: 'roti-wheat', servings: 3 },
      { foodId: 'paneer', servings: 1 },
      { foodId: 'cooking-oil', servings: 0.6 },
      { foodId: 'salad-bowl', servings: 1 },
      { foodId: 'curd', servings: 0.5 },
    ],
    prepMinutes: 30, goals: ['build-muscle', 'recompose'], proteinBoost: true,
    steps: [
      'Crisp 100 g paneer in a little oil and set aside.',
      'Cook onion-tomato gravy with spices, return the paneer and simmer 8 minutes.',
      'Roll 3 rotis and serve with salad and curd.',
    ],
  },
  {
    id: 'ln-rajma-rice', name: 'Rajma chawal with curd', slot: 'lunch', diet: VG, styles: N,
    items: [
      { foodId: 'rajma', servings: 1 },
      { foodId: 'rice-white', servings: 1 },
      { foodId: 'ghee', servings: 0.3 },
      { foodId: 'curd', servings: 0.6 },
      { foodId: 'onion', servings: 0.5 },
    ],
    prepMinutes: 40, goals: [],
    steps: [
      'Pressure-cook rajma with a pinch of salt, then temper with cumin, onion and tomato.',
      'Cook the rice separately so it stays fluffy.',
      'Serve with curd and raw onion.',
    ],
  },
  {
    id: 'ln-dal-rice', name: 'Dal, rice, sabzi and salad', slot: 'lunch', diet: VG, styles: N,
    items: [
      { foodId: 'dal-masoor', servings: 1 },
      { foodId: 'rice-white', servings: 0.9 },
      { foodId: 'mixed-veg', servings: 0.7 },
      { foodId: 'ghee', servings: 0.3 },
      { foodId: 'salad-bowl', servings: 0.6 },
    ],
    prepMinutes: 35, goals: [],
    steps: [
      'Simmer masoor dal with turmeric until soft; season with ghee, cumin and chilli.',
      'Cook the rice and sabzi.',
    ],
  },
  {
    id: 'ln-chicken-rice', name: 'Chicken curry with rice and salad', slot: 'lunch', diet: NV, styles: IN,
    items: [
      { foodId: 'chicken-curry', servings: 1 },
      { foodId: 'rice-brown', servings: 1 },
      { foodId: 'salad-bowl', servings: 1 },
      { foodId: 'ghee', servings: 0.2 },
    ],
    prepMinutes: 35, goals: ['build-muscle', 'performance', 'recompose'], proteinBoost: true,
    steps: [
      'Marinate chicken with yoghurt, ginger-garlic and spices for 20 minutes.',
      'Cook the onion-tomato gravy, add chicken and simmer 15 minutes.',
      'Serve with brown rice and salad.',
    ],
  },
  {
    id: 'ln-chicken-fry', name: 'Tandoori chicken with roti and salad', slot: 'lunch', diet: NV, styles: N,
    items: [
      { foodId: 'tandoori-chicken', servings: 1 },
      { foodId: 'roti-wheat', servings: 3 },
      { foodId: 'salad-bowl', servings: 1 },
      { foodId: 'buttermilk', servings: 0.7 },
    ],
    prepMinutes: 30, goals: ['build-muscle', 'gain-weight', 'performance'], proteinBoost: true,
    steps: [
      'Marinate in yoghurt, kashmiri chilli, garlic and lemon for at least 30 minutes.',
      'Roast at 220 °C for 20 minutes, or use a pan or airfryer.',
    ],
  },
  {
    id: 'ln-soya-chunks', name: 'Soya chunk curry with roti', slot: 'lunch', diet: VG, styles: N,
    items: [
      { foodId: 'soya-chunks', servings: 1 },
      { foodId: 'roti-wheat', servings: 3 },
      { foodId: 'mixed-veg', servings: 0.6 },
      { foodId: 'cooking-oil', servings: 0.5 },
    ],
    prepMinutes: 30, goals: [], proteinBoost: true,
    steps: [
      'Soak soya chunks in hot salted water, squeeze dry and shallow-fry lightly.',
      'Cook with onion, tomato and spices for 10 minutes.',
    ],
  },
  {
    id: 'ln-tofu-quinoa', name: 'Tofu quinoa bowl with roasted vegetables', slot: 'lunch', diet: VG, styles: C,
    items: [
      { foodId: 'tofu', servings: 1.2 },
      { foodId: 'quinoa', servings: 0.8 },
      { foodId: 'broccoli', servings: 0.5 },
      { foodId: 'cooking-oil', servings: 0.4 },
      { foodId: 'tomato', servings: 0.4 },
    ],
    prepMinutes: 25, goals: ['build-muscle', 'recompose', 'performance'], proteinBoost: true,
    steps: [
      'Press and cube the tofu, then pan-fry until golden on all sides.',
      'Steam the broccoli for 3 minutes.',
      'Serve over quinoa with sliced tomato.',
    ],
  },
  {
    id: 'ln-sprouts', name: 'Sprouts bhel with rice', slot: 'lunch', diet: VG, styles: S,
    items: [
      { foodId: 'sprouts', servings: 1.5 },
      { foodId: 'rice-white', servings: 0.8 },
      { foodId: 'onion', servings: 0.4 },
      { foodId: 'tomato', servings: 0.3 },
      { foodId: 'coconut', servings: 0.2 },
    ],
    prepMinutes: 15, goals: ['lose-fat', 'general-fitness'],
    steps: [
      'Toss the sprouts with chopped onion, tomato, chilli and a squeeze of lemon.',
      'Serve alongside steamed rice.',
    ],
  },
  {
    id: 'ln-palak-paneer', name: 'Palak paneer with roti', slot: 'lunch', diet: V, styles: N,
    items: [
      { foodId: 'palak-sabzi', servings: 1.2 },
      { foodId: 'paneer', servings: 0.8 },
      { foodId: 'roti-wheat', servings: 3 },
      { foodId: 'ghee', servings: 0.4 },
    ],
    prepMinutes: 30, goals: [], proteinBoost: true,
    steps: [
      'Blanch spinach, blend with green chilli and ginger, and reduce with a little cream or ghee.',
      'Add fried paneer cubes and serve with rotis.',
    ],
  },
  {
    id: 'ln-fish-rice', name: 'Fish curry with rice and salad', slot: 'lunch', diet: NV, styles: IN,
    items: [
      { foodId: 'fish-curry', servings: 1 },
      { foodId: 'rice-white', servings: 1 },
      { foodId: 'salad-bowl', servings: 1 },
    ],
    prepMinutes: 30, goals: ['build-muscle', 'performance'], proteinBoost: true,
    steps: [
      'Fry the fish with turmeric and a little oil until crisp.',
      'Simmer in an onion-tomato-coconut gravy with curry leaves.',
    ],
  },
  {
    id: 'ln-mixed-veg-quinoa', name: 'Mixed vegetable quinoa bowl', slot: 'lunch', diet: VG, styles: M,
    items: [
      { foodId: 'quinoa', servings: 0.9 },
      { foodId: 'mixed-veg', servings: 1 },
      { foodId: 'chana-boiled', servings: 0.4 },
      { foodId: 'cooking-oil', servings: 0.4 },
    ],
    prepMinutes: 25, goals: ['general-fitness', 'lose-fat'],
    steps: [
      'Cook the quinoa and let it steam dry for 5 minutes.',
      'Stir-fry the vegetables with cumin and a squeeze of lemon.',
      'Fold in the boiled chickpeas.',
    ],
  },
  {
    id: 'ln-chole-rice', name: 'Chole chawal with onion salad', slot: 'lunch', diet: VG, styles: N,
    items: [
      { foodId: 'chana-boiled', servings: 1.1 },
      { foodId: 'rice-white', servings: 0.9 },
      { foodId: 'onion', servings: 0.5 },
      { foodId: 'cooking-oil', servings: 0.4 },
      { foodId: 'tomato', servings: 0.4 },
    ],
    prepMinutes: 25, goals: [],
    steps: [
      'Simmer boiled chickpeas with tomato, amchur, chilli powder and garam masala.',
      'Fry sliced onion separately until crisp and top it on.',
    ],
  },
  {
    id: 'ln-lauki-dal', name: 'Lauki sabzi with dal and rotis', slot: 'lunch', diet: VG, styles: N,
    items: [
      { foodId: 'lauki', servings: 1 },
      { foodId: 'dal-moong', servings: 0.8 },
      { foodId: 'roti-wheat', servings: 2.5 },
      { foodId: 'ghee', servings: 0.3 },
    ],
    prepMinutes: 30, goals: ['general-fitness'],
    steps: [
      'Cook lauki with turmeric and a little oil.',
      'Simmer moong dal with jeera and ghee.',
    ],
  },

  /* ================= DINNER ================= */
  {
    id: 'dn-roti-chicken', name: 'Chicken curry with rotis and salad', slot: 'dinner', diet: NV, styles: IN,
    items: [
      { foodId: 'chicken-curry', servings: 0.8 },
      { foodId: 'roti-wheat', servings: 3 },
      { foodId: 'salad-bowl', servings: 1 },
    ],
    prepMinutes: 30, goals: ['build-muscle', 'performance'], proteinBoost: true,
    steps: [
      'Cook a lighter onion-tomato chicken gravy.',
      'Serve with 3 rotis and a large salad.',
    ],
  },
  {
    id: 'dn-paneer-tikka', name: 'Paneer tikka with mint chutney and rotis', slot: 'dinner', diet: V, styles: N,
    items: [
      { foodId: 'paneer-tikka', servings: 1 },
      { foodId: 'roti-wheat', servings: 2.5 },
      { foodId: 'buttermilk', servings: 0.7 },
      { foodId: 'onion', servings: 0.4 },
    ],
    prepMinutes: 30, goals: ['build-muscle', 'recompose'], proteinBoost: true,
    steps: [
      'Marinate paneer cubes in yoghurt, chilli powder, garam masala and ajwain.',
      'Grill or pan-sear until charred on the edges.',
    ],
  },
  {
    id: 'dn-dal-rice-light', name: 'Light dal, rice and vegetables', slot: 'dinner', diet: VG, styles: IN,
    items: [
      { foodId: 'dal-toor', servings: 1 },
      { foodId: 'rice-white', servings: 0.8 },
      { foodId: 'mixed-veg', servings: 0.8 },
      { foodId: 'salad-bowl', servings: 0.7 },
    ],
    prepMinutes: 30, goals: ['general-fitness', 'lose-fat'],
    steps: [
      'Simmer toor dal until it is soft and pourous.',
      'Keep the rice portion moderate and add a second helping of vegetables.',
    ],
  },
  {
    id: 'dn-tempeh-rice', name: 'Tempeh stir-fry with rice', slot: 'dinner', diet: VG, styles: A,
    items: [
      { foodId: 'tempeh', servings: 1 },
      { foodId: 'rice-brown', servings: 0.9 },
      { foodId: 'mushroom', servings: 0.6 },
      { foodId: 'broccoli', servings: 0.5 },
      { foodId: 'soy-sauce', servings: 0.6 },
      { foodId: 'cooking-oil', servings: 0.3 },
    ],
    prepMinutes: 25, goals: ['build-muscle', 'recompose'], proteinBoost: true,
    steps: [
      'Cube the tempeh and pan-fry until golden.',
      'Stir-fry mushrooms and broccoli over high heat for 3 minutes.',
      'Add soy sauce, toss once, and serve over brown rice.',
    ],
  },
  {
    id: 'dn-egg-dosa', name: 'Rava dosa with fried egg', slot: 'dinner', diet: EG, styles: S,
    items: [
      { foodId: 'rava-dosa', servings: 1 },
      { foodId: 'egg-whole', servings: 1 },
      { foodId: 'coconut', servings: 0.3 },
    ],
    prepMinutes: 20, goals: [], proteinBoost: true,
    steps: [
      'Cook the dosa and crack an egg into the centre while it is still hot.',
      'Fold and serve with coconut chutney.',
    ],
  },
  {
    id: 'dn-pasta-chicken', name: 'Chicken pasta with tomato sauce', slot: 'dinner', diet: NV, styles: C,
    items: [
      { foodId: 'pasta-cooked', servings: 1.2 },
      { foodId: 'chicken-breast', servings: 0.8 },
      { foodId: 'tomato', servings: 0.8 },
      { foodId: 'cooking-oil', servings: 0.4 },
    ],
    prepMinutes: 25, goals: ['build-muscle', 'performance'], proteinBoost: true,
    steps: [
      'Grill or pan-cook the chicken and slice it.',
      'Simmer tomatoes with garlic, oregano and a little oil.',
      'Toss with cooked pasta and chicken.',
    ],
  },
  {
    id: 'dn-mushroom-quinoa', name: 'Mushroom quinoa with sautéed vegetables', slot: 'dinner', diet: VG, styles: M,
    items: [
      { foodId: 'quinoa', servings: 0.9 },
      { foodId: 'mushroom', servings: 0.9 },
      { foodId: 'spinach', servings: 0.5 },
      { foodId: 'cooking-oil', servings: 0.4 },
    ],
    prepMinutes: 20, goals: ['general-fitness', 'lose-fat'],
    steps: [
      'Sauté sliced mushrooms until they release and reabsorb their water.',
      'Wilt in the spinach, season, and serve over quinoa.',
    ],
  },
  {
    id: 'dn-tofu-curry', name: 'Tofu and vegetable curry with rotis', slot: 'dinner', diet: VG, styles: IN,
    items: [
      { foodId: 'tofu', servings: 1.1 },
      { foodId: 'roti-wheat', servings: 2.5 },
      { foodId: 'mixed-veg', servings: 0.7 },
      { foodId: 'coconut-milk', servings: 0.3 },
      { foodId: 'cooking-oil', servings: 0.4 },
    ],
    prepMinutes: 30, goals: ['recompose', 'build-muscle'], proteinBoost: true,
    steps: [
      'Crisp the tofu, then simmer with vegetables and spices in a little coconut milk.',
    ],
  },
  {
    id: 'dn-khichdi', name: 'Moong dal khichdi with ghee and curd', slot: 'dinner', diet: VG, styles: N,
    items: [
      { foodId: 'dal-moong', servings: 1.1 },
      { foodId: 'rice-white', servings: 0.7 },
      { foodId: 'ghee', servings: 0.5 },
      { foodId: 'curd', servings: 0.6 },
    ],
    prepMinutes: 30, goals: ['general-fitness'],
    note: 'A light, easy-to-digest option — good when appetite is low.',
    steps: [
      'Cook moong dal and rice together with turmeric until soft.',
      'Finish with ghee and serve with curd.',
    ],
  },
  {
    id: 'dn-fish-tandoori', name: 'Tandoori fish with sautéed vegetables', slot: 'dinner', diet: NV, styles: N,
    items: [
      { foodId: 'tandoori-fish', servings: 1 },
      { foodId: 'mixed-veg', servings: 0.9 },
      { foodId: 'roti-wheat', servings: 2 },
      { foodId: 'cooking-oil', servings: 0.3 },
    ],
    prepMinutes: 25, goals: ['build-muscle', 'performance', 'lose-fat'], proteinBoost: true,
    steps: [
      'Marinate the fish with yoghurt, ajwain, chilli and lemon.',
      'Grill 8–10 minutes per side, then serve with vegetables and rotis.',
    ],
  },

  /* ================= SNACKS ================= */
  {
    id: 'sk-banana-peanut', name: 'Banana with peanut butter', slot: 'snack', diet: V, styles: CONT,
    items: [
      { foodId: 'banana', servings: 1 },
      { foodId: 'peanut-butter', servings: 0.6 },
    ],
    prepMinutes: 2, goals: ['build-muscle', 'gain-weight'], proteinBoost: true,
    steps: ['Slice the banana and spread peanut butter over it.'],
  },
  {
    id: 'sk-fruit', name: 'Seasonal fruit bowl', slot: 'snack', diet: VG, styles: IN,
    items: [{ foodId: 'fruit-bowl', servings: 1 }],
    prepMinutes: 6, goals: [],
    steps: ['Chop and combine the fruit. Add a squeeze of lemon to keep it fresh.'],
  },
  {
    id: 'sk-yogurt-nuts', name: 'Curd with roasted seeds', slot: 'snack', diet: V, styles: IN,
    items: [
      { foodId: 'curd', servings: 1 },
      { foodId: 'pumpkin-seeds', servings: 0.4 },
    ],
    prepMinutes: 2, goals: [], proteinBoost: true,
    steps: ['Beat the curd smooth and scatter the seeds on top.'],
  },
  {
    id: 'sk-yogurt-soy', name: 'Soy yogurt with fruit', slot: 'snack', diet: VG, styles: CONT,
    items: [
      { foodId: 'soymilk', servings: 1 },
      { foodId: 'papaya', servings: 0.8 },
      { foodId: 'pumpkin-seeds', servings: 0.3 },
    ],
    prepMinutes: 4, goals: [],
    steps: ['Blend or combine soymilk with diced papaya and top with seeds.'],
  },
  {
    id: 'sk-roasted-chana', name: 'Roasted chana and peanuts', slot: 'snack', diet: VG, styles: STREET,
    items: [
      { foodId: 'chana-boiled', servings: 0.6 },
      { foodId: 'peanuts', servings: 0.5 },
    ],
    prepMinutes: 3, goals: [], proteinBoost: true,
    steps: ['Roast with a pinch of salt and curry leaf in a pan until crisp.'],
  },
  {
    id: 'sk-whey-shake', name: 'Whey shake with banana', slot: 'snack', diet: V, styles: CONT,
    items: [
      { foodId: 'whey-protein', servings: 1 },
      { foodId: 'banana', servings: 0.5 },
      { foodId: 'milk-toned', servings: 0.8 },
    ],
    prepMinutes: 3, goals: ['build-muscle', 'performance'], proteinBoost: true,
    steps: ['Blend the scoop, milk and banana for 30 seconds.'],
  },
  {
    id: 'sk-egg-boiled', name: 'Boiled eggs with a fruit', slot: 'snack', diet: EG, styles: CONT,
    items: [
      { foodId: 'egg-whole', servings: 2 },
      { foodId: 'apple', servings: 0.5 },
    ],
    prepMinutes: 12, goals: ['build-muscle', 'performance'], proteinBoost: true,
    steps: ['Boil the eggs for 9 minutes, cool and peel. Serve with sliced apple.'],
  },
  {
    id: 'sk-sprouts', name: 'Sprouts chaat', slot: 'snack', diet: VG, styles: STREET,
    items: [
      { foodId: 'sprouts', servings: 0.8 },
      { foodId: 'onion', servings: 0.2 },
      { foodId: 'tomato', servings: 0.2 },
    ],
    prepMinutes: 6, goals: ['lose-fat'], proteinBoost: true,
    steps: ['Toss sprouts with chopped onion, tomato, chilli and lemon.'],
  },
  {
    id: 'sk-almonds', name: 'Mixed nuts', slot: 'snack', diet: VG, styles: CONT,
    items: [
      { foodId: 'almonds', servings: 1 },
      { foodId: 'walnuts', servings: 0.5 },
    ],
    prepMinutes: 1, goals: [],
    steps: ['Portion out roughly 40 g — a small closed handful, not the whole bag.'],
  },
  {
    id: 'sk-chai', name: 'Masala chai with peanuts', slot: 'snack', diet: V, styles: IN,
    items: [
      { foodId: 'milk-toned', servings: 0.8 },
      { foodId: 'peanuts', servings: 0.5 },
    ],
    prepMinutes: 10, goals: [],
    steps: ['Boil milk with tea, cardamom, ginger and a little sugar.', 'Serve with roasted peanuts.'],
  },
  {
    id: 'sk-butttermilk', name: 'Chaas with boondi', slot: 'snack', diet: V, styles: N,
    items: [
      { foodId: 'buttermilk', servings: 1.2 },
    ],
    prepMinutes: 3, goals: ['general-fitness'],
    steps: ['Whisk the buttermilk with roasted cumin, salt and a little mint.'],
  },
  {
    id: 'sk-tofu-bowl', name: 'Tofu scramble with toast', slot: 'snack', diet: VG, styles: C,
    items: [
      { foodId: 'tofu', servings: 0.7 },
      { foodId: 'bread-brown', servings: 1 },
      { foodId: 'tomato', servings: 0.3 },
      { foodId: 'cooking-oil', servings: 0.2 },
    ],
    prepMinutes: 12, goals: ['recompose'], proteinBoost: true,
    steps: ['Crumble and sauté the tofu with tomato and spices. Serve with toast.'],
  },
  {
    id: 'sk-papaya', name: 'Papaya with a glass of milk', slot: 'snack', diet: V, styles: IN,
    items: [
      { foodId: 'papaya', servings: 1 },
      { foodId: 'milk-toned', servings: 0.8 },
    ],
    prepMinutes: 3, goals: [],
    steps: ['Slice the papaya and serve with cold milk.'],
  },
  {
    id: 'sk-pomegranate', name: 'Pomegranate with curd', slot: 'snack', diet: V, styles: IN,
    items: [
      { foodId: 'pomegranate', servings: 0.7 },
      { foodId: 'curd', servings: 0.6 },
    ],
    prepMinutes: 4, goals: [],
    steps: ['Spoon curd into a bowl and scatter the pomegranate seeds on top.'],
  },
  {
    id: 'sk-coconut-water', name: 'Coconut water with boiled egg', slot: 'snack', diet: EG, styles: S,
    items: [
      { foodId: 'coconut-water', servings: 1 },
      { foodId: 'egg-whole', servings: 1 },
    ],
    prepMinutes: 12, goals: ['performance'], proteinBoost: true,
    steps: ['Boil an egg and serve it with a glass of coconut water.'],
  },
]

/* Allergen lists are derived from the foods referenced, so they can never drift
   out of sync with the database. */
function allergensFor(items: MealTemplate['items'], lookup: (id: string) => string[] | undefined): MealTemplate['allergens'] {
  const set = new Set<string>()
  for (const item of items) {
    for (const a of lookup(item.foodId) ?? []) set.add(a)
  }
  return [...set] as MealTemplate['allergens']
}

export function buildTemplates(
  lookup: (id: string) => string[] | undefined,
): MealTemplate[] {
  return MEAL_TEMPLATES.map((t) => ({ ...t, allergens: allergensFor(t.items, lookup) }))
}
