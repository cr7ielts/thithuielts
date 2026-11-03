// =====================================================================
//  ĐỌC BÁO KHOA HỌC — bài đọc sẵn có
//  Bài do i-melts biên soạn theo văn phong báo khoa học / IELTS Reading (độ dài, cấu trúc, từ vựng học thuật),
//  tổng hợp từ kiến thức khoa học phổ biến; mục "refs" ghi các cơ quan / tạp chí để học sinh đọc thêm.
//  Giáo viên thêm bài báo thật (dán nội dung + link nguồn) ở trang Đọc báo → "Thêm bài" — lưu Firestore newsArticles.
//  Mỗi bài: { id, title, topic, level, minutes, summary, refs: [{ name, url }], paras: [chuỗi] }
// =====================================================================

export const NEWS_TOPICS = {
  health: ["Sức khoẻ & y học", "Health & medicine"],
  environment: ["Môi trường", "Environment"],
  brain: ["Não bộ & tâm lý", "Brain & psychology"],
  nature: ["Thế giới tự nhiên", "The natural world"],
  tech: ["Công nghệ", "Technology"],
  space: ["Vũ trụ", "Space"],
};

export const NEWS = [
  {
    id: "sleep-memory",
    title: "Why a good night's sleep makes you a better learner",
    topic: "brain", level: "B2", minutes: 5,
    summary: "Sleep is not a pause in learning but an active stage in which the brain replays and stores new information.",
    refs: [{ name: "National Institutes of Health (NIH)", url: "https://www.nih.gov" }, { name: "Sleep Foundation", url: "https://www.sleepfoundation.org" }],
    paras: [
      "For a long time, sleep was regarded as little more than a period of rest, a necessary interruption to the productive hours of the day. Over the past three decades, however, researchers have built a compelling case that sleep plays an active role in learning. Far from switching off, the sleeping brain appears to sort, strengthen and file away the experiences of the previous day.",
      "Much of the evidence comes from laboratory studies in which volunteers learn a task, such as a list of word pairs or a sequence of finger movements, and are then tested after a period of either sleep or wakefulness. Time and again, those who have slept perform better, even when the length of the delay is identical. The improvement is not simply the result of being less tired at the time of the test; participants who learn in the evening and sleep before testing typically outperform those who learn in the morning and are tested in the evening of the same day.",
      "Scientists believe that the key lies in a process known as memory consolidation. During the day, new information is held temporarily in the hippocampus, a small structure deep inside the brain. During deep, slow-wave sleep, the hippocampus appears to replay recent experiences, gradually transferring them to the cortex, where long-term memories are stored. Recordings of brain activity in animals have shown patterns of neural firing during sleep that closely resemble those recorded while the animals were exploring a new environment earlier in the day.",
      "Different stages of sleep may contribute in different ways. Slow-wave sleep, which dominates the early part of the night, seems particularly important for facts and events. Rapid eye movement (REM) sleep, which becomes more frequent towards the morning, has been linked to emotional memory and to creative problem-solving, perhaps because it allows the brain to form unexpected connections between pieces of information.",
      "The practical implications for students are considerable. Staying up all night before an examination, a habit sometimes described as 'cramming', may feel productive, but it deprives the brain of exactly the process it needs to retain what has been studied. Several studies have found that even a short daytime nap can improve recall, provided it is taken soon after learning.",
      "None of this means that sleep can replace effort. Information that was never properly understood is unlikely to be rescued by a good night's rest. What the research does suggest is that learning and sleep are partners: the first lays down the material, and the second helps to make it last.",
    ],
  },
  {
    id: "urban-trees",
    title: "Cooling the city: the hidden value of urban trees",
    topic: "environment", level: "B2", minutes: 5,
    summary: "Trees can lower street temperatures by several degrees, reduce energy use and improve residents' health, but planting them is only the first step.",
    refs: [{ name: "US Environmental Protection Agency (EPA)", url: "https://www.epa.gov" }, { name: "UN Environment Programme", url: "https://www.unep.org" }],
    paras: [
      "On a hot summer afternoon, the centre of a large city can be several degrees warmer than the surrounding countryside. This phenomenon, known as the urban heat island effect, occurs because concrete, asphalt and brick absorb heat during the day and release it slowly at night. Vehicles, air-conditioning units and factories add further heat, while the lack of vegetation means there is little to cool the air.",
      "As heatwaves become more frequent and more intense, city authorities are looking for affordable ways to protect residents. One of the most effective solutions turns out to be one of the oldest: planting trees. Trees cool their surroundings in two ways. First, they provide shade, preventing sunlight from reaching pavements and walls. Second, they release water vapour through their leaves, a process called transpiration, which works rather like natural air-conditioning.",
      "The benefits can be substantial. Measurements in many cities have shown that streets lined with mature trees can be noticeably cooler than nearby streets without them, and buildings shaded by trees may need considerably less energy for air-conditioning. Lower temperatures, in turn, reduce the risk of heat-related illness, which particularly affects elderly people and those with heart or lung conditions.",
      "Trees offer other advantages too. Their leaves trap fine particles of dust and pollution, their roots help soil to absorb heavy rainfall and so reduce the risk of flooding, and green streets have been associated with lower stress levels and greater physical activity among residents. Some researchers argue that these combined benefits should be counted as part of a city's essential infrastructure, alongside roads and drains.",
      "However, experts warn that planting is only the beginning. Young trees need regular watering and protection for several years before they become established, and the wrong species planted in the wrong place may struggle to survive or damage pavements and pipes. There is also a question of fairness: wealthier neighbourhoods often have far more tree cover than poorer ones, which means that the residents most vulnerable to heat frequently receive the least protection.",
      "For this reason, many cities now map their tree cover street by street and give priority to areas where shade is scarce. The aim is not simply to increase the number of trees, but to ensure that their cooling effect reaches the people who need it most.",
    ],
  },
  {
    id: "microplastics",
    title: "Microplastics: small particles, big questions",
    topic: "environment", level: "C1", minutes: 6,
    summary: "Tiny fragments of plastic are now found almost everywhere, from deep oceans to drinking water. Scientists are still working out what this means for health.",
    refs: [{ name: "World Health Organization (WHO)", url: "https://www.who.int" }, { name: "NOAA Marine Debris Program", url: "https://marinedebris.noaa.gov" }],
    paras: [
      "Plastic was once celebrated as the miracle material of the modern age: light, durable and cheap to produce. Its durability, however, has turned out to be a double-edged sword. Plastic does not rot away in the manner of wood or paper; instead, exposure to sunlight, waves and friction gradually breaks it into smaller and smaller pieces. Fragments less than five millimetres across are known as microplastics, and they have now been detected in virtually every environment that scientists have examined.",
      "Some microplastics are manufactured at that size, such as the tiny beads once common in cosmetics, which many countries have since banned. The majority, though, are secondary particles, created when larger items such as bottles, bags and fishing nets break down. Synthetic clothing is another significant source: washing a single load of polyester or nylon garments can release large numbers of microscopic fibres, many of which pass through water treatment plants and into rivers and the sea.",
      "Once in the environment, microplastics travel remarkable distances. They have been found in Arctic sea ice, in sediments on the deep ocean floor and in the air above remote mountains. Marine animals, from plankton to whales, ingest them, either by mistake or because the particles are attached to food. Laboratory experiments suggest that high concentrations can harm the growth and reproduction of some small organisms, although the effects at the levels typically found in the wild are harder to establish.",
      "Inevitably, attention has turned to human health. Microplastics have been detected in drinking water, both bottled and tap, as well as in salt, seafood and the air inside homes. Researchers have also reported finding particles in human tissue. What remains uncertain is whether, and at what level, this exposure causes harm. Particles might cause inflammation, and some plastics contain chemical additives that could be released inside the body, but the evidence so far is limited and often based on small studies.",
      "Part of the difficulty is methodological. Microplastics come in countless shapes, sizes and chemical compositions, and measuring them reliably requires careful procedures to avoid contaminating samples with plastic from the laboratory itself. International organisations have therefore called for standardised methods, so that results from different studies can be compared with confidence.",
      "While the science develops, many experts argue that the most sensible response is to reduce the flow of plastic into the environment in the first place, through better waste management, improved product design and a reduction in single-use items. Whatever the eventual verdict on health effects, particles that do not degrade will continue to accumulate for as long as they are produced.",
    ],
  },
  {
    id: "octopus-intelligence",
    title: "The octopus: an alien intelligence on our own planet",
    topic: "nature", level: "B2", minutes: 5,
    summary: "With a brain distributed through its arms, the octopus solves problems in ways that challenge our ideas about intelligence.",
    refs: [{ name: "Smithsonian Ocean", url: "https://ocean.si.edu" }, { name: "Monterey Bay Aquarium", url: "https://www.montereybayaquarium.org" }],
    paras: [
      "When we think of intelligent animals, we usually picture creatures closely related to ourselves, such as chimpanzees, or familiar companions such as dogs. Yet one of the most impressive problem-solvers in the animal kingdom is an invertebrate whose last common ancestor with humans lived more than 500 million years ago: the octopus.",
      "Octopuses have been observed opening jars to reach food, escaping from tanks through surprisingly small gaps and using coconut shells as portable shelters. In laboratory studies, they can learn to distinguish between shapes and to navigate simple mazes. Aquarium staff often report that individual octopuses appear to recognise particular people, sometimes reacting quite differently to keepers they seem to dislike.",
      "What makes these abilities especially intriguing is the unusual structure of the octopus nervous system. An octopus has around 500 million neurons, a number comparable to that of some mammals, but roughly two-thirds of them are located not in the central brain but in its eight arms. Each arm can taste, touch and carry out complex movements with a considerable degree of independence. In effect, the animal's intelligence is distributed throughout its body.",
      "The octopus is also a master of disguise. Special cells in its skin allow it to change colour and pattern in a fraction of a second, and it can alter the texture of its skin to resemble rock or seaweed. Remarkably, it does all this despite the fact that its eyes appear to lack the type of cells that most animals use to see colour, a puzzle that researchers are still trying to solve.",
      "Perhaps the most striking feature of octopus intelligence is how it evolved. Intelligence is usually linked to long lives and complex social groups, in which individuals learn from one another. Most octopuses, however, live for only one or two years and spend much of that time alone. Their abilities seem to have developed independently of those of mammals and birds, which suggests that there may be more than one route to a sophisticated mind.",
      "For scientists, the octopus therefore offers a rare opportunity: a chance to study intelligence that has arisen along a completely separate evolutionary path. For the rest of us, it is a reminder that some of the most remarkable minds on Earth may look nothing like our own.",
    ],
  },
  {
    id: "bilingual-brain",
    title: "Does speaking two languages change the brain?",
    topic: "brain", level: "C1", minutes: 6,
    summary: "Bilingualism was once thought to confuse children. Today researchers debate whether it brings cognitive advantages — and how large they are.",
    refs: [{ name: "American Psychological Association", url: "https://www.apa.org" }, { name: "Linguistic Society of America", url: "https://www.linguisticsociety.org" }],
    paras: [
      "In the early twentieth century, many educators believed that raising children with two languages was harmful. Bilingual children, it was argued, would become confused, learn more slowly and perform worse at school. These conclusions were later shown to be based on poorly designed studies, which often compared children from very different social and economic backgrounds without taking those differences into account.",
      "Opinion has since swung in the opposite direction. A large body of research now indicates that growing up with two languages does not delay development in any lasting way. Bilingual children may initially know fewer words in each individual language than monolingual children of the same age, but when both languages are counted together, their total vocabulary is typically similar.",
      "More controversial is the claim that bilingualism brings general cognitive advantages. Because bilingual speakers must constantly select one language while suppressing the other, some researchers proposed that this daily practice strengthens 'executive functions' — the mental skills used to focus attention, ignore distractions and switch between tasks. Early studies reported that bilingual children and adults performed better on tests of these abilities.",
      "Later research has produced a more mixed picture. Several large studies have found little or no difference between bilinguals and monolinguals on executive-function tasks, and some scientists suggest that the original findings were partly the result of small samples and a tendency for positive results to be published more readily than negative ones. Others argue that the advantages are real but depend on how often people switch between languages and in what contexts.",
      "One area that continues to attract interest is ageing. Some studies have reported that lifelong bilinguals tend to show symptoms of dementia later than monolinguals with similar levels of brain change, possibly because their brains have built up what researchers call 'cognitive reserve'. However, these studies are observational, which means they cannot prove that bilingualism itself is responsible.",
      "What is not in doubt is the practical value of speaking more than one language, whether for travel, work or understanding other cultures. As one researcher has put it, the case for learning languages never depended on hidden benefits to the brain; any such benefits would simply be a welcome bonus.",
    ],
  },
  {
    id: "coral-reefs",
    title: "Coral reefs in hot water",
    topic: "nature", level: "B2", minutes: 5,
    summary: "Rising sea temperatures are causing repeated coral bleaching. Scientists are testing new ways to help reefs survive.",
    refs: [{ name: "NOAA Coral Reef Watch", url: "https://coralreefwatch.noaa.gov" }, { name: "Great Barrier Reef Marine Park Authority", url: "https://www.gbrmpa.gov.au" }],
    paras: [
      "Coral reefs cover only a tiny fraction of the ocean floor, yet they support around a quarter of all known marine species. They also protect coastlines from storms, provide food for millions of people and attract large numbers of tourists. For all their importance, reefs are among the ecosystems most threatened by rising global temperatures.",
      "Reef-building corals live in partnership with microscopic algae that inhabit their tissues. The algae produce food through photosynthesis and give corals much of their colour; in return, the corals provide shelter and nutrients. When the water becomes too warm for too long, this partnership breaks down. The stressed corals expel the algae and turn white, an event known as bleaching.",
      "Bleached corals are not immediately dead, and if temperatures return to normal quickly, the algae can recolonise them. If the heat persists, however, the corals may starve or become vulnerable to disease. Mass bleaching events, in which large areas of reef are affected at the same time, have become considerably more frequent in recent decades, leaving reefs less time to recover between episodes.",
      "Scientists and reef managers are exploring several ways to help. Some projects grow fragments of coral in underwater nurseries and transplant them onto damaged reefs. Others aim to identify corals that naturally tolerate higher temperatures and breed them, in the hope of producing more resilient populations. Researchers are also investigating whether shading reefs or cooling small areas of water could reduce damage during heatwaves.",
      "Local measures matter too. Reducing pollution from farms and cities, controlling overfishing and preventing damage from anchors and divers can all improve the chances that a reef will recover after bleaching. Healthy reefs, with plenty of fish that graze on seaweed, tend to bounce back more quickly than those already under pressure.",
      "Nevertheless, most experts agree that such efforts can only buy time. Restoration projects operate on a scale of hectares, while reefs extend over thousands of square kilometres. In the long run, the future of coral reefs depends on limiting the rise in ocean temperatures — a challenge that cannot be solved on the reefs themselves.",
    ],
  },
  {
    id: "ai-diagnosis",
    title: "Can artificial intelligence help doctors read medical scans?",
    topic: "tech", level: "C1", minutes: 6,
    summary: "AI systems can now spot some diseases in images as accurately as specialists, but using them safely in hospitals raises new questions.",
    refs: [{ name: "World Health Organization — Ethics and governance of AI for health", url: "https://www.who.int" }, { name: "US Food and Drug Administration (FDA)", url: "https://www.fda.gov" }],
    paras: [
      "Every day, hospitals produce enormous numbers of X-rays, CT scans and other medical images, each of which must be examined by a trained specialist. In many countries, there are not enough radiologists to meet demand, and delays in reading scans can mean delays in treatment. It is perhaps no surprise, then, that medical imaging has become one of the most active areas for the application of artificial intelligence.",
      "Most of these systems rely on a technique called deep learning. Rather than being programmed with explicit rules, a computer model is shown thousands or even millions of labelled images — scans marked by experts as showing, for example, a fracture or a tumour — and gradually learns to recognise the visual patterns associated with each condition. In a number of published studies, such systems have matched or come close to the accuracy of specialists on specific tasks, such as detecting certain eye diseases or signs of cancer in mammograms.",
      "Supporters argue that AI could act as a tireless second reader, flagging urgent cases so that they are seen first, or reducing the number of normal scans that a specialist must review in detail. In settings where specialists are scarce, it might extend access to diagnosis to people who would otherwise wait months.",
      "Yet experience has shown that performance in a research study does not always translate into performance in a busy hospital. A model trained on images from one type of scanner or one population may perform less well elsewhere, a problem known as poor generalisation. There is also the risk that doctors may rely too heavily on the computer's judgement, or, conversely, ignore it because they do not understand how it reached its conclusion.",
      "Questions of responsibility and fairness add further complications. If an AI system misses a diagnosis, it is not always clear who is accountable: the manufacturer, the hospital or the doctor. And if the data used to train a system under-represent certain groups of patients, its accuracy may be lower for precisely those groups. For these reasons, regulators in several countries now require evidence of safety and effectiveness before such tools can be used clinically.",
      "Most specialists see the future not as a contest between humans and machines but as a collaboration. The most promising results so far have come from combining the speed of AI with the judgement and context that experienced clinicians bring — an approach that aims to make diagnosis both faster and more reliable.",
    ],
  },
  {
    id: "exoplanets",
    title: "The search for planets beyond our solar system",
    topic: "space", level: "B2", minutes: 5,
    summary: "In just three decades, astronomers have gone from finding no planets around other stars to cataloguing thousands.",
    refs: [{ name: "NASA Exoplanet Exploration", url: "https://exoplanets.nasa.gov" }, { name: "European Space Agency (ESA)", url: "https://www.esa.int" }],
    paras: [
      "For most of human history, the question of whether other stars have planets of their own was a matter for philosophers rather than scientists. The first confirmed discoveries of planets orbiting stars similar to the Sun were made only in the 1990s. Today, astronomers have identified more than five thousand such worlds, known as exoplanets, and new ones are announced regularly.",
      "Finding them is far from easy. Planets are tiny and faint compared with the stars they orbit, and they are usually lost in the glare. As a result, most exoplanets have been discovered indirectly. One method looks for a slight wobble in a star's movement, caused by the gravitational pull of an orbiting planet. Another, known as the transit method, measures the small, regular dip in a star's brightness that occurs when a planet passes in front of it.",
      "The transit method has been especially productive, thanks to space telescopes designed to monitor the brightness of many thousands of stars at once. By measuring how much light is blocked, astronomers can estimate a planet's size; by combining this with the wobble method, they can calculate its mass and therefore whether it is likely to be rocky, like Earth, or gaseous, like Jupiter.",
      "The results have overturned many expectations. Astronomers have found 'hot Jupiters' — giant planets orbiting closer to their stars than Mercury is to the Sun — as well as types of planet that have no equivalent in our own solar system, such as worlds larger than Earth but smaller than Neptune, which appear to be among the most common in the galaxy.",
      "Inevitably, much attention focuses on planets that lie in the so-called habitable zone, the range of distances from a star at which liquid water could exist on a planet's surface. Being in this zone does not mean a planet is actually habitable, let alone inhabited, but it marks it out as worth further study.",
      "The next step is to study the atmospheres of these distant worlds. When a planet passes in front of its star, a little starlight filters through its atmosphere, and the gases present leave characteristic signatures in that light. Modern telescopes are now able to detect some of these signatures, bringing scientists closer to answering one of humanity's oldest questions: are we alone?",
    ],
  },
];
