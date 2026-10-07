/* ===================== DONNÉES ===================== */
const VERSION = 3;

const ARCH = {
  aggro:{l:"Aggro / combat",d:"Attaquer tôt et souvent avec une armée de créatures.",col:{R:.6,W:.5,G:.3}},
  voltron:{l:"Voltron",d:"Un seul monstre équipé jusqu’aux dents ; victoire aux dégâts de commandant.",col:{W:.5,G:.4,R:.3}},
  tokens:{l:"Jetons (go-wide)",d:"Remplir la table de jetons, puis tout booster d’un coup.",col:{W:.5,G:.5,R:.2}},
  aristo:{l:"Aristocrates",d:"Sacrifier tes propres créatures pour drainer la table.",col:{B:.7,W:.3,R:.3}},
  counters:{l:"Compteurs +1/+1",d:"Faire grandir ton équipe tour après tour.",col:{G:.6,W:.4,U:.2}},
  kindred:{l:"Tribal (kindred)",d:"Un type de créature à l’honneur.",col:{}},
  big:{l:"Rampe & gros sorts",d:"Accélérer ton mana pour lancer des choses énormes (battlecruiser).",col:{G:.7,R:.2}},
  lands:{l:"Terrains / landfall",d:"Poser plein de terrains et tirer de la valeur de chacun.",col:{G:.8,B:.2}},
  blink:{l:"Blink / effets d’arrivée",d:"Faire sortir et revenir tes créatures pour répéter leurs effets.",col:{W:.5,U:.5}},
  life:{l:"Gain de vie",d:"Gagner de la vie et la convertir en puissance.",col:{W:.6,B:.4,G:.3}},
  gy:{l:"Cimetière / réanimation",d:"Ton cimetière devient une deuxième main.",col:{B:.7,G:.5,U:.2}},
  artifacts:{l:"Artefacts",d:"Machines, équipements, trésors, créatures artefacts.",col:{U:.4,R:.4,W:.3,C:.6}},
  ench:{l:"Enchantements",d:"Enchantress, auras, constellation.",col:{W:.5,G:.5}},
  spells:{l:"Spellslinger",d:"Éphémères et rituels qui déclenchent tout ton plateau.",col:{U:.6,R:.6}},
  control:{l:"Contrôle",d:"Contresorts, removal, wipes : tu décides de ce qui reste sur la table.",col:{U:.7,W:.4,B:.3}},
  stax:{l:"Stax / prison",d:"Taxes et verrous qui étouffent les ressources adverses.",col:{W:.6,U:.4}},
  pillow:{l:"Pillowfort",d:"Rendre l’attaque contre toi trop chère et construire tranquille.",col:{W:.8}},
  combo:{l:"Combo",d:"Assembler deux ou trois pièces qui gagnent la partie.",col:{U:.5,B:.5,G:.2}},
  hug:{l:"Group hug / politique",d:"Donner aux autres, négocier, faire des alliances.",col:{G:.5,U:.4,W:.3}},
  slug:{l:"Group slug",d:"Faire mal à tout le monde un peu, tout le temps.",col:{R:.6,B:.6}},
  goad:{l:"Goad (provocation)",d:"Forcer les adversaires à se battre entre eux.",col:{R:.6,B:.3}},
  theft:{l:"Vol & clones",d:"Utiliser les meilleures cartes… des autres.",col:{U:.5,B:.5,R:.3}},
  mill:{l:"Meule",d:"Vider la bibliothèque des adversaires.",col:{U:.6,B:.4}},
  chaos:{l:"Chaos & hasard",d:"Pile ou face, cascade, dés : chaque partie est unique.",col:{R:.7,U:.2}},
  walkers:{l:"Superfriends",d:"Une équipe de planeswalkers à protéger.",col:{W:.3,U:.3,G:.2,B:.2,R:.2}},
  punish:{l:"Punition / renvoi de dégâts",d:"Chaque coup qu’on te porte se retourne contre l’attaquant.",col:{R:.6,B:.3,W:.2}}
};
const ENGINE=["tokens","counters","aristo","gy","lands","blink","artifacts","ench","spells","big","life","walkers"];
const PLANS=["aggro","voltron","combo","mill","control","stax","pillow","hug","slug","goad","chaos","punish","theft"];

const FANTASIES={
  villain:{l:"Le grand méchant",d:"Ambition, domination, tout le monde contre toi.",fx:{"c.B":2,"c.U":.6,"c.R":.6,"a.theft":.6,"a.aristo":.6},hint:"Noir et Grixis, démons, Phyrexians, Nicol Bolas. Il existe même un type de créature « Villain » depuis les extensions Marvel."},
  dwarf:{l:"Le nain forgeron",d:"Marteaux, équipements, trésors et machines.",fx:{"c.R":2,"c.W":1,"a.artifacts":1.2,"a.voltron":.6},hint:"Rouge et blanc : équipements, véhicules et trésors."},
  necro:{l:"Le nécromancien",d:"Les morts se relèvent à ton signal.",fx:{"c.B":2,"c.U":.4,"a.gy":1.5,"a.aristo":.6},hint:"Noir (avec bleu ou vert) : cimetière, zombies, réanimation."},
  dragons:{l:"Le dompteur de dragons",d:"Des ailes, du feu et des créatures énormes.",fx:{"c.R":1.5,"c.G":.6,"a.big":1.2},kind:"Dragon",hint:"Rouge et multicolore : rampe et gros volants."},
  pirate:{l:"Le capitaine pirate",d:"Trésors, abordages et pillage.",fx:{"c.U":1,"c.R":1,"c.B":.6,"a.theft":1},kind:"Pirate",hint:"Bleu-noir-rouge : trésors et vol."},
  paladin:{l:"Le paladin",d:"Armure, honneur et lumière.",fx:{"c.W":2,"a.voltron":1.2,"a.life":.4},kind:"Knight",hint:"Blanc : équipements, auras, protection."},
  inventor:{l:"Le savant fou",d:"Inventions, artefacts et expériences ratées.",fx:{"c.U":1.5,"c.R":1.5,"a.artifacts":1.5,"a.spells":.5},hint:"Bleu-rouge : artefacts et sorts."},
  druid:{l:"Le druide",d:"La nature grandit, les terres répondent.",fx:{"c.G":2,"a.lands":1.5,"a.big":.6},hint:"Vert : terrains, rampe, créatures massives."},
  king:{l:"Le souverain bâtisseur",d:"Un royaume, une armée, un peuple.",fx:{"c.W":1.5,"a.tokens":1.5,"a.hug":.4},hint:"Blanc et ses alliés : jetons, armée qui grandit."},
  horror:{l:"L’horreur venue d’ailleurs",d:"Indicible, inévitable, dérangeante.",fx:{"c.C":2,"c.B":.6,"c.U":.6,"a.big":.6},hint:"Eldrazi incolores, horreurs bleu-noir."},
  trickster:{l:"L’escroc",d:"Voler, tromper, retourner la situation.",fx:{"c.U":1,"c.B":1,"a.theft":1.2,"a.chaos":.4},hint:"Bleu-noir : vol, copie, manipulation."},
  archmage:{l:"L’archimage",d:"Savoir absolu et sorts parfaits.",fx:{"c.U":2,"a.spells":1.5,"a.control":.6},hint:"Bleu : éphémères, rituels, contrôle."},
  beastmaster:{l:"Le maître des bêtes",d:"Une ménagerie qui t’obéit.",fx:{"c.G":2,"a.aggro":.6,"a.counters":.6},hint:"Vert : créatures, compteurs, combat."},
  chaos:{l:"L’agent du chaos",d:"Personne, pas même toi, ne sait ce qui va arriver.",fx:{"c.R":2,"a.chaos":2},hint:"Rouge : pile ou face, cascade, hasard."},
  angel:{l:"L’ange gardien",d:"Protéger, guérir, veiller.",fx:{"c.W":2,"a.life":1.5,"a.pillow":.4},kind:"Angel",hint:"Blanc : gain de vie, volants, protection."},
  warlord:{l:"Le chef de guerre",d:"Tout le monde à l’attaque, maintenant.",fx:{"c.R":1,"c.W":1,"a.aggro":1.5},hint:"Rouge-blanc : combats supplémentaires et armées."},
  diplomat:{l:"Le diplomate",d:"Tu fais et défais les alliances.",fx:{"c.G":1,"c.U":1,"c.W":.5,"a.hug":2},hint:"Vert-bleu-blanc : group hug et politique."}
};

