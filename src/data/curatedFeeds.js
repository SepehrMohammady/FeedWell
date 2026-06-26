// Curated "Popular Categories" feeds, grouped by region/language.
// Each region maps to an array of categories; each category has a categoryKey
// (resolved to a localized title via t('category.<key>')) and 5 {name, url} feeds.
// Non-English feeds were live-verified (HTTP 200 + valid RSS/Atom, free/non-paywalled).
// Farsi feeds are independent / international Persian outlets only (no IRI state media).

export const CATEGORY_ORDER = [
  'technology', 'news', 'sports', 'entertainment', 'gaming', 'business', 'science', 'lifestyle',
];

// Global first, then alphabetical by English language name (standard ordering).
export const FEED_REGIONS = [
  { code: 'global', labelKey: 'region.global' },
  { code: 'hi', labelKey: 'region.hi' },
  { code: 'it', labelKey: 'region.it' },
  { code: 'fa', labelKey: 'region.fa' },
  { code: 'pl', labelKey: 'region.pl' },
  { code: 'th', labelKey: 'region.th' },
  { code: 'tr', labelKey: 'region.tr' },
];

export const CURATED_FEEDS = {
  global: [
    { categoryKey: 'technology', feeds: [
      { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
      { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
      { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
      { name: 'Engadget', url: 'https://www.engadget.com/rss.xml' },
      { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
    ]},
    { categoryKey: 'news', feeds: [
      { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
      { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml' },
      { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
      { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss' },
      { name: 'CNN News', url: 'https://rss.cnn.com/rss/edition.rss' },
    ]},
    { categoryKey: 'sports', feeds: [
      { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news' },
      { name: 'Guardian Sport', url: 'https://www.theguardian.com/sport/rss' },
      { name: 'Yahoo Sports', url: 'https://sports.yahoo.com/rss/' },
      { name: 'Sky Sports', url: 'https://www.skysports.com/rss/12040' },
      { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml' },
    ]},
    { categoryKey: 'entertainment', feeds: [
      { name: 'Variety', url: 'https://variety.com/feed/' },
      { name: 'Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/' },
      { name: 'Rolling Stone', url: 'https://www.rollingstone.com/feed/' },
      { name: 'Deadline', url: 'https://deadline.com/feed/' },
      { name: 'Pitchfork', url: 'https://pitchfork.com/feed/feed-news/rss' },
    ]},
    { categoryKey: 'gaming', feeds: [
      { name: 'IGN', url: 'https://feeds.ign.com/ign/all' },
      { name: 'Kotaku', url: 'https://kotaku.com/rss' },
      { name: 'GameSpot', url: 'https://www.gamespot.com/feeds/mashup/' },
      { name: 'Polygon', url: 'https://www.polygon.com/rss/index.xml' },
      { name: 'PC Gamer', url: 'https://www.pcgamer.com/rss/' },
    ]},
    { categoryKey: 'business', feeds: [
      { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
      { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss' },
      { name: 'Forbes Business', url: 'https://www.forbes.com/business/feed/' },
      { name: 'Fortune', url: 'https://fortune.com/feed/' },
      { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex' },
    ]},
    { categoryKey: 'science', feeds: [
      { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml' },
      { name: 'NASA', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
      { name: 'Nature', url: 'https://www.nature.com/nature.rss' },
      { name: 'New Scientist', url: 'https://www.newscientist.com/feed/home/' },
      { name: 'Phys.org', url: 'https://phys.org/rss-feed/' },
    ]},
    { categoryKey: 'lifestyle', feeds: [
      { name: 'The Guardian Life and Style', url: 'https://www.theguardian.com/lifeandstyle/rss' },
      { name: 'The Guardian Food', url: 'https://www.theguardian.com/food/rss' },
      { name: 'BuzzFeed', url: 'https://www.buzzfeed.com/index.xml' },
      { name: 'The Guardian Fashion', url: 'https://www.theguardian.com/fashion/rss' },
      { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/' },
    ]},
  ],

  // Persian/Farsi — independent / international / diaspora outlets only (NO Islamic
  // Republic state media). Some categories have fewer than 5 because independent
  // non-state Persian feeds are scarce there; padding with state media is not allowed.
  fa: [
    { categoryKey: 'technology', feeds: [
      { name: 'Zoomit', url: 'https://www.zoomit.ir/feed/' },
      { name: 'Digiato', url: 'https://digiato.com/feed' },
      { name: 'ITResan', url: 'https://itresan.com/feed' },
      { name: 'GadgetNews', url: 'https://www.gadgetnews.net/feed' },
      { name: 'Shahr-e Sakhtafzar', url: 'https://www.shahrsakhtafzar.com/fa/?format=feed&type=rss' },
    ]},
    { categoryKey: 'news', feeds: [
      { name: 'BBC Persian', url: 'https://feeds.bbci.co.uk/persian/rss.xml' },
      { name: 'Iran International', url: 'https://www.iranintl.com/feed' },
      { name: 'Euronews Persian', url: 'https://parsi.euronews.com/rss' },
      { name: 'DW Persian', url: 'https://rss.dw.com/xml/rss-per-all' },
      { name: 'IranWire', url: 'https://iranwire.com/fa/feed/' },
    ]},
    { categoryKey: 'sports', feeds: [
      { name: 'Varzesh3', url: 'https://www.varzesh3.com/rss/all' },
      { name: 'Khabar Varzeshi', url: 'https://www.khabarvarzeshi.com/rss' },
    ]},
    { categoryKey: 'entertainment', feeds: [
      { name: 'DW Persian - Culture & Arts', url: 'https://rss.dw.com/xml/rss-per-cul' },
      { name: 'Film2Movie', url: 'https://film2movie.asia/feed' },
    ]},
    { categoryKey: 'gaming', feeds: [
      { name: 'Gamefa', url: 'https://gamefa.com/feed/' },
      { name: 'Zoomg', url: 'https://www.zoomg.ir/feed/' },
      { name: 'BaziCenter', url: 'https://www.bazicenter.com/feed' },
    ]},
    { categoryKey: 'business', feeds: [
      { name: 'DW Persian - Economy', url: 'https://rss.dw.com/xml/rss-per-eco' },
      { name: 'Tejarat News', url: 'https://tejaratnews.com/feed' },
      { name: 'Peivast', url: 'https://www.peivast.com/feed/' },
    ]},
    { categoryKey: 'science', feeds: [
      { name: 'BigBangPage', url: 'https://www.bigbangpage.com/feed/' },
      { name: 'Zoomit', url: 'https://www.zoomit.ir/feed/' },
      { name: 'Digiato', url: 'https://digiato.com/feed' },
    ]},
    { categoryKey: 'lifestyle', feeds: [
      { name: 'Digikala Mag', url: 'https://www.digikala.com/mag/feed/' },
      { name: 'Chetor', url: 'https://www.chetor.com/feed/' },
      { name: 'Chetor - Health', url: 'https://www.chetor.com/category/health/feed/' },
      { name: '1Pezeshk', url: 'https://1pezeshk.com/feed' },
    ]},
  ],

  it: [
    { categoryKey: 'technology', feeds: [
      { name: 'Wired Italia', url: 'https://www.wired.it/feed/rss' },
      { name: 'DDay.it', url: 'https://www.dday.it/feed' },
      { name: 'Hardware Upgrade', url: 'https://www.hwupgrade.it/rss_hwup.xml' },
      { name: "Tom's Hardware Italia", url: 'https://www.tomshw.it/feed/' },
      { name: 'HTML.it', url: 'https://www.html.it/feed/' },
    ]},
    { categoryKey: 'news', feeds: [
      { name: 'ANSA', url: 'https://www.ansa.it/sito/ansait_rss.xml' },
      { name: 'la Repubblica', url: 'https://www.repubblica.it/rss/homepage/rss2.0.xml' },
      { name: 'Corriere della Sera', url: 'https://xml2.corriereobjects.it/rss/homepage.xml' },
      { name: 'La Stampa', url: 'https://www.lastampa.it/rss' },
      { name: 'Il Sole 24 Ore', url: 'https://www.ilsole24ore.com/rss/italia.xml' },
    ]},
    { categoryKey: 'sports', feeds: [
      { name: 'La Gazzetta dello Sport', url: 'https://www.gazzetta.it/rss/home.xml' },
      { name: 'Calciomercato.it', url: 'https://www.calciomercato.it/feed' },
      { name: 'FC Inter News', url: 'https://www.fcinternews.it/rss/' },
      { name: 'Tutto Juve', url: 'https://www.tuttojuve.com/rss' },
      { name: 'Pianeta Milan', url: 'https://www.pianetamilan.it/feed' },
    ]},
    { categoryKey: 'entertainment', feeds: [
      { name: 'Movieplayer.it', url: 'https://www.movieplayer.it/rss/news.xml' },
      { name: 'BadTaste', url: 'https://www.badtaste.it/feed/' },
      { name: 'TvBlog', url: 'https://www.tvblog.it/feed' },
      { name: 'Rolling Stone Italia', url: 'https://www.rollingstone.it/feed/' },
      { name: 'Cineblog', url: 'https://www.cineblog.it/feed' },
    ]},
    { categoryKey: 'gaming', feeds: [
      { name: 'Everyeye.it', url: 'https://www.everyeye.it/rss/news.xml' },
      { name: 'SpazioGames', url: 'https://www.spaziogames.it/feed' },
      { name: 'Multiplayer.it', url: 'https://multiplayer.it/feed/rss/news/' },
      { name: 'GamesVillage', url: 'https://www.gamesvillage.it/feed/' },
      { name: 'Player.it', url: 'https://www.player.it/feed' },
    ]},
    { categoryKey: 'business', feeds: [
      { name: 'Il Sole 24 Ore - Economia', url: 'https://www.ilsole24ore.com/rss/economia.xml' },
      { name: 'la Repubblica - Economia', url: 'https://www.repubblica.it/rss/economia/rss2.0.xml' },
      { name: 'Wall Street Italia', url: 'https://www.wallstreetitalia.com/feed/' },
      { name: 'Money.it', url: 'https://www.money.it/spip.php?page=backend' },
      { name: 'FIRSTonline', url: 'https://www.firstonline.info/feed/' },
    ]},
    { categoryKey: 'science', feeds: [
      { name: 'Focus', url: 'https://www.focus.it/rss' },
      { name: 'Media INAF', url: 'https://www.media.inaf.it/feed/' },
      { name: 'Galileo', url: 'https://www.galileonet.it/feed/' },
      { name: 'la Repubblica - Scienze', url: 'https://www.repubblica.it/rss/scienze/rss2.0.xml' },
      { name: 'Wired Italia - Scienza', url: 'https://www.wired.it/feed/scienza/rss' },
    ]},
    { categoryKey: 'lifestyle', feeds: [
      { name: 'Vanity Fair Italia', url: 'https://www.vanityfair.it/feed/rss' },
      { name: 'GQ Italia', url: 'https://www.gqitalia.it/feed/rss' },
      { name: 'GreenMe', url: 'https://www.greenme.it/feed/' },
      { name: 'Dissapore', url: 'https://www.dissapore.com/feed/' },
      { name: 'Giallozafferano', url: 'https://www.giallozafferano.it/feed/' },
    ]},
  ],

  hi: [
    { categoryKey: 'technology', feeds: [
      { name: 'Amar Ujala - Technology', url: 'https://www.amarujala.com/rss/technology.xml' },
      { name: 'Oneindia Hindi - Technology', url: 'https://hindi.oneindia.com/rss/feeds/hindi-technology-fb.xml' },
      { name: 'Dainik Bhaskar - Tech', url: 'https://www.bhaskar.com/rss-v1--category-5707.xml' },
      { name: 'ABP Live Hindi - Technology', url: 'https://www.abplive.com/technology/feed' },
      { name: 'ABP Live Hindi - Gadgets', url: 'https://www.abplive.com/gadgets/feed' },
    ]},
    { categoryKey: 'news', feeds: [
      { name: 'BBC News Hindi', url: 'https://feeds.bbci.co.uk/hindi/india/rss.xml' },
      { name: 'Amar Ujala - India', url: 'https://www.amarujala.com/rss/india-news.xml' },
      { name: 'Dainik Bhaskar - Desh', url: 'https://www.bhaskar.com/rss-v1--category-1061.xml' },
      { name: 'Aaj Tak', url: 'https://www.aajtak.in/rssfeeds/?id=home' },
      { name: 'Oneindia Hindi - News', url: 'https://hindi.oneindia.com/rss/feeds/hindi-news-fb.xml' },
    ]},
    { categoryKey: 'sports', feeds: [
      { name: 'BBC News Hindi - Sport', url: 'https://feeds.bbci.co.uk/hindi/sport/rss.xml' },
      { name: 'Amar Ujala - Sports', url: 'https://www.amarujala.com/rss/sports.xml' },
      { name: 'Dainik Bhaskar - Sports', url: 'https://www.bhaskar.com/rss-v1--category-1053.xml' },
      { name: 'ABP Live Hindi - Sports', url: 'https://www.abplive.com/sports/feed' },
      { name: 'Oneindia Hindi - Sports', url: 'https://hindi.oneindia.com/rss/feeds/hindi-sports-fb.xml' },
    ]},
    { categoryKey: 'entertainment', feeds: [
      { name: 'BBC News Hindi - Entertainment', url: 'https://feeds.bbci.co.uk/hindi/entertainment/rss.xml' },
      { name: 'Amar Ujala - Entertainment', url: 'https://www.amarujala.com/rss/entertainment.xml' },
      { name: 'Dainik Bhaskar - Bollywood', url: 'https://www.bhaskar.com/rss-v1--category-11215.xml' },
      { name: 'ABP Live Hindi - Entertainment', url: 'https://www.abplive.com/entertainment/feed' },
      { name: 'Oneindia Hindi - Entertainment', url: 'https://hindi.oneindia.com/rss/feeds/hindi-entertainment-fb.xml' },
    ]},
    { categoryKey: 'gaming', feeds: [
      { name: 'ABP Live Hindi - Gadgets', url: 'https://www.abplive.com/gadgets/feed' },
      { name: 'Oneindia Hindi - Technology', url: 'https://hindi.oneindia.com/rss/feeds/hindi-technology-fb.xml' },
      { name: 'Amar Ujala - Technology', url: 'https://www.amarujala.com/rss/technology.xml' },
      { name: 'Amar Ujala - Gadgets', url: 'https://www.amarujala.com/rss/gadgets.xml' },
      { name: 'TV9 Hindi - Technology', url: 'https://www.tv9hindi.com/technology/feed' },
    ]},
    { categoryKey: 'business', feeds: [
      { name: 'BBC News Hindi - Business', url: 'https://feeds.bbci.co.uk/hindi/business/rss.xml' },
      { name: 'Amar Ujala - Business', url: 'https://www.amarujala.com/rss/business.xml' },
      { name: 'Dainik Bhaskar - Business', url: 'https://www.bhaskar.com/rss-v1--category-1051.xml' },
      { name: 'ABP Live Hindi - Business', url: 'https://www.abplive.com/business/feed' },
      { name: 'Oneindia Hindi - Business', url: 'https://hindi.oneindia.com/rss/feeds/hindi-business-fb.xml' },
    ]},
    { categoryKey: 'science', feeds: [
      { name: 'BBC News Hindi - Science', url: 'https://feeds.bbci.co.uk/hindi/science/rss.xml' },
      { name: 'Dainik Bhaskar - Life-Science', url: 'https://www.bhaskar.com/rss-v1--category-7911.xml' },
      { name: 'ABP Live Hindi - Knowledge', url: 'https://www.abplive.com/gk/feed' },
      { name: 'Amar Ujala - Science', url: 'https://www.amarujala.com/rss/technology.xml' },
      { name: 'Oneindia Hindi - Science', url: 'https://hindi.oneindia.com/rss/feeds/hindi-technology-fb.xml' },
    ]},
    { categoryKey: 'lifestyle', feeds: [
      { name: 'Amar Ujala - Lifestyle', url: 'https://www.amarujala.com/rss/lifestyle.xml' },
      { name: 'Oneindia Hindi - Lifestyle', url: 'https://hindi.oneindia.com/rss/feeds/hindi-lifestyle-fb.xml' },
      { name: 'ABP Live Hindi - Lifestyle', url: 'https://www.abplive.com/lifestyle/feed' },
      { name: 'India TV Hindi - Lifestyle', url: 'https://www.indiatv.in/rssnews/topstory-lifestyle.xml' },
      { name: 'Amar Ujala - Automobiles', url: 'https://www.amarujala.com/rss/automobiles.xml' },
    ]},
  ],

  tr: [
    { categoryKey: 'technology', feeds: [
      { name: 'Webtekno', url: 'https://www.webtekno.com/rss.xml' },
      { name: 'DonanımHaber', url: 'https://www.donanimhaber.com/rss/tum/' },
      { name: 'ShiftDelete.Net', url: 'https://shiftdelete.net/feed' },
      { name: 'Teknoblog', url: 'https://www.teknoblog.com/feed/' },
      { name: 'LOG', url: 'https://www.log.com.tr/feed' },
    ]},
    { categoryKey: 'news', feeds: [
      { name: 'Hürriyet', url: 'https://www.hurriyet.com.tr/rss/anasayfa' },
      { name: 'Milliyet', url: 'https://www.milliyet.com.tr/rss/rssNew/SonDakikaRss.xml' },
      { name: 'NTV', url: 'https://www.ntv.com.tr/son-dakika.rss' },
      { name: 'BBC Türkçe', url: 'https://feeds.bbci.co.uk/turkce/rss.xml' },
      { name: 'Cumhuriyet', url: 'https://www.cumhuriyet.com.tr/rss/son_dakika.xml' },
    ]},
    { categoryKey: 'sports', feeds: [
      { name: 'Fotomaç', url: 'https://www.fotomac.com.tr/rss/anasayfa.xml' },
      { name: 'Hürriyet Spor', url: 'https://www.hurriyet.com.tr/rss/spor' },
      { name: 'A Spor', url: 'https://www.aspor.com.tr/rss/anasayfa.xml' },
      { name: 'TRT Spor - Futbol', url: 'https://www.trtspor.com.tr/rss/futbol.rss' },
      { name: 'Milliyet Spor', url: 'https://www.milliyet.com.tr/rss/rssNew/SporRss.xml' },
    ]},
    { categoryKey: 'entertainment', feeds: [
      { name: 'Hürriyet Magazin', url: 'https://www.hurriyet.com.tr/rss/magazin' },
      { name: 'Milliyet Magazin', url: 'https://www.milliyet.com.tr/rss/rssNew/magazinRss.xml' },
      { name: 'Posta Magazin', url: 'https://www.posta.com.tr/rss/magazin.xml' },
      { name: 'CNN Türk Magazin', url: 'https://www.cnnturk.com/feed/rss/magazin/news' },
      { name: 'Habertürk Magazin', url: 'https://www.haberturk.com/rss/kategori/magazin.xml' },
    ]},
    { categoryKey: 'gaming', feeds: [
      { name: "Merlin'in Kazanı", url: 'https://www.merlininkazani.com/rss' },
      { name: 'DonanımHaber Oyun', url: 'https://www.donanimhaber.com/rss/tum/oyun' },
      { name: 'Oyungezer', url: 'https://www.oyungezer.com.tr/index.php?format=feed&type=rss' },
      { name: 'Multiplayer', url: 'https://www.multiplayer.com.tr/feed/' },
      { name: 'FRPNET', url: 'https://www.frpnet.net/feed' },
    ]},
    { categoryKey: 'business', feeds: [
      { name: 'BloombergHT', url: 'https://www.bloomberght.com/rss' },
      { name: 'Dünya Gazetesi', url: 'https://www.dunya.com/rss?dunya' },
      { name: 'Hürriyet Ekonomi', url: 'https://www.hurriyet.com.tr/rss/ekonomi' },
      { name: 'Milliyet Ekonomi', url: 'https://www.milliyet.com.tr/rss/rssNew/ekonomiRss.xml' },
      { name: 'CNN Türk Ekonomi', url: 'https://www.cnnturk.com/feed/rss/ekonomi/news' },
    ]},
    { categoryKey: 'science', feeds: [
      { name: 'Matematiksel', url: 'https://www.matematiksel.org/feed/' },
      { name: 'Herkese Bilim Teknoloji', url: 'https://www.herkesebilimteknoloji.com/feed/' },
      { name: 'Açık Bilim', url: 'https://www.acikbilim.com/feed' },
      { name: 'Bilimkurgu Kulübü', url: 'https://www.bilimkurgukulubu.com/feed/' },
      { name: 'CNN Türk Bilim-Teknoloji', url: 'https://www.cnnturk.com/feed/rss/bilim-teknoloji/news' },
    ]},
    { categoryKey: 'lifestyle', feeds: [
      { name: 'Hürriyet Yaşam', url: 'https://www.hurriyet.com.tr/rss/yasam' },
      { name: 'Milliyet Yaşam', url: 'https://www.milliyet.com.tr/rss/rssNew/yasamRss.xml' },
      { name: 'NTV Yaşam', url: 'https://www.ntv.com.tr/yasam.rss' },
      { name: 'Hürriyet Seyahat', url: 'https://www.hurriyet.com.tr/rss/seyahat' },
      { name: 'Habertürk Yaşam', url: 'https://www.haberturk.com/rss/kategori/yasam.xml' },
    ]},
  ],

  th: [
    { categoryKey: 'technology', feeds: [
      { name: 'Blognone', url: 'https://www.blognone.com/atom.xml' },
      { name: 'Beartai', url: 'https://www.beartai.com/feed' },
      { name: 'Droidsans', url: 'https://droidsans.com/feed/' },
      { name: 'Notebookspec', url: 'https://notebookspec.com/web/feed' },
      { name: 'TechHub', url: 'https://www.techhub.in.th/feed/' },
    ]},
    { categoryKey: 'news', feeds: [
      { name: 'Thairath', url: 'https://www.thairath.co.th/rss/news' },
      { name: 'Khaosod', url: 'https://www.khaosod.co.th/feed' },
      { name: 'Matichon', url: 'https://www.matichon.co.th/feed' },
      { name: 'BBC News ไทย', url: 'https://www.bbc.com/thai/index.xml' },
      { name: 'Prachachat', url: 'https://www.prachachat.net/feed' },
    ]},
    { categoryKey: 'sports', feeds: [
      { name: 'Thairath - กีฬา', url: 'https://www.thairath.co.th/rss/sport' },
      { name: 'Khaosod - กีฬา', url: 'https://www.khaosod.co.th/sports/feed' },
      { name: 'Matichon - กีฬา', url: 'https://www.matichon.co.th/sport/feed' },
      { name: 'Ball Thai', url: 'https://www.ballthai.com/feed/' },
      { name: 'MThai Sport', url: 'https://www.mthai.com/sport/feed' },
    ]},
    { categoryKey: 'entertainment', feeds: [
      { name: 'Thairath - บันเทิง', url: 'https://www.thairath.co.th/rss/entertain' },
      { name: 'Khaosod - บันเทิง', url: 'https://www.khaosod.co.th/entertainment/feed' },
      { name: 'Matichon - บันเทิง', url: 'https://www.matichon.co.th/entertainment/feed' },
      { name: 'MThai Women', url: 'https://women.mthai.com/feed' },
      { name: 'Silpa-mag', url: 'https://www.silpa-mag.com/feed' },
    ]},
    { categoryKey: 'gaming', feeds: [
      { name: 'GamingDose', url: 'https://www.gamingdose.com/feed/' },
      { name: 'This Is Game Thailand', url: 'https://www.thisisgamethailand.com/feed/' },
      { name: 'CompGamer', url: 'https://www.compgamer.com/feed' },
      { name: 'GameMonday', url: 'https://www.gamemonday.com/feed/' },
      { name: 'Extreme IT', url: 'https://extremeit.com/feed/' },
    ]},
    { categoryKey: 'business', feeds: [
      { name: 'Thairath - Money', url: 'https://www.thairath.co.th/rss/money' },
      { name: 'Kaohoon', url: 'https://www.kaohoon.com/feed' },
      { name: 'Prachachat', url: 'https://www.prachachat.net/feed' },
      { name: 'Brand Inside', url: 'https://brandinside.asia/feed/' },
      { name: 'Marketing Oops!', url: 'https://www.marketingoops.com/feed/' },
    ]},
    { categoryKey: 'science', feeds: [
      { name: 'National Geographic Thailand', url: 'https://ngthai.com/feed/' },
      { name: 'NG Thailand - วิทยาศาสตร์', url: 'https://ngthai.com/category/science/feed/' },
      { name: 'NG Thailand - สิ่งแวดล้อม', url: 'https://ngthai.com/category/environment/feed/' },
      { name: 'NSTDA', url: 'https://www.nstda.or.th/home/feed/' },
      { name: 'Thairath - สกู๊ป', url: 'https://www.thairath.co.th/rss/scoop' },
    ]},
    { categoryKey: 'lifestyle', feeds: [
      { name: 'Thairath - ไลฟ์สไตล์', url: 'https://www.thairath.co.th/rss/lifestyle' },
      { name: 'Khaosod - ไลฟ์สไตล์', url: 'https://www.khaosod.co.th/lifestyle/feed' },
      { name: 'MThai Women', url: 'https://women.mthai.com/feed' },
      { name: 'MThai Food', url: 'https://food.mthai.com/feed' },
      { name: 'Salika', url: 'https://www.salika.co/feed/' },
    ]},
  ],

  pl: [
    { categoryKey: 'technology', feeds: [
      { name: "Spider's Web", url: 'https://www.spidersweb.pl/feed' },
      { name: 'Antyweb', url: 'https://antyweb.pl/feed' },
      { name: 'Benchmark.pl', url: 'https://www.benchmark.pl/rss/aktualnosci-prog.xml' },
      { name: 'CHIP.pl', url: 'https://www.chip.pl/feed' },
      { name: 'Tabletowo', url: 'https://www.tabletowo.pl/feed/' },
    ]},
    { categoryKey: 'news', feeds: [
      { name: 'Onet Wiadomości', url: 'https://wiadomosci.onet.pl/.feed' },
      { name: 'TVN24', url: 'https://www.tvn24.pl/najnowsze.xml' },
      { name: 'WP Wiadomości', url: 'https://wiadomosci.wp.pl/rss.xml' },
      { name: 'Gazeta.pl', url: 'https://wiadomosci.gazeta.pl/pub/rss/wiadomosci.xml' },
      { name: 'RMF24', url: 'https://www.rmf24.pl/feed' },
    ]},
    { categoryKey: 'sports', feeds: [
      { name: 'Przegląd Sportowy', url: 'https://przegladsportowy.onet.pl/.feed' },
      { name: 'Interia Sport', url: 'https://sport.interia.pl/feed' },
      { name: 'WP SportoweFakty', url: 'https://sportowefakty.wp.pl/rss.xml' },
      { name: 'Sport.pl', url: 'https://www.sport.pl/pub/rss/sport.xml' },
      { name: 'Weszło', url: 'https://weszlo.com/feed/' },
    ]},
    { categoryKey: 'entertainment', feeds: [
      { name: 'Plejada', url: 'https://www.plejada.pl/.feed' },
      { name: 'Kozaczek', url: 'https://www.kozaczek.pl/rss' },
      { name: 'Filmweb', url: 'https://www.filmweb.pl/rss/news' },
      { name: 'Onet Kultura', url: 'https://kultura.onet.pl/.feed' },
      { name: 'Interia Film', url: 'https://film.interia.pl/feed' },
    ]},
    { categoryKey: 'gaming', feeds: [
      { name: 'Gry-Online', url: 'https://www.gry-online.pl/rss/news.xml' },
      { name: 'CD-Action', url: 'https://www.cdaction.pl/feed' },
      { name: 'Eurogamer.pl', url: 'https://www.eurogamer.pl/feed' },
      { name: 'WP Gry', url: 'https://gry.wp.pl/rss.xml' },
      { name: 'Gameby.pl', url: 'https://gameby.pl/feed/' },
    ]},
    { categoryKey: 'business', feeds: [
      { name: 'Bankier.pl', url: 'https://www.bankier.pl/rss/wiadomosci.xml' },
      { name: 'Money.pl', url: 'https://www.money.pl/rss/' },
      { name: 'Interia Biznes', url: 'https://biznes.interia.pl/feed' },
      { name: 'Business Insider Polska', url: 'https://businessinsider.com.pl/.feed' },
      { name: 'WNP.pl', url: 'https://www.wnp.pl/rss/serwis_rss.xml' },
    ]},
    { categoryKey: 'science', feeds: [
      { name: 'Nauka w Polsce', url: 'https://naukawpolsce.pl/rss.xml' },
      { name: 'National Geographic Polska', url: 'https://www.national-geographic.pl/feed' },
      { name: 'Crazy Nauka', url: 'https://www.crazynauka.pl/feed/' },
      { name: 'Focus.pl', url: 'https://www.focus.pl/feed' },
      { name: 'Urania', url: 'https://www.urania.edu.pl/rss.xml' },
    ]},
    { categoryKey: 'lifestyle', feeds: [
      { name: 'Onet Kobieta', url: 'https://kobieta.onet.pl/.feed' },
      { name: 'WP Kobieta', url: 'https://kobieta.wp.pl/rss.xml' },
      { name: 'Interia Kobieta', url: 'https://kobieta.interia.pl/feed' },
      { name: 'Gazeta.pl Kobieta', url: 'https://kobieta.gazeta.pl/pub/rss/kobieta.xml' },
      { name: 'Onet Podróże', url: 'https://podroze.onet.pl/.feed' },
    ]},
  ],
};

// Returns the categories array for a region, falling back to global.
export function getCuratedFeeds(region) {
  const list = CURATED_FEEDS[region];
  return (list && list.length > 0) ? list : CURATED_FEEDS.global;
}
