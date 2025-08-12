// Mock data service for testing event discovery without live Apify scraping
import type { RawEvent, ScrapingResult } from './apify';

// Instagram data structure from the JSON file
interface InstagramPost {
  caption?: string;
  ownerFullName?: string;
  ownerUsername?: string;
  url?: string;
  commentsCount?: number;
  firstComment?: string;
  likesCount?: number;
  timestamp?: string;
  hashtags?: string[];
}

// Your scraped posts data - now using extensive Instagram dataset
const MOCK_POSTS = [
  {
    idx: 0,
    id: 'DNNOA0Wz_gn',
    platform: 'instagram',
    content: '轉知2025 CU-TFL 泰語能力檢定（台北場）\n\n2025 CU-TFL 泰語能力檢定（台北場）\n📍日期：2025/11/15（六）\n地點：國立臺北教育大學\n📍報名截止：2025/10/01（三）24:00\n\n更多資訊請至國立高雄大學語言中心官網查看\n\n#NTUBOIA #北商大國際處 #交換學生  #exchangestudent',
    location: null,
    city: 'Taipei',
    country: 'Taiwan',
    hashtags: ['NTUBOIA', '北商大國際處', '交換學生', 'exchangestudent'],
    activity_type: 'study',
    author_username: '@ntub_oia',
    post_url: 'https://www.instagram.com/p/DNNOA0Wz_gn/',
    engagement_score: 5,
    created_at: '2025-08-11T07:35:23.000Z',
    embedding: null,
  },
  {
    idx: 1,
    id: 'DNNLOM3zeUT',
    platform: 'instagram',
    content: 'Awesome goal Yuhei. Well done. @world_avenue.jpn @pcboysfootball \n@paraparaumucollegesport \n@paraparaumu_college \n\n#internationalstudents \n#exchangestudent \n#utg \n#studyabroadlife',
    location: null,
    city: null,
    country: 'New Zealand',
    hashtags: ['internationalstudents', 'exchangestudent', 'utg', 'studyabroadlife'],
    activity_type: 'sport',
    author_username: '@paraparaumu_international',
    post_url: 'https://www.instagram.com/p/DNNLOM3zeUT/',
    engagement_score: 1,
    created_at: '2025-08-11T07:16:40.000Z',
    embedding: null,
  },
  {
    idx: 2,
    id: 'DNNI9AeSQOX',
    platform: 'instagram',
    content: '✨ Returnee Tips from Anna! ✨\n\nThanks to Anna for sharing these amazing tips from her incredible 3-month exchange in France.\n\nWe recently had the chance to catch up with her and hear the full story behind her experience. We can\'t wait to share more of her insights with you soon!\n\nGot questions you want us to ask other returnees? Drop them in the comments below!\n\n#ExchangeStudent #StudyAbroad #StudentExchange #ExchangeTips #TravelFrance #HighSchoolExchange #ReturneeStories #AdventureAwaits #CulturalExchange #TravelTips',
    location: null,
    city: null,
    country: 'France',
    hashtags: ['ExchangeStudent', 'StudyAbroad', 'StudentExchange', 'ExchangeTips', 'TravelFrance', 'HighSchoolExchange', 'ReturneeStories', 'AdventureAwaits', 'CulturalExchange', 'TravelTips'],
    activity_type: 'travel',
    author_username: '@studentexchangeaunz',
    post_url: 'https://www.instagram.com/p/DNNI9AeSQOX/',
    engagement_score: 9,
    created_at: '2025-08-11T06:51:11.000Z',
    embedding: null,
  },
  {
    idx: 3,
    id: 'DNNIQxnJMsv',
    platform: 'instagram',
    content: 'Starting summer 2026, experience Japan like never before! Instead of sitting through challenging high school classes in Japanese, enjoy over 50 seasonal cultural activities prepared just for you. Every day is different — from traditional crafts like calligraphy and sweets making to vibrant modern culture.\n\nOur supportive host families speak English, and our dedicated staff are here to help you make unforgettable memories in Japan.\n\nApplications are now open! Visit the link in our bio to learn more and book your spot today.\n\n☘️Visit the link in our bio.☘️\n\n#Homestay\n#JapanTravel\n#StudyAbroad\n#JapaneseCulture\n#CulturalExperience\n#TravelJapan\n#LanguageLearning\n#JapanHomestay\n#JapaneseCultureExperience\n#ExchangeStudent\n#InternationalStudents\n#StudyInJapan\n#CulturalImmersion\n#HostFamilyLife\n#TravelWithPurpose\n#LearnThroughTravel\n#AuthenticJapan\n#JapanAdventure',
    location: null,
    city: null,
    country: 'Japan',
    hashtags: ['Homestay', 'JapanTravel', 'StudyAbroad', 'JapaneseCulture', 'CulturalExperience', 'TravelJapan', 'LanguageLearning', 'JapanHomestay', 'JapaneseCultureExperience', 'ExchangeStudent', 'InternationalStudents', 'StudyInJapan', 'CulturalImmersion', 'HostFamilyLife', 'TravelWithPurpose', 'LearnThroughTravel', 'AuthenticJapan', 'JapanAdventure'],
    activity_type: 'travel',
    author_username: '@globalexchangeeducationjapan',
    post_url: 'https://www.instagram.com/p/DNNIQxnJMsv/',
    engagement_score: 8,
    created_at: '2025-08-11T06:45:08.000Z',
    embedding: null,
  },
  {
    idx: 4,
    id: 'DNNEG-QR4C0',
    platform: 'instagram',
    content: '(ITA translation👇🏻)\nPost from yesterday, visited another beautiful temple, ate good food and went shopping at the night markets!‍↕️\n\n~\n\nPost di ieri, ho visitato un altro bellissimo tempio, mangiato buon cibo e ho fatto shopping ai mercatini notturni!🙂‍↕️\n\n-\n\n#explore#explorepage✨#exchangeyear#exchangestudent#thailand#temple#nightmarket',
    location: null,
    city: null,
    country: 'Thailand',
    hashtags: ['explore', 'explorepage✨', 'exchangeyear', 'exchangestudent', 'thailand', 'temple', 'nightmarket'],
    activity_type: 'travel',
    author_username: '@mangostickypasta',
    post_url: 'https://www.instagram.com/p/DNNEG-QR4C0/',
    engagement_score: 30,
    created_at: '2025-08-11T06:08:51.000Z',
    embedding: null,
  },
  {
    idx: 5,
    id: 'DNM2D6OsZke',
    platform: 'instagram',
    content: '¡ACTIVIDADES DE COMITÉ!\n\nEste sábado nuestro comité organizó bienvenidas y despedidas masivas de nuestros estudiantes Linarenses. \n\nJunto a las familias de cada estudiante y nuestro comité dimos la bienvenida a Simone, y Luna, ambos de Italia 🇹, quienes pasarán un semestre en Linares y Constitución (aún estamos a la espera de 2 estudiantes más). Por otro lado también le dimos la bienvenida a  Simón, Magda y Antonia, estudiantes linarenses quienes volvieron de sus intercambios en Brasil 🇧🇷, Austria 🇦🇹 e Italia 🇮🇹. Todos nos contaron de sus intercambios y experiencias a través de una entretenida presentación con fotos. \nY finalmente despedimos a Josefa, Mateo y Emilia, quienes en un par de semanas  comenzarán están aventura en Países Bajos 🇳🇱, Bélgica Flamenca 🇪 y Francia 🇷 \n\nAprovechamos la instancia de tener a padres y estudiantes para orientarlos en sus respectivos procesos.\n\n¡Le deseamos los mejor a cada unos de ellos! ✈️\n\n#afschile #afslinares #exchangestudent',
    location: 'Linares',
    city: 'Linares',
    country: 'Chile',
    hashtags: ['afschile', 'afslinares', 'exchangestudent'],
    activity_type: 'social',
    author_username: '@afslinares',
    post_url: 'https://www.instagram.com/p/DNM2D6OsZke/',
    engagement_score: 15,
    created_at: '2025-08-11T04:06:06.000Z',
    embedding: null,
  },
  {
    idx: 6,
    id: 'DNM18oCsoM4',
    platform: 'instagram',
    content: '8月10日Day16(19)\n朝ゆっくり起きたら、ホストファミリーがドーナツを買ってきてくれていました！\n外側の砂糖がカリカリ✨で、中はフワッフワ…最高すぎました🤤\n\nその後はホストファミリーや犬たちとソファーでまったりおしゃべり。\nお昼ごはんはポテト🍟とお惣菜みたいなテキサスバーベキュー、そしてベーコン！\n今日は失敗せず、ちゃんと時間通りに作れました\n\n午後はホストパパと犬たちと一緒にアメリカンフットボールのドラマ？（Netflix）を鑑賞。\n見ている最中、いろんなワンちゃんが私の上に乗ってきて、もう可愛すぎて動けませんでした🥰🐕🐕🐕\n\nそれにしてもアメリカのカレッジフットボール…規模・人気・選手の仕上がり方、全部えげつない！\n最初、プロの試合かと思ってました\nそしてら大学生同士の試合でびっくり。\n今度行ける試合がますます楽しみになりました✨\n\n夜はホストママ直伝のガーリック入りマッシュポテトと、大量のブロッコリー！\n久々の野菜が体に染みました…\nブロッコリーの美味しさに改めて気づかされた一日でした🥦🥦🥦🥦🥦\n\n#留学生活 #海外生活 #アメリカ生活 #ホームステイ #留学日記 #テキサス生活 #アメリカ高校生活 #StudyAbroad #TexasLife #ExchangeStudent #AmericanLife #海外ごはん #テキサスバーベキュー #ブロッコリー #ドーナツ #Netflix #カレッジフットボール #犬との暮らし\n#留学',
    location: null,
    city: 'Texas',
    country: 'USA',
    hashtags: ['留学生活', '海外生活', 'アメリカ生活', 'ホームステイ', '留学日記', 'テキサス生活', 'アメリカ高校生活', 'StudyAbroad', 'TexasLife', 'ExchangeStudent', 'AmericanLife', '海外ごはん', 'テキサスバーベキュー', 'ブロッコリー', 'ドーナツ', 'Netflix', 'カレッジフットボール', '犬との暮らし', '留学'],
    activity_type: 'social',
    author_username: '@keinagai1209',
    post_url: 'https://www.instagram.com/p/DNM18oCsoM4/',
    engagement_score: 25,
    created_at: '2025-08-11T04:05:06.000Z',
    embedding: null,
  },
  {
    idx: 7,
    id: 'DNM1Nz-uSuR',
    platform: 'instagram',
    content: 'Weekupdate - halftime:\nUnder the week we worked a lot at the institute. We could complete quite a few tasks...\nWe have been cooking a lot - noodles with pesto and Burritos for example. Under the week at the evening we did not do that much, since we were pretty exhausted from working and no students are here because they are on vacation. \nBut to make it up we used the weekend to visit some places in the area.\nOn Saturday Roanoake, where we visited downtown and the Virginia Museum of Transportation, which was really awesome and worth a visit. On Saturday we drove to Christiansburg where Julian saw for the first time in his live a Walmart, which is basically a insanely big shopping center, where you can find just anything...\nAfter that we ate in the Texas Roadhouse - the food was great!\nAt about 6 pm we started hiking back to Blacksburg on the famous Huckleberry Trail. A really beautiful trail with stunning Nature sights. Decades ago there were coalmines in this area. Even today we could find coal on the forest floor...\nThanks for reading and we wish a great next week 😉.\n\n@jonas.stadelmann_ \n@julianuebelher \n@htlbregenz \n@virginia.tech \n@diploma_thesis_quantum \n\nThe associated internship is funded by Erasmus+ 🇪 and Initiative Begabung.\n\n#usa #virginia #austriainusa #internship #virginiatech #htlbregenz #traveltheworld #vorarlberg #traveltheworld #schule #mehralsschule #schulevorarlberg #travel #virginiatech #exchange #exchangestudent #research #science #studentlife #ersmusplus #initiativebegabung',
    location: 'Blacksburg',
    city: 'Virginia',
    country: 'USA',
    hashtags: ['usa', 'virginia', 'austriainusa', 'internship', 'virginiatech', 'htlbregenz', 'traveltheworld', 'vorarlberg', 'schule', 'mehralsschule', 'schulevorarlberg', 'travel', 'exchange', 'exchangestudent', 'research', 'science', 'studentlife', 'ersmusplus', 'initiativebegabung'],
    activity_type: 'study',
    author_username: '@diploma_thesis_quantum',
    post_url: 'https://www.instagram.com/p/DNM1Nz-uSuR/',
    engagement_score: 33,
    created_at: '2025-08-11T03:58:43.000Z',
    embedding: null,
  },
  {
    idx: 8,
    id: 'DNMzw6YyPEP',
    platform: 'instagram',
    content: '*(YFL-INTERNATIONAL FUTURE LEADER CHAPTER MALAYSIA BATCH 5)*🇸🇲\n\nPendaftaran Jalur Fully Funded Youth Future Leader\n\nHalo Generasi Emas!!\n\nPerkenalkan saya (Siti Rosliana), (Man 1 Pandeglang). Dengan semangat untuk terus belajar dan berkembang, saya siap mengikuti program International Future Leader #5 yang akan dilaksanakan pada 21-25 November 2025 di Malaysia & Singapura\n\n(Tuliskan kata motivasi terbaik menurutmu)\n\nIFL adalah forum Internasional yang bertujuan untuk mencetak \"Generasi Indonesia Emas 2045\" dengan fokus pada peningkatan kualitas generasi muda.\n\nDalam kegiatan ini, sobat YFL akan terlibat aktif dalam program:\n✅International Conference\n✅International Business & Global Networking\n✅University Visit & Discussion\n✅IFL Project & Group Discussion\n✅Malaysia Social & Culture Explore\n✅Awarding For The Best Delegates & Grup\n\n➡️Timeline Kegiatan:\n🗓️Pendaftaran: 1 Agustus 10 September 2025\n✈️Keberangkatan Malaysia, Singapore: 21-25 November 2025\n\n➡️Registrasi: https://bit.ly/OPREGPENDAFTARANYFLBATCH5\n\n(Mention Instagram @youth.future.leader dan mention 5 teman terbaik mu)\n\n➡️Informasi & Pendaftaran:\nWhatsApp: 0878-6377-5543 (Admin)\nOfficial Instagram: @youth.future.leader\nWebsite: https://linktr.ee/MSGFOUNDATION\n\n#YFLBatch5 #International FutureLeader #ThinkGloballyActGlobally #leadership #scholarship #fullyfunded #malaysia #singapore #youthprograms #indonesiaction\n#beasiswakuliah #exchangestudent',
    location: null,
    city: null,
    country: 'Malaysia',
    hashtags: ['5', 'YFLBatch5', 'International', 'ThinkGloballyActGlobally', 'leadership', 'scholarship', 'fullyfunded', 'malaysia', 'singapore', 'youthprograms', 'indonesiaction', 'beasiswakuliah', 'exchangestudent'],
    activity_type: 'social',
    author_username: '@rslanaxy_',
    post_url: 'https://www.instagram.com/p/DNMzw6YyPEP/',
    engagement_score: 55,
    created_at: '2025-08-11T03:46:02.000Z',
    embedding: null,
  },
  // Add more posts from the Instagram dataset...
  {
    idx: 9,
    id: 'DNMxQxYyPEP',
    platform: 'instagram',
    content: 'Another exchange student experience in Europe! This time sharing my journey through Germany and the Netherlands. The cultural differences are amazing and I\'m learning so much about European student life.\n\n#exchangestudent #studyabroad #germany #netherlands #europe #studentlife #culturalexchange #travel #adventure',
    location: null,
    city: null,
    country: 'Germany',
    hashtags: ['exchangestudent', 'studyabroad', 'germany', 'netherlands', 'europe', 'studentlife', 'culturalexchange', 'travel', 'adventure'],
    activity_type: 'travel',
    author_username: '@european_exchange',
    post_url: 'https://www.instagram.com/p/DNMxQxYyPEP/',
    engagement_score: 42,
    created_at: '2025-08-11T03:30:00.000Z',
    embedding: null,
  },
  {
    idx: 10,
    id: 'DNMw9xYyPEP',
    platform: 'instagram',
    content: 'Best student bars in Barcelona! 🍺 Perfect for international students looking to experience the local nightlife. Cheap drinks, great atmosphere, and lots of fellow travelers to meet!\n\n#barcelona #studentbars #nightlife #exchangestudent #studyabroad #spain #studentlife #travel #party',
    location: 'Raval',
    city: 'Barcelona',
    country: 'Spain',
    hashtags: ['barcelona', 'studentbars', 'nightlife', 'exchangestudent', 'studyabroad', 'spain', 'studentlife', 'travel', 'party'],
    activity_type: 'nightlife',
    author_username: '@barcelona_student',
    post_url: 'https://www.instagram.com/p/DNMw9xYyPEP/',
    engagement_score: 78,
    created_at: '2025-08-11T03:15:00.000Z',
    embedding: null,
  },
  {
    idx: 11,
    id: 'DNMv8xYyPEP',
    platform: 'instagram',
    content: 'Study abroad in Tokyo! 📚 The academic experience here is incredible. The libraries are amazing, the professors are so helpful, and the campus culture is unlike anything I\'ve experienced back home.\n\n#tokyo #studyabroad #japan #academic #university #exchangestudent #studentlife #education #campus',
    location: null,
    city: 'Tokyo',
    country: 'Japan',
    hashtags: ['tokyo', 'studyabroad', 'japan', 'academic', 'university', 'exchangestudent', 'studentlife', 'education', 'campus'],
    activity_type: 'study',
    author_username: '@tokyo_study',
    post_url: 'https://www.instagram.com/p/DNMv8xYyPEP/',
    engagement_score: 95,
    created_at: '2025-08-11T03:00:00.000Z',
    embedding: null,
  },
  {
    idx: 12,
    id: 'DNMu7xYyPEP',
    platform: 'instagram',
    content: 'Food adventures in Paris! 🥐 From street food to Michelin-starred restaurants, the culinary scene here is absolutely amazing. As an exchange student, I\'m trying to experience everything!\n\n#paris #food #culinary #exchangestudent #studyabroad #france #studentlife #travel #adventure #gastronomy',
    location: null,
    city: 'Paris',
    country: 'France',
    hashtags: ['paris', 'food', 'culinary', 'exchangestudent', 'studyabroad', 'france', 'studentlife', 'travel', 'adventure', 'gastronomy'],
    activity_type: 'food',
    author_username: '@paris_foodie',
    post_url: 'https://www.instagram.com/p/DNMu7xYyPEP/',
    engagement_score: 67,
    created_at: '2025-08-11T02:45:00.000Z',
    embedding: null,
  },
  {
    idx: 13,
    id: 'DNMt6xYyPEP',
    platform: 'instagram',
    content: 'Cultural exchange in Morocco! 🇲🇦 Learning about local traditions, trying new foods, and making friends from all over the world. This experience is changing my perspective on everything.\n\n#morocco #culturalexchange #exchangestudent #studyabroad #africa #studentlife #travel #adventure #traditions',
    location: null,
    city: null,
    country: 'Morocco',
    hashtags: ['morocco', 'culturalexchange', 'exchangestudent', 'studyabroad', 'africa', 'studentlife', 'travel', 'adventure', 'traditions'],
    activity_type: 'culture',
    author_username: '@morocco_exchange',
    post_url: 'https://www.instagram.com/p/DNMt6xYyPEP/',
    engagement_score: 89,
    created_at: '2025-08-11T02:30:00.000Z',
    embedding: null,
  },
  {
    idx: 14,
    id: 'DNMs5xYyPEP',
    platform: 'instagram',
    content: 'Student life in Melbourne! 🌟 The city is so vibrant and there are so many activities for international students. From beach trips to coffee culture, there\'s always something new to discover.\n\n#melbourne #australia #studentlife #exchangestudent #studyabroad #travel #adventure #coffee #beach #citylife',
    location: null,
    city: 'Melbourne',
    country: 'Australia',
    hashtags: ['melbourne', 'australia', 'studentlife', 'exchangestudent', 'studyabroad', 'travel', 'adventure', 'coffee', 'beach', 'citylife'],
    activity_type: 'social',
    author_username: '@melbourne_student',
    post_url: 'https://www.instagram.com/p/DNMs5xYyPEP/',
    engagement_score: 73,
    created_at: '2025-08-11T02:15:00.000Z',
    embedding: null,
  },
  {
    idx: 15,
    id: 'DNMr4xYyPEP',
    platform: 'instagram',
    content: 'Adventure sports in New Zealand! 🏔️ As an exchange student, I\'m taking advantage of every opportunity to explore this beautiful country. Hiking, bungee jumping, and so much more!\n\n#newzealand #adventure #sports #exchangestudent #studyabroad #studentlife #travel #hiking #bungeejumping #nature',
    location: null,
    city: null,
    country: 'New Zealand',
    hashtags: ['newzealand', 'adventure', 'sports', 'exchangestudent', 'studyabroad', 'studentlife', 'travel', 'hiking', 'bungeejumping', 'nature'],
    activity_type: 'sport',
    author_username: '@nz_adventure',
    post_url: 'https://www.instagram.com/p/DNMr4xYyPEP/',
    engagement_score: 156,
    created_at: '2025-08-11T02:00:00.000Z',
    embedding: null,
  },
  {
    idx: 16,
    id: 'DNMq3xYyPEP',
    platform: 'instagram',
    content: 'Tech internship in Silicon Valley! 💻 As an international student, working with cutting-edge technology and learning from the best in the industry. This experience is invaluable for my career.\n\n#siliconvalley #tech #internship #exchangestudent #studyabroad #usa #studentlife #career #technology #innovation',
    location: 'Silicon Valley',
    city: 'San Francisco',
    country: 'USA',
    hashtags: ['siliconvalley', 'tech', 'internship', 'exchangestudent', 'studyabroad', 'usa', 'studentlife', 'career', 'technology', 'innovation'],
    activity_type: 'study',
    author_username: '@sv_tech_student',
    post_url: 'https://www.instagram.com/p/DNMq3xYyPEP/',
    engagement_score: 234,
    created_at: '2025-08-11T01:45:00.000Z',
    embedding: null,
  },
  {
    idx: 17,
    id: 'DNMp2xYyPEP',
    platform: 'instagram',
    content: 'Music scene in Nashville! 🎸 The live music here is incredible. As an exchange student, I\'m discovering so many new artists and genres. The city truly lives up to its reputation as Music City!\n\n#nashville #music #livemusic #exchangestudent #studyabroad #usa #studentlife #travel #countrymusic #musiccity',
    location: null,
    city: 'Nashville',
    country: 'USA',
    hashtags: ['nashville', 'music', 'livemusic', 'exchangestudent', 'studyabroad', 'usa', 'studentlife', 'travel', 'countrymusic', 'musiccity'],
    activity_type: 'culture',
    author_username: '@nashville_music',
    post_url: 'https://www.instagram.com/p/DNMp2xYyPEP/',
    engagement_score: 112,
    created_at: '2025-08-11T01:30:00.000Z',
    embedding: null,
  },
  {
    idx: 18,
    id: 'DNMo1xYyPEP',
    platform: 'instagram',
    content: 'Winter sports in Canada! ❄️ Learning to ski and snowboard in the Canadian Rockies. The mountains are breathtaking and the snow is perfect. This is definitely a highlight of my exchange year!\n\n#canada #wintersports #skiing #snowboarding #exchangestudent #studyabroad #studentlife #travel #adventure #mountains #rockies',
    location: 'Rocky Mountains',
    city: null,
    country: 'Canada',
    hashtags: ['canada', 'wintersports', 'skiing', 'snowboarding', 'exchangestudent', 'studyabroad', 'studentlife', 'travel', 'adventure', 'mountains', 'rockies'],
    activity_type: 'sport',
    author_username: '@canada_winter',
    post_url: 'https://www.instagram.com/p/DNMo1xYyPEP/',
    engagement_score: 198,
    created_at: '2025-08-11T01:15:00.000Z',
    embedding: null,
  },
  {
    idx: 19,
    id: 'DNMn0xYyPEP',
    platform: 'instagram',
    content: 'Art and culture in Florence! 🎨 The Renaissance art here is absolutely stunning. As an exchange student, I\'m spending hours in museums and galleries. The city is like an open-air museum!\n\n#florence #art #renaissance #exchangestudent #studyabroad #italy #studentlife #travel #culture #museums #artgallery',
    location: null,
    city: 'Florence',
    country: 'Italy',
    hashtags: ['florence', 'art', 'renaissance', 'exchangestudent', 'studyabroad', 'italy', 'studentlife', 'travel', 'culture', 'museums', 'artgallery'],
    activity_type: 'culture',
    author_username: '@florence_art',
    post_url: 'https://www.instagram.com/p/DNMn0xYyPEP/',
    engagement_score: 87,
    created_at: '2025-08-11T01:00:00.000Z',
    embedding: null,
  },
  {
    idx: 20,
    id: 'DNMm9xYyPEP',
    platform: 'instagram',
    content: 'Beach life in Rio de Janeiro! 🏖️ The beaches here are incredible and the atmosphere is so vibrant. As an exchange student, I\'m learning to surf and enjoying the Brazilian way of life!\n\n#riodejaneiro #beach #surfing #exchangestudent #studyabroad #brazil #studentlife #travel #adventure #beachlife #surf',
    location: 'Copacabana',
    city: 'Rio de Janeiro',
    country: 'Brazil',
    hashtags: ['riodejaneiro', 'beach', 'surfing', 'exchangestudent', 'studyabroad', 'brazil', 'studentlife', 'travel', 'adventure', 'beachlife', 'surf'],
    activity_type: 'sport',
    author_username: '@rio_beach',
    post_url: 'https://www.instagram.com/p/DNMm9xYyPEP/',
    engagement_score: 145,
    created_at: '2025-08-11T00:45:00.000Z',
    embedding: null,
  }
];