const TRIBE_CHIPS=[["Dragons","Dragon"],["Vampires","Vampire"],["Zombies","Zombie"],["Elfes","Elf"],["Gobelins","Goblin"],["Anges","Angel"],["Démons","Demon"],["Loups-garous","Werewolf"],["Loups","Wolf"],["Chats","Cat"],["Chiens","Dog"],["Grenouilles","Frog"],["Dinosaures","Dinosaur"],["Pirates","Pirate"],["Chevaliers","Knight"],["Sorciers","Wizard"],["Horreurs","Horror"],["Eldrazi","Eldrazi"],["Slivoïdes","Sliver"],["Faes","Faerie"],["Écureuils","Squirrel"],["Guerriers","Warrior"],["Soldats","Soldier"],["Rats","Rat"],["Hydres","Hydra"],["Sphinx","Sphinx"],["Crabes","Crab"],["Nains","Dwarf"],["Vilains","Villain"],["Ninjas","Ninja"],["Samouraïs","Samurai"],["Esprits","Spirit"],["Élémentaires","Elemental"],["Ondins","Merfolk"],["Araignées","Spider"],["Oiseaux","Bird"],["Serpents","Snake"],["Lapins","Rabbit"],["Loutres","Otter"],["Chauves-souris","Bat"],["Géants","Giant"],["Orques","Orc"],["Phyrexians","Phyrexian"],["Assembleurs","Construct"]];
const TRIBE_FR={}; TRIBE_CHIPS.forEach(([fr,en])=>TRIBE_FR[en]=fr);
const TRIBE_HINTS={
  Crab:"Les crabes mènent naturellement à la meule (Hedron Crab) et au landfall, avec de gros crabes défensifs en bleu.",
  Sphinx:"Les sphinx, c’est le bleu riche : gros volants, pioche et manipulation du dessus de bibliothèque.",
  Dwarf:"Les nains jouent rouge, souvent avec du blanc : équipements, véhicules et trésors.",
  Villain:"« Villain » est un vrai type de créature depuis les extensions Marvel, surtout en noir et en bleu.",
  Dragon:"Les dragons demandent de la rampe : gros volants, souvent en rouge ou multicolore.",
  Elf:"Les elfes jouent vert : mana très rapide et armées qui grandissent.",
  Zombie:"Les zombies jouent noir et bleu : cimetière, sacrifice et retours incessants.",
  Vampire:"Les vampires jouent noir, blanc et rouge : drain de vie et agressivité.",
  Goblin:"Les gobelins jouent rouge : hordes énormes et sacrifices explosifs.",
  Angel:"Les anges jouent blanc : gros volants et gain de vie.",
  Werewolf:"Les loups-garous jouent rouge-vert, avec le cycle jour/nuit.",
  Wolf:"Les loups jouent vert (et rouge) : meute et combats.",
  Cat:"Les chats jouent blanc-vert : équipements et combat.",
  Dog:"Les chiens jouent rouge-blanc-vert, souvent aux côtés des chats.",
  Frog:"Les grenouilles jouent bleu-vert : renvoyer tes permanents en main pour les rejouer, ou meuler.",
  Merfolk:"Les ondins jouent bleu-vert : exploration, compteurs et créatures difficiles à bloquer.",
  Pirate:"Les pirates jouent bleu-noir-rouge : trésors et vol.",
  Ninja:"Les ninjas jouent bleu-noir : créatures non bloquées et ninjutsu.",
  Sliver:"Les slivoïdes jouent cinq couleurs : chacun renforce tous les autres.",
  Faerie:"Les faes jouent bleu-noir : flash, volants et interaction.",
  Hydra:"Les hydres jouent vert : sorts à X et marqueurs +1/+1.",
  Dinosaur:"Les dinosaures jouent rouge-vert-blanc : créatures énormes et enrage.",
  Spirit:"Les esprits jouent blanc-bleu : volants et flash.",
  Rat:"Les rats jouent noir : nuées et défausse.",
  Squirrel:"Les écureuils jouent noir-vert : jetons, nourriture et sacrifice.",
  Knight:"Les chevaliers jouent blanc-noir-rouge : équipements et combat.",
  Wizard:"Les sorciers jouent bleu-rouge : éphémères et rituels.",
  Demon:"Les démons jouent noir : une grande puissance, toujours contre un prix.",
  Eldrazi:"Les Eldrazi sont incolores : rampe massive et annihilation.",
  Horror:"Les horreurs jouent bleu-noir : meule et peur.",
  Soldier:"Les soldats jouent blanc : jetons et armée disciplinée.",
  Warrior:"Les guerriers jouent le combat et les attaques multiples.",
  Otter:"Les loutres jouent bleu-rouge : sorts non-créature.",
  Rabbit:"Les lapins jouent blanc : jetons et terrains.",
  Bat:"Les chauves-souris jouent noir-blanc : gain et perte de vie."
};
const ANTIDOTES={
  theft:"Homeward Path (terrain) ou Brooding Saurian rendent leurs créatures aux propriétaires ; Lightning Greaves rend ta créature impossible à cibler.",
  tergrid:"Swords to Plowshares : exiler la source reste la réponse la plus propre.",
  stax:"Reclamation Sage, Nature’s Claim ou Return to Dust pour détruire les pièces de taxe.",
  hardlock:"Return to Dust, Austere Command ou Cleansing Nova contre les verrous en artefacts et enchantements.",
  mld:"Crucible of Worlds ou Ramunap Excavator te laissent rejouer tes terrains depuis le cimetière.",
  turns:"Stranglehold fait sauter les tours supplémentaires adverses (et bloque leurs recherches).",
  fastcombo:"Swan Song ou An Offer You Can’t Refuse pour contrer la pièce clé ; Rest in Peace contre les combos de cimetière.",
  mill:"Gaea’s Blessing, Elixir of Immortality ou Kozilek, Butcher of Truth remélangent ton cimetière.",
  discard:"Library of Leng ou Bag of Holding pour ne plus perdre tes cartes défaussées.",
  counterspells:"Defense Grid, Vexing Shusher ou Allosaurus Shepherd rendent tes sorts difficiles à contrer.",
  wipes:"Heroic Intervention, Boros Charm ou Flawless Maneuver protègent ton plateau.",
  pillow:"Tranquility, Austere Command ou Cleansing Nova balaient les enchantements de protection.",
  infect:"Melira, Sylvok Outcast t’immunise contre les marqueurs poison.",
  voltron:"Swords to Plowshares, Ghostly Prison et Propaganda.",
  endless:"Tainted Remedy, Erebos, God of the Dead ou Sulfuric Vortex empêchent les gains de vie adverses.",
  tutors:"Aven Mindcensor, Stranglehold ou Ashiok, Dream Render perturbent les recherches adverses.",
  gyhate:"Diversifie : un plan qui ne dépend pas seulement du cimetière.",
  slug:"Un peu de gain de vie constant (Soul Warden) et du removal sur le moteur.",
  solitaire:"Proposer un minuteur par tour au Rule 0 marche mieux qu’une carte.",
  powergap:"Annoncer son bracket avant la partie, c’est fait pour ça.",
  chaos:"Le chaos frappe tout le monde : garde de l’interaction instantanée pour réagir.",
  goad:"Des bloqueurs nombreux et de la protection pour tes créatures clés.",
  target:"Un peu de pillowfort léger (Ghostly Prison) et une partie politique assumée."
};

