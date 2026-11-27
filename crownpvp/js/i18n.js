/* CrownPVP language switcher: English, Nederlands, العربية, Filipino, Español, Français.
   Self-contained (no third-party scripts). Exact-text dictionary applied to the page, remembered in localStorage.
   Order of each entry: [English, nl, ar, fil, es, fr]. Add a row to translate more text. */
(() => {
"use strict";
const LANGS = [
  { code: "en", name: "English", dir: "ltr" },
  { code: "nl", name: "Nederlands", dir: "ltr" },
  { code: "ar", name: "العربية", dir: "rtl" },
  { code: "fil", name: "Filipino", dir: "ltr" },
  { code: "es", name: "Español", dir: "ltr" },
  { code: "fr", name: "Français", dir: "ltr" }
];
const COLS = ["nl", "ar", "fil", "es", "fr"];
const ROWS = [
/* ---- navigation ---- */
["Home","Home","الرئيسية","Tahanan","Inicio","Accueil"],
["Game","Spel","اللعبة","Laro","Juego","Jeu"],
["Gamemodes","Spelmodi","أوضاع اللعب","Mga Gamemode","Modos de juego","Modes de jeu"],
["Pick how you play","Kies hoe je speelt","اختر طريقة لعبك","Piliin kung paano ka maglaro","Elige cómo juegas","Choisissez votre façon de jouer"],
["Vote","Stemmen","صوّت","Bumoto","Votar","Voter"],
["Free daily rewards","Gratis dagelijkse beloningen","مكافآت يومية مجانية","Libreng araw-araw na gantimpala","Recompensas diarias gratis","Récompenses quotidiennes gratuites"],
["Coming soon","Binnenkort beschikbaar","قريباً","Malapit na","Próximamente","Bientôt disponible"],
["Punishments","Straffen","العقوبات","Mga Parusa","Sanciones","Sanctions"],
["Public ban list","Openbare banlijst","قائمة الحظر العامة","Pampublikong listahan ng ban","Lista pública de baneos","Liste publique des bannissements"],
["Players","Spelers","اللاعبون","Mga Manlalaro","Jugadores","Joueurs"],
["Community","Community","المجتمع","Komunidad","Comunidad","Communauté"],
["News feed","Nieuwsfeed","آخر الأخبار","Balita","Noticias","Fil d'actualité"],
["Latest from the team","Het laatste nieuws van het team","آخر ما لدى الفريق","Pinakabago mula sa team","Lo último del equipo","Les dernières nouvelles de l'équipe"],
["My profile","Mijn profiel","ملفي الشخصي","Aking profile","Mi perfil","Mon profil"],
["Likes, bio and friends","Likes, bio en vrienden","الإعجابات والنبذة والأصدقاء","Mga like, bio at kaibigan","Me gusta, biografía y amigos","J'aime, bio et amis"],
["Join the community","Word lid van de community","انضم إلى المجتمع","Sumali sa komunidad","Únete a la comunidad","Rejoignez la communauté"],
["Staff team","Staffteam","فريق الإشراف","Staff team","Equipo del staff","Équipe du staff"],
["Meet the people","Maak kennis met de mensen","تعرّف على الأشخاص","Kilalanin ang mga tao","Conoce a la gente","Rencontrez l'équipe"],
["Rules","Regels","القواعد","Mga Patakaran","Reglas","Règles"],
["Staff Applications","Staff-aanvragen","طلبات الانضمام للإشراف","Mga Aplikasyon sa Staff","Solicitudes de staff","Candidatures staff"],
["Support","Support","الدعم","Suporta","Soporte","Assistance"],
["Help center","Helpcentrum","مركز المساعدة","Help center","Centro de ayuda","Centre d'aide"],
["Start here","Begin hier","ابدأ من هنا","Magsimula dito","Empieza aquí","Commencez ici"],
["Open a ticket","Open een ticket","افتح تذكرة","Magbukas ng ticket","Abrir un ticket","Ouvrir un ticket"],
["Talk to staff","Praat met het staff","تحدّث مع الإشراف","Kausapin ang staff","Habla con el staff","Parlez au staff"],
["Report a player","Speler melden","الإبلاغ عن لاعب","Mag-ulat ng manlalaro","Reportar a un jugador","Signaler un joueur"],
["Cheating or abuse","Valsspelen of misbruik","غش أو إساءة","Pandaraya o pang-aabuso","Trampas o abuso","Triche ou abus"],
["Appeal a punishment","Straf aanvechten","استئناف عقوبة","Iapela ang parusa","Apelar una sanción","Contester une sanction"],
["Ban and mute appeals","Beroep tegen ban en mute","استئناف الحظر والكتم","Mga apela sa ban at mute","Apelaciones de baneo y silencio","Appels de bannissement et de mute"],
["FAQ","FAQ","الأسئلة الشائعة","FAQ","Preguntas frecuentes","FAQ"],
["Quick answers","Snelle antwoorden","إجابات سريعة","Mabilis na sagot","Respuestas rápidas","Réponses rapides"],
["Store","Winkel","المتجر","Tindahan","Tienda","Boutique"],
["Client","Client","العميل","Client","Cliente","Client"],
["Open menu","Menu openen","فتح القائمة","Buksan ang menu","Abrir menú","Ouvrir le menu"],
["Close menu","Menu sluiten","إغلاق القائمة","Isara ang menu","Cerrar menú","Fermer le menu"],
["Open cart","Winkelwagen openen","فتح السلة","Buksan ang cart","Abrir carrito","Ouvrir le panier"],
["Close cart","Winkelwagen sluiten","إغلاق السلة","Isara ang cart","Cerrar carrito","Fermer le panier"],
["Your cart","Je winkelwagen","سلتك","Iyong cart","Tu carrito","Votre panier"],
["Shopping cart","Winkelwagen","سلة التسوق","Shopping cart","Carrito de compras","Panier"],
["Alerts","Meldingen","التنبيهات","Mga alerto","Alertas","Alertes"],
["Account menu","Accountmenu","قائمة الحساب","Menu ng account","Menú de cuenta","Menu du compte"],
["Mark all read","Alles als gelezen markeren","تحديد الكل كمقروء","Markahan lahat bilang nabasa","Marcar todo como leído","Tout marquer comme lu"],
["Sign out","Uitloggen","تسجيل الخروج","Mag-sign out","Cerrar sesión","Se déconnecter"],
/* ---- header banner ---- */
["View player records","Bekijk spelersdossiers","عرض سجلات اللاعبين","Tingnan ang mga talaan ng manlalaro","Ver registros de jugadores","Voir les dossiers des joueurs"],
["PLAY NOW","NU SPELEN","العب الآن","MAGLARO NA","JUEGA AHORA","JOUER MAINTENANT"],
["players online ·","spelers online ·","لاعبون متصلون ·","manlalarong online ·","jugadores en línea ·","joueurs en ligne ·"],
["Click to copy the server IP","Klik om het server-IP te kopiëren","انقر لنسخ عنوان الخادم","I-click para kopyahin ang IP ng server","Haz clic para copiar la IP","Cliquez pour copier l'IP du serveur"],
["Copy IP","Kopieer IP","نسخ العنوان","Kopyahin ang IP","Copiar IP","Copier l'IP"],
["Copy","Kopiëren","نسخ","Kopyahin","Copiar","Copier"],
/* ---- home ---- */
["Play. Fight. Dominate. The official home of CrownPVP OP Factions.","Speel. Vecht. Domineer. De officiële thuisbasis van CrownPVP OP Factions.","العب. قاتل. سيطر. الموطن الرسمي لـ CrownPVP OP Factions.","Maglaro. Lumaban. Manaig. Ang opisyal na tahanan ng CrownPVP OP Factions.","Juega. Lucha. Domina. El hogar oficial de CrownPVP OP Factions.","Jouez. Combattez. Dominez. La maison officielle de CrownPVP OP Factions."],
["Log in","Inloggen","تسجيل الدخول","Mag-log in","Iniciar sesión","Se connecter"],
["Register","Registreren","إنشاء حساب","Magrehistro","Registrarse","S'inscrire"],
["Server IP »","Server-IP »","عنوان الخادم »","IP ng Server »","IP del servidor »","IP du serveur »"],
["Server Status:","Serverstatus:","حالة الخادم:","Status ng Server:","Estado del servidor:","État du serveur :"],
["Checking…","Controleren…","جارٍ التحقق…","Sinusuri…","Comprobando…","Vérification…"],
["Online","Online","متصل","Online","En línea","En ligne"],
["Offline","Offline","غير متصل","Offline","Fuera de línea","Hors ligne"],
["Join Our Discord","Word lid van onze Discord","انضم إلى ديسكورد","Sumali sa aming Discord","Únete a nuestro Discord","Rejoignez notre Discord"],
["Be part of our community!","Word onderdeel van onze community!","كن جزءاً من مجتمعنا!","Maging bahagi ng aming komunidad!","¡Sé parte de nuestra comunidad!","Faites partie de notre communauté !"],
["Community Hub","Community Hub","مركز المجتمع","Community Hub","Centro de la comunidad","Hub communautaire"],
["Connect with other players!","Maak contact met andere spelers!","تواصل مع لاعبين آخرين!","Makipag-ugnayan sa ibang manlalaro!","¡Conecta con otros jugadores!","Connectez-vous avec d'autres joueurs !"],
["Latest Updates","Laatste updates","آخر التحديثات","Pinakabagong Update","Últimas novedades","Dernières actualités"],
["Stay updated with the latest news!","Blijf op de hoogte van het laatste nieuws!","ابقَ على اطلاع بآخر الأخبار!","Manatiling updated sa pinakabagong balita!","¡Mantente al día con las últimas noticias!","Restez informé des dernières nouvelles !"],
["Gold Store","Goudwinkel","متجر الذهب","Tindahan ng Gold","Tienda de oro","Boutique d'or"],
["Get 250 gold for every $1","Krijg 250 gold voor elke $1","احصل على 250 ذهب مقابل كل 1$","Kumuha ng 250 gold sa bawat $1","Obtén 250 de oro por cada $1","Obtenez 250 gold pour chaque 1 $"],
["Vote for rewards","Stem voor beloningen","صوّت لتحصل على مكافآت","Bumoto para sa gantimpala","Vota por recompensas","Votez pour des récompenses"],
["4 vote sites, daily prizes","4 stemsites, dagelijkse prijzen","4 مواقع تصويت وجوائز يومية","4 vote site, araw-araw na premyo","4 sitios de votación, premios diarios","4 sites de vote, lots quotidiens"],
["Join the Staff Team","Word lid van het staffteam","انضم إلى فريق الإشراف","Sumali sa Staff Team","Únete al equipo de staff","Rejoignez l'équipe du staff"],
["Applications are open now","Aanmeldingen zijn nu open","باب التقديم مفتوح الآن","Bukas na ang mga aplikasyon","Las solicitudes ya están abiertas","Les candidatures sont ouvertes"],
/* ---- footer ---- */
["The official website of CrownPVP — news, community updates, player support and everything happening across the network.","De officiële website van CrownPVP: nieuws, community-updates, spelersondersteuning en alles wat er in het netwerk gebeurt.","الموقع الرسمي لـ CrownPVP: الأخبار وتحديثات المجتمع ودعم اللاعبين وكل ما يحدث في الشبكة.","Ang opisyal na website ng CrownPVP: balita, update ng komunidad, suporta sa manlalaro at lahat ng nangyayari sa network.","El sitio web oficial de CrownPVP: noticias, novedades de la comunidad, soporte a jugadores y todo lo que pasa en la red.","Le site officiel de CrownPVP : actualités, nouvelles de la communauté, assistance aux joueurs et tout ce qui se passe sur le réseau."],
["Explore","Verkennen","استكشف","Mag-explore","Explorar","Explorer"],
["Join Discord","Word lid van Discord","انضم إلى ديسكورد","Sumali sa Discord","Únete a Discord","Rejoindre Discord"],
["Player lookup","Speler opzoeken","البحث عن لاعب","Hanapin ang manlalaro","Buscar jugador","Recherche de joueur"],
["Players","Spelers","اللاعبون","Mga Manlalaro","Jugadores","Joueurs"],
["Store & community support","Winkel- & communitysupport","دعم المتجر والمجتمع","Suporta sa tindahan at komunidad","Soporte de tienda y comunidad","Assistance boutique et communauté"],
["Developed by","Ontwikkeld door","تطوير","Binuo ni","Desarrollado por","Développé par"],
["· We are not affiliated with Mojang Studios or Microsoft.","· Wij zijn niet gelieerd aan Mojang Studios of Microsoft.","· لا نرتبط بشركة Mojang Studios أو Microsoft.","· Hindi kami kaugnay ng Mojang Studios o Microsoft.","· No estamos afiliados a Mojang Studios ni a Microsoft.","· Nous ne sommes pas affiliés à Mojang Studios ni à Microsoft."],
/* ---- vote ---- */
["SUPPORT THE REALM","STEUN HET RIJK","ادعم المملكة","SUPORTAHAN ANG REALM","APOYA EL REINO","SOUTENEZ LE ROYAUME"],
["Vote for","Stem op","صوّت لـ","Bumoto para sa","Vota por","Votez pour"],
["Four server lists, about a minute. Every vote pushes CrownPVP higher so new players can find us.","Vier serverlijsten, ongeveer een minuut. Elke stem brengt CrownPVP hoger, zodat nieuwe spelers ons vinden.","أربع قوائم خوادم، وبحدود دقيقة واحدة. كل صوت يرفع CrownPVP أعلى ليجدنا اللاعبون الجدد.","Apat na server list, mga isang minuto. Bawat boto ay nagpapataas sa CrownPVP para mahanap kami ng mga bagong manlalaro.","Cuatro listas de servidores, cerca de un minuto. Cada voto sube a CrownPVP para que los nuevos jugadores nos encuentren.","Quatre listes de serveurs, environ une minute. Chaque vote fait monter CrownPVP pour que les nouveaux joueurs nous trouvent."],
["Who is voting?","Wie stemt er?","من الذي يصوّت؟","Sino ang bumoboto?","¿Quién vota?","Qui vote ?"],
["Save your Minecraft username to copy it quickly. You will enter it on each voting site.","Sla je Minecraft-gebruikersnaam op om hem snel te kopiëren. Je vult hem in op elke stemsite.","احفظ اسم مستخدم ماينكرافت لنسخه بسرعة. ستدخله في كل موقع تصويت.","I-save ang iyong Minecraft username para mabilis itong makopya. Ilalagay mo ito sa bawat voting site.","Guarda tu nombre de Minecraft para copiarlo rápido. Lo introducirás en cada sitio de votación.","Enregistrez votre pseudo Minecraft pour le copier vite. Vous le saisirez sur chaque site de vote."],
["Save","Opslaan","حفظ","I-save","Guardar","Enregistrer"],
["votes opened today","stemmen vandaag geopend","أصوات تم فتحها اليوم","boto na nabuksan ngayon","votos abiertos hoy","votes ouverts aujourd'hui"],
["Each button opens the voting site in a new tab. Most server lists allow one vote every 24 hours, and the tracker above only reminds you on this device. It does not verify votes.","Elke knop opent de stemsite in een nieuw tabblad. De meeste serverlijsten staan één stem per 24 uur toe en de tracker hierboven herinnert je alleen op dit apparaat. Stemmen worden niet geverifieerd.","كل زر يفتح موقع التصويت في تبويب جديد. تسمح معظم القوائم بصوت واحد كل 24 ساعة، والمتتبع أعلاه يذكّرك على هذا الجهاز فقط ولا يتحقق من الأصوات.","Binubuksan ng bawat button ang voting site sa bagong tab. Karamihan sa mga server list ay isang boto bawat 24 oras, at nagpapaalala lang ang tracker sa device na ito. Hindi nito bine-verify ang mga boto.","Cada botón abre el sitio de votación en una pestaña nueva. La mayoría de las listas permiten un voto cada 24 horas, y el contador solo te lo recuerda en este dispositivo. No verifica los votos.","Chaque bouton ouvre le site de vote dans un nouvel onglet. La plupart des listes autorisent un vote toutes les 24 heures, et le suivi ci-dessus ne vous le rappelle que sur cet appareil. Il ne vérifie pas les votes."],
["How to vote","Hoe te stemmen","كيف تصوّت","Paano bumoto","Cómo votar","Comment voter"],
["Save your name","Sla je naam op","احفظ اسمك","I-save ang iyong pangalan","Guarda tu nombre","Enregistrez votre pseudo"],
["Type your exact Minecraft username above.","Typ hierboven je exacte Minecraft-gebruikersnaam.","اكتب اسم مستخدم ماينكرافت بدقة في الأعلى.","I-type sa itaas ang eksaktong Minecraft username mo.","Escribe arriba tu nombre exacto de Minecraft.","Saisissez ci-dessus votre pseudo Minecraft exact."],
["Open a site","Open een site","افتح موقعاً","Magbukas ng site","Abre un sitio","Ouvrez un site"],
["Press Vote on any list. Enter your username and finish the captcha.","Druk op Stemmen bij een lijst. Vul je gebruikersnaam in en los de captcha op.","اضغط «صوّت» في أي قائمة. أدخل اسم المستخدم وأكمل الكابتشا.","Pindutin ang Vote sa alinmang list. Ilagay ang username at tapusin ang captcha.","Pulsa Votar en cualquier lista. Introduce tu nombre y completa el captcha.","Cliquez sur Voter sur une liste. Saisissez votre pseudo et validez le captcha."],
["Repeat","Herhaal","كرر","Ulitin","Repite","Répétez"],
["Come back to vote on the other three lists.","Kom terug om op de andere drie lijsten te stemmen.","عد للتصويت في القوائم الثلاث الأخرى.","Bumalik para bumoto sa natitirang tatlong list.","Vuelve para votar en las otras tres listas.","Revenez voter sur les trois autres listes."],
["Need help?","Hulp nodig?","تحتاج مساعدة؟","Kailangan ng tulong?","¿Necesitas ayuda?","Besoin d'aide ?"],
["Vote not working? Open a","Werkt stemmen niet? Open een","التصويت لا يعمل؟ افتح","Hindi gumagana ang boto? Magbukas ng","¿No funciona el voto? Abre un","Le vote ne marche pas ? Ouvrez un"],
["support ticket","supportticket","تذكرة دعم","support ticket","ticket de soporte","ticket d'assistance"],
["or ask on","of vraag het op","أو اسأل في","o magtanong sa","o pregunta en","ou demandez sur"],
["Your username","Je gebruikersnaam","اسم المستخدم","Iyong username","Tu nombre de usuario","Votre pseudo"],
["Minecraft username","Minecraft-gebruikersnaam","اسم مستخدم ماينكرافت","Minecraft username","Nombre de usuario de Minecraft","Pseudo Minecraft"],
/* ---- help / support ---- */
["Search our knowledgebase or contact us","Doorzoek onze kennisbank of neem contact op","ابحث في قاعدة المعرفة أو تواصل معنا","Hanapin sa aming knowledgebase o makipag-ugnayan sa amin","Busca en nuestra base de conocimientos o contáctanos","Cherchez dans notre base de connaissances ou contactez-nous"],
["Submit a ticket","Dien een ticket in","أرسل تذكرة","Magsumite ng ticket","Enviar un ticket","Envoyer un ticket"],
["CrownPVP Guides","CrownPVP-gidsen","أدلة CrownPVP","Mga Gabay ng CrownPVP","Guías de CrownPVP","Guides CrownPVP"],
["New to Factions? Learn how to play, raid and earn.","Nieuw bij Factions? Leer spelen, raiden en verdienen.","جديد على Factions؟ تعلّم اللعب والغارات وكسب المكافآت.","Bago sa Factions? Alamin kung paano maglaro, mag-raid at kumita.","¿Nuevo en Factions? Aprende a jugar, asaltar y ganar.","Nouveau dans Factions ? Apprenez à jouer, raider et gagner."],
["CrownPVP Rules","CrownPVP-regels","قواعد CrownPVP","Mga Patakaran ng CrownPVP","Reglas de CrownPVP","Règles de CrownPVP"],
["Rules and policies for the server and Discord.","Regels en beleid voor de server en Discord.","القواعد والسياسات الخاصة بالخادم وDiscord.","Mga patakaran para sa server at Discord.","Reglas y políticas del servidor y de Discord.","Règles et politiques du serveur et de Discord."],
["Store, account or general help from our staff.","Winkel-, account- of algemene hulp van ons staff.","مساعدة المتجر أو الحساب أو أي استفسار عام من فريقنا.","Tulong sa tindahan, account o pangkalahatan mula sa aming staff.","Ayuda de tienda, cuenta o general de nuestro staff.","Aide boutique, compte ou générale de notre staff."],
["Hacking, scamming or exploiting? Send evidence.","Hacken, oplichten of exploits? Stuur bewijs.","اختراق أو احتيال أو استغلال ثغرات؟ أرسل الدليل.","Hacking, scam o exploit? Magpadala ng ebidensya.","¿Hacks, estafas o exploits? Envía pruebas.","Triche, arnaque ou exploit ? Envoyez des preuves."],
["Ban Appeals","Banberoepen","استئناف الحظر","Mga Apela sa Ban","Apelaciones de baneo","Appels de bannissement"],
["Think a punishment was a mistake? Appeal it.","Denk je dat een straf een vergissing was? Ga in beroep.","تظن أن العقوبة كانت خطأ؟ قدّم استئنافاً.","Sa tingin mo ay pagkakamali ang parusa? Iapela ito.","¿Crees que una sanción fue un error? Apélala.","Une sanction vous semble injuste ? Contestez-la."],
["Join the CrownPVP staff team.","Word lid van het CrownPVP-staffteam.","انضم إلى فريق إشراف CrownPVP.","Sumali sa staff team ng CrownPVP.","Únete al equipo de staff de CrownPVP.","Rejoignez l'équipe du staff CrownPVP."],
["Nothing matches that.","Daar is niets over gevonden.","لا يوجد ما يطابق ذلك.","Walang tumugma doon.","No hay coincidencias.","Aucun résultat."],
["and staff will help.","en het staff helpt je.","وسيساعدك الإشراف.","at tutulungan ka ng staff.","y el staff te ayudará.","et le staff vous aidera."],
["Search (try: raid, appeal, staff)","Zoeken (probeer: raid, beroep, staff)","بحث (جرّب: غارة، استئناف، إشراف)","Maghanap (subukan: raid, apela, staff)","Buscar (prueba: asalto, apelación, staff)","Rechercher (essayez : raid, appel, staff)"],
["Search support","Zoek in support","ابحث في الدعم","Maghanap sa suporta","Buscar en soporte","Rechercher dans l'assistance"],
/* ---- login ---- */
["Your account","Je account","حسابك","Iyong account","Tu cuenta","Votre compte"],
["Sign in to get alerts from the CrownPVP staff team.","Log in om meldingen van het CrownPVP-staffteam te ontvangen.","سجّل الدخول لتصلك تنبيهات من فريق إشراف CrownPVP.","Mag-sign in para makatanggap ng alerto mula sa staff team ng CrownPVP.","Inicia sesión para recibir alertas del equipo de staff de CrownPVP.","Connectez-vous pour recevoir les alertes de l'équipe du staff CrownPVP."],
/* ---- player / punishments / tickets / store ---- */
["PLAYER LOOKUP","SPELER OPZOEKEN","البحث عن لاعب","HANAPIN ANG MANLALARO","BUSCAR JUGADOR","RECHERCHE DE JOUEUR"],
["Player profiles","Spelersprofielen","ملفات اللاعبين","Mga profile ng manlalaro","Perfiles de jugadores","Profils des joueurs"],
["Search player","Speler zoeken","ابحث عن لاعب","Hanapin ang manlalaro","Buscar jugador","Rechercher le joueur"],
["Search for a player","Zoek een speler","ابحث عن لاعب","Maghanap ng manlalaro","Busca a un jugador","Rechercher un joueur"],
["Type a username above to open their profile.","Typ hierboven een gebruikersnaam om het profiel te openen.","اكتب اسم مستخدم في الأعلى لفتح ملفه.","Mag-type ng username sa itaas para buksan ang profile.","Escribe un nombre arriba para abrir su perfil.","Saisissez un pseudo ci-dessus pour ouvrir son profil."],
["Enter a Minecraft username","Voer een Minecraft-gebruikersnaam in","أدخل اسم مستخدم ماينكرافت","Maglagay ng Minecraft username","Introduce un nombre de Minecraft","Saisissez un pseudo Minecraft"],
["Enter a Minecraft username...","Voer een Minecraft-gebruikersnaam in...","أدخل اسم مستخدم ماينكرافت...","Maglagay ng Minecraft username...","Introduce un nombre de Minecraft...","Saisissez un pseudo Minecraft..."],
["Bans","Bans","الحظر","Mga Ban","Baneos","Bannissements"],
["Kicks","Kicks","الطرد","Mga Kick","Expulsiones","Expulsions"],
["Mutes","Mutes","الكتم","Mga Mute","Silencios","Mutes"],
["Warnings","Waarschuwingen","التحذيرات","Mga Babala","Advertencias","Avertissements"],
["Search by Minecraft username","Zoek op Minecraft-gebruikersnaam","ابحث باسم مستخدم ماينكرافت","Maghanap gamit ang Minecraft username","Buscar por nombre de Minecraft","Rechercher par pseudo Minecraft"],
["Appeal it","Ga in beroep","قدّم استئنافاً","Iapela ito","Apelar","Contester"],
["Support tickets","Supporttickets","تذاكر الدعم","Mga support ticket","Tickets de soporte","Tickets d'assistance"],
["HELP CENTER","HELPCENTRUM","مركز المساعدة","HELP CENTER","CENTRO DE AYUDA","CENTRE D'AIDE"],
["OFFICIAL STORE","OFFICIËLE WINKEL","المتجر الرسمي","OPISYAL NA TINDAHAN","TIENDA OFICIAL","BOUTIQUE OFFICIELLE"],
["Gold per $1","Gold per $1","ذهب لكل 1$","Gold bawat $1","de oro por $1","gold par 1 $"],
["Choose a pack","Kies een pakket","اختر باقة","Pumili ng pack","Elige un paquete","Choisissez un pack"],
["Add as many as you like to your cart.","Voeg er zoveel toe als je wilt.","أضف ما تشاء إلى سلتك.","Magdagdag ng kahit ilan sa iyong cart.","Añade todos los que quieras a tu carrito.","Ajoutez-en autant que vous voulez à votre panier."],
["Enter your username","Voer je gebruikersnaam in","أدخل اسم المستخدم","Ilagay ang iyong username","Introduce tu nombre de usuario","Saisissez votre pseudo"],
["Pay with PayPal","Betaal met PayPal","ادفع عبر PayPal","Magbayad gamit ang PayPal","Paga con PayPal","Payez avec PayPal"],
["Need help with a purchase?","Hulp nodig bij een aankoop?","تحتاج مساعدة في عملية شراء؟","Kailangan ng tulong sa pagbili?","¿Necesitas ayuda con una compra?","Besoin d'aide pour un achat ?"],
["Open store support ↗","Winkelsupport openen ↗","افتح دعم المتجر ↗","Buksan ang suporta ng tindahan ↗","Abrir soporte de tienda ↗","Ouvrir l'assistance boutique ↗"],
["Thank you for your purchase!","Bedankt voor je aankoop!","شكراً على الشراء!","Salamat sa iyong pagbili!","¡Gracias por tu compra!","Merci pour votre achat !"],
["STAFF TEAM","STAFFTEAM","فريق الإشراف","STAFF TEAM","EQUIPO DE STAFF","ÉQUIPE DU STAFF"],
["Owners","Eigenaren","المالكون","Mga May-ari","Propietarios","Propriétaires"],
["Staff","Staff","الإشراف","Staff","Staff","Staff"],
["Developer","Ontwikkelaar","المطوّر","Developer","Desarrollador","Développeur"],
["Click to vote","Klik om te stemmen","انقر للتصويت","I-click para bumoto","Haz clic para votar","Cliquez pour voter"],
["Add to cart","In winkelwagen","أضف إلى السلة","Idagdag sa cart","Añadir al carrito","Ajouter au panier"],
["Gold Coins","Gouden munten","عملات ذهبية","Gold Coins","Monedas de oro","Pièces d'or"],
["Gold powers the CrownPVP economy. Pick a pack, add your username and pay with PayPal.","Gold drijft de CrownPVP-economie aan. Kies een pakket, voeg je gebruikersnaam toe en betaal met PayPal.","الذهب هو عصب اقتصاد CrownPVP. اختر باقة وأضف اسمك وادفع عبر PayPal.","Ang Gold ang nagpapatakbo sa ekonomiya ng CrownPVP. Pumili ng pack, ilagay ang username at magbayad gamit ang PayPal.","El oro mueve la economía de CrownPVP. Elige un paquete, añade tu nombre y paga con PayPal.","Le gold fait tourner l'économie de CrownPVP. Choisissez un pack, ajoutez votre pseudo et payez avec PayPal."],
["Language","Taal","اللغة","Wika","Idioma","Langue"]
];
const PATTERNS = [
  [/^© (\d{4}) CrownPVP\. All rights reserved\.$/, { nl: "© $1 CrownPVP. Alle rechten voorbehouden.", ar: "© $1 CrownPVP. جميع الحقوق محفوظة.", fil: "© $1 CrownPVP. Lahat ng karapatan ay nakalaan.", es: "© $1 CrownPVP. Todos los derechos reservados.", fr: "© $1 CrownPVP. Tous droits réservés." }]
];
const D = new Map(), DL = new Map();
for (const r of ROWS) { const m = {}; COLS.forEach((c, i) => m[c] = r[i + 1]); if (!D.has(r[0])) D.set(r[0], m); if (!DL.has(r[0].toLowerCase())) DL.set(r[0].toLowerCase(), m); }
const norm = s => s.replace(/\s+/g, " ").trim();
function tr(text, lang) {
  if (lang === "en") return null;
  const key = norm(text); if (!key) return null;
  let m = D.get(key), up = false;
  if (!m) { m = DL.get(key.toLowerCase()); up = !!m && key === key.toUpperCase() && /[A-Z]/.test(key); }
  if (m) { const v = m[lang]; return up ? v.toUpperCase() : v; }
  for (const [re, t] of PATTERNS) if (re.test(key)) return key.replace(re, t[lang]);
  return null;
}
let lang = "en";
try { const s = localStorage.getItem("crown-lang"); if (LANGS.some(l => l.code === s)) lang = s; } catch {}

const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "SVG"]);
const skipEl = el => !el || (el.closest && el.closest("[data-i18n-skip],.cp-lang,[contenteditable]")) || SKIP.has(el.tagName.toUpperCase());
function doText(n) {
  const p = n.parentElement; if (skipEl(p)) return;
  if (n.__t !== undefined && n.nodeValue !== n.__t) n.__o = n.nodeValue;   // page changed it
  else if (n.__o === undefined) n.__o = n.nodeValue;
  const o = n.__o, t = lang === "en" ? null : tr(o, lang);
  const v = t == null ? o : (o.match(/^\s*/)[0] + t + o.match(/\s*$/)[0]);
  if (n.nodeValue !== v) n.nodeValue = v;
  n.__t = v;
}
const ATTRS = ["placeholder", "title", "aria-label"];
function doAttrs(el) {
  if (skipEl(el)) return;
  for (const a of ATTRS) {
    if (!el.hasAttribute || !el.hasAttribute(a)) continue;
    el.__oa = el.__oa || {}; el.__ta = el.__ta || {};
    const cur = el.getAttribute(a);
    if (el.__ta[a] !== undefined && cur !== el.__ta[a]) el.__oa[a] = cur;
    else if (el.__oa[a] === undefined) el.__oa[a] = cur;
    const o = el.__oa[a], t = lang === "en" ? null : tr(o, lang), v = t == null ? o : t;
    if (cur !== v) el.setAttribute(a, v);
    el.__ta[a] = v;
  }
}
function walk(root) {
  if (root.nodeType === 3) return doText(root);
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.nodeType === 1) doAttrs(root);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n; while ((n = tw.nextNode())) n.nodeType === 3 ? doText(n) : doAttrs(n);
}
let busy = false;
const mo = new MutationObserver(list => {
  if (busy) return; busy = true;
  try { for (const m of list) {
    if (m.type === "characterData") doText(m.target);
    else if (m.type === "attributes") doAttrs(m.target);
    else m.addedNodes.forEach(walk);
  } } finally { busy = false; mo.takeRecords(); }
});
function startObserver() { mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS }); }

