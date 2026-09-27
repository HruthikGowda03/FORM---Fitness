/* ==========================================================================
   FORM — knowledge centre content
   ---------------------------------------------------------------------------
   Each topic separates what is broadly established guidance from what is a
   general suggestion, and explicitly avoids medical claims or presenting
   supplements as necessary. Written to be read, not to sound clinical.
   ========================================================================== */

export type EvidenceLevel = 'established' | 'general' | 'individual'

export type Topic = {
  slug: string
  title: string
  summary: string
  minutes: number
  level: EvidenceLevel
  levelNote: string
  body: { heading: string; paragraphs: string[]; list?: string[] }[]
  myth?: { claim: string; reality: string }
}

export const EVIDENCE_LABELS: Record<EvidenceLevel, { label: string; variant: 'ok' | 'info' | 'warn' }> = {
  established: { label: 'Broadly established', variant: 'ok' },
  general: { label: 'General guidance', variant: 'info' },
  individual: { label: 'Varies between people', variant: 'warn' },
}

export const TOPICS: Topic[] = [
  {
    slug: 'protein',
    title: 'Protein',
    summary: 'What it does, how much most people need, and why the answer changes with your goal.',
    minutes: 4,
    level: 'established',
    levelNote:
      'Protein requirements are among the most studied topics in nutrition. The exact number still depends on the individual.',
    body: [
      {
        heading: 'What protein actually does',
        paragraphs: [
          'Protein is the raw material for muscle, but that is only part of the job. It is also used to build and repair enzymes, hormones and antibodies, and to help the body recover from training and illness.',
          'Protein is also the most satiating macronutrient per calorie, which is part of why higher-protein diets tend to be easier to stick to for many people.',
        ],
      },
      {
        heading: 'How much you need',
        paragraphs: [
          'The minimum to avoid deficiency is about 0.8 g per kilogram of body mass per day for a healthy adult. That is a floor set to prevent deficiency, not a target for someone who trains.',
          'For people doing progressive resistance training, a good deal of research supports something closer to 1.6 g per kilogram per day as a point where additional benefit plateaus. Estimates above around 2.2 g per kilogram show little extra advantage, and FORM will not recommend more than that.',
          'When you are in a calorie deficit, higher protein intakes — closer to 2 g per kilogram — are associated with better retention of lean mass.',
        ],
        list: [
          'Everyday baseline: 0.8 g/kg',
          'General training: 1.0–1.6 g/kg',
          'Progressive resistance training: 1.6–2.2 g/kg',
          'During a deficit: 1.8–2.4 g/kg',
        ],
      },
      {
        heading: 'Spreading it out',
        paragraphs: [
          'Your body cannot store protein, so it uses what arrives and breaks down the rest. Eating a reasonable amount across three to five meals generally works better than one enormous serving, though the difference is smaller than internet folklore suggests. The simplest useful rule: aim for a decent protein source at each meal.',
        ],
      },
      {
        heading: 'Plant and vegetarian sources',
        paragraphs: [
          'Whole-food plant sources are perfectly adequate, but they generally have slightly lower protein per calorie and a different amino acid profile than animal sources. Two practical approaches: eat a larger total volume, and vary your sources across the day rather than relying on one.',
          'Soy is the most complete plant protein of the foods commonly eaten. Combining grains and legumes across a day — dal with rice, for example — covers the profile well.',
        ],
      },
    ],
    myth: {
      claim: 'You must drink a protein shake after every session to build muscle.',
      reality:
        'Total daily protein matters far more than any single serving. A shake is a convenient food, not a requirement, and it only makes sense if it is helping you hit a number you would otherwise miss.',
    },
  },
  {
    slug: 'carbohydrates',
    title: 'Carbohydrates',
    summary: 'The main fuel for training, and the most useful macronutrient to adjust week to week.',
    minutes: 4,
    level: 'established',
    levelNote: 'Carbohydrate requirements for physical activity are well established; individual needs vary with the training itself.',
    body: [
      {
        heading: 'What they do',
        paragraphs: [
          'Carbohydrate is the body’s preferred fuel for moderate-to-high intensity work, and it is what fills glycogen stores in muscle and liver. More stored glycogen means more quality training volume before you fatigue.',
          'Carbohydrate also matters for the brain, which runs almost entirely on glucose. Very low intakes over long periods are associated with mood and concentration problems in some people.',
        ],
      },
      {
        heading: 'Timing around training',
        paragraphs: [
          'The most useful window is before and during training. A meal containing carbohydrate one to three hours beforehand, or a snack closer to the session, gives you something to work with. Immediately after training is fine, but the "anabolic window" is far wider than once suggested — total daily intake still dominates.',
          'For most people, carbohydrate is the first thing to raise on a hard training week and the first thing to lower on a rest week or a lighter week. It is the most flexible of the three macronutrients.',
        ],
        list: [
          'Hard training days: the higher end of your range',
          'Rest days: the lower end',
          'Around sessions: keep something available',
        ],
      },
      {
        heading: 'Quality and fibre',
        paragraphs: [
          'Whole grains, legumes, vegetables and fruit bring fibre, micronutrients and water along with the carbohydrate, which slows digestion and improves fullness. Refined carbohydrate is not forbidden — it is just less nutrient-dense per calorie, which matters when calories are the constraint.',
        ],
      },
    ],
  },
  {
    slug: 'fats',
    title: 'Fats',
    summary: 'Essential, calorie-dense, and the macro most often over- or under-eaten.',
    minutes: 3,
    level: 'established',
    levelNote: 'Essential fat intake and its relationship to hormones are well established. The ideal total percentage is genuinely debatable.',
    body: [
      {
        heading: 'They are not optional',
        paragraphs: [
          'Fat supplies essential fatty acids, helps absorb vitamins A, D, E and K, and is involved in hormone production. Very low fat intakes over time are a legitimate concern, which is why FORM keeps a floor in place rather than letting fat get squeezed to nothing to make room for protein.',
        ],
      },
      {
        heading: 'Saturated versus unsaturated',
        paragraphs: [
          'The distinction that matters most in practice: regularly eating large amounts of saturated fat is associated with raised LDL cholesterol, while replacing it with unsaturated fats lowers it. This is one of the more consistent findings in nutrition research.',
          'That is a reason to favour oils, nuts, seeds and fish over repeated deep-frying or large amounts of ghee and butter — not a reason to remove fat. In many South Asian kitchens, swapping a portion of ghee for a vegetable oil while keeping the total roughly the same is a reasonable, low-effort change.',
        ],
      },
      {
        heading: 'How much',
        paragraphs: [
          'Commonly suggested intakes sit between about 20% and 35% of total energy, with no single figure proven superior for everyone. FORM targets the middle of that range, and lowers fat slightly when you are in a surplus because the surplus is easier to fill with carbohydrate.',
        ],
      },
    ],
    myth: {
      claim: 'Eat as little fat as possible to lose fat.',
      reality:
        'Body fat loss is driven by a sustained energy deficit, not by eliminating a macronutrient. Cutting fat very low while keeping calories the same tends to crowd out protein and fibre, and rarely sticks.',
    },
  },
  {
    slug: 'hydration',
    title: 'Hydration',
    summary: 'Simple, cheap, and more important on hot days and long sessions than people expect.',
    minutes: 3,
    level: 'general',
    levelNote:
      'Basic fluid needs are well established. The precise amount an individual needs varies with climate, activity and diet, and there is no single magic number.',
    body: [
      {
        heading: 'A starting point',
        paragraphs: [
          'Around 30–35 millilitres per kilogram of body mass per day is a reasonable baseline for a sedentary adult in a temperate climate. Add more for training, heat and humid weather.',
          'Thirst is a decent guide for most people, but it lags behind during hard sessions. Pale-yellow urine is a reasonable quick check.',
        ],
      },
      {
        heading: 'During training',
        paragraphs: [
          'For sessions under about an hour, water is generally enough. Beyond that, particularly in heat, carbohydrate-containing drinks can help sustain output. There is no benefit to drinking more than you lose.',
        ],
      },
      {
        heading: 'Practical habits',
        paragraphs: [
          'Keep a bottle visible and refill it on a timer rather than on thirst. Most people underestimate how little they drink on a desk day and overestimate on a training day. Indian households often already have practical options: buttermilk, coconut water, chaas, lassi without too much sugar.',
        ],
        list: [
          'Start the day with a glass of water',
          'Drink with every meal',
          'One bottle for the commute, one for training',
        ],
      },
    ],
  },
  {
    slug: 'recovery',
    title: 'Recovery',
    summary: 'What you do between sessions is where adaptation actually happens.',
    minutes: 3,
    level: 'established',
    levelNote: 'Sleep’s role in adaptation and recovery is one of the more consistent findings in the field.',
    body: [
      {
        heading: 'Sleep first',
        paragraphs: [
          'Sleep is the single highest-leverage recovery variable, and it is free. Short sleep reliably reduces training quality, appetite control and mood. If you are in a position to change one thing about your week, it is this — not a supplement.',
        ],
      },
      {
        heading: 'Rest between hard sessions',
        paragraphs: [
          'A muscle group needs roughly 48 hours to recover from hard work. You can train other things in between, but repeatedly hitting the same pattern hard without recovery tends to produce stalled progress and more injury risk.',
        ],
      },
      {
        heading: 'Easy days should be easy',
        paragraphs: [
          'Low-intensity movement on a rest day — walking, mobility work — helps without adding fatigue. There is no requirement to train hard every day for progress; the weekly total matters more than any single session.',
        ],
      },
      {
        heading: 'What to eat afterwards',
        paragraphs: [
          'A normal meal containing protein and carbohydrate within a few hours of training is plenty. Combined with a daily protein target met across the day, there is nothing special a "recovery meal" has to do.',
        ],
      },
    ],
  },
  {
    slug: 'meal-timing',
    title: 'Meal timing',
    summary: 'Why the narrow “anabolic window” is mostly marketing, and what does matter.',
    minutes: 3,
    level: 'general',
    levelNote: 'Total daily intake dominates. Exact timing effects are real but much smaller than commonly claimed.',
    body: [
      {
        heading: 'The window is wide',
        paragraphs: [
          'Research testing the idea of a 30-minute post-workout window found that the metabolic window after training lasts several hours, not minutes. Unless you are training twice a day or competing, when you eat within a few hours of finishing is fine.',
        ],
      },
      {
        heading: 'What does matter',
        paragraphs: [
          'Eating enough total energy and protein across the day. Then, for people training in the morning, having something available before the session — even a banana and a handful of nuts — often makes a real difference to how the session feels. For people training late at night, a normal dinner afterwards is sufficient.',
        ],
      },
      {
        heading: 'If you skip breakfast',
        paragraphs: [
          'Total intake still matters. Some people do better eating later, and that is fine. One caution worth knowing: very high protein eaten only in a single evening meal is absorbed less efficiently than protein spread across the day, so front-loading a little is reasonable if breakfast is not your thing.',
        ],
      },
    ],
  },
  {
    slug: 'variety',
    title: 'Dietary variety',
    summary: 'The most underrated nutrition variable, and the cheapest to improve.',
    minutes: 3,
    level: 'established',
    levelNote: 'Micronutrient adequacy depends on food variety. This is one of the least contentious areas of nutrition.',
    body: [
      {
        heading: 'Why it matters',
        paragraphs: [
          'No single food contains everything you need, and a narrow diet — even a narrow diet of "healthy" food — reliably runs short on particular micronutrients over time. Variety is the mechanism by which a diet becomes adequate.',
        ],
      },
      {
        heading: 'A practical rule',
        paragraphs: [
          'Aim for a broad range of vegetables, legumes and grains across the week rather than counting servings perfectly. Indian kitchens make this easier than most: dal, seasonal vegetables, whole or regional grains and fruit are all inexpensive and all count.',
        ],
        list: [
          'Several different vegetables across a week, not one every day',
          'At least two or three different protein sources',
          'Whole and regional grains rather than only one',
          'Fruit daily, whole rather than juiced',
        ],
      },
      {
        heading: 'Restricting variety can backfire',
        paragraphs: [
          'Eliminative diets have a legitimate place — coeliac disease, genuine allergies, diagnosed intolerance. Outside those cases, narrowing your diet without a clear reason adds nutritional risk and makes eating less enjoyable, which is its own problem over months and years.',
        ],
      },
    ],
  },
  {
    slug: 'sleep',
    title: 'Sleep',
    summary: 'Not a wellness extra — a training variable that sits alongside nutrition.',
    minutes: 3,
    level: 'established',
    levelNote: 'Robust associations between sleep duration and metabolic, mood and performance outcomes.',
    body: [
      {
        heading: 'Consistency beats duration',
        paragraphs: [
          'A regular seven to nine hours, kept at a similar time, tends to outperform an irregular schedule even when the total is similar. Waking at a similar time is the anchor.',
        ],
      },
      {
        heading: 'What it changes',
        paragraphs: [
          'Short sleep raises hunger and reduces satiety, makes training output worse, and worsens mood and decision-making. It is not worth "making up" on weekends either — social jetlag has its own costs.',
        ],
      },
      {
        heading: 'Practical',
        paragraphs: [
          'Dim light and less screen time in the hour before bed, a cool room, and avoiding a very large meal immediately before sleep are low-effort habits with reasonable support. If you snore heavily or wake unrefreshed regardless of hours, that is worth raising with a doctor — sleep apnoea is common and treatable.',
        ],
      },
    ],
  },
  {
    slug: 'supplements',
    title: 'Supplements',
    summary: 'The short, honest version: almost everything is optional.',
    minutes: 4,
    level: 'general',
    levelNote: 'Supplement research is weaker than exercise or nutrition research. Most products are poorly studied.',
    body: [
      {
        heading: 'The honest hierarchy',
        paragraphs: [
          'For almost every goal, the ordering of impact is: training consistently, eating enough food, sleeping, and then — far behind everything else — supplements. A supplement cannot rescue a plan that is not working.',
        ],
        list: [
          'Whey protein — a convenient food, not a magic compound',
          'Creatine monohydrate — the most studied sports supplement, and cheap',
          'Vitamin D — worth checking if you get little sun, which is common',
          'Fish oil — easy to get omega-3s from fish',
          'Iron — only when low, and low iron is a medical question, not a fitness one',
        ],
      },
      {
        heading: 'If you do take something',
        paragraphs: [
          'Third-party tested products are the safer default, because the supplement industry is largely unregulated. Check the batch certificate rather than the front label. Be cautious with anything marketed as a fat burner — effective ones contain pharmaceutical stimulants, and ineffective ones are just expensive carbohydrate.',
        ],
      },
      {
        heading: 'When to ask someone',
        paragraphs: [
          'If you are pregnant or breastfeeding, on any regular medication, managing a medical condition, or have had disordered eating, talk to a doctor or registered dietitian before starting any supplement. That is not a formality.',
        ],
      },
    ],
    myth: {
      claim: 'You need supplements to build muscle.',
      reality:
        'Whole food at an adequate daily protein target is sufficient. Creatine is the one supplement with strong, repeated support for a modest additional benefit, and it is inexpensive — but it is still an addition, not a foundation.',
    },
  },
]

export function getTopic(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug)
}