const FACE=[
  {k:"stax",l:"Stax & taxes",d:"Winter Orb, Rhystic Study, Smothering Tithe : chaque sort coûte plus cher ou profite à quelqu’un d’autre.",a:"stax"},
  {k:"mld",l:"Destruction massive de terrains",d:"Armageddon, Ravages of War : retour à zéro pour tout le monde."},
  {k:"turns",l:"Tours supplémentaires en chaîne",d:"Regarder quelqu’un jouer trois tours d’affilée."},
  {k:"fastcombo",l:"Combo infini rapide",d:"Une partie terminée au tour 4 ou 5 sur deux cartes.",a:"combo"},
  {k:"theft",l:"Vol de créatures ou de commandant",d:"Ton propre commandant qui revient t’attaquer.",a:"theft"},
  {k:"mill",l:"Meule",d:"Ta bibliothèque vidée dans ton cimetière.",a:"mill"},
  {k:"discard",l:"Défausse et wheels",d:"Ta main jetée ou remplacée tous les tours."},
  {k:"chaos",l:"Chaos aléatoire",d:"Pile ou face, échanges de permanents, effets imprévisibles.",a:"chaos"},
  {k:"solitaire",l:"Tours de solitaire",d:"Un joueur résout quarante déclencheurs pendant que la table attend."},
  {k:"slug",l:"Group slug",d:"Tout le monde perd de la vie à chaque action.",a:"slug"},
  {k:"counterspells",l:"Contresorts systématiques",d:"Chaque sort important se fait contrer.",a:"control"},
  {k:"wipes",l:"Wipes à répétition",d:"Le plateau rasé tous les deux tours."},
  {k:"pillow",l:"Pillowfort",d:"Un joueur intouchable qui ne fait presque rien… jusqu’à gagner.",a:"pillow"},
  {k:"hardlock",l:"Verrous durs",d:"Stasis, Humility, Drannith Magistrate : impossible de jouer ton deck.",a:"stax"},
  {k:"infect",l:"Poison / infect",d:"Dix marqueurs poison au lieu de quarante points de vie."},
  {k:"voltron",l:"Voltron qui one-shot",d:"Un commandant équipé qui te tue en deux attaques.",a:"voltron"},
  {k:"endless",l:"Partie sans fin",d:"Gain de vie massif, brouillards, prison : rien ne bouge pendant trois heures.",a:"life"},
  {k:"tutors",l:"Tutors partout",d:"Le même deck fait exactement la même chose à chaque partie."},
  {k:"gyhate",l:"Hate de cimetière",d:"Ton cimetière exilé en permanence."},
  {k:"powergap",l:"Écart de puissance",d:"Un deck cEDH ou bourré de Game Changers sur une table détendue."},
  {k:"goad",l:"Goad",d:"Tes créatures forcées d’attaquer quelqu’un d’autre que la cible de ton choix.",a:"goad"},
  {k:"target",l:"Être la cible désignée",d:"Toute la table qui ne frappe que toi."},
  {k:"tergrid",l:"Punition de tes sacrifices",d:"Tergrid et compagnie : tout ce que tu perds, l’adversaire le récupère.",a:"theft"}
];
const FACEMAP={}; FACE.forEach(f=>FACEMAP[f.k]=f);

const COLORS=[
  {k:"W",l:"Blanc",d:"Ordre, protection, armées, règles qui s’appliquent à tous."},
  {k:"U",l:"Bleu",d:"Pioche, contresorts, manipulation, tout savoir avant d’agir."},
  {k:"B",l:"Noir",d:"Sacrifice, cimetière, pouvoir à n’importe quel prix."},
  {k:"R",l:"Rouge",d:"Vitesse, dégâts, chaos, passion."},
  {k:"G",l:"Vert",d:"Rampe, grosses créatures, nature qui grandit."},
  {k:"C",l:"Incolore",d:"Artefacts purs, Eldrazi, ce qui ne dépend d’aucune couleur."}
];
const CNAME={W:"blanc",U:"bleu",B:"noir",R:"rouge",G:"vert",C:"incolore"};
const WANT_LV=[{v:3,l:"Coup de cœur"},{v:2,l:"Pourquoi pas"},{v:1,l:"Bof"},{v:0,l:"Jamais"}];
const FACE_LV=[{v:3,l:"J’adore affronter"},{v:2,l:"Ça va"},{v:1,l:"Ça m’agace"},{v:0,l:"Je quitte la table"}];
const COLOR_LV=[{v:3,l:"J’adore"},{v:2,l:"Bien"},{v:1,l:"Bof"},{v:0,l:"Jamais"}];
const PSY={
  timmy:{l:"Timmy / Tammy",d:"tu joues pour l’expérience : grands moments, gros sorts, attaques mémorables."},
  johnny:{l:"Johnny / Jenny",d:"tu joues pour t’exprimer : faire marcher une idée qui n’appartient qu’à toi."},
  spike:{l:"Spike",d:"tu joues pour prouver : bien jouer, optimiser, gagner proprement."},
  vorthos:{l:"Vorthos",d:"tu trouves la beauté dans l’univers : histoire, illustrations, cohérence du thème."},
  mel:{l:"Mel",d:"tu trouves la beauté dans la mécanique : une carte bien conçue, un moteur élégant."}
};
const BRK={1:"Bracket 1 (Exhibition)",2:"Bracket 2 (Core)",3:"Bracket 3 (Upgraded)",4:"Bracket 4 (Optimized)",5:"Bracket 5 (cEDH)"};
const NAMES={"W":"Mono-blanc","U":"Mono-bleu","B":"Mono-noir","R":"Mono-rouge","G":"Mono-vert","":"Incolore",
 "WU":"Azorius","UB":"Dimir","BR":"Rakdos","RG":"Gruul","WG":"Selesnya","WB":"Orzhov","UR":"Izzet","BG":"Golgari","WR":"Boros","UG":"Simic",
 "WUB":"Esper","UBR":"Grixis","BRG":"Jund","WRG":"Naya","WUG":"Bant","WBG":"Abzan","WUR":"Jeskai","UBG":"Sultai","WBR":"Mardu","URG":"Temur",
 "UBRG":"Quatre couleurs sans blanc","WBRG":"Quatre couleurs sans bleu","WURG":"Quatre couleurs sans noir","WUBG":"Quatre couleurs sans rouge","WUBR":"Quatre couleurs sans vert","WUBRG":"Cinq couleurs"};