function setLang(code, save = true) {
  const L = LANGS.find(l => l.code === code) || LANGS[0]; lang = L.code;
  if (save) try { localStorage.setItem("crown-lang", lang); } catch {}
  document.documentElement.lang = L.code === "fil" ? "fil" : L.code;
  document.documentElement.dir = L.dir;
  document.documentElement.setAttribute("data-lang", L.code);
  busy = true; try { walk(document.body); } finally { busy = false; mo.takeRecords(); }
  const cur = document.querySelector(".cp-lang-cur"); if (cur) cur.textContent = L.code === "fil" ? "FIL" : L.code.toUpperCase();
  document.querySelectorAll(".cp-lang-menu button").forEach(b => { const on = b.dataset.lang === L.code; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
}

function buildSwitcher() {
  if (document.querySelector(".cp-lang")) return;
  const w = document.createElement("div"); w.className = "cp-lang"; w.setAttribute("data-i18n-skip", "");
  w.innerHTML = `<button type="button" class="cp-lang-btn" aria-haspopup="true" aria-expanded="false" aria-label="Language / اللغة"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 4 5.7 4 9s-1.4 6.3-4 9c-2.6-2.7-4-5.7-4-9s1.4-6.3 4-9z"/></svg><span class="cp-lang-cur">EN</span></button><div class="cp-lang-menu" role="menu">${LANGS.map(l => `<button type="button" role="menuitemradio" aria-checked="false" data-lang="${l.code}" lang="${l.code}" dir="${l.dir}">${l.name}</button>`).join("")}</div>`;
  const hr = document.querySelector(".aq-top .hr, .hr"), slot = document.getElementById("acct-slot");
  if (hr) hr.insertBefore(w, slot && slot.parentNode === hr ? slot : hr.firstChild); else document.body.append(w);
  const btn = w.querySelector(".cp-lang-btn");
  const close = () => { w.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); };
  btn.addEventListener("click", e => { e.stopPropagation(); const o = !w.classList.contains("open"); w.classList.toggle("open", o); btn.setAttribute("aria-expanded", String(o)); });
  w.querySelector(".cp-lang-menu").addEventListener("click", e => { const b = e.target.closest("button[data-lang]"); if (!b) return; setLang(b.dataset.lang); close(); btn.focus(); });
  document.addEventListener("click", e => { if (!e.target.closest(".cp-lang")) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
}

const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "css/i18n.css?v=20261125-lang"; document.head.append(css);
const init = () => { buildSwitcher(); setLang(lang, false); startObserver(); };
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
window.CrownI18n = { setLang, get lang() { return lang; }, languages: LANGS };
})();