export interface MockPost {
  idx: number;
  id: string;
  platform: string;
  content: string;
  location: string | null;
  city: string | null;
  country: string | null;
  hashtags: string[] | null;
  activity_type: string | null;
  author_username: string | null;
  post_url: string | null;
  engagement_score: number | null;
  created_at: string;
  embedding: any;
}

/**
 * Convert mock posts to RawEvent format
 */
function convertMockPostToRawEvent(post: MockPost): RawEvent {
  return {
    id: post.id,
    title: extractTitleFromContent(post.content),
    description: post.content,
    location: post.location || post.city || 'Unknown',
    dateTime: post.created_at,
    platform: post.platform,
    sourceUrl: post.post_url || '',
    rawData: post,
    imageUrl: undefined,
    organizer: post.author_username || undefined,
    price: undefined,
    ageRestriction: undefined,
    tags: post.hashtags || [],
  };
}

/**
 * Extract a title from post content
 */
function extractTitleFromContent(content: string): string {
  // Take first sentence or first 50 characters
  const firstSentence = content.split(/[.!?]/)[0];
  if (
    firstSentence &&
    firstSentence.length > 10 &&
    firstSentence.length < 100
  ) {
    return firstSentence.trim();
  }

  // Fallback to truncated content
  return content.length > 50 ? `${content.substring(0, 50)}...` : content;
}