/* ===================== QUESTIONS =====================
 mode: "b" les deux parcours (défaut), "c" confirmé seulement, "d" découverte seulement
 single/multi : options avec id stables ; "ordered" = ne pas mélanger
*/
const O=(id,l,fx,extra)=>Object.assign({id,l,fx},extra||{});
const SECTIONS=[
{id:"toi",title:"Qui tu es",intro:"Pas de bonne réponse : suis ton instinct. Si une question ne te parle pas, choisis « Je ne sais pas », c’est une réponse utile aussi.",qs:[
 {id:"fantasy",type:"multi",max:2,chips:false,other:true,q:"Qui as-tu envie d’incarner à la table ?",help:"Deux choix maximum. Pense à un personnage, pas à une mécanique.",
  opts:Object.entries(FANTASIES).map(([k,f])=>O(k,`<b>${f.l}</b><br><span class="muted small">${f.d}</span>`,f.fx,{fant:k,kind:f.kind}))},
 {id:"colorlove",type:"single",ordered:true,q:"Ta couleur coup de cœur, sans réfléchir",help:"Pas besoin d’être rationnel : ce qui t’attire compte autant que ce qui est efficace.",
  opts:[O("W","Blanc",{"c.W":3}),O("U","Bleu",{"c.U":3}),O("B","Noir",{"c.B":3}),O("R","Rouge",{"c.R":3}),O("G","Vert",{"c.G":3}),O("C","Aucune : l’incolore, les artefacts",{"c.C":3})]},
 {id:"moment",type:"single",q:"Ta meilleure partie de Commander, c’est celle où…",opts:[
  O("t","J’ai posé un truc énorme et toute la table a réagi",{"p.timmy":2}),
  O("j","Ma combinaison improbable a enfin fonctionné",{"p.johnny":2}),
  O("s","J’ai gagné en jouant chaque tour parfaitement",{"p.spike":2})]},
 {id:"beauty",type:"single",q:"Ce qui rend une carte belle à tes yeux",opts:[
  O("v","Son illustration et l’histoire qu’elle raconte",{"p.vorthos":2}),
  O("m","Sa mécanique, élégante et bien pensée",{"p.mel":2}),
  O("vm","Les deux à la fois",{"p.vorthos":1,"p.mel":1}),
  O("n","Je ne regarde pas vraiment ça",{})]},
 {id:"booster",type:"single",mode:"c",q:"Quand tu découvres une nouvelle extension, ton œil va d’abord vers…",opts:[
  O("t","Les créatures géantes et les effets spectaculaires",{"p.timmy":2}),
  O("j","Les textes bizarres dont personne ne voit encore l’utilité",{"p.johnny":2}),
  O("s","Les cartes qui vont changer le format",{"p.spike":2})]},
 {id:"defaite",type:"single",mode:"c",q:"Perdre une partie, pour toi, c’est…",opts:[
  O("t","Pas grave si c’était spectaculaire",{"p.timmy":2}),
  O("j","Pas grave si ma mécanique a tourné au moins une fois",{"p.johnny":2}),
  O("s","Frustrant : je veux comprendre ce que j’aurais dû faire",{"p.spike":2})]},
 {id:"depart",type:"single",mode:"c",q:"Quand tu commences un nouveau deck, tu pars de…",opts:[
  O("t","Une carte qui me fait vibrer",{"p.timmy":2}),
  O("j","Une interaction que je viens de découvrir",{"p.johnny":2}),
  O("s","Une liste efficace que j’affine",{"p.spike":2}),
  O("v","Un thème, un univers, une histoire",{"p.vorthos":2})]},
 {id:"theme",type:"scale",mode:"c",q:"Thème ou efficacité ?",left:"100 % thème, même si c’est moins fort",right:"100 % efficacité, le thème viendra après",fx:{"p.vorthos":-1},set:"themeEff"},
 {id:"fidele",type:"single",mode:"c",q:"Un deck que tu joues depuis longtemps, tu…",opts:[
  O("s","L’améliores sans arrêt pour qu’il soit plus fort",{"p.spike":2}),
  O("v","Le gardes tel quel : il raconte quelque chose",{"p.vorthos":2}),
  O("j","Le démontes pour essayer une nouvelle idée",{"p.johnny":2}),
  O("t","En construis un plus spectaculaire",{"p.timmy":2})]}
]},
{id:"gagner",title:"Comment tu veux gagner",intro:"La façon dont une partie se termine compte autant que le fait de gagner.",qs:[
 {id:"vibe",type:"multi",max:3,mode:"d",q:"Ce qui te ferait vraiment plaisir pendant une partie",help:"Trois choix maximum.",opts:[
  O("army","Avoir une énorme armée",{"a.aggro":1.5,"a.tokens":1.5}),
  O("giant","Un monstre gigantesque",{"a.big":2,"a.voltron":1}),
  O("dead","Faire revenir les morts",{"a.gy":2,"a.aristo":.6}),
  O("spells","Lancer plein de sorts",{"a.spells":2}),
  O("steal","Voler les cartes des autres",{"a.theft":2}),
  O("lock","Empêcher les autres de faire ce qu’ils veulent",{"a.stax":1.5,"a.control":1}),
  O("combo","Une combinaison qui gagne d’un coup",{"a.combo":2}),
  O("crazy","Une partie complètement folle",{"a.chaos":2}),
  O("allies","Me faire des alliés, manipuler",{"a.hug":2,"a.goad":.6}),
  O("hurt","Faire un peu mal à tout le monde",{"a.slug":2}),
  O("grow","Des créatures qui grandissent sans arrêt",{"a.counters":2}),
  O("lands","Poser plein de terrains et en profiter",{"a.lands":2})]},
 {id:"wincon",type:"multi",max:3,mode:"c",q:"Tes façons de gagner préférées",help:"Trois choix maximum.",opts:[
  O("army","Une armée qui attaque",{"a.aggro":2,"a.tokens":1}),
  O("voltron","Un seul monstre, aux dégâts de commandant",{"a.voltron":2.5}),
  O("drain","Drainer la vie de toute la table",{"a.aristo":2,"a.life":.5}),
  O("combo","Une combinaison infinie",{"a.combo":2.5}),
  O("alt","Une condition de victoire alternative",{"a.combo":1,"a.control":1}),
  O("mill","Vider leurs bibliothèques",{"a.mill":2.5}),
  O("burn","Brûler la table à coups de dégâts directs",{"a.slug":1.5,"a.punish":1}),
  O("goad","Laisser les autres s’entretuer",{"a.goad":2,"a.hug":.6}),
  O("survive","Survivre derrière mes défenses jusqu’à ce que tout le monde craque",{"a.pillow":2,"a.life":.6}),
  O("big","Une créature gigantesque qui écrase tout",{"a.big":2.5}),
  O("lands","Un plateau de terrains qui produit tout seul",{"a.lands":2}),
  O("walkers","Mes planeswalkers qui montent en puissance",{"a.walkers":2.5})]},
 {id:"tempo",type:"single",ordered:true,q:"Idéalement, la partie se termine vers le…",opts:[
  O("4","Tour 4 à 6 : rapide et tranchant",{},{set:{speed:5}}),
  O("7","Tour 7 à 9 : le rythme classique",{},{set:{speed:4}}),
  O("10","Tour 10 à 12 : on a le temps de construire",{},{set:{speed:2.5}}),
  O("13","Tour 13 et plus : plus c’est long, mieux c’est",{},{set:{speed:1}})]},
 {id:"explosion",type:"scale",mode:"c",q:"Comment tu préfères conclure ?",left:"Petit à petit, en grignotant",right:"En un seul tour où tout explose",fx:{"a.combo":.5,"a.tokens":.4,"a.big":.3,"a.slug":-.3}},
 {id:"longturns",type:"scale",mode:"c",q:"Les tours où tu résous trente déclencheurs d’affilée…",left:"Non merci, je veux jouer vite",right:"C’est exactement pour ça que je joue",fx:{"a.combo":.4,"a.tokens":.4,"a.aristo":.4,"a.counters":.3},set:"longturns"},
 {id:"winrate",type:"single",ordered:true,q:"Sur quatre parties, tu es content si tu en gagnes…",opts:[
  O("1","Une : chacun son tour",{},{set:{compet:2}}),
  O("2","Deux",{},{set:{compet:3}}),
  O("3","Trois ou plus",{},{set:{compet:5}}),
  O("x","Peu importe, je joue pour l’expérience",{},{set:{compet:1}})]}
]},
{id:"table",title:"Ta place autour de la table",intro:"Le Commander se joue à plusieurs : ton rôle social compte autant que ton deck.",qs:[
 {id:"role",type:"single",q:"Ton rôle naturel à la table",opts:[
  O("threat","La menace : on me cible dès le tour 3",{"a.aggro":.8,"a.voltron":.6}),
  O("diplo","Le diplomate : je négocie, je fais des alliances",{"a.hug":1.2,"s.politics":1}),
  O("sheriff","Le shérif : je calme celui qui mène",{"a.control":1}),
  O("shadow","L’ombre : on m’oublie jusqu’au tour où je gagne",{"a.combo":.8,"a.pillow":.5}),
  O("chaos","Le chaos : personne ne sait ce que je vais faire",{"a.chaos":1.5})]},
 {id:"interaction",type:"scale",mode:"c",q:"Combien d’interaction (removal, contres) tu veux avoir en main ?",left:"Presque rien, je déroule mon plan",right:"Toujours une réponse prête",fx:{"a.control":.5},set:"interaction"},
 {id:"counter",type:"single",mode:"c",q:"Dire « non » avec un contresort, c’est…",opts:[
  O("love","Mon plaisir préféré",{"a.control":1.2,"c.U":1.5}),
  O("some","Utile de temps en temps",{"a.control":.3}),
  O("after","Pas mon style, je préfère répondre après coup",{"c.U":-.5}),
  O("hate","Je déteste ça, des deux côtés",{"a.control":-1,"c.U":-1})]},
 {id:"wipe",type:"single",mode:"c",q:"Tu as un board wipe en main, et le plus gros plateau de la table, c’est le tien. Tu…",opts:[
  O("cast","Le lances quand même si quelqu’un d’autre est sur le point de gagner",{"a.control":.4}),
  O("keep","Le gardes : mon plateau, c’est ma victoire",{"a.aggro":.4,"a.tokens":.4}),
  O("resil","N’hésites pas : mon deck est construit pour se relever",{"a.gy":.8,"a.ench":.4,"a.artifacts":.4}),
  O("never","N’aimes pas jouer de wipes du tout",{"a.control":-.8})]},
 {id:"politics",type:"scale",q:"La négociation à table (« je ne t’attaque pas si… »)",left:"Je déteste, laissez-moi jouer",right:"C’est la meilleure partie du jeu",fx:{"a.hug":.6,"a.goad":.4},set:"politics"},
 {id:"archenemy",type:"single",q:"Être la cible de toute la table, ça te…",opts:[
  O("go","Motive : qu’ils viennent",{"a.voltron":.4,"a.big":.4}),
  O("fun","Amuse, tant que je peux me défendre",{"a.control":.4,"a.pillow":.4}),
  O("stress","Stresse : je préfère rester discret",{"a.pillow":.8,"a.hug":.4}),
  O("ruin","Gâche la partie",{"a.pillow":1,"a.hug":.8})]},
 {id:"deal",type:"single",mode:"c",q:"Un adversaire te propose : « Je ne t’attaque pas pendant deux tours si tu fais pareil. »",opts:[
  O("yes","J’accepte et je tiens parole",{"a.hug":.8,"s.politics":.5}),
  O("betray","J’accepte… et je trahis au bon moment",{"a.goad":.5,"a.chaos":.4}),
  O("no","Je refuse : pas de deals",{"s.politics":-1}),
  O("counter","Je fais une contre-offre",{"a.hug":.4,"s.politics":1})]}
]},
{id:"moteurs",title:"Ton moteur de jeu",mode:"c",intro:"Le moteur, c’est ce que ton deck fait tour après tour. Note chaque idée selon l’envie de la piloter, pas selon sa puissance.",qs:[
 {id:"wantE",type:"grid",scale:"want",q:"Les moteurs qui te donnent envie",items:ENGINE.map(k=>({k,l:ARCH[k].l,d:ARCH[k].d}))}
]},
{id:"plans",title:"Tes plans et ton interaction",mode:"c",intro:"Ici, ce qui concerne la victoire et la façon dont tu touches les autres joueurs.",qs:[
 {id:"wantP",type:"grid",scale:"want",q:"Les plans de jeu qui te donnent envie",items:PLANS.map(k=>({k,l:ARCH[k].l,d:ARCH[k].d}))}
]},
{id:"dilemmes",title:"Dilemmes",intro:"Il faut trancher : chaque dilemme oblige à choisir entre deux plaisirs. C’est ce qui révèle tes vraies priorités.",qs:[
 {id:"d1",type:"pair",q:"Tu préfères…",a:O("a","Gagner une partie sur trois, de façon spectaculaire",{"p.timmy":1.5}),b:O("b","Gagner une partie sur deux, toujours de la même façon",{"p.spike":1.5})},
 {id:"d2",type:"pair",mode:"c",q:"Tu préfères…",a:O("a","Un plateau énorme que tout le monde voit",{"a.aggro":.8,"a.tokens":.8,"a.big":.4}),b:O("b","Une main pleine que personne ne voit",{"a.control":.8,"a.spells":.8})},
 {id:"d3",type:"pair",q:"Tu préfères…",a:O("a","Une seule créature énorme",{"a.voltron":1.2,"a.big":.5}),b:O("b","Cinquante petites créatures",{"a.tokens":1.2,"a.aggro":.4})},
 {id:"d5",type:"pair",mode:"c",q:"Tu préfères…",a:O("a","Gagner avec tes propres cartes",{"a.theft":-.8}),b:O("b","Retourner les cartes des autres contre eux",{"a.theft":1.4,"a.goad":.4})},
 {id:"d8",type:"pair",mode:"c",q:"Tu préfères…",a:O("a","Interagir avec tout le monde à chaque tour",{"a.hug":.8,"a.goad":.4,"a.control":.3}),b:O("b","Construire tranquillement dans ton coin",{"a.pillow":.9,"a.counters":.4,"a.lands":.4})},
 {id:"d9",type:"pair",q:"Tu préfères…",a:O("a","Une mécanique parfaitement huilée",{"p.mel":1.5}),b:O("b","Un deck qui raconte une histoire",{"p.vorthos":1.5})},
 {id:"d4",type:"pair",mode:"c",q:"Tu préfères…",a:O("a","Faire très mal à un seul joueur",{"a.aggro":.6,"a.voltron":.6}),b:O("b","Faire un peu mal à tout le monde",{"a.slug":1.2,"a.aristo":.4})},
 {id:"d6",type:"pair",mode:"c",q:"Ta ressource préférée…",a:O("a","Ton cimetière",{"a.gy":1.4}),b:O("b","Ta main",{"a.spells":.7,"a.control":.6})},
 {id:"d7",type:"pair",mode:"c",q:"Tu préfères…",a:O("a","Imposer le rythme à la table",{"a.control":.7,"a.stax":.7}),b:O("b","Laisser jouer et exploser au bon moment",{"a.combo":.7,"a.big":.7})},
 {id:"d10",type:"pair",mode:"c",q:"Tu préfères…",a:O("a","Un plan fiable",{"a.combo":.4,"a.control":.3}),b:O("b","Une surprise à chaque partie",{"a.chaos":1.2})},
 {id:"d11",type:"pair",mode:"c",q:"Ce qui travaille pour toi…",a:O("a","Des terrains",{"a.lands":1.4}),b:O("b","Des artefacts",{"a.artifacts":1.4})},
 {id:"d12",type:"pair",mode:"c",q:"Tu préfères…",a:O("a","Faire revenir tes créatures pour rejouer leurs effets",{"a.blink":1.2,"a.gy":.3}),b:O("b","Des permanents uniques et puissants : planeswalkers, enchantements",{"a.walkers":1,"a.ench":.5})}
]},
{id:"contre",title:"Ce que tu ne veux plus affronter",intro:"Pense à tes pires soirées. Ces réponses servent à préparer ta discussion d’avant-partie (le « Rule 0 ») et à te proposer des parades.",qs:[
 {id:"faceD",type:"multi",max:4,mode:"d",q:"Ce qui te gâcherait une partie",help:"Quatre choix maximum.",opts:[
  O("stax","Ne plus pouvoir jouer mes cartes (verrous, taxes)",{},{face:["stax","hardlock"]}),
  O("mld","Qu’on détruise tous mes terrains",{},{face:["mld"]}),
  O("theft","Qu’on me vole mes créatures",{},{face:["theft"]}),
  O("combo","Perdre d’un coup sur une combinaison",{},{face:["fastcombo"]}),
  O("wait","Attendre pendant qu’un joueur joue tout seul",{},{face:["solitaire","turns"]}),
  O("luck","Que tout se joue au hasard",{},{face:["chaos"]}),
  O("long","Une partie qui ne finit jamais",{},{face:["endless"]}),
  O("target","Être la cible de toute la table",{},{face:["target"]}),
  O("gap","Un adversaire beaucoup trop fort pour la table",{},{face:["powergap"]}),
  O("counter","Voir tous mes sorts contrés",{},{face:["counterspells"]})]},
 {id:"face",type:"grid",scale:"face",mode:"c",q:"Ton ressenti face à…",items:FACE.map(f=>({k:f.k,l:f.l,d:f.d}))},
 {id:"worst",type:"single",mode:"c",q:"Quand une partie tourne mal, ce qui te gêne le plus, c’est…",opts:[
  O("lock","Ne pas pouvoir jouer mes cartes du tout",{},{face:["stax","hardlock","counterspells"]}),
  O("long","Une partie qui traîne sans fin",{},{face:["endless","solitaire"]}),
  O("sudden","Perdre d’un coup sans l’avoir vu venir",{},{face:["fastcombo","voltron"]}),
  O("luck","Perdre à cause du hasard",{},{face:["chaos"]}),
  O("solo","Un joueur qui joue seul pendant que la table attend",{},{face:["solitaire","turns"]}),
  O("target","Être ciblé sans raison",{},{face:["target"]})]},
 {id:"answerback",type:"single",mode:"c",q:"Face à un deck que tu n’aimes pas, tu préfères…",opts:[
  O("punish","Avoir dans mon deck les cartes pour le punir",{"a.control":.3}),
  O("talk","En parler avant la partie",{}),
  O("build","Construire un deck exprès pour le contrer",{"a.control":.3}),
  O("leave","Changer de table",{})]}
]},
{id:"couleurs",title:"Les couleurs",intro:"Deux lectures se croisent : ce qui t’attire (même sans raison) et ce que ta façon de jouer demande. Le pentagone les superpose.",qs:[
 {id:"colors",type:"grid",scale:"color",q:"Ton affinité avec chaque couleur",items:COLORS},
 {id:"philo",type:"multi",mode:"c",max:2,q:"La philosophie qui te parle le plus",help:"Deux choix maximum.",opts:[
  O("W","L’ordre et la communauté : des règles justes pour tous",{"c.W":2}),
  O("U","Le savoir et la perfection : tout prévoir",{"c.U":2}),
  O("B","L’ambition : le pouvoir, quel qu’en soit le prix",{"c.B":2}),
  O("R","La liberté et la passion : agir maintenant",{"c.R":2}),
  O("G","La nature et la croissance : devenir ce qu’on est",{"c.G":2})]},
 {id:"ncolors",type:"single",ordered:true,q:"Combien de couleurs dans ton deck idéal ?",opts:[
  O("1","Une seule, pure",{},{set:{ncol:1}}),O("2","Deux",{},{set:{ncol:2}}),O("3","Trois",{},{set:{ncol:3}}),O("4","Quatre ou cinq",{},{set:{ncol:4}}),O("0","Peu importe",{},{set:{ncol:0}})]},
 {id:"guilds",type:"multi",max:3,mode:"c",chips:true,ordered:true,q:"Les paires de couleurs qui t’attirent",help:"Trois choix maximum.",opts:[
  O("WU","Azorius (blanc-bleu)",{"c.W":1,"c.U":1}),O("UB","Dimir (bleu-noir)",{"c.U":1,"c.B":1}),O("BR","Rakdos (noir-rouge)",{"c.B":1,"c.R":1}),
  O("RG","Gruul (rouge-vert)",{"c.R":1,"c.G":1}),O("WG","Selesnya (vert-blanc)",{"c.G":1,"c.W":1}),O("WB","Orzhov (blanc-noir)",{"c.W":1,"c.B":1}),
  O("UR","Izzet (bleu-rouge)",{"c.U":1,"c.R":1}),O("BG","Golgari (noir-vert)",{"c.B":1,"c.G":1}),O("WR","Boros (rouge-blanc)",{"c.R":1,"c.W":1}),O("UG","Simic (vert-bleu)",{"c.G":1,"c.U":1})]}
]},
{id:"commandant",title:"Ton commandant",intro:"La carte qui attend dans la zone de commandement change tout le rythme du deck.",qs:[
 {id:"cmdrole",type:"single",ordered:true,mode:"c",q:"Ton commandant doit être…",opts:[
  O("core","Le cœur du deck : sans lui, rien ne marche",{"a.voltron":.6},{set:{cmddep:3}}),
  O("imp","Important, mais le deck tient debout sans lui",{},{set:{cmddep:2}}),
  O("bonus","Presque un bonus : c’est surtout l’identité de couleur qui compte",{},{set:{cmddep:1}})]},
 {id:"cmdtype",type:"single",mode:"c",q:"Tu préfères un commandant…",opts:[
  O("crea","Créature légendaire classique",{},{set:{cmdtype:"crea"}}),
  O("odd","Atypique : planeswalker, véhicule…",{"a.walkers":.6},{set:{cmdtype:"odd"}}),
  O("duo","En duo : partenaires ou Background",{},{set:{cmdtype:"duo"}}),
  O("any","Peu importe",{},{set:{cmdtype:"any"}})]},
 {id:"popular",type:"scale",mode:"c",q:"Commandant populaire ou obscur ?",left:"Un grand classique, ça me va",right:"Je veux un commandant que personne ne joue",set:"obscure"},
 {id:"cmdcast",type:"single",ordered:true,mode:"c",q:"Dans une partie normale, ton commandant arrive…",opts:[
  O("early","Tour 2 ou 3 : il lance la machine",{"a.aggro":.4,"a.voltron":.4,"s.speed":.5}),
  O("mid","Tour 4 ou 5",{}),
  O("late","Tard, comme un boss final",{"a.big":1,"s.speed":-.5}),
  O("answer","Quand ça m’arrange : c’est une réponse plus qu’une menace",{"a.control":.8})]}
]},
{id:"rythme",title:"Rythme et complexité",intro:"Certains decks se pilotent en discutant, d’autres demandent toute ton attention.",qs:[
 {id:"complexity",type:"scale",q:"Le pilotage idéal",left:"Simple : je veux discuter en jouant",right:"Un casse-tête qui me fait réfléchir",set:"complexity"},
 {id:"tracking",type:"scale",mode:"c",q:"Jetons, compteurs, déclencheurs à suivre…",left:"Une corvée",right:"Un plaisir",fx:{"a.tokens":.5,"a.counters":.5,"a.aristo":.4}},
 {id:"variance",type:"scale",mode:"c",q:"Le hasard (pile ou face, cascade, dés, pioche du dessus)",left:"Je veux tout contrôler",right:"Plus c’est fou, mieux c’est",fx:{"a.chaos":1,"a.control":-.3,"a.stax":-.3},set:"variance"},
 {id:"consistency",type:"scale",mode:"c",q:"D’une partie à l’autre, ton deck doit…",left:"Faire la même chose à chaque fois",right:"Faire quelque chose de différent à chaque fois",fx:{"a.combo":-.3,"a.chaos":.4},set:"consist"},
 {id:"plan",type:"single",mode:"c",q:"Ton style tour par tour",opts:[
  O("plan","Je planifie trois tours à l’avance",{"a.combo":.4,"a.control":.4}),
  O("react","Je réagis à ce qui se passe",{"a.control":.6}),
  O("rush","Je fonce",{"a.aggro":.8}),
  O("impro","J’improvise selon l’ambiance",{"a.chaos":.6,"a.hug":.3})]}
]},
{id:"puissance",title:"Puissance et budget",intro:"Les brackets officiels (1 à 5) servent de langage commun pour annoncer le niveau d’un deck avant de jouer.",qs:[
 {id:"powerD",type:"single",ordered:true,mode:"d",q:"L’ambiance de partie qui te plaît",opts:[
  O("chill","Détendue : on rigole, on fait des trucs fous",{},{set:{bracket:2}}),
  O("mid","Équilibrée : on joue pour gagner, sans excès",{},{set:{bracket:3}}),
  O("hard","Compétitive : je veux de la puissance",{},{set:{bracket:4}})]},
 {id:"bracket",type:"single",ordered:true,mode:"c",q:"Le niveau de puissance qui te fait le plus envie",opts:[
  O("1","Bracket 1 (Exhibition) : le concept avant tout",{},{set:{bracket:1}}),
  O("2","Bracket 2 (Core) : niveau préconstruit, sans Game Changers",{},{set:{bracket:2}}),
  O("3","Bracket 3 (Upgraded) : deck amélioré, trois Game Changers au plus",{},{set:{bracket:3}}),
  O("4","Bracket 4 (Optimized) : fort, sans restriction",{},{set:{bracket:4}}),
  O("5","Bracket 5 (cEDH) : compétitif, tout pour gagner",{},{set:{bracket:5}})]},
 {id:"accept",type:"multi",max:5,mode:"c",none:"Rien de tout ça",q:"Dans TON deck, tu acceptes…",help:"Ces éléments comptent dans la définition officielle des brackets.",opts:[
  O("gc","Des Game Changers (Rhystic Study, Smothering Tithe…)",{}),
  O("combo2","Des combos infinis à deux cartes",{"a.combo":.6}),
  O("turns","Des sorts de tours supplémentaires en chaîne",{}),
  O("mld","De la destruction massive de terrains",{"a.stax":.4}),
  O("tutors","Beaucoup de tutors",{})]},
 {id:"budget",type:"single",ordered:true,q:"Budget pour un nouveau deck",opts:[
  O("1","Moins de 100 $",{},{set:{budget:1}}),O("2","100 à 300 $",{},{set:{budget:2}}),O("3","300 à 800 $",{},{set:{budget:3}}),O("4","Pas de limite",{},{set:{budget:4}})]},
 {id:"proxy",type:"single",mode:"c",q:"Les proxys (cartes imprimées) dans ton groupe",opts:[
  O("yes","Totalement acceptés",{},{set:{proxy:2}}),O("test","Pour tester seulement",{},{set:{proxy:1}}),O("no","Non, que des vraies cartes",{},{set:{proxy:0}})]},
 {id:"precon",type:"single",q:"Ton point de départ préféré",opts:[
  O("precon","Un deck préconstruit que j’améliore",{},{set:{start:"precon"}}),
  O("list","Une liste trouvée en ligne que je modifie",{},{set:{start:"list"}}),
  O("scratch","Tout construire de zéro",{},{set:{start:"scratch"}}),
  O("any","Peu importe",{},{set:{start:"any"}})]}
]},
{id:"univers",title:"Univers et thème",intro:"Le thème n’est pas un détail : c’est souvent lui qui te fait ressortir un deck du placard.",qs:[
 {id:"tribes",type:"tribes",max:6,q:"Les types de créatures qui te parlent",help:"Six choix maximum. Si le tien n’est pas dans la liste, cherche-le parmi les 350 types du jeu (noms anglais)."},
 {id:"planes",type:"multi",max:4,mode:"c",chips:true,other:true,q:"Les plans de Magic qui te font rêver",help:"Quatre choix maximum.",opts:[
  ["inn","Innistrad (horreur gothique)"],["rav","Ravnica (cité des guildes)"],["phy","Phyrexia (horreur biomécanique)"],["ther","Theros (mythes grecs)"],["kam","Kamigawa (esprits et néons)"],["ixa","Ixalan (dinosaures et pirates)"],["eld","Eldraine (contes de fées)"],["blb","Bloomburrow (animaux des bois)"],["tark","Tarkir (clans et dragons)"],["akh","Amonkhet (Égypte des dieux)"],["khm","Kaldheim (mythes nordiques)"],["dom","Dominaria (la grande histoire)"],["dsk","Duskmourn (maison hantée)"],["otj","Thunder Junction (western)"],["stx","Strixhaven (université de magie)"],["lrw","Lorwyn (féerie celtique)"]].map(([id,l])=>O(id,l,{"p.vorthos":.2}))},
 {id:"ub",type:"single",ordered:true,q:"Les cartes Universes Beyond (Warhammer 40K, Seigneur des Anneaux, Final Fantasy, Marvel…)",opts:[
  O("love","J’adore, surtout si ça mélange mes univers préférés",{},{set:{ub:2}}),
  O("ok","Ça me va",{},{set:{ub:1}}),
  O("pref","Je préfère les univers de Magic",{},{set:{ub:0}}),
  O("no","Pas dans mes decks",{},{set:{ub:-1}})]},
 {id:"collect",type:"single",mode:"c",q:"Le côté objet : foils, alters, jetons personnalisés, protège-cartes à thème…",opts:[
  O("vip","Très important, mon deck doit être beau",{"p.vorthos":.8}),O("plus","Un petit plus",{}),O("no","Je m’en fiche, c’est le jeu qui compte",{})]},
 {id:"flavorwin",type:"single",mode:"c",q:"Ta victoire de rêve ressemble à…",opts:[
  O("t","Un dragon de 12/12 qui finit le travail",{"p.timmy":1.5,"a.big":1}),
  O("j","Une boucle de cinq cartes que j’explique fièrement à toute la table",{"p.johnny":1.5,"p.mel":.5,"a.combo":1}),
  O("s","Un plan propre et inévitable",{"p.spike":1.5,"a.control":.6}),
  O("v","Une fin digne de l’histoire de mon commandant",{"p.vorthos":1.5})]}
]},
{id:"situations",title:"Mises en situation",intro:"Des moments de partie concrets. Réponds avec ton instinct.",qs:[
 {id:"s_t6",type:"single",mode:"c",q:"Tour 6, sept terrains en jeu. Tu…",opts:[
  O("threat","Poses ta plus grosse menace",{"a.big":.8,"a.aggro":.4}),
  O("hold","Gardes trois manas ouverts pour répondre",{"a.control":1}),
  O("engine","Poses discrètement une pièce de ton moteur",{"a.combo":.5,"a.aristo":.3,"a.ench":.3,"a.artifacts":.3}),
  O("dig","Pioches et prépares le tour suivant",{"a.control":.4,"a.spells":.4})]},
 {id:"s_winner",type:"single",mode:"c",q:"Un adversaire va gagner au prochain tour. Tu peux l’arrêter, mais ça te coûte ta propre victoire.",opts:[
  O("stop","Je l’arrête, c’est mon rôle",{"a.control":.6}),
  O("other","Je laisse quelqu’un d’autre s’en charger",{"a.pillow":.4,"a.hug":.3}),
  O("deal","Je négocie : je l’arrête si on m’aide ensuite",{"a.hug":.8,"s.politics":1}),
  O("race","Je tente de gagner avant lui",{"a.aggro":.5,"a.combo":.5})]},
 {id:"s_steal",type:"single",q:"Tu peux voler le commandant d’un adversaire jusqu’à la fin de la partie.",opts:[
  O("yes","Avec plaisir",{"a.theft":1.2}),
  O("threat","Seulement si c’est la plus grosse menace",{"a.theft":.3,"a.control":.3}),
  O("kill","Non, je préfère simplement le tuer",{"a.theft":-.4}),
  O("never","Jamais : voler, ce n’est pas fun",{"a.theft":-1.2})]},
 {id:"s_combo",type:"single",mode:"c",q:"Ton combo est prêt au tour 5, mais la table s’amuse beaucoup.",opts:[
  O("win","Je gagne : c’est le jeu",{"a.combo":.8}),
  O("wait","J’attends un tour ou deux",{"a.combo":.3,"a.hug":.3}),
  O("again","Je gagne et je propose de rejouer tout de suite",{"a.combo":.5}),
  O("none","Je ne mets pas de combo infini dans mes decks",{"a.combo":-1.2})]},
 {id:"s_screw",type:"single",mode:"c",q:"Un adversaire reste bloqué à deux terrains.",opts:[
  O("help","Je l’aide (rampe pour tous, deals)",{"a.hug":1.2}),
  O("ignore","Je l’ignore, il n’est pas une menace",{}),
  O("kill","J’en profite pour l’éliminer",{"a.aggro":.5}),
  O("talk","On en reparle avant la prochaine partie",{"a.hug":.2})]},
 {id:"s_attack",type:"single",mode:"c",q:"Quelqu’un t’attaque avec un gros monstre. Le rêve, c’est…",opts:[
  O("trap","Bloquer et le détruire avec un piège",{"a.control":.5,"a.punish":.4}),
  O("reflect","Lui renvoyer les dégâts à la figure",{"a.punish":1.5}),
  O("tank","Encaisser : j’ai trop de vie pour m’en soucier",{"a.life":1.2}),
  O("deter","Qu’il n’ose même pas : mes défenses le dissuadent",{"a.pillow":1.5})]},
 {id:"s_wiped",type:"single",mode:"c",q:"Ton plateau vient d’être rasé. Tu…",opts:[
  O("gy","Ressors tout de ton cimetière",{"a.gy":1.5}),
  O("hand","Repars avec ta main pleine",{"a.spells":.4,"a.control":.4}),
  O("cmdr","Relances ton commandant et c’est reparti",{"a.voltron":.8}),
  O("perm","T’en fiches : tes enchantements, artefacts et terrains sont toujours là",{"a.ench":.6,"a.artifacts":.6,"a.lands":.6})]},
 {id:"s_streak",type:"single",mode:"c",q:"Ton deck vient de gagner quatre parties de suite dans ton groupe.",opts:[
  O("keep","Je continue à le jouer, c’est un bon deck",{}),
  O("lower","Je le baisse un peu pour garder la table équilibrée",{"a.hug":.3}),
  O("new","J’en construis un autre pour changer",{}),
  O("ask","Je demande au groupe ce qu’il préfère",{})]}
]},
{id:"contexte",title:"Ton contexte de jeu",intro:"Dernière partie. Tes decks actuels servent à te proposer autre chose que des doublons.",qs:[
 {id:"pod",type:"multi",mode:"c",max:3,ordered:true,q:"Tu joues surtout…",help:"Trois choix maximum.",opts:[
  O("4","À quatre, entre amis",{}),O("3","À trois",{}),O("1v1","En duel (1 contre 1)",{}),O("5","À cinq ou plus",{}),O("lgs","En boutique, avec des inconnus",{}),O("online","En ligne (SpellTable ou autre)",{})]},
 {id:"duration",type:"single",mode:"c",ordered:true,q:"Durée idéale d’une partie",opts:[
  O("1","Moins de 45 minutes",{},{set:{duration:1}}),O("2","45 à 90 minutes",{},{set:{duration:2}}),O("3","1 h 30 à 2 h 30",{},{set:{duration:3}}),O("4","Le temps qu’il faut",{},{set:{duration:4}})]},
 {id:"owned",type:"multi",max:6,chips:true,ordered:true,none:"Je n’ai pas encore de deck",q:"Les styles de tes decks actuels",help:"Six choix maximum.",opts:Object.keys(ARCH).map(k=>O(k,ARCH[k].l,{},{own:k}))},
 {id:"nextdeck",type:"single",mode:"c",q:"Pour ton prochain deck, tu veux…",opts:[
  O("new","Quelque chose de différent de ce que j’ai",{},{set:{nextdeck:"new"}}),
  O("deeper","Mieux faire ce que j’aime déjà",{},{set:{nextdeck:"deeper"}}),
  O("any","Peu importe",{},{set:{nextdeck:"any"}})]},
 {id:"decks",type:"text",q:"Tes commandants actuels (noms)",ph:"Un par ligne : ils seront retirés des suggestions"},
 {id:"favcards",type:"text",mode:"c",q:"Trois cartes que tu adores",ph:"Une carte par ligne"},
 {id:"hatecard",type:"text",mode:"c",q:"La carte ou le commandant que tu détestes le plus affronter, et pourquoi",ph:"Ce qui t’a marqué"},
 {id:"meta",type:"text",mode:"c",q:"Ce que jouent tes adversaires habituels",ph:"Les decks de ton groupe"},
 {id:"dream",type:"text",mode:"c",q:"Un commandant que tu as toujours voulu essayer, ou une idée folle",ph:"Même si ça semble injouable"}
]}
];

