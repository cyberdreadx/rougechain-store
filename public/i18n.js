// RougeChain Store in English, Spanish and Russian. Load it in <head>, before the other scripts.
//
//   - The language: ?lang=en|es|ru (then remembered), else the one chosen before, else the
//     device's language, else English. <html lang> follows it.
//   - The pages are written in English. Once a page is parsed, every text, alt, aria-label,
//     placeholder and title whose English is in T below is swapped for the translation, and so
//     are the page's <title> and description. Anything not in T stays English. The page stays
//     hidden for that moment, so nobody sees it change.
//   - Scripts translate what they write with I18N.t("English text", { name: value }).
//   - [data-langs] (the footers) gets the English · Español · Русский links.
//   - Names stay as they are: Gltch Runner, Kestrel Block, NEXUS, weapon and arena names, XRGE.
//
// Adding English text anywhere? Add its line to T; `npm test` lists any text that has none.
(function () {
  var LANGS = { en: "English", es: "Español", ru: "Русский" };
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function choose() {
    var q = /[?&]lang=(en|es|ru)(?:&|$)/.exec(location.search);
    if (q) {
      set("rc-lang", q[1]);
      try {
        var rest = location.search.replace(/([?&])lang=(en|es|ru)(&|$)/, function (m, a, l, b) { return b ? a : ""; });
        history.replaceState(null, "", location.pathname + (rest === "?" ? "" : rest) + location.hash);
      } catch (e) {}
      return q[1];
    }
    var saved = get("rc-lang");
    if (saved && LANGS[saved]) return saved;
    var prefs = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < prefs.length; i++) {
      var l = String(prefs[i]).slice(0, 2).toLowerCase();
      if (LANGS[l]) return l;
    }
    return "en";
  }
  var lang = choose();
  var root = document.documentElement;
  root.lang = lang;
  if (lang !== "en") {
    var hide = document.createElement("style");
    hide.textContent = "html.i18n-wait body{visibility:hidden}";
    document.head.appendChild(hide);
    root.classList.add("i18n-wait");
  }

  // "English": ["Español", "Русский"]
  var T = {
    // ---- store bar, tabs, shared
    "Games": ["Juegos", "Игры"],
    "Merch": ["Merch", "Мерч"],
    "Apps": ["Apps", "Приложения"],
    "More": ["Más", "Ещё"],
    "Search the store": ["Buscar en la tienda", "Поиск по магазину"],
    "Wishlist": ["Deseados", "Избранное"],
    "Cart": ["Carrito", "Корзина"],
    "Store": ["Tienda", "Магазин"],
    "Sign in": ["Entrar", "Войти"],
    "Account": ["Cuenta", "Аккаунт"],
    "Signed in ✓": ["Conectado ✓", "Вы вошли ✓"],
    "Signed out": ["Sesión cerrada", "Вы вышли"],
    "RougeChain Store home": ["Inicio de RougeChain Store", "Главная RougeChain Store"],
    "Departments": ["Secciones", "Разделы"],
    "Sections": ["Secciones", "Разделы"],
    "RougeChain logo": ["Logotipo de RougeChain", "Логотип RougeChain"],
    "RougeChain Technologies logo": ["Logotipo de RougeChain Technologies", "Логотип RougeChain Technologies"],
    "Prices in US dollars": ["Precios en dólares estadounidenses", "Цены в долларах США"],
    "Contact:": ["Contacto:", "Контакты:"],
    "Terms": ["Términos", "Условия"],
    "Refunds": ["Reembolsos", "Возвраты"],
    "Privacy": ["Privacidad", "Конфиденциальность"],
    "Privacy policy": ["Política de privacidad", "Политика конфиденциальности"],
    "Close": ["Cerrar", "Закрыть"],
    "Back": ["Atrás", "Назад"],
    "Email": ["Correo electrónico", "Эл. почта"],
    "you@example.com": ["tu@ejemplo.com", "you@example.com"],
    "Early Access": ["Acceso anticipado", "Ранний доступ"],
    "Early Access · Windows": ["Acceso anticipado · Windows", "Ранний доступ · Windows"],
    "Was": ["Antes", "Было"],
    "{n} percent off": ["{n} % de descuento", "Скидка {n}%"],
    "33 percent off": ["33 % de descuento", "Скидка 33%"],
    "Add to cart": ["Añadir al carrito", "В корзину"],
    "Get notified": ["Avísame", "Сообщить мне"],
    "♡ Add to wishlist": ["♡ Añadir a deseados", "♡ В избранное"],
    "♥ On your wishlist": ["♥ En tus deseados", "♥ В избранном"],
    "Follow": ["Seguir", "Следить"],
    "Following": ["Siguiendo", "Вы следите"],

    // ---- homepage
    "Games, merch, apps": ["Juegos, merch, apps", "Игры, мерч, приложения"],
    "and more": ["y mucho más", "и многое другое"],
    "The RougeChain Technologies store. Our first game, Gltch Runner, is in Early Access, and the rest of the shelves are filling up.":
      ["La tienda de RougeChain Technologies. Nuestro primer juego, Gltch Runner, está en acceso anticipado, y el resto de las estanterías se va llenando.",
       "Магазин RougeChain Technologies. Наша первая игра, Gltch Runner, уже в раннем доступе, а остальные полки постепенно заполняются."],
    "Featured": ["Destacado", "Рекомендуем"],
    "A cyberpunk shooter set in Kestrel Block. You wake with eleven days cut out of your memory, and every contract takes you somewhere new to win one back.":
      ["Un shooter ciberpunk ambientado en Kestrel Block. Despiertas con once días arrancados de tu memoria, y cada contrato te lleva a un lugar nuevo para recuperar uno.",
       "Киберпанк-шутер, действие которого происходит в Kestrel Block. Вы просыпаетесь, а из вашей памяти вырезаны одиннадцать дней, и каждый контракт ведёт вас в новое место, чтобы вернуть один из них."],
    "Cyberpunk": ["Ciberpunk", "Киберпанк"],
    "Story Rich": ["Gran historia", "Глубокий сюжет"],
    "Parkour": ["Parkour", "Паркур"],
    "See the game ›": ["Ver el juego ›", "Об игре ›"],
    "Browse": ["Explorar", "Разделы"],
    "4 departments": ["4 secciones", "4 раздела"],
    "1 game · Gltch Runner": ["1 juego · Gltch Runner", "1 игра · Gltch Runner"],
    "Coming soon": ["Próximamente", "Скоро"],
    "On the way": ["En camino", "Уже в пути"],
    "Special offers": ["Ofertas especiales", "Специальные предложения"],
    "1 offer": ["1 oferta", "1 предложение"],
    "Early Access launch sale": ["Oferta de lanzamiento del acceso anticipado", "Скидка к старту раннего доступа"],
    "Windows · Early Access alpha": ["Windows · Alfa en acceso anticipado", "Windows · Альфа-версия в раннем доступе"],
    "1 in Early Access": ["1 en acceso anticipado", "1 в раннем доступе"],
    "Cyberpunk FPS · story and arenas · Windows": ["FPS ciberpunk · historia y arenas · Windows", "Киберпанк-FPS · сюжет и арены · Windows"],
    "View": ["Ver", "Открыть"],
    "More games": ["Más juegos", "Другие игры"],
    "RougeChain's next games will show up here.": ["Aquí aparecerán los próximos juegos de RougeChain.", "Здесь появятся следующие игры RougeChain."],
    "COMING SOON": ["PRÓXIMAMENTE", "СКОРО"],
    "RougeChain and Gltch Runner merch": ["Merch de RougeChain y Gltch Runner", "Мерч RougeChain и Gltch Runner"],
    "Merch is on its way to the store. When it lands it will be on this shelf, and in your cart beside the games.":
      ["El merch está en camino. Cuando llegue estará en esta estantería, y en tu carrito junto a los juegos.",
       "Мерч уже на пути в магазин. Когда он появится, он будет на этой полке и в вашей корзине рядом с играми."],
    "Apps from RougeChain": ["Apps de RougeChain", "Приложения от RougeChain"],
    "Apps for desktop and phone are coming to the store. Watch this shelf.":
      ["Pronto llegarán a la tienda apps para ordenador y móvil. No pierdas de vista esta estantería.",
       "Скоро в магазине появятся приложения для компьютера и телефона. Следите за этой полкой."],
    "And more": ["Y más", "И не только"],
    "ON THE WAY": ["EN CAMINO", "УЖЕ В ПУТИ"],
    "Whatever RougeChain makes next": ["Lo próximo que haga RougeChain", "Всё, что RougeChain сделает дальше"],
    "The store will carry everything RougeChain Technologies puts out. New departments open here first.":
      ["La tienda tendrá todo lo que publique RougeChain Technologies. Las nuevas secciones abren aquí primero.",
       "В магазине будет всё, что выпускает RougeChain Technologies. Новые разделы открываются здесь первыми."],
    "Gltch Runner store page": ["Página de Gltch Runner en la tienda", "Страница Gltch Runner в магазине"],
    "Kestrel Block at night in the rain": ["Kestrel Block de noche, bajo la lluvia", "Kestrel Block ночью под дождём"],
    "Show screenshot {n}": ["Mostrar captura {n}", "Показать скриншот {n}"],
    "RougeChain Technologies' store: games, merch, apps and more. Gltch Runner is in Early Access.":
      ["La tienda de RougeChain Technologies: juegos, merch, apps y mucho más. Gltch Runner está en acceso anticipado.",
       "Магазин RougeChain Technologies: игры, мерч, приложения и многое другое. Gltch Runner уже в раннем доступе."],
    // the homepage's search
    "Game · Early Access": ["Juego · Acceso anticipado", "Игра · Ранний доступ"],
    "Department": ["Sección", "Раздел"],
    "Department · coming soon": ["Sección · próximamente", "Раздел · скоро"],
    "Nothing called “{q}” yet.": ["Aún no hay nada llamado “{q}”.", "Пока нет ничего под названием «{q}»."],
    "gltch runner game fps cyberpunk early access shooter kestrel": ["juego shooter ciberpunk acceso anticipado disparos", "игра шутер киберпанк ранний доступ стрелялка"],
    "games game": ["juegos juego", "игры игра"],
    "merch shirt tee hoodie clothes": ["merch camiseta sudadera ropa", "мерч футболка худи одежда"],
    "apps app software": ["aplicaciones aplicación programas", "приложения приложение программы"],
    "more other": ["más otros", "ещё другое"],

    // ---- Gltch Runner page
    "About": ["Acerca de", "Об игре"],
    "Arsenal": ["Arsenal", "Арсенал"],
    "Arenas": ["Arenas", "Арены"],
    "Requirements": ["Requisitos", "Требования"],
    "All Games": ["Todos los juegos", "Все игры"],
    "Action": ["Acción", "Экшен"],
    "by": ["de", "от"],
    "Screenshots and summary": ["Capturas y resumen", "Скриншоты и описание"],
    "Previous screenshot": ["Captura anterior", "Предыдущий скриншот"],
    "Next screenshot": ["Captura siguiente", "Следующий скриншот"],
    "Screenshots": ["Capturas", "Скриншоты"],
    "Story": ["Historia", "Сюжет"],
    "Arena": ["Arena", "Арена"],
    "Day Two": ["Día Dos", "День второй"],
    "Kestrel Block at half past nine, in the rain": ["Kestrel Block a las nueve y media, bajo la lluvia", "Kestrel Block в половине десятого, под дождём"],
    "Neon Row: team deathmatch down a street canyon": ["Neon Row: duelo por equipos en un cañón de calles", "Neon Row: командный бой в уличном каньоне"],
    "Sunset over the avenue": ["Atardecer sobre la avenida", "Закат над проспектом"],
    "The NEXUS black site, Sublevel 3": ["La instalación secreta de NEXUS, Subnivel 3", "Секретный объект NEXUS, подуровень 3"],
    "Halt 14 on the Cold Line": ["Parada 14 de la Cold Line", "Остановка 14 на Cold Line"],
    "Rain on Neon Row": ["Lluvia en Neon Row", "Дождь на Neon Row"],
    "The avenue at ten in the morning": ["La avenida a las diez de la mañana", "Проспект в десять утра"],
    "Containment breach": ["Brecha de contención", "Нарушение изоляции"],
    "The halt goes to red": ["La parada se pone en rojo", "Остановка переходит на красный"],
    "Kestrel Block from above": ["Kestrel Block desde arriba", "Kestrel Block сверху"],
    "A service lane off Neon Row": ["Un callejón de servicio junto a Neon Row", "Служебный переулок у Neon Row"],
    "Kestrel Block at night: cherry trees, lanterns and a neon sign in the rain":
      ["Kestrel Block de noche: cerezos, farolillos y un letrero de neón bajo la lluvia", "Kestrel Block ночью: вишнёвые деревья, фонарики и неоновая вывеска под дождём"],
    "Eleven days missing": ["Once días perdidos", "Одиннадцать потерянных дней"],
    "You wake in flat 306, over a mechanic's workshop, with eleven days cut out of your memory. Kestrel Block keeps its own hours: neighbours, noodle counters, neon in the rain. Every contract takes you somewhere new to win one of those days back.":
      ["Despiertas en el piso 306, encima de un taller mecánico, con once días arrancados de tu memoria. Kestrel Block tiene sus propios horarios: vecinos, puestos de fideos, neón bajo la lluvia. Cada contrato te lleva a un lugar nuevo para recuperar uno de esos días.",
       "Вы просыпаетесь в квартире 306 над автомастерской, а из вашей памяти вырезаны одиннадцать дней. В Kestrel Block свой распорядок: соседи, лапшичные, неон под дождём. Каждый контракт ведёт вас в новое место, чтобы вернуть один из этих дней."],
    "Reviews": ["Reseñas", "Отзывы"],
    "No reviews yet": ["Aún no hay reseñas", "Отзывов пока нет"],
    "Release date": ["Fecha de lanzamiento", "Дата выхода"],
    "Early Access alpha · date to be announced": ["Alfa en acceso anticipado · fecha por anunciar", "Альфа-версия в раннем доступе · дата будет объявлена"],
    "Developer": ["Desarrollador", "Разработчик"],
    "Publisher": ["Editor", "Издатель"],
    "Tags": ["Etiquetas", "Метки"],
    "Singleplayer": ["Un jugador", "Для одного игрока"],
    "Multiplayer": ["Multijugador", "Мультиплеер"],
    "Atmospheric": ["Atmosférico", "Атмосфера"],
    "Early Access alpha · Windows · English": ["Alfa en acceso anticipado · Windows · Inglés", "Альфа-версия в раннем доступе · Windows · английский"],
    "Early Access game": ["Juego en acceso anticipado", "Игра в раннем доступе"],
    "You play the alpha while it's being built. It isn't finished: expect missing pieces, rough edges and changes from one build to the next.":
      ["Juegas la alfa mientras se construye. No está terminada: habrá partes que faltan, detalles sin pulir y cambios de una versión a otra.",
       "Вы играете в альфа-версию, пока она создаётся. Игра не закончена: чего-то не хватает, что-то не отполировано, и от сборки к сборке всё меняется."],
    "In the alpha now": ["Ya en la alfa", "Уже в альфа-версии"],
    "Kestrel Block, the story's district, by day, at sunset and at night": ["Kestrel Block, el distrito de la historia, de día, al atardecer y de noche", "Kestrel Block — сюжетный район днём, на закате и ночью"],
    "Dead Signal, the first contract, down in NEXUS's Sublevel 3": ["Dead Signal, el primer contrato, en el Subnivel 3 de NEXUS", "Dead Signal — первый контракт, внизу, на подуровне 3 NEXUS"],
    "Day Two of the eleven days: the Cold Line": ["El Día Dos de los once: la Cold Line", "День второй из одиннадцати: Cold Line"],
    "Flat 306, your bag, the workbench, food, rest and XRGE": ["El piso 306, tu bolsa, el banco de trabajo, comida, descanso y XRGE", "Квартира 306, ваша сумка, верстак, еда, отдых и XRGE"],
    "16 guns and the MonoEdge katana": ["16 armas y la katana MonoEdge", "16 стволов и катана MonoEdge"],
    "8 arenas and 9 modes, with bots or over LAN": ["8 arenas y 9 modos, con bots o en LAN", "8 арен и 9 режимов, с ботами или по локальной сети"],
    "Planned": ["Previsto", "В планах"],
    "The rest of the eleven days, each in a place of its own": ["El resto de los once días, cada uno en un lugar propio", "Остальные из одиннадцати дней, каждый в своём месте"],
    "Neon Row as a neighbourhood, home to AFTERIMAGE, reached by Line 6 or taxi": ["Neon Row como barrio, hogar de AFTERIMAGE, al que se llega en la Línea 6 o en taxi", "Neon Row как отдельный район, где находится AFTERIMAGE; туда можно доехать по линии 6 или на такси"],
    "More of the city to explore": ["Más ciudad por explorar", "Ещё больше города для исследования"],
    "Buy Gltch Runner": ["Comprar Gltch Runner", "Купить Gltch Runner"],
    "Buy Gltch Runner (Early Access)": ["Comprar Gltch Runner (acceso anticipado)", "Купить Gltch Runner (ранний доступ)"],
    "The alpha build: the story of Kestrel Block from Dead Signal on, every arena and mode, and the bots to fill them.":
      ["La versión alfa: la historia de Kestrel Block desde Dead Signal, todas las arenas y modos, y los bots para llenarlos.",
       "Альфа-сборка: история Kestrel Block начиная с Dead Signal, все арены и режимы, а также боты, чтобы их заполнить."],
    "Recent updates": ["Actualizaciones recientes", "Последние обновления"],
    "from the development log": ["del diario de desarrollo", "из дневника разработки"],
    "The ground has depth": ["El suelo tiene profundidad", "У земли появилась глубина"],
    "Roads, paving and floors drawn in real relief, puddles in the cracks, and a garden of real grass.":
      ["Calles, aceras y suelos con relieve real, charcos en las grietas y un jardín de césped de verdad.",
       "Дороги, тротуары и полы с настоящим рельефом, лужи в трещинах и сад с настоящей травой."],
    "Dead Signal, rebuilt": ["Dead Signal, reconstruido", "Dead Signal, пересобран"],
    "Sublevel 3 is a robotics firm's neon-lit black site, and what comes up comes out of a hatch.":
      ["El Subnivel 3 es la instalación secreta de una empresa de robótica, iluminada con neón, y lo que sube sale por una escotilla.",
       "Подуровень 3 — секретный объект робототехнической компании в неоновом свете, и всё, что поднимается наверх, выходит из люка."],
    "The Cold Line": ["La Cold Line", "Cold Line"],
    "Day Two's freight halt is a modelled train in an arched tunnel, with the city's neon, adverts and paint down there.":
      ["La parada de mercancías del Día Dos es un tren modelado en un túnel abovedado, con el neón, los anuncios y los grafitis de la ciudad allí abajo.",
       "Грузовая остановка второго дня — смоделированный поезд в арочном тоннеле, а внизу — городской неон, реклама и граффити."],
    "About this game": ["Acerca de este juego", "Об этой игре"],
    "Gltch Runner is a first-person shooter set in Kestrel Block, a few streets of a vertical city that keep their own hours. Someone took eleven days out of your head and filed them under another name. The neighbourhood knows more than it says.":
      ["Gltch Runner es un shooter en primera persona ambientado en Kestrel Block, unas pocas calles de una ciudad vertical que tienen sus propios horarios. Alguien te sacó once días de la cabeza y los archivó con otro nombre. El barrio sabe más de lo que cuenta.",
       "Gltch Runner — шутер от первого лица, действие которого разворачивается в Kestrel Block, на нескольких улицах вертикального города со своим распорядком. Кто-то вынул из вашей головы одиннадцать дней и записал их на чужое имя. Район знает больше, чем говорит."],
    "The avenue at sunset": ["La avenida al atardecer", "Проспект на закате"],
    "The avenue at sunset under a pink sky, cherry trees on both pavements": ["La avenida al atardecer bajo un cielo rosa, con cerezos en ambas aceras", "Проспект на закате под розовым небом, вишнёвые деревья по обе стороны"],
    "A block that": ["Un barrio que", "Квартал, который"],
    "lives": ["vive", "живёт"],
    "Kestrel Block is a place to walk end to end, not a mission menu. Your neighbours take Line 6 to work, eat at KOMA Night Kitchen, do their washing at the Spin Cycle and spend their evenings at AFTERIMAGE.":
      ["Kestrel Block es un lugar para recorrer de punta a punta, no un menú de misiones. Tus vecinos van al trabajo en la Línea 6, comen en KOMA Night Kitchen, lavan la ropa en el Spin Cycle y pasan las noches en AFTERIMAGE.",
       "Kestrel Block — это место, которое можно пройти из конца в конец, а не меню миссий. Ваши соседи ездят на работу по линии 6, едят в KOMA Night Kitchen, стирают в Spin Cycle и проводят вечера в AFTERIMAGE."],
    "Morning smog turns to a pink sunset and then a wet neon night. When it rains, the street fills with reflections.":
      ["El smog de la mañana da paso a un atardecer rosa y luego a una noche húmeda de neón. Cuando llueve, la calle se llena de reflejos.",
       "Утренний смог сменяется розовым закатом, а затем мокрой неоновой ночью. Когда идёт дождь, улица наполняется отражениями."],
    "Day · sunset · night · rain": ["Día · atardecer · noche · lluvia", "День · закат · ночь · дождь"],
    "Dead Signal: containment breach": ["Dead Signal: brecha de contención", "Dead Signal: нарушение изоляции"],
    "A NEXUS concourse under red alarm light": ["Un vestíbulo de NEXUS bajo la luz roja de alarma", "Зал NEXUS в красном свете тревоги"],
    "Eleven": ["Once", "Одиннадцать"],
    "days": ["días", "дней"],
    "Dead Signal takes you down into NEXUS's Sublevel 3. After it come the eleven days themselves. Vale bottled them, and a bottled day won't take without its anchor: something real from the place it happened.":
      ["Dead Signal te lleva al Subnivel 3 de NEXUS. Después vienen los once días en sí. Vale los embotelló, y un día embotellado no prende sin su ancla: algo real del lugar donde ocurrió.",
       "Dead Signal спускает вас на подуровень 3 NEXUS. После него начинаются сами одиннадцать дней. Vale закупорил их, а закупоренный день не приживётся без своего якоря — чего-то настоящего из того места, где он случился."],
    "So every contract is a place of its own, one you'll only see once. Get the anchor, bring it home, and remember.":
      ["Así que cada contrato es un lugar propio, que solo verás una vez. Consigue el ancla, llévala a casa y recuerda.",
       "Поэтому каждый контракт — это отдельное место, которое вы увидите лишь однажды. Добудьте якорь, принесите его домой — и вспомните."],
    "Day Two · The Cold Line · Halt 14": ["Día Dos · La Cold Line · Parada 14", "День второй · Cold Line · Остановка 14"],
    "Kestrel Garden: a paved path through long grass under cherry trees": ["Kestrel Garden: un camino de losas entre hierba alta bajo los cerezos", "Kestrel Garden: мощёная дорожка в высокой траве под вишнями"],
    "Between": ["Entre", "Между"],
    "jobs": ["encargos", "заданиями"],
    "Flat 306 in Kestrel Heights has your bed, your weapons locker and a balcony over the plaza. Eat and drink before you rest, fit gear at the workbench, and keep everything you carry in a bag that shows what it does and what it's worth.":
      ["El piso 306 de Kestrel Heights tiene tu cama, tu armero y un balcón sobre la plaza. Come y bebe antes de descansar, ajusta tu equipo en el banco de trabajo y guarda todo lo que llevas en una bolsa que muestra para qué sirve cada cosa y cuánto vale.",
       "В квартире 306 в Kestrel Heights — ваша кровать, оружейный шкаф и балкон над площадью. Ешьте и пейте перед отдыхом, настраивайте снаряжение на верстаке и храните всё, что носите, в сумке, которая показывает, что делает каждая вещь и сколько она стоит."],
    "Earn and spend XRGE, the block's coin, and stake it with KESTREL-1 for a little back each day. It's in-game money only.":
      ["Gana y gasta XRGE, la moneda del barrio, y ponla en staking con KESTREL-1 para recibir un poco cada día. Es solo dinero del juego.",
       "Зарабатывайте и тратьте XRGE, монету квартала, и отдавайте её в стейкинг KESTREL-1, чтобы каждый день получать немного обратно. Это только внутриигровые деньги."],
    "Inventory · workbench · food and rest · 10 Genesis Papers to find": ["Inventario · banco de trabajo · comida y descanso · 10 Genesis Papers por encontrar", "Инвентарь · верстак · еда и отдых · 10 Genesis Papers, которые нужно найти"],
    "Neon Row, team deathmatch": ["Neon Row, duelo por equipos", "Neon Row, командный бой"],
    "Neon Row at night in the rain, signs stacked up the towers": ["Neon Row de noche bajo la lluvia, con letreros apilados en las torres", "Neon Row ночью под дождём, вывески громоздятся по башням"],
    "Move like a": ["Muévete como un", "Двигайтесь как"],
    "runner": ["runner", "раннер"],
    "Sprint, slide, double jump, mantle and run along walls. Tap to hack, put a drone up, throw a grenade, or holster the gun and draw the MonoEdge.":
      ["Esprinta, deslízate, haz doble salto, escala y corre por las paredes. Toca para hackear, lanza un dron, arroja una granada o enfunda el arma y desenvaina la MonoEdge.",
       "Бегайте, скользите, делайте двойной прыжок, взбирайтесь на уступы и бегите по стенам. Нажмите, чтобы взломать, запустите дрон, бросьте гранату или уберите ствол и обнажите MonoEdge."],
    "Wall run · slide · double jump · mantle · hacks · drones": ["Carrera por paredes · deslizamiento · doble salto · escalada · hackeos · drones", "Бег по стенам · скольжение · двойной прыжок · подъём на уступы · взломы · дроны"],
    "16 guns and a blade": ["16 armas y una hoja", "16 стволов и клинок"],
    "Pistol": ["Pistola", "Пистолет"],
    "SMG": ["Subfusil", "Пистолет-пулемёт"],
    "Assault rifle": ["Fusil de asalto", "Штурмовая винтовка"],
    "Shotgun": ["Escopeta", "Дробовик"],
    "Sniper rifle": ["Fusil de francotirador", "Снайперская винтовка"],
    "Rocket launcher": ["Lanzacohetes", "Ракетомёт"],
    "EM sniper rifle": ["Fusil de francotirador EM", "ЭМ-снайперская винтовка"],
    "Plasma rifle": ["Fusil de plasma", "Плазменная винтовка"],
    "Katana": ["Katana", "Катана"],
    "MonoEdge katana": ["Katana MonoEdge", "Катана MonoEdge"],
    "against bots, or friends on your network": ["contra bots o con amigos en tu red", "против ботов или с друзьями по сети"],
    "Team Deathmatch": ["Duelo por equipos", "Командный бой"],
    "Free For All": ["Todos contra todos", "Каждый сам за себя"],
    "Domination": ["Dominación", "Господство"],
    "Search & Destroy": ["Buscar y destruir", "Найти и уничтожить"],
    "Rush": ["Asalto", "Штурм"],
    "Infestation": ["Infestación", "Заражение"],
    "Katana Only": ["Solo katana", "Только катаны"],
    "Data War": ["Guerra de datos", "Война данных"],
    "System requirements": ["Requisitos del sistema", "Системные требования"],
    "Minimum": ["Mínimos", "Минимальные"],
    "OS": ["SO", "ОС"],
    "Windows 10, 64-bit": ["Windows 10, 64 bits", "Windows 10, 64-бит"],
    "Windows 11, 64-bit": ["Windows 11, 64 bits", "Windows 11, 64-бит"],
    "Graphics": ["Gráficos", "Видеокарта"],
    "To be confirmed in testing": ["Por confirmar en las pruebas", "Уточняется в ходе тестирования"],
    "Memory": ["Memoria", "Память"],
    "To be confirmed": ["Por confirmar", "Уточняется"],
    "Storage": ["Almacenamiento", "Место на диске"],
    "Built and tested on": ["Desarrollado y probado en", "Создано и протестировано на"],
    "Settings": ["Ajustes", "Настройки"],
    "Low, Medium, High, Ultra (global illumination, FSR 2)": ["Bajo, Medio, Alto, Ultra (iluminación global, FSR 2)", "Низкие, средние, высокие, ультра (глобальное освещение, FSR 2)"],
    "Engine": ["Motor", "Движок"],
    "Customer reviews": ["Reseñas de clientes", "Отзывы покупателей"],
    "Gltch Runner isn't out, so nobody has reviewed it. Reviews will show here after launch.":
      ["Gltch Runner aún no ha salido, así que nadie lo ha reseñado. Las reseñas aparecerán aquí tras el lanzamiento.",
       "Gltch Runner ещё не вышел, поэтому отзывов пока нет. Они появятся здесь после релиза."],
    "Game details": ["Detalles del juego", "Подробности об игре"],
    "Features": ["Características", "Особенности"],
    "Single-player story": ["Historia para un jugador", "Сюжетная кампания"],
    "LAN multiplayer": ["Multijugador en LAN", "Мультиплеер по локальной сети"],
    "Bots to fight or team with": ["Bots para enfrentarte o formar equipo", "Боты-противники и союзники"],
    "Controller support": ["Compatible con mando", "Поддержка геймпада"],
    "Day, night and rain": ["Día, noche y lluvia", "День, ночь и дождь"],
    "Four graphics settings": ["Cuatro ajustes gráficos", "Четыре уровня графики"],
    "Languages": ["Idiomas", "Языки"],
    "Interface": ["Interfaz", "Интерфейс"],
    "Audio": ["Audio", "Озвучка"],
    "Subtitles": ["Subtítulos", "Субтитры"],
    "English": ["Inglés", "Английский"],
    "Mature content": ["Contenido para adultos", "Контент для взрослых"],
    "Frequent violence and gore, strong language, drug and alcohol use, and non-explicit sexual content.":
      ["Violencia y sangre frecuentes, lenguaje fuerte, consumo de drogas y alcohol, y contenido sexual no explícito.",
       "Частое насилие и жестокость, нецензурная лексика, употребление наркотиков и алкоголя, сексуальный контент без откровенных сцен."],
    "Independent studio, makers of Gltch Runner.": ["Estudio independiente, creadores de Gltch Runner.", "Независимая студия, создатели Gltch Runner."],
    "Gltch Runner is in development. Screenshots are from the current build and everything here may change.":
      ["Gltch Runner está en desarrollo. Las capturas son de la versión actual y todo lo que ves aquí puede cambiar.",
       "Gltch Runner находится в разработке. Скриншоты сделаны в текущей сборке, и всё здесь может измениться."],
    "Wet asphalt at night, neon broken up in its grit and puddles": ["Asfalto mojado de noche, con el neón roto en su grano y sus charcos", "Мокрый асфальт ночью, неон дробится в его крошке и лужах"],
    "The NEXUS lobby: a holographic reception desk under neon lines": ["El vestíbulo de NEXUS: un mostrador holográfico bajo líneas de neón", "Вестибюль NEXUS: голографическая стойка под неоновыми линиями"],
    "Halt 14: a tunnel platform with a neon advert and graffiti": ["Parada 14: un andén en un túnel con un anuncio de neón y grafitis", "Остановка 14: платформа в тоннеле с неоновой рекламой и граффити"],
    "Gltch Runner: a cyberpunk FPS from RougeChain Technologies, in Early Access. Kestrel Block, eleven missing days, 16 guns and a katana, 8 arenas.":
      ["Gltch Runner: un FPS ciberpunk de RougeChain Technologies, en acceso anticipado. Kestrel Block, once días perdidos, 16 armas y una katana, 8 arenas.",
       "Gltch Runner — киберпанк-FPS от RougeChain Technologies в раннем доступе. Kestrel Block, одиннадцать потерянных дней, 16 стволов и катана, 8 арен."],
    "Add · {price}": ["Añadir · {price}", "В корзину · {price}"],
    "Notify me": ["Avísame", "Сообщить"],

    // ---- cart, wishlist, signup (store.js)
    "Your cart": ["Tu carrito", "Ваша корзина"],
    "Close the cart": ["Cerrar el carrito", "Закрыть корзину"],
    "Close the wishlist": ["Cerrar deseados", "Закрыть избранное"],
    "Estimated total": ["Total estimado", "Итого (примерно)"],
    "Continue to payment": ["Continuar al pago", "Перейти к оплате"],
    "Your cart is empty.": ["Tu carrito está vacío.", "Корзина пуста."],
    "Remove": ["Quitar", "Убрать"],
    "Checkout isn't open yet. Until it is, keep things on your wishlist.": ["El pago aún no está abierto. Mientras tanto, guarda lo que quieras en tus deseados.", "Оплата пока недоступна. А пока добавляйте товары в избранное."],
    "For now, buy one item at a time.": ["Por ahora, compra un artículo cada vez.", "Пока можно покупать только по одному товару."],
    "You pay on Stripe's secure checkout page.": ["Pagas en la página de pago segura de Stripe.", "Оплата проходит на защищённой странице Stripe."],
    "The purchase is saved to your store account.": ["La compra se guarda en tu cuenta de la tienda.", "Покупка сохранится в вашем аккаунте."],
    "Nothing saved yet. Tap ♡ Add to wishlist on a game to keep it here.": ["Aún no has guardado nada. Toca ♡ Añadir a deseados en un juego para tenerlo aquí.", "Здесь пока пусто. Нажмите ♡ В избранное на странице игры, чтобы сохранить её здесь."],
    "{name} isn't on sale yet. Leave your email and we'll tell you when it is.": ["{name} aún no está a la venta. Déjanos tu correo y te avisaremos cuando lo esté.", "{name} пока не продаётся. Оставьте почту, и мы сообщим, когда начнутся продажи."],
    "Sign me up": ["Apúntame", "Подписаться"],
    "We only use your address to tell you about RougeChain releases. Every email has an unsubscribe link.":
      ["Solo usamos tu dirección para avisarte de los lanzamientos de RougeChain. Todos los correos incluyen un enlace para darte de baja.",
       "Мы используем ваш адрес только для новостей о релизах RougeChain. В каждом письме есть ссылка для отписки."],

    // ---- sign-in and the account (account.js)
    "Sign in or create your store account.": ["Entra o crea tu cuenta de la tienda.", "Войдите или создайте аккаунт магазина."],
    "Continue with RougeChain wallet": ["Continuar con la billetera RougeChain", "Продолжить с кошельком RougeChain"],
    "Continue with Qwalla": ["Continuar con Qwalla", "Продолжить с Qwalla"],
    "or": ["o", "или"],
    "Continue": ["Continuar", "Продолжить"],
    "Enter your email address.": ["Escribe tu dirección de correo.", "Введите адрес электронной почты."],
    "Enter an email address.": ["Escribe una dirección de correo.", "Введите адрес почты."],
    "Sending code…": ["Enviando código…", "Отправляем код…"],
    "Check your email": ["Revisa tu correo", "Проверьте почту"],
    "Enter the 6-digit code we sent to {email}.": ["Introduce el código de 6 dígitos que enviamos a {email}.", "Введите 6-значный код, который мы отправили на {email}."],
    "6-digit code": ["Código de 6 dígitos", "6-значный код"],
    "Send a new code": ["Enviar un código nuevo", "Отправить новый код"],
    "Use password instead": ["Usar contraseña", "Войти с паролем"],
    "New code sent.": ["Código nuevo enviado.", "Новый код отправлен."],
    "Checking…": ["Comprobando…", "Проверяем…"],
    "Enter your password": ["Escribe tu contraseña", "Введите пароль"],
    "Signing in as {email}.": ["Entrando como {email}.", "Вход как {email}."],
    "Password": ["Contraseña", "Пароль"],
    "Signing in…": ["Entrando…", "Входим…"],
    "Email me a code instead": ["Envíame un código", "Прислать код на почту"],
    "Your account": ["Tu cuenta", "Ваш аккаунт"],
    "Your wishlist, follows and purchases stay with this account.": ["Tus deseados, seguimientos y compras se quedan en esta cuenta.", "Избранное, подписки и покупки хранятся в этом аккаунте."],
    "Add email": ["Añadir correo", "Добавить почту"],
    "None": ["Ninguno", "Нет"],
    "Wallet": ["Billetera", "Кошелёк"],
    "Add wallet": ["Añadir billetera", "Добавить кошелёк"],
    "Set": ["Configurada", "Задан"],
    "Not set": ["Sin configurar", "Не задан"],
    "Sign out": ["Cerrar sesión", "Выйти"],
    "Check your wallet…": ["Revisa tu billetera…", "Проверьте кошелёк…"],
    "You can also sign in with your wallet, so this email can be removed. Removing it also removes your password.":
      ["También puedes entrar con tu billetera, así que puedes quitar este correo. Al quitarlo, también se elimina tu contraseña.",
       "Вы также можете входить с кошельком, поэтому эту почту можно удалить. Вместе с ней удалится и пароль."],
    "Remove email": ["Quitar correo", "Удалить почту"],
    "This RougeChain wallet signs you in. Signing in never moves funds.": ["Con esta billetera RougeChain entras en tu cuenta. Entrar nunca mueve fondos.", "Этот кошелёк RougeChain используется для входа. Вход никогда не перемещает средства."],
    "Remove wallet": ["Quitar billetera", "Удалить кошелёк"],
    "Email added.": ["Correo añadido.", "Почта добавлена."],
    "Email removed.": ["Correo quitado.", "Почта удалена."],
    "Wallet added.": ["Billetera añadida.", "Кошелёк добавлен."],
    "Wallet removed.": ["Billetera quitada.", "Кошелёк удалён."],
    "Change password": ["Cambiar contraseña", "Сменить пароль"],
    "Set a password": ["Crear una contraseña", "Задать пароль"],
    "Current password": ["Contraseña actual", "Текущий пароль"],
    "New password": ["Contraseña nueva", "Новый пароль"],
    "At least 10 characters.": ["Al menos 10 caracteres.", "Не менее 10 символов."],
    "Save password": ["Guardar contraseña", "Сохранить пароль"],
    "Saving…": ["Guardando…", "Сохраняем…"],
    "Password saved.": ["Contraseña guardada.", "Пароль сохранён."],
    "Forgot it? Reset it with an email code": ["¿La olvidaste? Restablécela con un código por correo", "Забыли? Сбросьте его с помощью кода из письма"],
    "Reset password": ["Restablecer contraseña", "Сброс пароля"],
    "Enter the code we sent to {email}, then your new password.": ["Introduce el código que enviamos a {email} y luego tu contraseña nueva.", "Введите код, отправленный на {email}, а затем новый пароль."],
    "Qwalla didn't open.": ["Qwalla no se abrió.", "Qwalla не открылся."],
    "Get Qwalla": ["Descarga Qwalla", "Скачайте Qwalla"],
    "for iPhone or Android, then try again.": ["para iPhone o Android y vuelve a intentarlo.", "для iPhone или Android и попробуйте снова."],
    "Add the {ext} to Chrome, Edge or Brave, or use {qwalla}. Then reload this page.": ["Instala la {ext} en Chrome, Edge o Brave, o usa {qwalla}. Después recarga esta página.", "Установите {ext} в Chrome, Edge или Brave или используйте {qwalla}. Затем перезагрузите страницу."],
    "RougeChain Wallet extension": ["extensión RougeChain Wallet", "расширение RougeChain Wallet"],
    "Update your wallet to sign in (RougeChain Wallet 1.8 or later, or the latest Qwalla), then reload this page.":
      ["Actualiza tu billetera para entrar (RougeChain Wallet 1.8 o posterior, o la última versión de Qwalla) y recarga esta página.",
       "Обновите кошелёк, чтобы войти (RougeChain Wallet 1.8 или новее либо последняя версия Qwalla), затем перезагрузите страницу."],
    "Cancelled in your wallet. Nothing was signed.": ["Cancelado en tu billetera. No se firmó nada.", "Отменено в кошельке. Ничего не подписано."],
    "Unlock your wallet, then try again.": ["Desbloquea tu billetera y vuelve a intentarlo.", "Разблокируйте кошелёк и попробуйте снова."],
    "Your wallet didn't answer in time. Try again.": ["Tu billetera no respondió a tiempo. Vuelve a intentarlo.", "Кошелёк не ответил вовремя. Попробуйте снова."],
    "Your wallet couldn't sign in. Try again.": ["Tu billetera no pudo iniciar sesión. Vuelve a intentarlo.", "Не удалось войти через кошелёк. Попробуйте снова."],
    "Your wallet didn't share its public key.": ["Tu billetera no compartió su clave pública.", "Кошелёк не передал открытый ключ."],
    "Something went wrong. Try again in a minute.": ["Algo salió mal. Vuelve a intentarlo en un minuto.", "Что-то пошло не так. Попробуйте через минуту."],

    // ---- what the accounts server says (netlify/lib); shown as the server sends them, in English, then here
    "Not found.": ["No encontrado.", "Не найдено."],
    "That request didn't come from the store.": ["Esa solicitud no vino de la tienda.", "Этот запрос пришёл не из магазина."],
    "Something went wrong on our side. Try again in a minute.": ["Algo falló por nuestra parte. Vuelve a intentarlo en un minuto.", "У нас что-то пошло не так. Попробуйте через минуту."],
    "You're signed out. Sign in again.": ["Tu sesión se cerró. Vuelve a entrar.", "Вы вышли из аккаунта. Войдите снова."],
    "Too many tries. Wait a few minutes, then try again.": ["Demasiados intentos. Espera unos minutos y vuelve a intentarlo.", "Слишком много попыток. Подождите несколько минут и попробуйте снова."],
    "Enter a valid email address.": ["Escribe una dirección de correo válida.", "Введите корректный адрес почты."],
    "Use at least 10 characters for your password.": ["Usa al menos 10 caracteres en tu contraseña.", "Пароль должен содержать не менее 10 символов."],
    "That password is too long. Use 200 characters at most.": ["Esa contraseña es demasiado larga. Usa 200 caracteres como máximo.", "Слишком длинный пароль. Используйте не более 200 символов."],
    "Don't use your email address as your password.": ["No uses tu dirección de correo como contraseña.", "Не используйте адрес почты в качестве пароля."],
    "That list isn't valid.": ["Esa lista no es válida.", "Неверный список."],
    "We've sent a lot of codes to this address. Wait an hour, then try again.": ["Hemos enviado muchos códigos a esta dirección. Espera una hora y vuelve a intentarlo.", "Мы отправили на этот адрес много кодов. Подождите час и попробуйте снова."],
    "We just sent you a code. Wait a minute before asking for another.": ["Acabamos de enviarte un código. Espera un minuto antes de pedir otro.", "Мы только что отправили вам код. Подождите минуту, прежде чем запрашивать новый."],
    "That code has expired. Ask for a new one.": ["Ese código ha caducado. Pide uno nuevo.", "Срок действия кода истёк. Запросите новый."],
    "Too many wrong codes. Ask for a new one.": ["Demasiados códigos incorrectos. Pide uno nuevo.", "Слишком много неверных кодов. Запросите новый."],
    "That code isn't right. Check the email and try again.": ["Ese código no es correcto. Revisa el correo y vuelve a intentarlo.", "Неверный код. Проверьте письмо и попробуйте снова."],
    "Enter the 6-digit code from the email.": ["Introduce el código de 6 dígitos del correo.", "Введите 6-значный код из письма."],
    "This account already has an email.": ["Esta cuenta ya tiene un correo.", "У этого аккаунта уже есть почта."],
    "That email already has its own store account. Use a different email, or sign in with that one.": ["Ese correo ya tiene su propia cuenta en la tienda. Usa otro correo o entra con ese.", "У этой почты уже есть свой аккаунт в магазине. Укажите другую почту или войдите с этой."],
    "Enter your password.": ["Escribe tu contraseña.", "Введите пароль."],
    "Too many password tries for this email. Wait 15 minutes, or sign in with an email code.": ["Demasiados intentos de contraseña para este correo. Espera 15 minutos o entra con un código por correo.", "Слишком много попыток ввода пароля для этой почты. Подождите 15 минут или войдите по коду из письма."],
    "That email and password don't match. No password yet? Sign in with an email code.": ["Ese correo y esa contraseña no coinciden. ¿Aún no tienes contraseña? Entra con un código por correo.", "Почта и пароль не совпадают. Ещё нет пароля? Войдите по коду из письма."],
    "The sign-in message was changed before it was signed. Try again.": ["El mensaje de inicio de sesión se modificó antes de firmarlo. Vuelve a intentarlo.", "Сообщение для входа изменилось до подписи. Попробуйте снова."],
    "The wallet's signature didn't check out. Try again.": ["La firma de la billetera no es válida. Vuelve a intentarlo.", "Подпись кошелька не прошла проверку. Попробуйте снова."],
    "Your wallet switched accounts partway through. Try again.": ["Tu billetera cambió de cuenta a mitad del proceso. Vuelve a intentarlo.", "Кошелёк сменил аккаунт в процессе. Попробуйте снова."],
    "That sign-in was made for a different site.": ["Ese inicio de sesión era para otro sitio.", "Этот вход был выполнен для другого сайта."],
    "That sign-in has expired or was already used. Try again.": ["Ese inicio de sesión caducó o ya se usó. Vuelve a intentarlo.", "Этот вход устарел или уже использован. Попробуйте снова."],
    "That sign-in was for a different RougeChain network.": ["Ese inicio de sesión era para otra red de RougeChain.", "Этот вход был для другой сети RougeChain."],
    "Your device's clock looks wrong. Check it, then try again.": ["El reloj de tu dispositivo parece incorrecto. Revísalo y vuelve a intentarlo.", "Похоже, часы на устройстве идут неверно. Проверьте их и попробуйте снова."],
    "That sign-in has expired. Try again.": ["Ese inicio de sesión caducó. Vuelve a intentarlo.", "Срок действия входа истёк. Попробуйте снова."],
    "Your wallet sent a public key the store can't read.": ["Tu billetera envió una clave pública que la tienda no puede leer.", "Кошелёк отправил открытый ключ, который магазин не может прочитать."],
    "This account already has a wallet.": ["Esta cuenta ya tiene una billetera.", "У этого аккаунта уже есть кошелёк."],
    "Send the signed message, the signature and the public key.": ["Envía el mensaje firmado, la firma y la clave pública.", "Отправьте подписанное сообщение, подпись и открытый ключ."],
    "You signed in as someone else meanwhile. Try again.": ["Mientras tanto entraste con otra cuenta. Vuelve a intentarlo.", "Тем временем вы вошли под другим аккаунтом. Попробуйте снова."],
    "That wallet already has its own store account. Use a different wallet, or sign in with that one.": ["Esa billetera ya tiene su propia cuenta en la tienda. Usa otra billetera o entra con esa.", "У этого кошелька уже есть свой аккаунт в магазине. Используйте другой кошелёк или войдите с этим."],
    "Add an email first. A password signs in with your email.": ["Añade primero un correo. La contraseña se usa junto con tu correo.", "Сначала добавьте почту: пароль используется вместе с ней."],
    "Your current password isn't right.": ["Tu contraseña actual no es correcta.", "Текущий пароль неверен."],
    "Link a wallet first, so you can still sign in.": ["Vincula antes una billetera para poder seguir entrando.", "Сначала привяжите кошелёк, чтобы сохранить возможность входа."],
    "Add an email first, so you can still sign in.": ["Añade antes un correo para poder seguir entrando.", "Сначала добавьте почту, чтобы сохранить возможность входа."],
    "Say which sign-in to remove: email or wallet.": ["Indica qué método quitar: correo o billetera.", "Укажите, что удалить: почту или кошелёк."],
    "Send the request as JSON.": ["Envía la solicitud como JSON.", "Отправьте запрос в формате JSON."],
    "That request is too large.": ["Esa solicitud es demasiado grande.", "Запрос слишком большой."],
    "That request isn't valid JSON.": ["Esa solicitud no es JSON válido.", "Запрос содержит неверный JSON."],
    "Email sign-in isn't set up yet. Use your RougeChain wallet for now.": ["El inicio de sesión por correo aún no está configurado. Por ahora usa tu billetera RougeChain.", "Вход по почте пока не настроен. Пока используйте кошелёк RougeChain."],
    "We couldn't send the email. Try again in a minute.": ["No pudimos enviar el correo. Vuelve a intentarlo en un minuto.", "Не удалось отправить письмо. Попробуйте через минуту."],

    // ---- the app (app.js)
    "Get the app": ["Instala la app", "Установите приложение"],
    "The store on your home screen.": ["La tienda en tu pantalla de inicio.", "Магазин на главном экране."],
    "Install": ["Instalar", "Установить"],
    "Tap Share {icon} then Add to Home Screen.": ["Toca Compartir {icon} y luego Añadir a pantalla de inicio.", "Нажмите «Поделиться» {icon}, затем «На экран „Домой“»."],
    "Not now": ["Ahora no", "Не сейчас"],

    // ---- thanks.html, offline.html
    "Thank you": ["Gracias", "Спасибо"],
    "Your payment went through. Stripe has emailed your receipt, and your Gltch Runner Early Access download will be sent to the same address.":
      ["Tu pago se ha completado. Stripe te ha enviado el recibo por correo, y la descarga de Gltch Runner en acceso anticipado llegará a esa misma dirección.",
       "Оплата прошла. Stripe отправил чек на вашу почту, а ссылка на загрузку Gltch Runner (ранний доступ) придёт на тот же адрес."],
    "Back to the store": ["Volver a la tienda", "Вернуться в магазин"],
    "Thank you · RougeChain Store": ["Gracias · RougeChain Store", "Спасибо · RougeChain Store"],
    "You're offline": ["Sin conexión", "Нет подключения"],
    "This page needs a connection the first time. Pages you've already opened still work.": ["Esta página necesita conexión la primera vez. Las páginas que ya abriste siguen funcionando.", "Для первого открытия этой страницы нужно подключение. Страницы, которые вы уже открывали, работают."],
    "Try again": ["Reintentar", "Повторить"],
    "Go to the store": ["Ir a la tienda", "В магазин"],
    "Offline · RougeChain Store": ["Sin conexión · RougeChain Store", "Нет подключения · RougeChain Store"]
  };

  var col = lang === "es" ? 0 : 1;
  function norm(s) { return String(s).replace(/\s+/g, " ").trim(); }
  function fill(s, vars) {
    return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m; }) : s;
  }
  /** The translation of an English string (with {name} slots filled from vars), or the English. */
  function t(s, vars) {
    var hit = lang !== "en" && T[norm(s)];
    return fill(hit ? hit[col] : s, vars);
  }

  var ATTRS = ["alt", "aria-label", "placeholder", "title"];
  /** Translates the text and attributes under `node` that T knows. */
  function apply(node) {
    if (lang === "en" || !node) return;
    var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null), texts = [];
    for (var n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n);
    texts.forEach(function (n) {
      var p = n.parentNode;
      if (!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName) || (p.closest && p.closest("[translate=no]"))) return;
      var raw = n.nodeValue, hit = T[norm(raw)];
      if (!hit) return;
      n.nodeValue = raw.match(/^\s*/)[0] + hit[col] + raw.match(/\s*$/)[0];
    });
    ATTRS.forEach(function (a) {
      (node.querySelectorAll ? node.querySelectorAll("[" + a + "]") : []).forEach(function (el) {
        var hit = T[norm(el.getAttribute(a))];
        if (hit) el.setAttribute(a, hit[col]);
      });
    });
    // dates in the reader's language
    (node.querySelectorAll ? node.querySelectorAll("time[datetime]") : []).forEach(function (el) {
      try {
        el.textContent = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" }).format(new Date(el.getAttribute("datetime") + "T12:00:00"));
      } catch (e) {}
    });
  }

  function reveal() { root.classList.remove("i18n-wait"); }
  function ready() {
    if (lang !== "en") {
      apply(document.body);
      var title = T[norm(document.title)];
      if (title) document.title = title[col];
      var d = document.querySelector('meta[name="description"]');
      if (d && T[norm(d.content)]) d.content = T[norm(d.content)][col];
    }
    // the language links
    document.querySelectorAll("[data-langs]").forEach(function (box) {
      box.setAttribute("translate", "no");
      box.innerHTML = Object.keys(LANGS).map(function (l) {
        return '<a href="?lang=' + l + '" hreflang="' + l + '" lang="' + l + '"' + (l === lang ? ' aria-current="true"' : "") + ">" + LANGS[l] + "</a>";
      }).join(" · ");
    });
    reveal();
  }
  if (lang !== "en") setTimeout(reveal, 2500); // never leave the page hidden
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();

  window.I18N = { lang: lang, langs: LANGS, t: t, apply: apply, dict: T };
})();
