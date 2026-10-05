/**
 * articles.ts
 *
 * Bundled health-education content for the patient **Health Education Corner**.
 * Curated with Cameroon-relevant topics (malaria, vaccinations, nutrition,
 * hypertension, diabetes, maternal & child health, mental health, general).
 */

export interface HealthArticle {
  id: string;
  title: string;
  category: string;
  readTime: string;
  image: string;
  summary: string;
  content: string[];
  tips: string[];
  featured?: boolean;
  /** Topic id used to ask the AI assistant about this article (optional). */
  aiTopic?: string;
}

export const ARTICLE_CATEGORIES = [
  "General",
  "Prevention & Hygiene",
  "Outbreaks & Epidemics",
  "Malaria",
  "Hypertension",
  "Diabetes",
  "Maternal & Child",
  "Nutrition",
  "Mental Health",
];

export const HEALTH_ARTICLES: HealthArticle[] = [
  {
    id: "malaria-prevention",
    title: "Protecting Yourself Against Malaria",
    category: "Malaria",
    readTime: "3 min",
    image: "",
    summary:
      "Malaria is still a leading cause of illness in Cameroon. Learn how to protect yourself and your family with simple, affordable measures.",
    content: [
      "Malaria is transmitted by the bite of an infected female Anopheles mosquito, which is most active between dusk and dawn. In Cameroon, the disease is endemic in most regions, making prevention essential.",
      "Sleep under a long-lasting insecticide-treated net every night, even if you live in a town or city. Nets are distributed free at health centres and during national campaigns.",
      "Use insect repellent on exposed skin in the evening, wear long sleeves and trousers, and clear stagnant water around the home where mosquitoes breed.",
      "If you develop fever, headache, chills or body aches, especially after a rainy season, get tested at a health facility immediately. Early diagnosis and treatment with Artemisinin-based Combination Therapy (ACT) saves lives.",
    ],
    tips: [
      "Sleep under a treated net every night.",
      "Clear stagnant water around your home weekly.",
      "Complete your malaria treatment even if you feel better.",
      "Pregnant women should attend all antenatal visits for IPTp doses.",
    ],
    featured: true,
    aiTopic: "malaria",
  },
  {
    id: "hand-hygiene",
    title: "Hand Washing: The Cheapest Medicine",
    category: "Prevention & Hygiene",
    readTime: "2 min",
    image: "",
    summary:
      "Hand washing with soap prevents diarrhoea, cholera, typhoid and respiratory infections. Here is when and how to wash properly.",
    content: [
      "Hand washing with soap is one of the most effective and affordable ways to prevent disease transmission in the community.",
      "Wash your hands before eating, before preparing food, after using the toilet, after changing a baby, and after coughing or sneezing.",
      "Rub your hands together with soap for at least 20 seconds, covering all surfaces, then rinse with clean running water.",
      "If soap and water are not available, use an alcohol-based hand sanitiser with at least 60% alcohol.",
    ],
    tips: [
      "Keep soap in a dry place near your water source.",
      "Teach children the 5 steps of hand washing at school and home.",
      "Always wash hands before breastfeeding or feeding a child.",
    ],
    aiTopic: "hygiene",
  },
  {
    id: "hypertension",
    title: "Living Well With High Blood Pressure",
    category: "Hypertension",
    readTime: "4 min",
    image: "",
    summary:
      "Hypertension is a silent killer that affects many Cameroonians. Understand your numbers and the lifestyle changes that keep your heart safe.",
    content: [
      "High blood pressure (hypertension) often has no symptoms, which is why it is called the 'silent killer'. It is a major risk factor for stroke, heart attack and kidney disease.",
      "A normal reading is below 120/80 mmHg. If your readings are consistently 140/90 mmHg or above, see a health professional for evaluation and follow-up.",
      "Reduce salt intake: most of the salt we eat is hidden in bread, bouillon cubes, processed fish and canned foods. Aim for less than one teaspoon of salt per day.",
      "Stay active with 30 minutes of brisk walking most days, keep your weight in a healthy range, limit alcohol, and take blood pressure medication exactly as prescribed — never stop without advice.",
    ],
    tips: [
      "Monitor your blood pressure and log it in the Vitals section.",
      "Use a blood pressure monitor at home and record readings regularly.",
      "Take your medication at the same time every day.",
      "Alert your doctor if readings are repeatedly high or you feel dizzy.",
    ],
    featured: true,
  },
  {
    id: "diabetes-basics",
    title: "Understanding Diabetes & Blood Sugar",
    category: "Diabetes",
    readTime: "4 min",
    image: "",
    summary:
      "Diabetes is on the rise in Cameroon. Learn the early warning signs, healthy habits and how to manage blood sugar day to day.",
    content: [
      "Diabetes occurs when the body cannot regulate blood sugar properly. Common symptoms include excessive thirst, frequent urination, tiredness and unexplained weight loss.",
      "Prevention is possible: maintain a healthy weight, eat more vegetables and whole grains, limit sugary drinks, and stay physically active.",
      "If you have diabetes, self-monitoring of blood sugar, foot care and regular eye checks are essential to prevent complications like blindness and amputation.",
      "Follow your treatment plan — oral medication or insulin — and never miss doses. Attend your follow-up appointments and bring your blood sugar log.",
    ],
    tips: [
      "Log your blood glucose in the Vitals section and share trends with your doctor.",
      "Check your feet daily for cuts or sores.",
      "Carry a sugar source (candy, juice) in case of hypoglycaemia.",
    ],
  },
  {
    id: "maternal-health",
    title: "Safe Pregnancy: Antenatal Care That Works",
    category: "Maternal & Child",
    readTime: "3 min",
    image: "",
    summary:
      "Four or more antenatal visits reduce the risk of complications for mother and baby. Here is what to expect at each stage.",
    content: [
      "Antenatal care starts as soon as you suspect you are pregnant. In Cameroon, health facilities offer free or subsidised packages that include tests, supplements and monitoring.",
      "Attend at least 4 antenatal consultations, and more if you have high blood pressure, diabetes or previous pregnancy complications.",
      "Take iron and folic acid daily, sleep under a treated mosquito net, and receive Intermittent Preventive Treatment (IPTp) for malaria from the second trimester.",
      "Deliver at a health facility with a skilled birth attendant — this dramatically reduces maternal and newborn deaths.",
    ],
    tips: [
      "Register for ANC as soon as pregnancy is confirmed.",
      "Bring your immunisation card to every visit.",
      "Know the warning signs: severe headache, bleeding, reduced baby movements — go to the nearest facility immediately.",
      "Start exclusive breastfeeding within one hour after birth.",
    ],
    featured: true,
    aiTopic: "maternal",
  },
  {
    id: "child-vaccines",
    title: "A Child's Vaccination Schedule in Cameroon",
    category: "Maternal & Child",
    readTime: "3 min",
    image: "",
    summary:
      "Vaccines protect children from deadly diseases. Keep this schedule handy and never miss an immunisation date.",
    content: [
      "Vaccination is available free of charge for children at all public health facilities in Cameroon through the Expanded Programme on Immunisation (EPI).",
      "At birth: BCG (tuberculosis) and Oral Polio Vaccine dose 0, plus Hepatitis B.",
      "At 6, 10 and 14 weeks: Penta (diphtheria, tetanus, whooping cough, hepatitis B, Hib), polio, pneumococcal and rotavirus vaccines.",
      "At 9 months: measles and yellow fever. Follow-up boosters for measles and other vaccines are given from 15 months onwards.",
      "Keep the vaccination card safely and bring it to every appointment — it is also required for school enrolment.",
    ],
    tips: [
      "Record each vaccination date immediately on the child's card.",
      "Mild fever after a vaccine is normal; use paracetamol if needed.",
      "If a dose is missed, go to the facility to catch up — it is rarely necessary to restart.",
    ],
    aiTopic: "maternal",
  },
  {
    id: "nutrition-balance",
    title: "Eating Well on a Budget",
    category: "Nutrition",
    readTime: "3 min",
    image: "",
    summary:
      "Good nutrition does not need imported foods. Use local staples like beans, groundnuts, leafy greens and fruits for a balanced diet.",
    content: [
      "A balanced plate is about variety, not expensive foods. Aim to include a starchy staple (plantain, rice, maize, cassava), a protein (beans, fish, eggs, groundnuts), vegetables and a fruit each day.",
      "Dark green leafy vegetables like huckleberry (ntumba), bitter leaf (ndolé) and waterleaf are rich in iron and vitamins — buy them fresh and wash well.",
      "Limit fried and sugary foods, and reduce salt, bouillon cubes and palm oil consumption, to prevent hypertension and diabetes.",
      "Drink plenty of clean, treated or boiled water. Breastfed babies under 6 months need only breastmilk.",
    ],
    tips: [
      "Prefer whole foods over processed snacks.",
      "Add beans or groundnuts to sauces to increase protein.",
      "Eat fruit in season — it is cheaper and fresher.",
      "Wash fruits and vegetables with clean water before eating.",
    ],
    aiTopic: "nutrition",
  },
  {
    id: "mental-health",
    title: "Taking Care of Your Mental Health",
    category: "Mental Health",
    readTime: "3 min",
    image: "",
    summary:
      "Mental health matters as much as physical health. Recognise the signs of stress and depression and know where to get help.",
    content: [
      "Mental health includes our emotional, psychological and social wellbeing. Stress, sadness and anxiety are normal — but when they persist and disrupt daily life, it is time to seek help.",
      "Common signs of depression include persistent sadness, loss of interest in activities, disturbed sleep, fatigue, and feelings of worthlessness lasting more than two weeks.",
      "Talk to someone you trust, keep a daily routine, exercise, limit alcohol, and avoid self-medicating with alcohol or other substances.",
      "Mental health services are available at regional and district hospitals, as well as through specialised centres and hotlines.",
    ],
    tips: [
      "Reach out to the free mental health hotlines available in Cameroon.",
      "Use the Daily Check-in to keep track of how you feel.",
      "Support loved ones by listening without judgement and encouraging professional help.",
      "Never ignore suicidal thoughts — get help immediately.",
    ],
    aiTopic: "mental",
  },
  {
    id: "chikungunya-dengue",
    title: "Mosquito-Borne Diseases: Chikungunya & Dengue",
    category: "Malaria",
    readTime: "2 min",
    image: "",
    summary:
      "Besides malaria, Cameroon faces outbreaks of dengue and chikungunya. Learn the symptoms and how these differ from malaria.",
    content: [
      "Dengue and chikungunya are viral diseases also spread by mosquitoes, with outbreaks increasingly reported in Cameroon and neighbouring countries.",
      "Symptoms include sudden high fever, severe joint or muscle pain, headache, rash and fatigue. They often overlap with malaria symptoms.",
      "The best diagnosis is a blood test. Do not take aspirin or ibuprofen if dengue is suspected, as they increase bleeding risk.",
      "Prevention is identical to malaria: eliminate mosquito breeding sites, use repellent and nets, especially during outbreaks.",
    ],
    tips: [
      "See a health professional for any unexplained fever.",
      "Never self-treat dengue with aspirin or NSAIDs.",
      "Discard containers that collect rainwater around the home.",
    ],
    aiTopic: "dengue",
  },
  {
    id: "eye-care",
    title: "Protecting Your Eyesight",
    category: "General",
    readTime: "2 min",
    image: "",
    summary:
      "Simple habits protect your eyes from infections and long-term damage. Know when to see an ophthalmologist.",
    content: [
      "Wash your hands before touching your eyes, and never share eye drops or towels. Avoid rubbing eyes with unwashed hands to prevent conjunctivitis.",
      "Take breaks from screens: follow the 20-20-20 rule — every 20 minutes, look at something 20 feet away for 20 seconds.",
      "Diabetes and hypertension can damage the eyes, so annual eye checks are essential for people living with these conditions.",
      "Seek care immediately if you have sudden vision loss, severe eye pain or an injury to the eye.",
    ],
    tips: [
      "Wear sunglasses to protect against UV damage.",
      "Get your eyes checked once a year, especially after age 40.",
      "See a specialist if you notice floaters, flashes or double vision.",
    ],
  },
  {
    id: "mpox-outbreak",
    title: "Mpox: Know the Signs and Stop the Spread",
    category: "Outbreaks & Epidemics",
    readTime: "3 min",
    image: "",
    summary:
      "Mpox causes fever, rash and painful skin bumps and spreads through close contact. Learn how to protect your household during an outbreak.",
    content: [
      "Mpox (formerly monkeypox) is a viral illness that spreads through close physical contact with an infected person — including skin-to-skin contact with the rash, body fluids, and shared bedding, towels or utensils. It can also spread from animals such as rodents and monkeys.",
      "The illness usually starts with fever, headache, muscle aches, swollen lymph nodes and tiredness, followed by a rash that becomes raised bumps filled with fluid, then crusts over. The rash can appear on the face, hands, feet, mouth and genital area.",
      "Most people recover in two to four weeks with supportive care: rest, plenty of fluids, and keeping the rash clean and covered. Isolation at home helps protect the family, especially children, pregnant women and people with weak immunity.",
      "During an outbreak, avoid close contact with anyone who has a rash or fever, do not share bedding or clothes, and wash hands frequently with soap. Seek care immediately if you have a rash with fever, difficulty breathing, or if you are pregnant or caring for a young child.",
    ],
    tips: [
      "Isolate a suspected case at home and avoid skin-to-skin contact.",
      "Wear gloves and a mask when caring for a person with a rash.",
      "Wash hands with soap after touching a rash, bedding or clothes.",
      "Do not share towels, bedsheets, cups or utensils.",
      "Report suspected cases to the nearest health facility for testing.",
    ],
    featured: true,
    aiTopic: "mpox",
  },
  {
    id: "cholera-outbreak",
    title: "Cholera: Treat Dehydration Fast",
    category: "Outbreaks & Epidemics",
    readTime: "3 min",
    image: "",
    summary:
      "Cholera causes sudden watery diarrhoea and vomiting that can kill within hours through dehydration. Early rehydration saves lives.",
    content: [
      "Cholera is a bacterial infection spread through water and food contaminated with faeces. Outbreaks are common during the rainy season and in crowded areas with poor sanitation.",
      "The main danger is rapid dehydration: profuse watery 'rice-water' stools, vomiting, muscle cramps and weakness. A person can lose dangerous amounts of fluid within a few hours.",
      "Start oral rehydration salts (ORS) immediately — dissolve one sachet in one litre of clean water and give frequent small sips. Continue breastfeeding a sick child. At a health facility, severe cases receive intravenous fluids and antibiotics.",
      "Prevention is about safe water and sanitation: boil, filter or chlorinate drinking water, cook food thoroughly and eat it hot, wash hands with soap after the toilet and before eating, and use latrines. Never defecate near a water source.",
    ],
    tips: [
      "Treat all drinking water by boiling or chlorination.",
      "Start ORS at the first watery stool — do not wait.",
      "Wash hands with soap before eating and after using the toilet.",
      "Keep food covered and reheat leftovers thoroughly.",
      "Go to a health facility if the person cannot drink or is very weak.",
    ],
    featured: true,
    aiTopic: "cholera",
  },
  {
    id: "typhoid-fever",
    title: "Typhoid Fever: Prolonged Fever Needs a Test",
    category: "Outbreaks & Epidemics",
    readTime: "2 min",
    image: "",
    summary:
      "Typhoid spreads through contaminated food and water and causes lasting fever. A blood test confirms it and full treatment prevents relapse.",
    content: [
      "Typhoid fever is caused by Salmonella Typhi bacteria, spread by food or water contaminated by an infected person's stool. It is common where sanitation and safe water are limited.",
      "Symptoms build up gradually over one to three weeks: persistent high fever, headache, abdominal pain, constipation or diarrhoea, and loss of appetite. Some people develop a rash of small pink spots.",
      "Typhoid is confirmed with a blood test and treated with a full course of antibiotics prescribed by a health professional. Because the illness can be confused with malaria, testing matters.",
      "Always finish the entire antibiotic course even after the fever settles — stopping early causes relapse and encourages drug resistance. Proper hand washing and safe water protect the whole household.",
    ],
    tips: [
      "Get a blood test for any fever lasting more than a few days.",
      "Complete the full antibiotic course as prescribed.",
      "Drink only boiled or chlorinated water.",
      "Wash hands with soap after the toilet and before handling food.",
    ],
    aiTopic: "typhoid",
  },
];