/* ===================== AJUSTEMENTS v3 ===================== */
// Questions retirées pour alléger le parcours complet (remplacées par le coup d'œil sur les cartes et l'import de deck)
(()=>{
  const DROP=new Set(["deal","s_screw","s_streak","collect","answerback","tracking","consistency","cmdcast","explosion","plan","longturns","decks"]);
  SECTIONS.forEach(s=>{s.qs=s.qs.filter(q=>!DROP.has(q.id));});
  const toi=SECTIONS.find(s=>s.id==="toi");
  const i=toi.qs.findIndex(q=>q.id==="beauty");
  toi.qs.splice(i+1,0,{id:"mel2",type:"single",q:"Quand tu lis une nouvelle carte, tu…",opts:[
    O("m","Cherches comment elle s’emboîte avec d’autres",{"p.mel":1.5,"p.johnny":.5}),
    O("v","Regardes d’abord l’illustration et son nom",{"p.vorthos":1.5}),
    O("s","Évalues tout de suite sa puissance",{"p.spike":1}),
    O("t","Imagines le moment où tu vas la poser",{"p.timmy":1})]});
  const gi=SECTIONS.findIndex(s=>s.id==="gagner");
  SECTIONS.splice(gi+1,0,{id:"coupdoeil",title:"Coup d’œil sur les cartes",intro:"Vingt vrais commandants défilent. Réagis à l’instinct : l’illustration, le texte, l’ambiance. La sélection s’adapte à tes réactions.",qs:[{id:"swipe",type:"swipe",n:20,q:"Ton ressenti sur chaque commandant"}]});
  const ctx=SECTIONS.find(s=>s.id==="contexte");
  ctx.qs.splice(ctx.qs.findIndex(q=>q.id==="owned")+1,0,{id:"collection",type:"collection",q:"Tes decks actuels",help:"Indique tes commandants pour qu’ils ne te soient pas reproposés. Tu peux aussi coller une liste de deck complète (format Moxfield, Archidekt ou Arena) : on l’analyse pour connaître ton vrai style de jeu."});
})();
const MELMAX_NOTE="Mel est maintenant mesuré par quatre questions.";
