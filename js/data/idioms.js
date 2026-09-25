// =====================================================================
//  THÀNH NGỮ (IDIOMS) — dùng tốt cho IELTS Speaking
//  Mỗi mục: phrase, blank (từ bị ẩn trong trò "Missing word"), meaning (EN),
//  vi (nghĩa tiếng Việt), example, tag (chủ đề), register (informal/neutral)
// =====================================================================

const RAW = [
  ["a piece of cake", "cake", "very easy", "dễ như ăn bánh", "Don't worry, Part 1 of the Speaking test is a piece of cake.", "study", "informal"],
  ["break the ice", "ice", "make people feel relaxed when they first meet", "phá vỡ sự ngại ngùng ban đầu", "Our teacher played a game to break the ice on the first day.", "people", "neutral"],
  ["hit the books", "books", "start studying hard", "bắt đầu học hành chăm chỉ", "I need to hit the books before my IELTS exam next month.", "study", "informal"],
  ["once in a blue moon", "moon", "very rarely", "hiếm khi, năm thì mười hoạ", "I eat fast food once in a blue moon.", "time", "informal"],
  ["under the weather", "weather", "feeling slightly ill", "hơi mệt, không được khoẻ", "She stayed at home because she was feeling under the weather.", "health", "informal"],
  ["cost an arm and a leg", "arm", "be very expensive", "đắt cắt cổ", "Renting a flat in the city centre costs an arm and a leg.", "money", "informal"],
  ["the tip of the iceberg", "iceberg", "a small part of a much bigger problem", "bề nổi của tảng băng chìm", "The reported cases are just the tip of the iceberg.", "problems", "neutral"],
  ["get the hang of", "hang", "learn how to do something", "quen tay, nắm được cách làm", "Typing essays was hard at first, but I soon got the hang of it.", "study", "informal"],
  ["on cloud nine", "nine", "extremely happy", "vui sướng tột độ", "He was on cloud nine when he got band 8.", "feelings", "informal"],
  ["burn the midnight oil", "oil", "work or study late at night", "thức khuya làm việc, học bài", "Students often burn the midnight oil before exams.", "study", "neutral"],
  ["a blessing in disguise", "disguise", "something bad that turns out to be good", "trong cái rủi có cái may", "Failing that job interview was a blessing in disguise.", "life", "neutral"],
  ["keep an eye on", "eye", "watch something carefully", "để mắt tới, trông chừng", "Could you keep an eye on my bag for a minute?", "people", "neutral"],
  ["let the cat out of the bag", "bag", "tell a secret by mistake", "lỡ miệng tiết lộ bí mật", "My brother let the cat out of the bag about the surprise party.", "animals", "informal"],
  ["rain cats and dogs", "dogs", "rain very heavily", "mưa như trút nước", "We cancelled the picnic because it was raining cats and dogs.", "animals", "informal"],
  ["curiosity killed the cat", "curiosity", "being too curious can get you into trouble", "tò mò quá sẽ rước hoạ", "Stop reading her messages — curiosity killed the cat!", "animals", "informal"],
  ["see eye to eye", "see", "agree with someone", "đồng quan điểm", "My parents and I don't always see eye to eye about my career.", "people", "neutral"],
  ["a drop in the ocean", "ocean", "a very small amount compared with what is needed", "muối bỏ biển", "The donation was welcome, but it was only a drop in the ocean.", "money", "neutral"],
  ["in the long run", "run", "over a long period of time", "về lâu dài", "Learning a second language pays off in the long run.", "time", "neutral"],
  ["pull someone's leg", "pull", "joke with someone by saying something untrue", "trêu chọc, nói đùa", "Relax, I'm only pulling your leg!", "people", "informal"],
  ["bite off more than you can chew", "chew", "try to do more than you are able to", "ôm đồm quá sức", "Taking three part-time jobs was biting off more than I could chew.", "work", "informal"],
  ["the ball is in your court", "court", "it is your turn to decide or act", "đến lượt bạn quyết định", "I've made my offer; now the ball is in your court.", "work", "neutral"],
  ["go the extra mile", "mile", "make more effort than is expected", "nỗ lực hơn mức cần thiết", "Good teachers go the extra mile for their students.", "work", "neutral"],
  ["on the same page", "page", "agreeing or understanding in the same way", "cùng chung suy nghĩ", "Let's make sure the whole team is on the same page.", "work", "neutral"],
  ["miss the boat", "boat", "lose an opportunity by being too slow", "lỡ mất cơ hội", "The tickets sold out in an hour, so I missed the boat.", "life", "informal"],
  ["learn the ropes", "ropes", "learn the basics of a new job or activity", "học những điều cơ bản", "It took me a month to learn the ropes at my new job.", "work", "informal"],
  ["think outside the box", "box", "think in a creative, original way", "tư duy sáng tạo, khác lối mòn", "The competition encourages students to think outside the box.", "work", "neutral"],
  ["cut corners", "corners", "do something badly to save time or money", "làm ẩu, đốt cháy giai đoạn", "The builders cut corners, and the roof started leaking.", "work", "neutral"],
  ["when pigs fly", "pigs", "something that will never happen", "chuyện không bao giờ xảy ra", "He'll tidy his room when pigs fly.", "animals", "informal"],
  ["like a fish out of water", "fish", "uncomfortable in an unfamiliar situation", "lạc lõng như cá trên cạn", "At my first English-speaking party I felt like a fish out of water.", "animals", "informal"],
  ["every cloud has a silver lining", "lining", "there is something good in every bad situation", "trong cái rủi luôn có cái may", "I lost my job, but every cloud has a silver lining — now I can study full-time.", "life", "neutral"],
  // ===== Bổ sung 09/2026 — hợp với chủ đề Speaking gần đây =====
  ["a double-edged sword", "sword", "something that has both good and bad effects", "con dao hai lưỡi", "Social media is a double-edged sword for young people.", "technology", "neutral"],
  ["go viral", "viral", "spread very quickly online", "lan truyền chóng mặt trên mạng", "Her video about recycling went viral overnight.", "technology", "informal"],
  ["glued to the screen", "glued", "unable to stop looking at a screen", "dán mắt vào màn hình", "My little brother is glued to the screen all weekend.", "technology", "informal"],
  ["jump on the bandwagon", "bandwagon", "start doing something because it is popular", "đu trend, chạy theo đám đông", "Every company is jumping on the AI bandwagon.", "technology", "informal"],
  ["ahead of the curve", "curve", "more advanced or modern than others", "đi trước thời đại", "Our school was ahead of the curve in teaching coding.", "technology", "neutral"],
  ["a game changer", "changer", "something that completely changes a situation", "nhân tố thay đổi cuộc chơi", "Online banking has been a game changer for small businesses.", "change", "neutral"],
  ["the new normal", "normal", "a situation that was unusual but is now expected", "trạng thái bình thường mới", "Working from home has become the new normal for many people.", "change", "neutral"],
  ["turn over a new leaf", "leaf", "start behaving in a better way", "làm lại cuộc đời, thay đổi tích cực", "After failing the test, I turned over a new leaf and studied every day.", "change", "neutral"],
  ["at a crossroads", "crossroads", "at a point where you must make an important choice", "đứng trước ngã rẽ", "After graduating, I was at a crossroads in my career.", "change", "neutral"],
  ["a wake-up call", "wake-up", "an event that makes people realise there is a problem", "hồi chuông cảnh tỉnh", "The floods were a wake-up call about climate change.", "environment", "neutral"],
  ["go green", "green", "start living in a more environmentally friendly way", "sống xanh", "Our office decided to go green and stopped using paper cups.", "environment", "informal"],
  ["a breath of fresh air", "breath", "something new and pleasantly different", "một làn gió mới", "The new park is a breath of fresh air in such a crowded city.", "environment", "neutral"],
  ["off the beaten track", "beaten", "far away from places that many people visit", "nơi hẻo lánh, ít người lui tới", "We found a lovely beach off the beaten track.", "travel", "neutral"],
  ["hit the road", "road", "start a journey", "lên đường", "We hit the road at six to avoid the traffic.", "travel", "informal"],
  ["itchy feet", "itchy", "a strong wish to travel", "máu xê dịch", "After a year in the office I got itchy feet and went backpacking.", "travel", "informal"],
  ["live out of a suitcase", "suitcase", "travel so much that you never fully unpack", "sống vali (đi suốt)", "Pilots often live out of a suitcase.", "travel", "informal"],
  ["the elephant in the room", "elephant", "an obvious problem that nobody wants to talk about", "vấn đề ai cũng thấy nhưng né tránh", "The cost of housing is the elephant in the room.", "problems", "neutral"],
  ["back to square one", "square", "back to the beginning after a failure", "trở lại vạch xuất phát", "The plan failed, so we were back to square one.", "problems", "informal"],
  ["in hot water", "water", "in trouble", "gặp rắc rối", "He was in hot water for missing the deadline.", "problems", "informal"],
  ["make ends meet", "ends", "have just enough money to live on", "xoay xở đủ sống", "With rising prices, many families struggle to make ends meet.", "money", "neutral"],
  ["tighten your belt", "belt", "spend less money than before", "thắt lưng buộc bụng", "We had to tighten our belts when rent went up.", "money", "informal"],
  ["on a shoestring", "shoestring", "with very little money", "với ngân sách eo hẹp", "We travelled around Vietnam on a shoestring.", "money", "informal"],
  ["hit the ground running", "ground", "start something new quickly and successfully", "bắt tay vào việc ngay lập tức", "She hit the ground running in her new job.", "work", "informal"],
  ["call it a day", "day", "stop working on something", "nghỉ tay, dừng làm", "We've done enough — let's call it a day.", "work", "informal"],
  ["have a lot on your plate", "plate", "have many things to deal with", "bận ngập đầu", "I have a lot on my plate this month with exams and work.", "work", "informal"],
  ["a steep learning curve", "steep", "a situation where you must learn a lot quickly", "phải học rất nhiều trong thời gian ngắn", "Moving abroad was a steep learning curve for me.", "study", "neutral"],
  ["learn by heart", "heart", "learn something so you can remember it exactly", "học thuộc lòng", "We had to learn the poem by heart.", "study", "neutral"],
  ["pass with flying colours", "colours", "pass very successfully", "đỗ với kết quả xuất sắc", "She passed her driving test with flying colours.", "study", "neutral"],
  ["food for thought", "thought", "something that makes you think carefully", "điều đáng suy ngẫm", "The documentary gave me plenty of food for thought.", "study", "neutral"],
  ["sit on the fence", "fence", "avoid choosing a side in an argument", "ba phải, không chọn phe", "In the Speaking test, don't sit on the fence — give a clear opinion.", "people", "informal"],
  ["a couch potato", "potato", "a lazy person who watches a lot of TV", "người lười vận động, nghiện TV", "I was a couch potato until I joined a football team.", "health", "informal"],
  ["as fit as a fiddle", "fiddle", "very healthy and strong", "khoẻ như vâm", "My grandfather is 80 but still as fit as a fiddle.", "health", "informal"],
  ["over the moon", "over", "extremely pleased", "vui mừng khôn xiết", "I was over the moon when I got my visa.", "feelings", "informal"],
  ["down in the dumps", "dumps", "sad and unhappy", "buồn chán, ủ rũ", "He's been down in the dumps since his team lost.", "feelings", "informal"],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const IDIOMS = RAW.map(([phrase, blank, meaning, vi, example, tag, register]) => ({
  id: slug(phrase), phrase, blank, meaning, vi, example, tag, register,
}));

export const IDIOM_TAGS = [...new Set(IDIOMS.map((i) => i.tag))];

/** "a piece of cake" → "a piece of ____" */
export function withGap(idiom) {
  const re = new RegExp(`\\b${idiom.blank}\\b`, "i");
  return idiom.phrase.replace(re, "____");
}