/**
 * Maps an AI health topic to the bundled category that best covers it.
 * Used as the offline fallback when the online model is unavailable.
 */
const AI_TOPIC_TO_CATEGORY: Record<string, string> = {
  mpox: "Outbreaks & Epidemics",
  cholera: "Outbreaks & Epidemics",
  typhoid: "Outbreaks & Epidemics",
  malaria: "Malaria",
  dengue: "Malaria",
  hygiene: "Prevention & Hygiene",
  diarrhoea: "Prevention & Hygiene",
  tuberculosis: "General",
  nutrition: "Nutrition",
  maternal: "Maternal & Child",
  mental: "Mental Health",
  general: "General",
};

/**
 * Build health care tips from the bundled articles when the AI cannot be
 * reached, so the Health Education page never shows an empty section.
 */
export const localTipsForTopic = (
  topic: string,
): { title: string; detail: string }[] => {
  const category = AI_TOPIC_TO_CATEGORY[topic] || "General";
  // Prefer the article explicitly tagged for this topic, then the closest
  // category, then the first article as a last resort.
  const article =
    HEALTH_ARTICLES.find((a) => a.aiTopic === topic) ||
    HEALTH_ARTICLES.find((a) => a.category === category) ||
    HEALTH_ARTICLES[0];

  if (!article) return [];

  return article.tips.slice(0, 5).map((tip) => ({
    title: tip.length > 90 ? `${tip.slice(0, 87)}…` : tip,
    detail: `From "${article.title}". Open the article below for the full guidance.`,
  }));
};