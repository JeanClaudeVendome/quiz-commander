# Le grand quiz Commander

Un quiz entre amis pour trouver les commandants Magic qui te ressemblent, découvrir ceux de tes amis et deviner leurs réponses.
Site statique (HTML, CSS, JavaScript) prévu pour GitHub Pages, avec une petite base Supabase (gratuite) pour partager les profils. Projet personnel, sans but commercial.

## Les pages

| Page | Rôle |
|---|---|
| `index.html` | Accueil : les joueurs du groupe, le fil des nouvelles |
| `qui.html` | Entrer : code du groupe, puis réclamer son profil, se reconnecter ou en créer un |
| `quiz.html` | Le quiz (découverte : 39 questions ; confirmé : 62), la révélation et la publication |
| `profil.html` | La fiche d'un joueur : hexagone, styles, commandants proposés avec leurs explications, historique |
| `groupe.html` | L'hexagone du groupe, les statistiques, les fiches, le face-à-face |
| `devine.html` | Devine ton ami : cinq questions du quiz d'un ami, et le classement |
| `ancien.html` | L'ancienne version du quiz (v3), conservée |
| `maquettes/` | Les maquettes de design, avec des données fictives (pour mémoire) |

## Deux modes de fonctionnement

- **Mode local** (par défaut, tant que `site/config.js` est vide) : tout fonctionne, mais les profils restent dans le navigateur de chacun. Pratique pour essayer le site. Un encadré jaune le signale en bas de l'écran.
- **Mode partagé** (Supabase) : les profils sont visibles par tout le groupe. Il faut le configurer une fois (ci-dessous).

## Mettre le site en ligne (environ 10 minutes)

