# Le moteur du grand quiz Commander — conception

Version de travail du 7 octobre 2026. Ce document décrit **comment le site transforme des réponses en profil, puis en commandants proposés**. Rien n'est encore codé : on valide d'abord la logique.

---

## 0. Principes

1. **Mesurer, pas deviner.** Chaque réponse est un indice sur une ou plusieurs dimensions du joueur. Le moteur additionne des indices, il n'invente rien.
2. **Chaque nombre a une raison.** Pas de poids « au feeling » cachés dans le code : tous les poids sont dans un seul fichier de réglages, commentés, et testés.
3. **Équilibré par construction.** Aucune couleur, aucun style ne peut être favorisé par la structure du quiz. Un audit automatique le vérifie à chaque modification.
4. **Honnête sur l'incertitude.** Le moteur sait quand il manque d'informations, et le dit (« ton rapport au combo est encore flou »).
5. **Explicable.** Pour chaque commandant proposé, le moteur sait exactement d'où vient sa note : on peut afficher pourquoi il te correspond et ce qui pourrait te déplaire.
6. **Recalculable.** On stocke les réponses brutes, jamais les résultats. Quand le moteur ou les données s'améliorent, tous les profils sont recalculés.
7. **Vérifié par des tests.** Des joueurs fictifs aux goûts connus doivent obtenir les bons commandants. Si une modification casse un test, on le voit tout de suite.

---

## 1. Le profil d'un joueur : ce qu'on mesure

