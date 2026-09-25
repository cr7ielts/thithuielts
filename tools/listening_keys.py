# Đáp án Listening — chép từ file KEY (PDF chữ, ảnh JPEG, trang cuối "CẢ KEY", file đáp án Dự đoán).
# Mỗi đề: chuỗi 40 dòng "n|đáp án" ; nhiều đáp án chấp nhận ngăn bằng " / ".
# Nhóm "Choose TWO" ghi "B,C" cho cả hai câu (thứ tự tuỳ ý).

def K(s):
    out = {}
    for line in s.strip().splitlines():
        n, a = line.split('|', 1)
        out[int(n)] = a.strip()
    assert sorted(out) == list(range(1, 41)), sorted(set(range(1, 41)) - set(out))
    return out

LETTERS = lambda s, start: '\n'.join(f'{start + i}|{c}' for i, c in enumerate(s.split()))

def words(start, *ws):
    return '\n'.join(f'{start + i}|{w}' for i, w in enumerate(ws))

KEYS = {
 'forecast-01': K(words(1, 'Friday', 'International', '14 Mountain Road', 'Hillman', 'North Building', 'Park Avenue', 'books', 'photographs', '98', 'ID code / an ID code')
    + '\n' + LETTERS('D G A F D F J E C I', 11) + '\n' + LETTERS('B E A C H D B E C G', 21)
    + '\n' + words(31, 'passive', 'beaches', 'roots', 'light', 'signature', 'sugar', 'potatoes', 'chemicals', 'circle', 'equipment')),
 'forecast-02': K(words(1, 'light', 'manager', 'automatic', 'tires / tyres', '8 / eight', 'station', 'Thursday', 'Gerald', 'supermarket', 'identification')
    + '\n' + words(11, 'lead', 'sheet', 'house', 'horse hair / horsehair', 'rubber', 'stop watch / stopwatch') + '\n' + LETTERS('B C B C', 17)
    + '\n' + LETTERS('B A B C D G F E C B', 21)
    + '\n' + words(31, 'engineering', 'printed', 'global market', 'documentation', 'traditional', 'tutorials', 'reflective', 'business plan', 'journalism', 'interview')),
 'forecast-03': K(words(1, 'studio', 'laundry', 'harbour / harbor', 'balcony', 'gym', 'cinemas', 'parking', '580', 'electricity', '13 / 13th')
    + '\n' + LETTERS('B C A C H F G D E C', 11) + '\n' + LETTERS('C C A A B G B A D C', 21)
    + '\n' + words(31, 'sea', 'right', 'hair', 'worms', '1st century / first century', 'defenses / defences', 'dry', 'forests', 'ground', 'environment')),
 'forecast-04': K(words(1, 'cash', 'museum', 'caravan', 'sailing', 'four days / 4 days', 'white mountain', 'snow boarding / snowboarding', 'cakes', 'car', 'map')
    + '\n' + LETTERS('D E C D B B A C C A', 11) + '\n' + LETTERS('A C B A B B G E D B', 21)
    + '\n' + words(31, 'wool', 'bird', 'rain', 'desert', 'prison', 'clothing', 'family', 'rainbow', 'snake', 'carpet')),
 'forecast-05': K(words(1, '614381997', 'post', 'chemist', 'garden', 'balcony', 'fridge', '400', 'beach', 'parking', 'electricity')
    + '\n' + LETTERS('B A C A B A B E C D', 11) + '\n' + LETTERS('D C C E C A B E G A', 21)
    + '\n' + words(31, 'confusion', 'generations', 'environment', 'right', 'living', 'time', 'accept', 'roads', 'corn', 'diet')),
 'forecast-06': K(words(1, '14 September / 14th September', '835', 'school', 'deck', 'river', 'towel', 'garage', 'Chinese', '200', 'July')
    + '\n' + LETTERS('A B A B F A B H G I', 11) + '\n' + LETTERS('B A B A C B F C E B', 21)
    + '\n' + words(31, 'marketing', 'airline', 'feedback', 'behavior / behaviour', 'pilots', 'exercise', 'piano', 'hand', 'fun', 'privacy')),
 'forecast-07': K(words(1, 'radio program / a radio program / radio programme', 'LS14 2JW', 'hennings.co.uk', '2 / two', 'joint membership', '49 / forty-nine',
                        'Union Bank / The Union Bank', '15th October / 15 October / October 15th', 'JYZ37', 'video')
    + '\n' + LETTERS('B B C A B A F C B G', 11) + '\n' + LETTERS('C A B A C G D A H F', 21)
    + '\n' + words(31, 'health increase', 'internal clock', 'light dark / light and dark', 'unsocial hours', 'heart stomach / heart and stomach',
                   'depression', 'mental ability', 'performance', 'family life', 'friends')),
 'forecast-08': K(words(1, '5174XCM / 517 4XCM / 5174 XCM', 'summer', 'pump', 'bottle', 'plates', 'rubber', 'baseball', 'map', 'Taupo', '25.50')
    + '\n' + LETTERS('B C A C H F G D E C', 11) + '\n' + LETTERS('C A C B B C B F E A', 21)
    + '\n' + words(31, 'file', 'intelligent', 'varied', 'women', 'brain', 'quality', 'disease', 'personal', 'forests', 'planet')),
 'forecast-09': K(words(1, 'Bittens', 'group', '23', '12.50', 'back', 'wheelchair', 'lift', 'library', 'vegetarian', 'pizza')
    + '\n' + LETTERS('C A B A B B A C B C', 11) + '\n' + LETTERS('A A C C B B D A F G', 21)
    + '\n' + words(31, 'company', 'original', 'description', 'engineering', 'communication', 'language', 'salary', 'lonely / lonley', 'industrial', 'government')),
 'forecast-10': K(words(1, 'golf course', 'blue', '12.40', 'breakfast', 'swimming', 'piano', 'Spanish', 'Wednesday', '10.15', 'science')
    + '\n' + LETTERS('E D F C B A G C D F', 11) + '\n' + LETTERS('C C A A B G B A D C', 21)
    + '\n' + words(31, 'engineering', 'printed', 'global market', 'documentation', 'traditional', 'tutorials', 'reflective', 'business plan', 'journalism', 'interview')),
 'forecast-11': K(words(1, 'Gray', '0491577248', '29th September / 29 September', '3 / three', 'pool', 'car', 'lemon', 'couple', 'smoking', 'police')
    + '\n' + LETTERS('A A C B C A', 11) + '\n17|B,C\n18|B,C\n19|A,E\n20|A,E'
    + '\n' + LETTERS('B G F A H E D F G C', 21)
    + '\n' + words(31, 'typing', 'desks', 'screens', 'share', 'privacy', 'security', 'health', 'energy', 'training', 'noise')),
 'forecast-12': K(words(1, 'Skellarn', 'park', '4.30', 'drama', 'singing', 'artists', 'magazines', 'films', 'number', 'maps')
    + '\n' + LETTERS('A C G D F H A E B D', 11) + '\n' + LETTERS('C D C E A C B E G A', 21)
    + '\n' + words(31, 'personal', 'bridges', 'wind', 'weight', 'sweetener', 'tank', 'trial', 'safety', 'pressure', 'license / licence')),
 'forecast-13': K(words(1, 'travel', 'teaching', '9.15', 'guide', 'coach', 'garden', 'guitar', 'farm', 'friends', 'supermarket')
    + '\n' + LETTERS('B F D A G E B D B C', 11) + '\n' + LETTERS('C A C B B C B F E A', 21)
    + '\n' + words(31, 'triangle', 'horse', 'fat', 'straw', 'noise', 'code', 'necklace', 'boat', 'arrows', 'wood')),
 'forecast-14': K(words(1, 'truck', 'technology', 'bird', '8.99', 'boxes', 'temperature', 'Rimona', 'postage', 'gift', 'message')
    + '\n' + LETTERS('B F C A E B C C A B', 11) + '\n' + LETTERS('C C C B C E H A B F', 21)
    + '\n' + words(31, 'life', 'twins', 'experiences', 'improvement', 'musical', 'circuits', 'face', 'interaction', 'spelling', 'song')),
 'forecast-15': K(words(1, 'Fordyce', '07840051963', 'nurse', 'primary', 'south', 'station', 'park', 'house', '3 / three', 'office')
    + '\n' + LETTERS('B A C B A D B E G C', 11) + '\n' + LETTERS('I A E F C D A B A D', 21)
    + '\n' + words(31, 'registration', 'telephones', 'ecology', 'insects', 'climate', 'repairs', 'plant', 'pools', 'documentation', 'pollution')),
 'forecast-16': K(words(1, 'Prestney', '17th March / 17 March', '34 Market Road', 'European', 'citizen', 'high user', 'castle', 'north', 'full-time / full time', 'sports')
    + '\n' + LETTERS('C B A C F E G D C B', 11) + '\n' + LETTERS('B C A B A D B C B E', 21)
    + '\n' + words(31, 'coconut', 'mould / mold', 'pressed', 'machinery', 'dried', 'traders', 'balls', 'more elastic', 'tires / tyres', 'Germany')),
 'forecast-17': K(words(1, 'fifth / 5th', 'view', '35', 'Saturday', 'Limerick', 'business', 'garden', 'week', '65', '44298611')
    + '\n' + LETTERS('B E F I C C C B A A', 11) + '\n' + LETTERS('A B A C B A B E A D', 21)
    + '\n' + words(31, 'breathing', 'common', 'face', 'tears', 'fire', 'relatives', 'number', 'contrast', 'time', 'pilots')),
 'forecast-18': K(words(1, 'West', 'market', 'parks', 'smell', 'lock', 'paint', 'leak', 'noise', 'laundry', 'garbage')
    + '\n' + words(11, 'lake', 'picnic', 'flowers', '20 / 20 minutes', 'motor', 'art gallery', 'concert hall', '2.30') + '\n' + LETTERS('C B', 19)
    + '\n' + LETTERS('A B B C A A B C D F', 21) + '\n' + LETTERS('B B C', 31)
    + '\n' + words(34, 'cloud', 'danger', 'camera', 'airports', 'reliable', 'alarm', 'computer')),
 'forecast-19': K(words(1, 'work', 'Somerton', '3 years / three years', 'flat', 'north', 'park', 'pool', '600', '15', 'hotel')
    + '\n' + words(11, 'lake', 'picnic', 'flowers', '20 minutes / 20', 'motor', 'art gallery', 'concert hall', '2.30') + '\n' + LETTERS('C B', 19)
    + '\n' + LETTERS('C B D F A E A C A A', 21) + '\n' + LETTERS('C C B B A', 31)
    + '\n' + words(36, 'landmarks', 'people', 'good eyesight', 'machines', 'they do well')),
 'dudoan-01': K(words(1, 'theatre / theater / theather', '4.30', 'station', 'cooking', 'plate', 'river', '11.15', 'parking', 'events', 'feedback')
    + '\n' + LETTERS('C B A B', 11) + '\n' + words(15, 'socks', 'total block', 'plastic') + '\n' + LETTERS('A F G', 18)
    + '\n' + LETTERS('A B B A B C C A C B', 21)
    + '\n' + words(31, 'extinct', 'education', 'broken', 'plantation', 'city', 'developed', 'meanings', 'French', 'culture', 'preposition')),
 'dudoan-02': K(words(1, '614381997', 'post / post.com', 'chemist', 'garden', 'balcony', 'fridge', '400', 'beach', 'parking', 'electricity')
    + '\n' + words(11, '3 months / three months', 'cooperative / co-operative', 'training', 'mixed', 'reading', 'visits', 'government', 'job', 'meeting', 'confidence')
    + '\n' + LETTERS('A B B C A A A C B D', 21)
    + '\n' + words(31, 'traffic flow', 'rush', 'random', 'time', 'cost-effective / cost effective', 'smaller areas') + '\n' + LETTERS('E F A B', 37)),
 'dudoan-03': K(words(1, 'Keogh', '15', 'garden', 'music', 'story', '470', 'farm', 'toy', 'pillow', '0914638520')
    + '\n' + words(11, 'overseas', 'Woodside', '8 / eight', 'Tuesday', 'website') + '\n' + LETTERS('C C B A C', 16)
    + '\n' + LETTERS('C B A C C B D E B C', 21)
    + '\n' + words(31, 'computer science', 'rocks', 'video cameras') + '\n' + LETTERS('C A B', 34) + '\n' + words(37, 'seminar', 'skills', 'ideas', 'team')),
 'dudoan-04': K(words(1, 'database', 'rock', 'month', '45', '750', 'studio', 'legal', 'recording', 'Kippax', 'talent')
    + '\n' + LETTERS('A B C B G A C H D B', 11) + '\n' + LETTERS('A B A A B C D B A C', 21)
    + '\n' + words(31, 'flooding', 'firewood', 'fertilizer / fertiliser', 'trash', 'sand', 'grey / gray', 'hot house / hothouse', 'rain', 'rabbit', 'storm')),
}