1. Crée un compte gratuit sur [github.com](https://github.com) si tu n'en as pas.
2. Crée un nouveau dépôt **public**, par exemple `quiz-commander` (bouton « New repository »).
3. Dans le dépôt, clique sur **Add file → Upload files** et glisse **le contenu** du dossier (pas le dossier lui-même), puis « Commit changes ».
   - Le dossier `.github` est caché sur certains ordinateurs. Vérifie qu'il apparaît bien dans le dépôt. Sinon : **Add file → Create new file**, nomme le fichier `.github/workflows/site.yml` et colles-y le contenu du fichier du même nom.
4. Va dans **Settings → Pages**, et sous « Build and deployment », choisis **Source : GitHub Actions**.
5. Va dans l'onglet **Actions**, choisis **Site et données**, puis **Run workflow**. La tâche reconstruit les données (une dizaine de minutes), vérifie le moteur, puis publie le site.
6. Ton site est à l'adresse `https://TON-PSEUDO.github.io/quiz-commander/`.

## Profils partagés : configurer Supabase (environ 15 minutes, une seule fois)

1. Crée un compte gratuit sur [supabase.com](https://supabase.com), puis **New project**. Choisis une région européenne et note le mot de passe de la base (il ne servira pas au site).
2. Dans le projet, ouvre **SQL Editor → New query**, colle **tout** le contenu de `supabase/schema.sql`, puis **Run**.
3. Ouvre `supabase/groupe.sql` et remplace les deux codes :
   - `REMPLACE-MOI-code-du-groupe` : le code que tu donneras à tes amis, par exemple `dragon-du-mardi` ;
   - `REMPLACE-MOI-code-admin` : un code à garder pour toi.

   Colle-le dans une nouvelle requête, puis **Run**. Cela crée le groupe et les profils de Ben, Ilyes, Clement et Filipe.
4. Va dans **Project Settings → API**. Copie **Project URL** et la clé **anon public** dans `site/config.js`.
5. Envoie ce fichier modifié sur GitHub : le site se republie tout seul.
6. Donne à tes amis l'adresse du site et le code du groupe. Chacun choisit son prénom, puis un code personnel à 4 chiffres.

**Sécurité :**
- La clé « anon » est faite pour être publique.
- Les données ne sont lisibles qu'avec le code du groupe. Les codes sont stockés hachés, jamais en clair.
- Écrire au nom d'un joueur exige son code personnel. Après 10 essais faux, le profil se verrouille.
- Un code à 4 chiffres protège contre les erreurs entre amis, pas contre un pirate déterminé : ne mets rien de sensible dans les réponses.

**Code personnel oublié ou profil verrouillé :** dans Supabase, **SQL Editor**, lance la ligne qui convient en remplaçant les valeurs. L'identifiant du joueur se trouve dans l'adresse de sa fiche, après `?j=`.
- Pour débloquer un profil verrouillé :
  ```
  select admin_deverrouiller('code-du-groupe', 'code-admin', 'identifiant-du-joueur');
  ```
- Pour rendre un profil libre (code oublié) ; ses anciennes versions sont conservées :
  ```
  select admin_liberer('code-du-groupe', 'code-admin', 'identifiant-du-joueur');
  ```

**Mise en veille :** un projet Supabase gratuit se met en pause après une période sans activité. Si le site affiche « Impossible de joindre le serveur », rouvre le projet sur supabase.com et clique sur **Restore**.

## Mises à jour automatiques

Chaque lundi, la tâche **Site et données** reconstruit la fiche de chaque commandant :

- **Scryfall** : nouvelles cartes, légalités en Commander, Game Changers, prix, popularité (classement EDHREC fourni par Scryfall), étiquettes de fonction de la communauté (Tagger) et noms français ;
- **Commander Spellbook** : les combos connus de chaque commandant et leur niveau de puissance ;
- **MTGJSON** : les decks préconstruits Commander et leur commandant.

EDHREC n'est pas interrogé directement : ses conditions d'utilisation interdisent les requêtes automatisées.

La tâche vérifie ensuite le moteur (audit et tests). **Si une vérification échoue, rien n'est publié.** Elle écrit aussi `data/report.json`, un rapport de qualité des données. Les caches de chaque source sont dans `data/cache/` : si une source est indisponible un lundi, sa dernière version est réutilisée.

GitHub met en pause les tâches planifiées d'un dépôt resté longtemps sans activité. Si les données ne bougent plus, relance la tâche à la main depuis l'onglet Actions.

## Tester sur ton ordinateur

Ouvrir `index.html` directement ne marche pas : le navigateur bloque la lecture des fichiers de données. Lance un petit serveur dans le dossier :

```
python -m http.server 8000
```

puis ouvre http://localhost:8000. Pour reconstruire les données toi-même : `python scripts/build_data.py` (Python 3, aucune bibliothèque à installer). Compte une dizaine de minutes : l'export de Commander Spellbook pèse environ 700 Mo.

## Vérifier le moteur

```
node scripts/audit.js
node scripts/tests/lancer.js
```

Ajoute `-v` au second pour voir le détail des commandants proposés à chaque joueur test. Pour ajouter un joueur test, complète `scripts/tests/profils.js` avec ses réponses et ce que tu attends du moteur. La conception du moteur est expliquée dans `docs/moteur.md`.

## Ce que tu peux modifier

| Fichier | Rôle |
|---|---|
| `moteur/questions.js` | Les questions et leurs effets (relance l'audit après chaque modification) |
| `moteur/reglages.js` | Tous les poids du moteur, commentés |
| `site/quiz-textes.js` | Les textes d'affichage du quiz : descriptions, illustrations, types de créatures en français |
| `site/commun.js` | Les textes des fiches (titres, devises, phrases de profil) et les outils communs |
| `data/curated.json` | Mes corrections manuelles sur 145 commandants : style de jeu, personnages, puissance, description française |
| `data/power_ref.json` | La liste de référence des commandants très forts ou cEDH |
| `data/rules.json` | Les règles qui devinent le style de jeu d'un commandant à partir de son texte |
| `data/sources.json` | Le lien entre les étiquettes Scryfall et les styles de jeu, et le calcul de la puissance |
| `scripts/build_data.py` | La construction des données |

## Vie privée

- En mode partagé, les réponses publiées sont visibles par **tout le groupe** (et seulement par lui).
- Un brouillon de quiz reste dans le navigateur jusqu'à sa publication.
- Le code personnel est gardé dans le navigateur de l'appareil où tu t'es connecté. Sur un appareil partagé, utilise « Ce n'est pas moi » pour te déconnecter.
- Quand tu cherches une carte dans le quiz, le texte tapé est envoyé à Scryfall pour l'autocomplétion.
- Le site charge les images de Scryfall et les polices de Google Fonts.

## Limites connues

- Le style de jeu des commandants non vérifiés à la main est déduit automatiquement : le style principal est juste dans environ 62 % des cas, et au moins un style est juste dans 90 % des cas (voir `data/report.json`).
- La puissance est estimée à partir des combos connus, des Game Changers et de la liste de référence : elle reste approximative au milieu de l'échelle.
- Pour l'instant, le quiz ne sait pas analyser une liste de deck collée : on indique seulement ses commandants (c'était possible dans l'ancienne version).

## Crédits

Données et images des cartes : [Scryfall](https://scryfall.com). Merci de respecter leurs [conditions d'utilisation](https://scryfall.com/docs/api).
Combos : [Commander Spellbook](https://commanderspellbook.com). Decks préconstruits : [MTGJSON](https://mtgjson.com).

Le grand quiz Commander est un contenu de fan non officiel, autorisé par la politique de contenu de fan de Wizards of the Coast. Il n'est ni approuvé ni soutenu par Wizards. Certains éléments utilisés sont la propriété de Wizards of the Coast. ©Wizards of the Coast LLC.