| Bloc | Dimensions | Échelle |
|---|---|---|
| **Couleurs** | Blanc, bleu, noir, rouge, vert, incolore | 0 à 1 chacune, en trois couches : *dit*, *révélé*, *choisi* |
| **Styles de jeu** | Les 25 styles (aggro, voltron, jetons, aristocrates, compteurs, tribal, rampe, terrains, blink, gain de vie, cimetière, artefacts, enchantements, spellslinger, contrôle, stax, pillowfort, combo, group hug, group slug, goad, vol, meule, chaos, superfriends, punition) | −1 (rejet) à +1 (coup de cœur) |
| **Motivation** | Timmy, Johnny, Spike | Pourcentages qui totalisent 100 |
| **Esthétique** | Vorthos, Mel | 0 à 1 chacune, indépendantes |
| **Réglages** | Puissance (bracket), budget, complexité, vitesse, interaction, politique, hasard, popularité (classique ou obscur), nombre de couleurs, type de commandant, Universes Beyond, point de départ | Échelles propres à chacun |
| **Thème** | Personnages incarnés, types de créatures, plans de Magic | Liste pondérée |
| **Aversions** | Ce que le joueur ne veut plus affronter | 0 (je quitte la table) à 3 (j'adore affronter) |
| **Exclusions** | Couleurs « Jamais », commandants déjà possédés, commandants rejetés | Indicateurs |

Chaque dimension porte aussi une **fiabilité** entre 0 et 1 (voir §3.4).

---

## 2. Comment une question est décrite

Chaque question est une donnée, pas du code :

```js
{ id: "probleme", mode: "commun",        // "commun" = découverte + confirmé, "confirme" = confirmé seulement
  type: "choix",                          // choix | multi | echelle | dilemme | grille | cartes | texte
  fiabilite: 1.0,                         // 1 = question directe et claire, 0.6 = question indirecte ou ambiguë
  options: [
    { id: "W", texte: "Imposes une règle qui vaut pour tout le monde", effets: { "c.W": 1, "a.stax": .3 } },
    { id: "U", texte: "L'avais vu venir…", effets: { "c.U": 1, "a.control": .4 } },
    … ] }
```

- Les **effets** indiquent vers où pousse chaque option, sur une échelle relative (−1 à +1). Leur somme n'a pas d'importance : le moteur normalise (§3).
- Une option peut avoir des effets négatifs (« Jamais : voler, ce n'est pas fun » donne −1 sur *vol*).
- Le **mode** permet d'avoir un tronc commun (découverte) et des questions en plus (confirmé).

---

## 3. Le calcul du profil

### 3.1 L'idée centrale : la position relative dans chaque question

Pour une question *q* et une dimension *d* :

- on regarde l'effet le plus bas et le plus haut parmi les options : `min_qd` et `max_qd` ;
- si `max_qd = min_qd`, la question ne dit rien sur *d* : on l'ignore pour *d* ;
- sinon, la réponse donne une **position** `p_qd = (effet choisi − min_qd) / (max_qd − min_qd)`, entre 0 et 1 ;
- et un **poids** `w_qd = fiabilité_q × (max_qd − min_qd)` : plus une question sépare fortement ses options sur *d*, plus elle compte pour *d*.

Le score de la dimension est la moyenne pondérée des positions, **tirée vers le neutre** quand on a peu d'informations :

```
score_d = ( Σ w_qd · p_qd  +  k · 0,5 ) / ( Σ w_qd  +  k )        puis ramené entre −1 et +1 : 2·score − 1
```

`k` est la « force du neutre » (réglage, environ 1,5). Avec une seule réponse, le score bouge un peu. Avec dix réponses concordantes, il va franchement au bout.

**Pourquoi c'est mieux qu'aujourd'hui :**
- **plus de question qui pèse trop par accident** : chaque question pèse selon ce qu'elle sépare vraiment, plus selon la taille de ses chiffres ;
- **« Je ne sais pas » ne pénalise rien** : la question sort simplement du calcul ;
- **les deux modes sont équilibrés automatiquement** : seules les questions visibles comptent, au numérateur comme au dénominateur ;
- **le score veut dire quelque chose** : +0,8 en contrôle signifie « presque toutes tes réponses penchaient vers le contrôle », quel que soit le nombre de questions.

### 3.2 Les types de questions

| Type | Comment la position est calculée |
|---|---|
| **Choix unique** | Comme au §3.1 |
| **Choix multiple** (3 au plus) | Chaque option est une petite question oui/non. Option choisie : position 1. Option non choisie : position 0, mais avec un poids réduit (× 0,25), parce que ne pas cocher n'est pas rejeter. |
| **Échelle 1 à 5** | Position = (valeur − 1) / 4, dans le sens des effets |
| **Dilemme** | Choix unique à deux options |
| **Grille « ce qui te donne envie »** | Mesure directe d'un style : coup de cœur 1, pourquoi pas 0,65, bof 0,3, jamais 0. Poids élevé (question directe). On corrige la tendance à tout noter haut : on retire 40 % de la moyenne personnelle de la grille. |
| **Coup d'œil sur les cartes** | Voir §3.3 |
| **Texte avec recherche** (cartes préférées, carte détestée, commandant de rêve) | La carte est retrouvée chez Scryfall. Ses couleurs et ses styles deviennent des indices, comme une réaction « j'adore » (ou « pas pour moi » pour la carte détestée). |
| **Decks importés** | La part réelle de chaque style et de chaque couleur dans le deck devient un indice « choisi », avec un poids fort |

### 3.3 Le coup d'œil sur les cartes

Chaque réaction (j'adore = 1, bof = 0,5, pas pour moi = 0) devient un indice sur **toutes les caractéristiques de la carte** : ses couleurs, ses styles (pondérés par leur force dans la carte), ses types de créatures, sa complexité, sa puissance, sa popularité.

**Quelles cartes montrer ?** La carte suivante est celle qui **apprend le plus** au moteur. Concrètement, c'est une carte dont les caractéristiques touchent les dimensions dont la fiabilité est la plus basse, et dont la note prédite est proche du milieu : quand le moteur est déjà sûr de ta réaction, montrer la carte n'apprend rien. On ajoute une part de hasard (environ 20 %) pour garder de la variété, et on ne montre que des commandants assez connus pour être reconnus.

### 3.4 La fiabilité de chaque dimension

```
fiabilité_d = Σ w_qd / ( Σ w_qd + k )
```

C'est entre 0 (aucune information) et 1. Le moteur mesure aussi la **cohérence** : si les réponses sur une dimension se contredisent (positions très dispersées), la fiabilité baisse.

À l'affichage : « Tes couleurs sont sûres (92 %). Ton rapport au combo est encore flou (41 %) ». Le site peut proposer **deux ou trois questions de départage**, uniquement sur les dimensions floues.

### 3.5 Les couleurs : trois couches

**Ce que tu dis (30 %)**
- La grille d'affinité (70 % de la couche) : jamais 0, bof 0,25, bien 0,6, j'adore 0,85, coup de cœur ★ 1.
- Les paires de couleurs (30 % de la couche) : chaque paire choisie donne la moitié de ses points à chacune de ses deux couleurs.

**Ce que tes goûts révèlent (40 %)** — des questions qui ne nomment jamais les couleurs :
- *questions directes sur la philosophie* : « Face à un problème », la philosophie, le personnage incarné ;
- *types de créatures* : chaque type choisi donne des points selon la **vraie répartition des couleurs** des commandants de ce type dans la base (les elfes donnent surtout du vert). C'est calculé automatiquement ;
- *plans de Magic* : un petit indice ;
- *styles de jeu* : chaque style a une couleur naturelle (le contrôle est surtout bleu, puis blanc et noir). Les styles que tu aimes donnent des points à leurs couleurs. C'est **normalisé par couleur**, pour que le blanc (lié à 15 styles) ne soit pas avantagé sur l'incolore (lié à 2 styles).

**Ce que tu choisis vraiment (30 %)**
- Coup d'œil : la proportion de cartes aimées parmi celles qui contiennent cette couleur, tirée vers le neutre si on a vu peu de cartes de cette couleur.
- Cartes préférées et decks importés.

Si une couche manque, son poids est réparti sur les autres. Chaque couche est aussi pondérée par sa fiabilité :

```
couleur_c = Σ_couche  poids_couche × fiabilité_couche × valeur_couche,c   /   Σ_couche  poids_couche × fiabilité_couche
```

**L'audit garantit que les six couleurs ont le même maximum atteignable dans chaque couche et dans chaque mode.**

**« Jamais »** n'enlève pas la couleur du calcul : il pose un drapeau qui sert dans la recommandation (§5.4).

### 3.6 Motivation et esthétique

- **Timmy, Johnny, Spike** : chaque dimension est calculée comme au §3.1, puis les trois sont ramenées à 100 % pour l'affichage.
- **Vorthos et Mel** sont indépendants : on peut être les deux, ou aucun.
- Ces dimensions **comptent dans la recommandation** (§5.2), elles ne servent plus seulement à l'affichage.

---

## 4. Les commandants : ce que le moteur sait d'eux

Construit chaque lundi par le script de données, à partir de plusieurs sources croisées.

> **Mise à jour du 7 octobre 2026 : EDHREC est écarté.** Ses conditions d'utilisation interdisent les requêtes automatisées. Les sources réellement utilisées sont Scryfall (étiquettes de fonction du Tagger, en particulier les étiquettes « synergy-* », popularité, noms français), Commander Spellbook (113 858 combos, avec leur niveau de puissance et leur popularité réelle) et MTGJSON (decks préconstruits). S'y ajoute une référence manuelle des commandants cEDH (`data/power_ref.json`). Partout où le tableau ci-dessous cite EDHREC, lire : étiquettes Scryfall et Commander Spellbook.
>
> Précision mesurée sans les corrections manuelles, sur les 136 commandants vérifiés à la main : style principal trouvé dans 64 % des cas (44 % avant le réglage), au moins un style juste dans 91 % des cas. Puissance automatique moyenne : 3,1 pour les commandants cEDH connus, 2,3 pour les préconstruits, 1,5 pour les commandants faibles connus. Le détail se trouve dans `data/report.json`.

| Caractéristique | Sources | Notes |
|---|---|---|
| Identité de couleur | Scryfall | Exacte |
| **Styles** (25 valeurs de 0 à 1) | EDHREC (thèmes réellement joués, en nombre de decks), étiquettes de fonction Scryfall, règles sur le texte, corrections à la main | Fusion pondérée par la fiabilité de chaque source. EDHREC passe en premier quand il a assez de decks. |
| Fiabilité des données | Nombre de decks EDHREC, accord entre les sources | Un commandant mal connu est légèrement pénalisé, pour ne pas recommander au hasard |
| Types de créatures, personnages | Scryfall, plus les thèmes tribaux d'EDHREC | |
| **Puissance** (1 à 5, aligné sur les brackets) | Game Changer, combos connus (Commander Spellbook, avec leur bracket), place dans les listes cEDH, classement EDHREC | |
| **Complexité** (1 à 5) | Longueur et structure du texte (déclencheurs, choix, capacités activées), corrections à la main | |
| Vitesse, interaction, politique, hasard | Déduits des styles et de mots-clés | |
| **Popularité** | Nombre de decks EDHREC (en percentile) | Sert au réglage « classique ou obscur » |
| **Frustration à affronter** | Score de « sel » d'EDHREC, et les styles pénibles (stax, vol, combo rapide…) | Sert aux avertissements et au lien avec les aversions |
| Prix, Universes Beyond, préconstruit, partenaires et Backgrounds, nom français | Scryfall | |

---

## 5. La recommandation

### 5.1 Quatre notes partielles, toutes entre 0 et 1

**Comment on les combine : une moyenne géométrique pondérée, pas une somme.**

```
note = style^0,40 × couleur^0,30 × thème^0,15 × psychologie^0,15        (chaque note partielle a un plancher de 0,05)
```

Pourquoi une moyenne géométrique ? Une somme permet de **compenser** : un commandant parfait en style mais dans des couleurs que tu n'aimes pas finirait quand même haut. Avec un produit, une note partielle très basse fait chuter l'ensemble. C'est le comportement d'un vrai joueur, qui ne jouera pas un deck dans des couleurs qu'il déteste, même s'il en adore la mécanique.

Pourquoi ces poids ?
- **Style 40 %** : la façon dont un deck se joue tour après tour est ce qui prédit le mieux le plaisir à long terme.
- **Couleur 30 %** : la couleur est importante, mais le produit lui donne déjà un rôle de **porte d'entrée**. Elle n'a donc pas besoin d'un poids nominal plus élevé.
- **Thème 15 %** : il monte jusqu'à 25 % pour un profil Vorthos et pour les débutants, qui choisissent d'abord sur l'ambiance, et descend à 10 % pour un profil très Spike.
- **Psychologie 15 %** : Timmy, Johnny et Spike sont la mesure la plus solide de la psychologie du joueur. Le test v3 montre que les ignorer donne des recommandations à côté (§8).

**Ajustement par la fiabilité** : chaque poids est multiplié par la fiabilité de la dimension correspondante, puis les poids sont renormalisés. Si tes couleurs sont sûres et ton style encore flou, la couleur compte davantage pour toi.

**Ces poids sont des valeurs de départ.** On les ajuste ensuite automatiquement : on garde la combinaison qui satisfait le plus d'attentes des joueurs tests (§7.2).

**Style** : à quel point les styles du commandant correspondent à tes goûts.
```
style = Σ_k s_k · u_k / Σ_k s_k        avec u_k = (score du style k + 1) / 2
```
Un style que tu as marqué « Jamais » et qui est fort chez le commandant (s_k > 0,5) applique une forte pénalité, au lieu de simplement baisser la moyenne.

**Couleur** : la moyenne de tes valeurs sur les couleurs du commandant, moins une pénalité si l'une d'elles est nettement sous ta moyenne. On ajoute l'accord avec ton nombre de couleurs préféré. Pour un commandant incolore, c'est ton axe incolore.

**Thème** : personnage incarné, types de créatures, plans, Universes Beyond.

**Psychologie** :
- Timmy : commandants spectaculaires (gros sorts, grosses créatures, effets visibles) ;
- Johnny : combos, commandants peu joués, complexité haute ;
- Spike : puissance cohérente avec ton bracket, commandants efficaces ;
- Mel : mécanique élégante, complexité moyenne à haute.

### 5.2 Les multiplicateurs de contexte

La note de base est multipliée par des facteurs entre 0 et 1, chacun visible dans l'explication :

| Facteur | Effet |
|---|---|
| **Bracket** | Courbe en cloche autour de ton bracket : un commandant de puissance 5 pour un joueur bracket 2 tombe nettement. C'est une forte pénalité, pas un retrait : un commandant puissant peut se jouer en version allégée, et l'explication le précise. |
| **Budget** | Selon le prix du commandant et des cartes clés, et l'acceptation des proxys |
| **Complexité** | Écart avec la complexité voulue |
| **Popularité** | Selon « classique ou obscur » |
| **Type de commandant** | Créature, atypique, duo |
| **Prochain deck** | « Quelque chose de différent » pénalise les commandants proches de tes decks actuels ; « mieux faire ce que j'aime » les favorise |
| **Débutant** | En mode découverte, les commandants simples et vendus en préconstruit sont favorisés |
| **Fiabilité des données** | Légère pénalité pour les commandants mal connus |

### 5.3 Les exclusions

- Commandants que tu possèdes : retirés.
- Commandants rejetés au coup d'œil ou en duel : retirés.
- **Couleur « Jamais »** : note × 0,6, jamais dans « le choix sûr », possible dans « hors de ta zone » avec l'avertissement « contient du vert, que tu as écarté ».

### 5.4 Trois familles de propositions

1. **Le choix sûr** : les meilleures notes globales, toutes leurs couleurs dans ton haut d'hexagone, aucune pénalité forte, données fiables.
2. **La surprise cohérente** : forte note de style et de thème, mais **différente de l'évidence** (peu populaire, ou un style secondaire, ou une couleur voisine).
3. **Hors de ta zone** : tes motivations et ton thème correspondent, mais le style principal ou les couleurs changent. C'est pour découvrir.

Dans chaque famille, on évite les doublons : un commandant trop proche d'un autre déjà choisi (mêmes couleurs, même style principal) laisse sa place au suivant.

### 5.5 Les explications

Comme la note est une somme de contributions connues, le moteur peut dire :
- **pourquoi** : les deux plus grosses contributions positives (« colle à ton goût pour le cimetière », « incarne le nécromancien ») ;
- **ce qui pourrait te déplaire** : la plus grosse contribution négative (« plus complexe que ce que tu cherches », « souvent mal vu à table », « environ 40 € pour le commandant seul ») ;
- **l'effet sur le bracket** : combos connus du commandant.

### 5.6 Les duels

Après les résultats, quelques duels entre tes meilleurs candidats affinent l'ordre final (classement de type Elo). Ils n'influencent que l'ordre des candidats déjà retenus, pas ton profil.

---

## 6. Le groupe

- **Compatibilité entre deux joueurs** : 40 % couleurs (1 − écart moyen), 40 % styles (similarité des goûts recentrés), 20 % motivation. Les points communs et les oppositions viennent des mêmes calculs.
- **Hexagone du groupe** : moyenne des profils publiés, chacun pondéré par sa fiabilité.
- **Devine ton ami** : les réponses brutes de l'ami servent de corrigé.

---

## 7. Comment on s'assure que c'est précis

### 7.1 L'audit de structure (à chaque modification du quiz)

Pour **chaque mode** (découverte et confirmé), il vérifie :
- même maximum atteignable pour les six couleurs, dans chaque couche ;
- au moins trois questions informatives pour chacun des 25 styles ;
- aucune question qui pèse plus de 2,5 fois la médiane ;
- aucune question qui ne mesure rien ;
- aucune question indirecte qui nomme une couleur.

### 7.2 Les joueurs tests (à chaque modification du moteur ou des données)

Une vingtaine de joueurs fictifs, avec des réponses écrites à l'avance et des **attentes** :
- « Aime les dragons, le rouge et les gros sorts » : The Ur-Dragon ou Miirym dans les 10 premiers ;
- « Déteste le combo » : aucun commandant à combo rapide dans les 10 premiers ;
- « Débutant, budget serré » : pas de commandant à plus de 20 €, complexité basse ;
- « Joueur incolore et artefacts » : au moins un commandant incolore dans les 10 premiers ;
- …

Le test échoue si une attente n'est plus respectée. **Le mieux serait d'y ajouter tes amis réels** : leurs vraies réponses, et les commandants qu'ils adorent ou détestent.

### 7.3 Les tests statistiques

- **Les commandants aimants** : on simule 10 000 joueurs au hasard. Aucun commandant ne doit apparaître dans le top 10 de plus de 5 % d'entre eux, et les six couleurs doivent ressortir à parts comparables.
- **La stabilité** : changer une seule réponse secondaire ne doit pas bouleverser le top 3, alors que changer une réponse forte (grille de couleurs, style coup de cœur) doit le faire bouger.
- **La qualité des données** : chaque lundi, on mesure l'accord entre les styles déduits automatiquement, EDHREC et les commandants vérifiés à la main, et on suit ce taux dans le temps.

Tout tourne automatiquement dans la tâche GitHub. Si un test échoue, la mise à jour n'est pas publiée.

---

## 8. Test du moteur v3 sur trois profils (7 octobre 2026)

Les trois profils ont été passés dans le moteur actuel, sur le catalogue complet (3 400 commandants). Le banc d'essai deviendra le premier jeu de tests du nouveau moteur.

| Profil | Attendu | Obtenu | Verdict |
|---|---|---|---|
| **Débutant** (3 mois, dragons, rouge-vert, simple, budget serré) | Commandants rouge-vert simples, populaires, vendus en préconstruit | Ghalta, Xenagos, Lathliss : bien. Mais aussi Rorix et Tarox Bladewing, des dragons sans moteur de jeu, très peu joués. | Couleurs et thème justes ; la qualité des commandants n'est pas filtrée |
| **Confirmée** (aristocrates et cimetière noir-vert, bracket 3, veut changer de ses decks) | Commandants noir-vert de sacrifice, mais différents de son Meren | Chatterfang, Teysa, Gitrog, Jarad : bien. Mais 10 sur 12 reprennent exactement les styles qu'elle joue déjà. | Bon, mais « quelque chose de différent » est presque ignoré |
| **Vétéran** (depuis Alpha, contrôle et stax bleu-blanc, bracket 4, obscur, complexe, pas d'Universes Beyond) | Commandants puissants et pointus : Grand Arbiter Augustin IV, Lavinia, Baral… | Baral et Talrand : bien. Mais surtout des commandants faibles et anecdotiques à moins de 1 $, et des cartes Marvel malgré son refus | Échec |

**Les causes, par ordre d'importance :**

1. **Les données des commandants sont trop pauvres.** 96 % des commandants sont étiquetés automatiquement, et 586 (17 %) n'ont aucun style. La puissance ne distingue presque rien : 3 380 commandants sur 3 400 ont la même valeur. Le moteur ne peut donc pas séparer un commandant de bracket 4 d'un commandant anecdotique. **C'est la première chose à corriger** (EDHREC, Commander Spellbook, §4).
2. **Le filtre Universes Beyond était cassé** pour tous les commandants non vérifiés à la main : 1 292 cartes (38 % du catalogue) n'étaient pas reconnues. **Corrigé** dans le script de données.
3. **« Obscur » est confondu avec « mauvais ».** Le vétéran qui veut des commandants peu joués reçoit des cartes faibles. Il faut distinguer la **pépite** (peu jouée mais forte et cohérente) du simple fond de catalogue.
4. **La psychologie n'est pas utilisée** : un Spike à 96 % reçoit des commandants sans puissance.
5. **Les pourcentages saturent** : neuf commandants à 97-99 % pour le vétéran. Ils n'ont plus de sens ; il faut les calibrer (par exemple en percentile du catalogue).
6. **Les profils sont trop tranchés** : Timmy 100 %, Spike 96 % après quelques questions, faute de tirage vers le neutre (§3.1).
7. **La règle de diversité écrase les signaux forts** : Grand Arbiter Augustin IV, aimé au coup d'œil, n'apparaît pas, parce que deux commandants « stax » plus obscurs ont déjà pris la place.
8. **Quelques avertissements à tort** : par exemple, « partie sans fin » pour Dina, simplement parce qu'elle gagne des points de vie.

**Ce que le quiz lui-même doit améliorer, vu par chaque profil :**
- **Débutant** : les cartes du coup d'œil sont en anglais, d'où l'utilité des noms français. Il faut aussi privilégier les commandants vendus en préconstruit, que la recherche ne repère pas encore.
- **Vétéran** : il manque des nuances que ce joueur attend :
  - les sous-familles de stax (taxes ou verrou) et de combo (storm, mana infini, turbo) ;
  - les tours supplémentaires, les wheels, le poison ;
  - les équipements et les véhicules ;
  - la différence entre bracket 4 et cEDH.

  Une grille « avancée » réservée au mode confirmé suffirait.

## 10. Moteur v4 : état au 7 octobre 2026

Le moteur décrit ici est **écrit, testé et branché sur le site** (pages `quiz.html`, `profil.html`, `groupe.html`, `devine.html`). L'ancien site v3 reste disponible sous `ancien.html`. Le coup d'œil du quiz choisit ses cartes selon §3.3 (`site/quiz.js`, fonction `prochaineCarte`).

**Fichiers** : `moteur/reglages.js` (tous les poids), `moteur/questions.js` (39 questions en découverte, 62 en confirmé), `moteur/mesure.js`, `moteur/match.js`, `moteur/propositions.js`. Vérifications : `scripts/audit.js` et `scripts/tests/lancer.js` (avec `profils.js`).

**Résultats des tests** :
- **12 joueurs tests sur 12 réussis** : débutant, confirmée, vétéran, anti-combo, incolore, diplomate, paladin, petit budget, elfes, Universes Beyond, cEDH, chaos.
- **1 500 joueurs simulés cohérents**, chacun avec deux styles et une à trois couleurs préférés, et 30 % de réponses au hasard :
  - 91 % des propositions sont dans des couleurs que le joueur accepte, contre 43 % au hasard ;
  - un style aimé du joueur est présent dans 39 % des propositions, contre 13 % au hasard, soit trois fois plus ;
  - aucun commandant « aimant » ;
  - les cinq couleurs sont équilibrées (17 à 21 % chacune).
- **Stabilité** : changer une réponse secondaire garde le même top 3. Changer complètement de couleurs le renouvelle entièrement.
- **Audit** : pas de couleur nommée hors de la fin du quiz, chaque style a au moins trois sources dans chaque mode, et les six couleurs sont informées de façon équilibrée.

**Ajustements faits pendant les tests** (tous dans `reglages.js`, avec leur raison) :
- **la couleur la plus faible d'un commandant compte** (45 %), parce qu'un deck joue toutes ses couleurs ;
- **contraste de la note de style** (× 1,5), pour qu'elle départage plus que le thème ;
- **pénalité bracket plus douce en dessous du niveau voulu**, et élargie si le bracket est seulement déduit de l'ambiance ;
- **psychologie comparée en répartition**, pour qu'un commandant polyvalent ne plaise pas à tout le monde ;
- **commandants sans donnée de style sous le neutre**, pour ne pas les recommander à l'aveugle ;
- **pénalité modérée pour une couleur « Bof »** ;
- **décote de 10 % pour un commandant incolore** ;
- **bonus d'un commandant aimé au coup d'œil porté à × 1,35**.

**Limites connues** :
- **Le style principal des commandants non vérifiés est juste dans 62 % des cas.** C'est la première limite de précision : le moteur ne peut pas être plus juste que les données.
- **Le contrôle reste la dimension la plus mesurée** (14 sources en découverte, 23 en confirmé), et le group slug, les sorts et la meule les moins mesurées. **Johnny et Mel sont moins bien mesurés que Spike.** Quelques questions en plus sur ces dimensions amélioreraient la précision.
- **La sélection des cartes du coup d'œil** (§3.3) est simple : elle mélange l'incertitude des styles de la carte, une note prédite proche du milieu et du hasard. Elle n'est pas couverte par les tests automatiques.

## 9. Organisation du code (pour plus tard)

```
moteur/
  reglages.js     tous les poids et seuils, commentés
  mesure.js       réponses → profil (§3)
  match.js        profil × commandant → note détaillée (§5.1 à 5.3)
  propositions.js trois familles, diversité, explications (§5.4 et 5.5)
  groupe.js       compatibilité, hexagone du groupe (§6)
quiz/questions.js  les questions, sous forme de données (§2)
scripts/
  build_data.py   données des commandants (§4)
  audit.js        audit de structure (§7.1)
  tests/          joueurs tests et tests statistiques (§7.2 et 7.3)
```

Le moteur est du JavaScript sans dépendance, qui tourne dans le navigateur et dans les tests. Noter 2 700 commandants prend quelques millisecondes.