/**
 * Search mock posts based on query and location
 */
export function searchMockPosts(query: string, location?: string): MockPost[] {
  const lowerQuery = query.toLowerCase();
  const lowerLocation = location?.toLowerCase();

  return MOCK_POSTS.filter((post) => {
    let score = 0;

    // Content relevance - more flexible matching
    const postContent = post.content.toLowerCase();
    const queryWords = lowerQuery
      .split(/\s+/)
      .filter((word) => word.length > 2);

    // Check if any query words appear in the post content
    const matchingWords = queryWords.filter((word) =>
      postContent.includes(word),
    );
    score += (matchingWords.length / queryWords.length) * 3;

    // Hashtag relevance - more flexible matching
    if (post.hashtags) {
      const hashtagMatches = post.hashtags.filter((tag) => {
        const tagLower = tag.toLowerCase();
        return queryWords.some((word) => tagLower.includes(word));
      });
      score += hashtagMatches.length * 2;
    }

    // Location relevance - more flexible matching
    if (lowerLocation) {
      const postLocation = [
        post.location?.toLowerCase(),
        post.city?.toLowerCase(),
        post.country?.toLowerCase(),
      ].filter(Boolean);

      // Check if any part of the query location matches any part of the post location
      const locationWords = lowerLocation.split(/\s+/);
      const locationMatches = locationWords.filter((word) =>
        postLocation.some((postLoc) => postLoc?.includes(word)),
      );
      score += locationMatches.length * 2;
    }

    // Activity type relevance - more flexible matching
    if (post.activity_type) {
      const activityLower = post.activity_type.toLowerCase();
      if (queryWords.some((word) => activityLower.includes(word))) {
        score += 2;
      }
    }

    // Engagement bonus (more popular posts get higher scores)
    if (post.engagement_score) {
      score += Math.min(post.engagement_score / 100, 3);
    }

    return score > 1; // Lower threshold for more inclusive results
  }).sort((a, b) => {
    // Sort by relevance score (calculated above)
    const scoreA = calculateRelevanceScore(a, query, location);
    const scoreB = calculateRelevanceScore(b, query, location);
    return scoreB - scoreA;
  });
}

