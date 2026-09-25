// =====================================================================
//  ĐỀ THI THỬ SỐ 01 — IELTS Academic (nội dung tự biên soạn)
// =====================================================================
//  Cấu trúc một nhóm câu hỏi (group):
//  {
//    title: "Questions 1-5",
//    instruction: "...",            // hướng dẫn hiển thị
//    bank: ["A ...", "B ..."],      // (tuỳ chọn) khung đáp án cho matching
//    type: "gap" | "mcq" | "mcq-multi" | "tfng" | "ynng" | "matching",
//    choices: ["A","B","C"],        // giá trị cho type matching
//    questions: [
//      { n: 1, text: "Tên khoá học: ____", answer: ["evening", "the evening"] }
//    ]
//  }
//  - "gap": nếu text có "____" thì ô nhập được chèn ngay tại chỗ đó.
//  - answer: mảng các đáp án được chấp nhận (không phân biệt hoa/thường).
// =====================================================================

export const TEST = {
  id: "test-01",
  title: "IELTS Academic — Mock Test 01",

  /* =================================================================
     LISTENING — 4 sections, 40 câu
     ================================================================= */
  listening: {
    note:
      "Each section is played ONCE, as in the real test.",
    sections: [
      {
        id: "s1",
        title: "Section 1",
        context: "A phone call to enrol on a course at a community language centre.",
        audioUrl: "", // ví dụ: "audio/test01-s1.mp3"
        transcript: `You will hear a telephone conversation between a woman and a receptionist at the Riverside Community Language Centre. First you have some time to look at questions one to ten.

Receptionist: Good morning, Riverside Community Language Centre, Daniel speaking.
Woman: Oh hello. I saw a leaflet about your English classes and I'd like to enrol.
Receptionist: Certainly. Can I take your full name?
Woman: Yes, it's Helena Marsh. That's M-A-R-S-H.
Receptionist: Thank you, Helena. And which course were you interested in?
Woman: The Academic Writing course, if there are still places.
Receptionist: There are. That one runs on Thursday evenings, from six thirty to eight thirty.
Woman: Thursday suits me well.
Receptionist: Good. The course lasts twelve weeks and the fee is one hundred and eighty pounds. That includes the coursebook but not the exam entry.
Woman: One hundred and eighty. Fine. Where exactly do the classes take place?
Receptionist: In the Hartley Building, room fourteen, on the first floor. It's the entrance opposite the library.
Woman: Got it. And do I need to do a test first?
Receptionist: Yes, all new students take a short placement test. It's online and takes about forty minutes. You'll get the link by email once you've paid the deposit.
Woman: How much is the deposit?
Receptionist: Fifty pounds, and the rest is due on the first day of term.
Woman: All right. Is there anything I should bring to the first class?
Receptionist: Just a notebook and some form of photo identification, a passport or a driving licence. And the teacher, Mrs Okonjo, likes students to bring a dictionary, a paper one rather than a phone.
Woman: A dictionary, right. And when does term start?
Receptionist: The eleventh of September. Registration closes on the fourth.
Woman: Perfect. One last thing, is there parking?
Receptionist: There's a car park behind the building but it's for staff. Students usually use the free spaces on Elm Street.
Woman: Thank you, that's very helpful.
That is the end of Section 1.`,
        groups: [
          {
            title: "Questions 1–10",
            instruction:
              "Complete the form below. Write <strong>NO MORE THAN TWO WORDS AND/OR A NUMBER</strong> for each answer.",
            type: "gap",
            questions: [
              { n: 1, text: "Surname: ____", answer: ["marsh"] },
              { n: 2, text: "Course: ____ Writing", answer: ["academic"] },
              { n: 3, text: "Class day: ____ evenings", answer: ["thursday", "thurs"] },
              { n: 4, text: "Time: 6.30 p.m. – ____ p.m.", answer: ["8.30", "830", "8:30", "eight thirty"] },
              { n: 5, text: "Length of course: ____ weeks", answer: ["12", "twelve"] },
              { n: 6, text: "Fee: £____", answer: ["180", "one hundred and eighty"] },
              { n: 7, text: "Location: the ____ Building, room 14", answer: ["hartley", "the hartley"] },
              { n: 8, text: "Placement test: online, takes about ____ minutes", answer: ["40", "forty"] },
              { n: 9, text: "Bring: a notebook, photo ID and a paper ____", answer: ["dictionary", "paper dictionary"] },
              { n: 10, text: "Registration closes: ____ September", answer: ["4", "4th", "fourth"] },
            ],
          },
        ],
      },

      {
        id: "s2",
        title: "Section 2",
        context: "A talk introducing a new community sports centre.",
        audioUrl: "",
        transcript: `You will hear a talk given to new members of the Hillview Sports Complex.

Good evening everyone, and welcome to Hillview. I'm Priya, the membership coordinator, and I'll spend ten minutes explaining how the centre works.

Hillview opened four years ago on the site of an old bus depot. The council funded most of the building, but the swimming pool was paid for entirely by donations from local businesses, which is something we're rather proud of.

Let me start with opening hours. We open at six in the morning on weekdays and close at ten at night. At weekends we open an hour later, at seven, and close at eight. The only day we shut completely is the twenty-fifth of December.

Now, the layout. As you come through the main doors, reception is directly in front of you. The changing rooms are to your left, past the café. The gym is upstairs, at the top of the main staircase, and the two studios where the fitness classes run are at the far end of the upstairs corridor. The sports hall, which we use for badminton and basketball, is behind reception on the ground floor.

A word about booking. Courts must be booked in advance, and members can book up to seven days ahead. Non-members can book only two days ahead and pay a higher rate. Fitness classes work differently, they're included in the full membership, but you must reserve a place through the app, because they fill up quickly, particularly the early morning ones.

There are a few rules we ask everyone to follow. Please bring a padlock, as we don't provide them and items left in unlocked lockers are not insured. Outdoor shoes are not permitted in the sports hall, the floor was resurfaced last year and marks very easily. And children under twelve must be accompanied by an adult at all times, including in the café area.

Finally, our most popular addition this year has been the outdoor running track, which is floodlit until nine in the evening and is free for everyone, members or not.

That is the end of Section 2.`,
        groups: [
          {
            title: "Questions 11–14",
            instruction: "Choose the correct letter, <strong>A, B or C</strong>.",
            type: "mcq",
            questions: [
              {
                n: 11,
                text: "The swimming pool was paid for by",
                choices: [
                  { v: "A", t: "the local council." },
                  { v: "B", t: "local businesses." },
                  { v: "C", t: "membership fees." },
                ],
                answer: ["B"],
              },
              {
                n: 12,
                text: "At weekends, the centre opens at",
                choices: [
                  { v: "A", t: "6 a.m." },
                  { v: "B", t: "7 a.m." },
                  { v: "C", t: "8 a.m." },
                ],
                answer: ["B"],
              },
              {
                n: 13,
                text: "Members can book courts up to",
                choices: [
                  { v: "A", t: "two days ahead." },
                  { v: "B", t: "seven days ahead." },
                  { v: "C", t: "fourteen days ahead." },
                ],
                answer: ["B"],
              },
              {
                n: 14,
                text: "The speaker says that fitness classes",
                choices: [
                  { v: "A", t: "cost extra." },
                  { v: "B", t: "must be reserved through the app." },
                  { v: "C", t: "are only for people over 16." },
                ],
                answer: ["B"],
              },
            ],
          },
          {
            title: "Questions 15–17",
            instruction:
              "Where are the following facilities? Choose the correct letter, <strong>A–E</strong>.",
            bank: [
              "A  upstairs, at the end of the corridor",
              "B  on the left, past the café",
              "C  behind reception, on the ground floor",
              "D  at the top of the main staircase",
              "E  outside the building",
            ],
            type: "matching",
            choices: ["A", "B", "C", "D", "E"],
            questions: [
              { n: 15, text: "Changing rooms", answer: ["B"] },
              { n: 16, text: "Gym", answer: ["D"] },
              { n: 17, text: "Sports hall", answer: ["C"] },
            ],
          },
          {
            title: "Questions 18–20",
            instruction:
              "Complete the sentences below. Write <strong>NO MORE THAN TWO WORDS</strong> for each answer.",
            type: "gap",
            questions: [
              { n: 18, text: "Members must bring their own ____ for the lockers.", answer: ["a padlock", "padlock"] },
              { n: 19, text: "Outdoor shoes are not allowed in the ____.", answer: ["the sports hall", "sports hall"] },
              { n: 20, text: "The running track is floodlit until ____ p.m.", answer: ["9", "nine", "9pm", "9 pm"] },
            ],
          },
        ],
      },

      {
        id: "s3",
        title: "Section 3",
        context: "Two students discuss a fieldwork research project.",
        audioUrl: "",
        transcript: `You will hear two geography students, Maya and Tom, discussing a field project about river water quality.

Tom: Maya, have you started writing up the river project?
Maya: I've drafted the methods section, but I'm stuck on the introduction. My problem is that our research question changed halfway through.
Tom: Mine too. We began by asking whether farm run-off was the main cause of the pollution, but after the second visit it was obvious that the old sewage outflow mattered far more.
Maya: Exactly. So do we describe the original question or the one we ended up with?
Tom: Dr Ferris said we should describe both and explain why the change happened. Apparently examiners like seeing that you responded to the evidence.
Maya: That's reassuring. What about the sampling? We only collected water on four days.
Tom: I know, and two of those were after heavy rain, which distorts everything. I'd say that's the weakest part of the study and we should just admit it in the limitations.
Maya: Agreed. Better to be honest than to pretend the data is stronger than it is. Did you manage to use the software for the graphs?
Tom: I tried the one the department recommends, but it kept crashing on my laptop. In the end I did everything in a spreadsheet. The graphs look plainer, but they're accurate.
Maya: I used the recommended software and it was fine, so it may just be your machine. I can export mine as images and send them over if you like.
Tom: That would help enormously. Now, about the presentation next Tuesday. We've got fifteen minutes between us.
Maya: I'd rather not do the statistics part. I always rush when I'm nervous and the numbers come out wrong.
Tom: Then you take the background and the fieldwork, and I'll take the results and the conclusion. But you must do the questions at the end with me.
Maya: Fine. And we should practise at least twice, ideally in the actual room.
Tom: I'll book it for Sunday afternoon. One more thing, the deadline for the written report is the sixteenth, not the eighteenth. They moved it.
Maya: Really? Then I've lost two days. I'd better start tonight.

That is the end of Section 3.`,
        groups: [
          {
            title: "Questions 21–25",
            instruction: "Choose the correct letter, <strong>A, B or C</strong>.",
            type: "mcq",
            questions: [
              {
                n: 21,
                text: "The students changed their research question because",
                choices: [
                  { v: "A", t: "their tutor told them to." },
                  { v: "B", t: "the fieldwork pointed to a different cause." },
                  { v: "C", t: "they could not find enough sources." },
                ],
                answer: ["B"],
              },
              {
                n: 22,
                text: "Dr Ferris advised them to",
                choices: [
                  { v: "A", t: "describe only the final question." },
                  { v: "B", t: "describe both questions and explain the change." },
                  { v: "C", t: "leave out the introduction." },
                ],
                answer: ["B"],
              },
              {
                n: 23,
                text: "Tom thinks the weakest part of the study is",
                choices: [
                  { v: "A", t: "the small number of sampling days." },
                  { v: "B", t: "inaccurate equipment." },
                  { v: "C", t: "not interviewing any farmers." },
                ],
                answer: ["A"],
              },
              {
                n: 24,
                text: "Tom made his graphs using",
                choices: [
                  { v: "A", t: "the department's recommended software." },
                  { v: "B", t: "a spreadsheet." },
                  { v: "C", t: "hand-drawn sketches." },
                ],
                answer: ["B"],
              },
              {
                n: 25,
                text: "Which part of the presentation does Maya NOT want to do?",
                choices: [
                  { v: "A", t: "the background" },
                  { v: "B", t: "the statistics" },
                  { v: "C", t: "the questions at the end" },
                ],
                answer: ["B"],
              },
            ],
          },
          {
            title: "Questions 26–30",
            instruction:
              "Complete the notes below. Write <strong>NO MORE THAN TWO WORDS AND/OR A NUMBER</strong> for each answer.",
            type: "gap",
            questions: [
              { n: 26, text: "Main cause of the pollution: the old ____", answer: ["sewage outflow", "the sewage outflow", "sewage"] },
              { n: 27, text: "Water samples were collected on only ____ days", answer: ["4", "four"] },
              { n: 28, text: "Length of the presentation: ____ minutes", answer: ["15", "fifteen"] },
              { n: 29, text: "Rehearsal: ____ afternoon", answer: ["sunday"] },
              { n: 30, text: "New deadline for the written report: the ____", answer: ["16", "16th", "sixteenth", "the 16th"] },
            ],
          },
        ],
      },

      {
        id: "s4",
        title: "Section 4",
        context: "A lecture on the role of trees in cities.",
        audioUrl: "",
        transcript: `You will hear part of a lecture about urban trees and the climate of cities.

Good afternoon. Today I want to look at the humble street tree, and to argue that it is one of the most cost-effective pieces of infrastructure a city can install.

Let's start with temperature. Cities are typically warmer than the countryside around them, a phenomenon known as the urban heat island. The difference is usually between two and five degrees, but on still summer nights it can reach eight. Trees reduce this in two ways. First, their canopy blocks sunlight before it reaches paving and brickwork. Second, and less obviously, they cool the air through transpiration, releasing water vapour from their leaves. A single mature tree can move several hundred litres of water into the air on a hot day.

The second benefit is water management. During heavy rain, leaves and branches intercept a proportion of the rainfall before it hits the ground, and tree roots increase the rate at which soil absorbs water. Studies in Manchester found that a mature canopy can reduce surface run-off by around twenty per cent, which matters enormously for flooding.

Third, air quality. Leaves trap particles, though I should stress that the effect is often overstated in the popular press. In narrow streets with tall buildings, a dense canopy can actually trap pollution at street level rather than dispersing it, so species choice and street design matter more than simply planting as many trees as possible.

Now, the difficulties. Urban trees live far shorter lives than their rural cousins. The average street tree in a city centre survives around nineteen years, compared with well over a century in a park. The main killer is not disease but soil compaction: the ground beneath pavements is pressed so hard that roots cannot find oxygen. The second problem is water stress in the first three summers after planting, which is why many councils now use watering bags.

Finally, cost. Planting is cheap; maintenance is not. Roughly seventy per cent of the lifetime cost of an urban tree is spent after it goes into the ground, on pruning, watering and eventual removal. Cities that budget only for planting end up with dead trees and empty pits, which is worse than not planting at all.

That is the end of Section 4.`,
        groups: [
          {
            title: "Questions 31–40",
            instruction:
              "Complete the notes below. Write <strong>NO MORE THAN TWO WORDS AND/OR A NUMBER</strong> for each answer.",
            type: "gap",
            questions: [
              { n: 31, text: "Cities being warmer than the countryside is known as the urban ____.", answer: ["heat island", "heat-island"] },
              { n: 32, text: "On still summer nights the difference can reach ____ degrees.", answer: ["8", "eight"] },
              { n: 33, text: "Trees also cool the air through ____.", answer: ["transpiration"] },
              { n: 34, text: "A mature canopy can reduce surface run-off by about ____ per cent.", answer: ["20", "twenty"] },
              { n: 35, text: "The run-off study was carried out in ____.", answer: ["manchester"] },
              { n: 36, text: "In narrow streets, a dense canopy can trap ____ at street level.", answer: ["pollution", "the pollution"] },
              { n: 37, text: "Average life of a city-centre street tree: ____ years", answer: ["19", "nineteen"] },
              { n: 38, text: "Main cause of death: soil ____", answer: ["compaction"] },
              { n: 39, text: "Many councils now use ____ to prevent water stress in young trees.", answer: ["watering bags", "watering bag"] },
              { n: 40, text: "About ____ per cent of a tree's lifetime cost comes after planting.", answer: ["70", "seventy"] },
            ],
          },
        ],
      },
    ],
  },

  /* =================================================================
     READING — 3 passages, 40 câu
     ================================================================= */
  reading: {
    passages: [
      {
        id: "p1",
        title: "Reading Passage 1",
        heading: "Bringing the Bees Back",
        intro: "You should spend about 20 minutes on Questions 1–13.",
        paragraphs: [
          {
            mark: "",
            text: `Twenty years ago, keeping bees in a city was regarded as an eccentric hobby. Today, hives sit on the roofs of opera houses, hotels and government ministries in dozens of capitals. Paris alone is thought to host more than seven hundred registered colonies, and the figure for London has roughly tripled since 2008. The trend began as a response to alarming reports of colony collapse in agricultural regions, and it carried an appealing message: that ordinary citizens could do something practical about a global environmental problem.`,
          },
          {
            mark: "",
            text: `The surprise, for many beekeepers, was how well the insects did. Urban colonies frequently produce more honey than rural ones. The reason is variety. A field of oilseed rape offers an enormous quantity of a single food source for three weeks and almost nothing afterwards, whereas a city offers lime trees, garden lavender, railway-side buddleia and window boxes, flowering in succession from March to October. Cities are also slightly warmer than the surrounding countryside, so the foraging season is longer, and pesticide use in gardens, though far from negligible, is patchy rather than systematic.`,
          },
          {
            mark: "",
            text: `Enthusiasm, however, has begun to outrun the evidence. Ecologists point out that the honeybee is a managed, farmed animal, closer to a hen than to a wild songbird. Placing more hives in a city does not protect pollinators in general; it may do the opposite. A study of parks in one European capital found that where hive density exceeded roughly seven colonies per square kilometre, the diversity of wild bee species measurably declined. Honeybees are efficient generalists, and in a bad year they strip the available flowers before smaller solitary species can reach them.`,
          },
          {
            mark: "",
            text: `Dr Karin Voss, an entomologist who has advised two city councils, puts it bluntly. "We have confused a farming practice with conservation," she says. "If a company wants to help pollinators, the last thing it should buy is a hive on the roof. The first thing it should do is let the grass grow." Her own surveys suggest that an unmown verge supports more insect species than an intensively managed wildflower bed, and costs nothing.`,
          },
          {
            mark: "",
            text: `Not everyone accepts this framing. Beekeeping associations argue that urban hives are the most effective public education tool available, and that people who have watched a colony at close range are more likely to support wider habitat protection. There is some evidence for the claim: surveys of school programmes report lasting changes in attitude, though not necessarily in behaviour. The disagreement, then, is less about the biology than about what cities are for.`,
          },
          {
            mark: "",
            text: `A compromise is emerging in the form of regulation. Several municipalities now require hives to be registered, cap the number permitted in each district, and tie planting obligations to permits, so that anyone installing a colony must also fund forage. Oslo has gone further, mapping a continuous "bee highway" of flowering sites across the city so that no insect, managed or wild, has to travel more than two hundred and fifty metres to find food. Early monitoring suggests wild bee numbers along the route have stabilised, although researchers caution that four years is too short a period to be certain.`,
          },
        ],
        groups: [
          {
            title: "Questions 1–6",
            instruction:
              "Do the following statements agree with the information in the passage? Write <strong>TRUE</strong> if the statement agrees with the information, <strong>FALSE</strong> if it contradicts the information, <strong>NOT GIVEN</strong> if there is no information on this.",
            type: "tfng",
            questions: [
              { n: 1, text: "The number of registered colonies in London has roughly tripled since 2008.", answer: ["TRUE"] },
              { n: 2, text: "Urban colonies usually produce less honey than rural ones.", answer: ["FALSE"] },
              { n: 3, text: "Warmer temperatures give city bees a longer foraging season.", answer: ["TRUE"] },
              { n: 4, text: "Urban honey sells for a higher price than rural honey.", answer: ["NOT GIVEN"] },
              { n: 5, text: "One study found that very high hive density reduced wild bee diversity.", answer: ["TRUE"] },
              { n: 6, text: "Dr Voss believes a rooftop hive is the best way for a company to help pollinators.", answer: ["FALSE"] },
            ],
          },
          {
            title: "Questions 7–13",
            instruction:
              "Complete the summary. Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage for each answer.",
            type: "gap",
            questions: [
              {
                n: 7,
                text: "Urban beekeeping began as a response to reports of colony ____ in farming regions.",
                answer: ["collapse"],
              },
              {
                n: 8,
                text: "A field of oilseed rape provides food for only about ____ weeks.",
                answer: ["three", "3"],
              },
              {
                n: 9,
                text: "Ecologists say the honeybee is closer to a ____ than to a wild songbird.",
                answer: ["hen", "a hen"],
              },
              {
                n: 10,
                text: "Wild bee diversity fell where there were more than about ____ colonies per square kilometre.",
                answer: ["seven", "7"],
              },
              {
                n: 11,
                text: "Dr Voss found that a verge that is not ____ supports more insect species than a managed wildflower bed.",
                answer: ["mown", "unmown", "cut"],
              },
              {
                n: 12,
                text: "Beekeeping associations call urban hives the most effective public ____ tool.",
                answer: ["education", "public education"],
              },
              {
                n: 13,
                text: "In Oslo, no bee has to travel more than ____ metres to find food.",
                answer: ["250", "two hundred and fifty"],
              },
            ],
          },
        ],
      },

      {
        id: "p2",
        title: "Reading Passage 2",
        heading: "Farming Upwards",
        intro: "You should spend about 20 minutes on Questions 14–26.",
        paragraphs: [
          {
            mark: "A",
            text: `The idea of growing food in stacked layers inside a building is older than it sounds. Patents for multi-storey greenhouses were filed in the 1910s, and wartime governments experimented with indoor salad production. What changed in the last fifteen years was not the concept but the price of light. Once light-emitting diodes became cheap, efficient and tunable, it became possible to give a plant precisely the wavelengths it uses and none of the ones it wastes, and an industry that had existed only on paper began to raise money.`,
          },
          {
            mark: "B",
            text: `The claims made for vertical farming are striking. A well-run facility uses between ninety and ninety-five per cent less water than a field growing the same crop, because water that transpires from the leaves is condensed and returned rather than lost to the sky. Yields per square metre of floor space can be twenty times higher than in open ground, and because the growing environment is sealed, pesticides are largely unnecessary. Harvests are unaffected by drought, hail or an early frost, which makes supply and therefore price far more predictable for supermarkets.`,
          },
          {
            mark: "C",
            text: `The difficulty is arithmetic. Sunlight is free; electricity is not. Even the most efficient LEDs convert only part of the energy they consume into usable photons, and the heat they produce must then be removed by cooling systems that consume more power still. Energy typically accounts for between a quarter and a half of operating costs. This is why the sector has converged on a narrow range of crops. Leafy greens, herbs and microgreens are light, quick to mature and sold fresh at high prices per kilogram. Wheat, rice and potatoes are none of these things, and no serious operator claims otherwise.`,
          },
          {
            mark: "D",
            text: `Marta Reinholt, who has advised investors in the sector since 2016, is impatient with the rhetoric. "The promise was that we would feed cities," she says. "What we have built is a premium salad business. That is a perfectly respectable business, but it is not food security, and pretending otherwise has cost investors a great deal of money." Between 2022 and 2024 several of the best-funded companies in Europe and North America entered administration, most of them undone by electricity prices they had assumed would stay low.`,
          },
          {
            mark: "E",
            text: `Others take a longer view. Professor Ade Balogun, an agricultural engineer, argues that judging the technology by its current economics is like judging solar panels by their 1985 cost. He points to steady improvements in the efficiency of horticultural lighting and to the possibility of siting farms next to sources of waste heat and surplus renewable power. "A vertical farm is a very flexible electrical load," he notes. "It can grow fast when the wind blows and idle when it does not. Very few industries can say that."`,
          },
          {
            mark: "F",
            text: `There are also uses that have nothing to do with feeding the general population. Vertical systems are already producing seedlings for conventional growers, medicinal plants requiring exact and repeatable conditions, and fresh vegetables in places where the alternative is a long refrigerated flight. Research stations in Antarctica, mining camps and several Gulf states fall into this last category, and there the comparison is not with a field in a temperate country but with imported produce that arrives limp and expensive.`,
          },
          {
            mark: "G",
            text: `Perhaps the most useful contribution, however, will be indirect. The sector has generated a large body of data on exactly how particular varieties respond to particular combinations of light, temperature and nutrient. Plant breeders are already using this to develop cultivars for glasshouses and open fields. In this reading, the vertical farm is less a replacement for agriculture than a laboratory for it, which is a more modest claim than the one originally made, and considerably more likely to be true.`,
          },
        ],
        groups: [
          {
            title: "Questions 14–20",
            instruction:
              "The passage has seven paragraphs, <strong>A–G</strong>. Choose the correct heading for each paragraph from the list of headings below.",
            bank: [
              "i    A broken promise and its cost",
              "ii   Why energy costs limit which crops are grown",
              "iii  How governments subsidise the industry",
              "iv   The advertised advantages",
              "v    An old idea revived by cheap light",
              "vi   The lasting value lies in the data",
              "vii  The case that it is too early to judge",
              "viii Niche markets where the model already works",
              "ix   The impact on rural employment",
            ],
            type: "matching",
            choices: ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"],
            questions: [
              { n: 14, text: "Paragraph A", answer: ["v"] },
              { n: 15, text: "Paragraph B", answer: ["iv"] },
              { n: 16, text: "Paragraph C", answer: ["ii"] },
              { n: 17, text: "Paragraph D", answer: ["i"] },
              { n: 18, text: "Paragraph E", answer: ["vii"] },
              { n: 19, text: "Paragraph F", answer: ["viii"] },
              { n: 20, text: "Paragraph G", answer: ["vi"] },
            ],
          },
          {
            title: "Questions 21–23",
            instruction:
              "Match each statement with the correct person, <strong>A</strong> (Marta Reinholt) or <strong>B</strong> (Ade Balogun).",
            bank: [
              "A  Marta Reinholt",
              "B  Ade Balogun",
            ],
            type: "matching",
            choices: ["A", "B"],
            questions: [
              { n: 21, text: "The industry is really selling premium salad rather than solving food security.", answer: ["A"] },
              { n: 22, text: "Vertical farms can adjust their electricity use to match renewable supply.", answer: ["B"] },
              { n: 23, text: "Judging the technology on today's costs is premature.", answer: ["B"] },
            ],
          },
          {
            title: "Questions 24–26",
            instruction:
              "Complete the sentences. Choose <strong>NO MORE THAN TWO WORDS OR A NUMBER</strong> from the passage for each answer.",
            type: "gap",
            questions: [
              {
                n: 24,
                text: "A well-run facility uses up to ____ per cent less water than a field growing the same crop.",
                answer: ["95", "ninety-five", "ninety five"],
              },
              {
                n: 25,
                text: "Energy accounts for between a quarter and ____ of operating costs.",
                answer: ["a half", "half", "one half"],
              },
              {
                n: 26,
                text: "____ are already using the sector's data to develop new cultivars.",
                answer: ["plant breeders", "breeders"],
              },
            ],
          },
        ],
      },

      {
        id: "p3",
        title: "Reading Passage 3",
        heading: "The Procrastination Puzzle",
        intro: "You should spend about 20 minutes on Questions 27–40.",
        paragraphs: [
          {
            mark: "",
            text: `Procrastination is usually described as a failure of time management, and the advice that follows from this description is correspondingly practical: make a list, break the task into smaller pieces, block out an hour in the calendar. Anyone who has tried these techniques on a task they genuinely dread will know how little they help. The list gets written. The hour arrives. The task remains untouched.`,
          },
          {
            mark: "",
            text: `Over the past two decades psychologists have largely abandoned the time-management account. In its place is a view of procrastination as a problem of mood repair. The delayed task provokes an unpleasant feeling — boredom, anxiety, self-doubt, resentment — and postponing it removes that feeling immediately. The relief is real, and because it arrives within seconds, it is powerfully reinforcing. The cost, by contrast, is deferred, diffuse and easy to discount. In this framework procrastination is not irrational at all; it is a rational response to a badly structured set of incentives inside one's own head.`,
          },
          {
            mark: "",
            text: `This explains several findings that the older account could not. Procrastination correlates only weakly with measures of organisation or intelligence, but strongly with impulsiveness and with low tolerance for negative emotion. It is more common on tasks that threaten self-worth — a first draft, a difficult conversation, an application likely to be rejected — than on tasks that are merely long or tedious. And it is worse when the deadline is distant, because the emotional cost of starting is felt now while the consequence of not starting is felt by a future self who does not, neurologically speaking, feel much like us at all.`,
          },
          {
            mark: "",
            text: `The most robust experimental result in the field concerns self-criticism. Students who were induced to forgive themselves for procrastinating before one examination procrastinated less before the next; those who were encouraged to dwell on their failure procrastinated more. The finding is counter-intuitive and has been replicated several times, though the effect sizes are modest and the samples are almost entirely undergraduates, a limitation the original authors themselves emphasise. The mechanism appears to be straightforward: shame is itself a negative emotion, and the reliable way to escape a negative emotion associated with a task is to avoid the task.`,
          },
          {
            mark: "",
            text: `Interventions that work tend to attack the emotion rather than the schedule. Reducing the perceived size of the first step is one — not "write the chapter" but "open the file and write one bad sentence" — because the aversive feeling is attached to the imagined whole, not to the opening move. Another is temptation bundling, pairing the dreaded task with something immediately pleasant, which changes the emotional arithmetic of starting. A third, and the most effective in field studies, is the removal of choice: commitment devices that make delay impossible or costly, from a shared workspace where colleagues can see the screen to software that disables a website until a word count is met. Their power lies precisely in the fact that they do not rely on the person feeling any better.`,
          },
          {
            mark: "",
            text: `There is a final complication. A certain amount of delay is productive. Ideas benefit from incubation, and starting a complex task too early can lock in a poor initial framing that is then defended out of sunk-cost stubbornness. The distinction that matters is not between acting now and acting later, but between delay that is chosen and delay that is suffered. The first is a strategy. The second is the thing that keeps people awake at two in the morning, having accomplished nothing and enjoyed nothing, which is the state that no amount of list-making has ever cured.`,
          },
        ],
        groups: [
          {
            title: "Questions 27–31",
            instruction: "Choose the correct letter, <strong>A, B, C or D</strong>.",
            type: "mcq",
            questions: [
              {
                n: 27,
                text: "In the first paragraph, the writer mentions to-do lists in order to",
                choices: [
                  { v: "A", t: "advise readers to plan in more detail." },
                  { v: "B", t: "show that the usual advice does not solve the problem." },
                  { v: "C", t: "prove that time management can be learned." },
                  { v: "D", t: "compare two schools of psychology." },
                ],
                answer: ["B"],
              },
              {
                n: 28,
                text: "According to the newer view, putting a task off provides",
                choices: [
                  { v: "A", t: "an immediate emotional reward." },
                  { v: "B", t: "extra time to gather information." },
                  { v: "C", t: "a lasting sense of control." },
                  { v: "D", t: "better focus near the deadline." },
                ],
                answer: ["A"],
              },
              {
                n: 29,
                text: "Procrastination is most strongly linked to",
                choices: [
                  { v: "A", t: "low intelligence." },
                  { v: "B", t: "poor organisation." },
                  { v: "C", t: "impulsiveness." },
                  { v: "D", t: "lack of sleep." },
                ],
                answer: ["C"],
              },
              {
                n: 30,
                text: "What does the writer say about the self-forgiveness research?",
                choices: [
                  { v: "A", t: "It has never been replicated." },
                  { v: "B", t: "Its samples were almost all undergraduates." },
                  { v: "C", t: "The effect was very large." },
                  { v: "D", t: "The authors hid its limitations." },
                ],
                answer: ["B"],
              },
              {
                n: 31,
                text: "Commitment devices work because they",
                choices: [
                  { v: "A", t: "make people feel more confident." },
                  { v: "B", t: "break tasks into small steps." },
                  { v: "C", t: "do not rely on the person feeling any better." },
                  { v: "D", t: "reward users with money." },
                ],
                answer: ["C"],
              },
            ],
          },
          {
            title: "Questions 32–36",
            instruction:
              "Do the following statements agree with the claims of the writer? Write <strong>YES</strong>, <strong>NO</strong> or <strong>NOT GIVEN</strong>.",
            type: "ynng",
            questions: [
              { n: 32, text: "Procrastination is completely irrational behaviour.", answer: ["NO"] },
              { n: 33, text: "People put off tasks that threaten their self-worth more than tasks that are merely long.", answer: ["YES"] },
              { n: 34, text: "Criticising yourself reduces procrastination next time.", answer: ["NO"] },
              { n: 35, text: "Website-blocking software works better than a shared workspace.", answer: ["NOT GIVEN"] },
              { n: 36, text: "Some kinds of delay can be useful.", answer: ["YES"] },
            ],
          },
          {
            title: "Questions 37–40",
            instruction:
              "Complete the summary using the list of words, <strong>A–F</strong>, below.",
            bank: [
              "A  incubation",
              "B  shame",
              "C  deadlines",
              "D  bundling",
              "E  chosen",
              "F  intelligence",
            ],
            type: "matching",
            choices: ["A", "B", "C", "D", "E", "F"],
            questions: [
              {
                n: 37,
                text: "Dwelling on failure produces ____, an emotion that pushes people further away from the task.",
                answer: ["B"],
              },
              {
                n: 38,
                text: "Temptation ____ pairs a dreaded task with something pleasant.",
                answer: ["D"],
              },
              {
                n: 39,
                text: "Some delay helps because ideas benefit from ____.",
                answer: ["A"],
              },
              {
                n: 40,
                text: "What matters is the difference between delay that is ____ and delay that is suffered.",
                answer: ["E"],
              },
            ],
          },
        ],
      },
    ],
  },

  /* =================================================================
     WRITING — 2 tasks
     ================================================================= */
  writing: {
    tasks: [
      {
        id: "t1",
        title: "Writing Task 1",
        minutes: 20,
        minWords: 150,
        prompt:
          "The chart below shows the percentage of households with a home internet connection in four countries in 2005, 2015 and 2025.<br><br>" +
          "<strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong><br><br>" +
          "Write at least <strong>150 words</strong>.",
        chart: {
          caption: "Households with a home internet connection (%)",
          series: ["2005", "2015", "2025"],
          colors: ["#c8d0d8", "#6d7986", "#e0892a"],
          data: [
            { label: "Country A", values: [52, 84, 96] },
            { label: "Country B", values: [31, 67, 91] },
            { label: "Country C", values: [12, 44, 78] },
            { label: "Country D", values: [4, 19, 57] },
          ],
        },
      },
      {
        id: "t2",
        title: "Writing Task 2",
        minutes: 40,
        minWords: 250,
        prompt:
          "Some people believe that schools should teach practical skills such as cooking, budgeting and basic repairs, " +
          "even if this means spending less time on traditional academic subjects. Others argue that academic subjects " +
          "must remain the priority.<br><br>" +
          "<strong>Discuss both views and give your own opinion.</strong><br><br>" +
          "Give reasons for your answer and include any relevant examples from your own knowledge or experience.<br><br>" +
          "Write at least <strong>250 words</strong>.",
      },
    ],
  },

  /* =================================================================
     SPEAKING — 3 parts
     ================================================================= */
  speaking: {
    parts: [
      {
        id: "sp1",
        title: "Part 1 — Introduction and interview",
        instruction:
          "The examiner asks about you. Answer each question in about 20–40 seconds.",
        prepSeconds: 0,
        speakSeconds: 45,
        questions: [
          "Let's talk about where you live. Do you live in a house or an apartment?",
          "What do you like most about the area you live in?",
          "How do you usually travel around your city?",
          "Do you prefer studying in the morning or in the evening? Why?",
          "How often do you use English outside the classroom?",
        ],
      },
      {
        id: "sp2",
        title: "Part 2 — Individual long turn",
        instruction:
          "You have <strong>1 minute</strong> to prepare and make notes, then speak for <strong>1–2 minutes</strong>.",
        prepSeconds: 60,
        speakSeconds: 120,
        cue: {
          topic: "Describe a decision you made that turned out well.",
          bullets: [
            "what the decision was",
            "when and why you made it",
            "how difficult it was to decide",
            "and explain why you think it was a good decision.",
          ],
        },
        questions: [],
        followUp: "Did anyone else help you make that decision?",
      },
      {
        id: "sp3",
        title: "Part 3 — Two-way discussion",
        instruction:
          "More abstract questions linked to the Part 2 topic. Answer each in about 40–60 seconds.",
        prepSeconds: 0,
        speakSeconds: 60,
        questions: [
          "Why do you think some people find it so hard to make decisions?",
          "Is it better to make decisions quickly or to take a long time thinking?",
          "How has technology changed the way people make everyday decisions?",
          "Should young people be allowed to make important decisions about their own education?",
          "Do you think older generations make decisions differently from younger ones?",
        ],
      },
    ],
  },
};

/* ===================================================================
   Bảng quy đổi điểm thô → band (Academic, mang tính tham khảo)
   =================================================================== */
export const BAND_LISTENING = [
  [39, 9.0], [37, 8.5], [35, 8.0], [32, 7.5], [30, 7.0], [26, 6.5],
  [23, 6.0], [18, 5.5], [16, 5.0], [13, 4.5], [10, 4.0], [8, 3.5],
  [6, 3.0], [4, 2.5], [0, 0],
];

export const BAND_READING = [
  [39, 9.0], [37, 8.5], [35, 8.0], [33, 7.5], [30, 7.0], [27, 6.5],
  [23, 6.0], [19, 5.5], [15, 5.0], [13, 4.5], [10, 4.0], [8, 3.5],
  [6, 3.0], [4, 2.5], [0, 0],
];