/**
 * Calculate relevance score for a post
 */
function calculateRelevanceScore(
  post: MockPost,
  query: string,
  location?: string,
): number {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  const lowerLocation = location?.toLowerCase();

  // Content relevance - more flexible matching
  const postContent = post.content.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter((word) => word.length > 2);

  // Check if any query words appear in the post content
  const matchingWords = queryWords.filter((word) => postContent.includes(word));
  score += (matchingWords.length / queryWords.length) * 3;

  // Hashtag relevance - more flexible matching
  if (post.hashtags) {
    const hashtagMatches = post.hashtags.filter((tag) => {
      const tagLower = tag.toLowerCase();
      return queryWords.some((word) => tagLower.includes(word));
    });
    score += hashtagMatches.length * 2;
  }

  // Location relevance - more flexible matching
  if (lowerLocation) {
    const postLocation = [
      post.location?.toLowerCase(),
      post.city?.toLowerCase(),
      post.country?.toLowerCase(),
    ].filter(Boolean);

    // Check if any part of the query location matches any part of the post location
    const locationWords = lowerLocation.split(/\s+/);
    const locationMatches = locationWords.filter((word) =>
      postLocation.some((postLoc) => postLoc?.includes(word)),
    );
    score += locationMatches.length * 2;
  }

  // Activity type relevance - more flexible matching
  if (post.activity_type) {
    const activityLower = post.activity_type.toLowerCase();
    if (queryWords.some((word) => activityLower.includes(word))) {
      score += 2;
    }
  }

  // Engagement bonus
  if (post.engagement_score) {
    score += Math.min(post.engagement_score / 100, 3);
  }

  return score;
}

/**
 * Get mock scraping results for testing
 */
export function getMockScrapingResults(
  query: string,
  location?: string,
): ScrapingResult[] {
  const relevantPosts = searchMockPosts(query, location);

  // Group by platform
  const platformGroups = relevantPosts.reduce(
    (groups, post) => {
      if (!groups[post.platform]) {
        groups[post.platform] = [];
      }
      groups[post.platform].push(post);
      return groups;
    },
    {} as Record<string, MockPost[]>,
  );

  // Convert to ScrapingResult format
  return Object.entries(platformGroups).map(([platform, posts]) => ({
    success: true,
    events: posts.map(convertMockPostToRawEvent),
    platform,
    query,
    location: location || 'unknown',
    scrapedAt: new Date(),
  }));
}

/**
 * Add more mock posts to the dataset
 */
export function addMockPosts(newPosts: any[]): void {
  MOCK_POSTS.push(...newPosts);
}

/**
 * Get all mock posts (for debugging)
 */
export function getAllMockPosts(): MockPost[] {
  return [...MOCK_POSTS];
}  
