# AI Chat

Application de chat IA auto-hébergée, construite avec **Flask** et du **JavaScript natif**. Elle fonctionne au choix avec l'**API Google Gemini** (cloud) ou avec **Ollama** (modèles exécutés localement, sans clé API ni connexion Internet).

Le fournisseur et le modèle se changent à tout moment depuis la barre supérieure, sans redémarrer l'application.

---

## Fonctionnalités

**Fournisseurs d'IA**
- API Gemini ou Ollama, interchangeables en un clic
- Liste des modèles récupérée en direct depuis le fournisseur actif
- Détection automatique des modèles Ollama compatibles avec les images
- Clé API Gemini saisissable directement dans l'interface (vérifiée auprès de Google avant d'être enregistrée), sans toucher au code ni au fichier `.env`
- Test de connexion et indicateur d'état permanent
- Messages d'erreur explicites (clé absente, serveur injoignable, modèle non installé, quota atteint...)

**Conversations**
- Conversations multiples : création, renommage, suppression, recherche, regroupement par date
- Réponses en streaming, bouton d'arrêt et régénération de la dernière réponse
- Rendu Markdown complet : tableaux, listes, blocs de code avec coloration syntaxique et bouton de copie
- Export d'une conversation au format Markdown

**Images**
- Jusqu'à 3 images par message : sélecteur de fichiers, glisser-déposer ou copier-coller
- Redimensionnement et compression automatiques dans le navigateur
- Questions de suivi possibles sur la dernière image envoyée
- Avec Ollama, le modèle vision est utilisé automatiquement dès qu'un message contient une image

**Paramètres**
- Interface en français ou en anglais, thème sombre, clair ou système, couleur d'accent, taille du texte
- Personnalité de l'assistant (équilibrée, concise, amicale, pédagogue, développeur ou instructions personnalisées)
- Langue des réponses, créativité, longueur maximale, taille du contexte
- Fenêtre de contexte Ollama configurable

**Mémoire**
- Informations conservées entre les conversations, gérables depuis les paramètres
- Commande rapide dans le chat : `retiens: j'habite à Casablanca`

**Divers** : dictée vocale (Chrome ou Edge), interface adaptée au mobile, raccourcis clavier (`Entrée` envoyer, `Maj+Entrée` nouvelle ligne, `Ctrl+K` nouvelle conversation, `Échap` fermer).

---

## Gemini ou Ollama : lequel choisir ?

| | API Gemini | Ollama |
|---|---|---|
| Exécution | Cloud (Google) | Locale, sur votre machine |
| Prérequis | Clé API (offre gratuite disponible) | Ollama installé et au moins un modèle |
| Internet | Obligatoire | Inutile une fois les modèles téléchargés |
| Confidentialité | Les messages sont envoyés à Google | Rien ne quitte votre machine |
| Performance | Rapide, indépendante de votre matériel | Dépend de votre processeur / carte graphique |
| Images | Prises en charge par les modèles Gemini | Nécessite un modèle vision (par exemple `llava`) |

---

## Structure du projet

```
Ai-chat-app/
├── app.py                 # Serveur Flask : routes, stockage, streaming
├── providers.py           # Fournisseurs d'IA : Gemini et Ollama
├── requirements.txt       # Dépendances Python
├── .env.example           # Modèle de configuration (à copier en .env)
├── templates/
│   └── index.html         # Page unique de l'application
├── static/
│   ├── css/style.css      # Design (thèmes clair et sombre)
│   └── js/app.js          # Logique du frontend
└── data/                  # Créé automatiquement : conversations, images, paramètres, mémoire
```

---

## Installation et lancement

### 1. Prérequis
- **Python 3.9 ou plus récent** (vérifiez avec `python --version`)
- Au choix : une clé API Gemini **ou** Ollama installé (voir l'étape 5)

### 2. Récupérer le projet
```bash
git clone https://github.com/<votre-compte>/Ai-chat-app.git
cd Ai-chat-app
```

### 3. Créer un environnement virtuel et installer les dépendances

Windows (PowerShell ou cmd) :
```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

macOS / Linux :
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 4. Créer le fichier de configuration
```bash
# Windows
copy .env.example .env
# macOS / Linux
cp .env.example .env
```

### 5. Choisir un fournisseur

**Option A : API Gemini**
1. Créez une clé gratuite sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Au choix :
   - **Dans l'interface** (recommandé) : lancez l'application, ouvrez **Paramètres > Fournisseur**, choisissez *Gemini API*, collez la clé et cliquez sur **Enregistrer**. La clé est vérifiée auprès de Google avant d'être enregistrée.
   - **Dans le fichier `.env`** : renseignez `GEMINI_API_KEY=votre_cle_ici`.

Si les deux existent, la clé saisie dans l'interface est prioritaire. Le bouton **Supprimer** retire la clé enregistrée dans l'application ; la clé du `.env` reprend alors le relais.

**Option B : Ollama (local)**
1. Installez Ollama depuis [ollama.com/download](https://ollama.com/download) et vérifiez qu'il est démarré.
2. Téléchargez un modèle de discussion, et si besoin un modèle vision :
   ```bash
   ollama pull llama3.2
   ollama pull llava
   ```
3. Aucune clé n'est nécessaire. Si Ollama tourne sur une autre machine ou un autre port, renseignez `OLLAMA_HOST` dans `.env` ou dans **Paramètres > Fournisseur**.

Vous pouvez configurer les deux options : l'application utilise Gemini au premier lancement si une clé est présente, sinon Ollama. Vous pouvez forcer ce choix avec `DEFAULT_PROVIDER=ollama` dans `.env`.

### 6. Lancer l'application
```bash
python app.py
```
Ouvrez ensuite **http://127.0.0.1:5000** dans votre navigateur.

---

## Utilisation

| Action | Comment faire |
|---|---|
| Changer de fournisseur ou de modèle | Cliquez sur le sélecteur en haut de la fenêtre |
| Ajouter ou changer la clé Gemini | **Paramètres > Fournisseur > Clé API** |
| Tester la connexion | **Paramètres > Fournisseur > Tester la connexion** |
| Envoyer une image | Bouton image, glisser-déposer, ou `Ctrl+V` |
| Arrêter une réponse | Bouton d'arrêt à la place du bouton d'envoi |
| Régénérer une réponse | Action « Régénérer » sous la dernière réponse |
| Mémoriser une information | `retiens: <information>` dans le chat, ou **Paramètres > Mémoire** |
| Exporter une conversation | Icône de téléchargement en haut à droite |

---

## Configuration (fichier `.env`)

| Variable | Rôle | Valeur par défaut |
|---|---|---|
| `GEMINI_API_KEY` | Clé de l'API Gemini (facultative : elle peut être saisie dans l'interface) | aucune |
| `GEMINI_MODEL` | Modèle Gemini initial | `gemini-3.5-flash` |
| `OLLAMA_HOST` | Adresse du serveur Ollama | `http://localhost:11434` |
| `OLLAMA_MODEL` | Modèle Ollama initial | premier modèle installé |
| `OLLAMA_VISION_MODEL` | Modèle Ollama pour les images | identique au modèle principal |
| `DEFAULT_PROVIDER` | Fournisseur au premier lancement | `gemini` si clé présente, sinon `ollama` |
| `PORT` | Port du serveur web | `5000` |
| `FLASK_DEBUG` | Mode debug de Flask (`1` ou `0`) | `1` |

Ces valeurs ne servent qu'au premier lancement : ensuite, les choix faits dans l'interface sont enregistrés dans `data/settings.json`. Les noms de modèles Gemini évoluent régulièrement ; la liste des modèles disponibles est récupérée en direct, aucun changement de code n'est nécessaire.

---

## Architecture

Toute la communication avec les modèles passe par `providers.py`. Chaque fournisseur expose la même interface :

```python
chat(model, system, messages, opts, stream)   # générateur de morceaux de texte
list_models(...)                              # [{"id": "...", "vision": True}]
test(...)                                     # état de la connexion
```

Pour ajouter un autre fournisseur (par exemple une API compatible OpenAI), il suffit d'écrire une classe qui respecte cette interface, de l'enregistrer dans le dictionnaire `PROVIDERS` de `app.py` et d'ajouter son nom aux valeurs acceptées par `sanitize_settings`.

---

## Données et confidentialité

- Conversations, images, paramètres et mémoire sont stockés localement dans `data/` (ignoré par Git).
- Avec **Ollama**, aucune donnée ne quitte votre machine.
- Avec **Gemini**, les messages, les images envoyées et les informations en mémoire sont transmis à l'API de Google pour générer les réponses.
- Une clé saisie dans l'interface est stockée dans `data/secrets.json` (permissions restreintes à votre utilisateur sous macOS et Linux). Le fichier est ignoré par Git. Le navigateur ne reçoit jamais la clé complète, seulement ses 4 derniers caractères.
- La clé du fichier `.env`, si vous l'utilisez, n'est jamais envoyée au navigateur non plus.
- Les clés sont stockées en clair sur votre disque, comme dans un fichier `.env` : ne partagez pas le dossier `data/`.
- Le serveur écoute uniquement sur `127.0.0.1` : il n'est pas accessible depuis le reste du réseau.
- Pour tout effacer : **Paramètres > Données**, ou supprimez le dossier `data/`.

---

## Dépannage

| Problème | Solution |
|---|---|
| `ModuleNotFoundError` | L'environnement virtuel n'est pas activé : activez-le puis relancez `pip install -r requirements.txt` |
| « Aucune clé API Gemini définie » | Ajoutez-la dans **Paramètres > Fournisseur**. Si vous passez par `.env`, vérifiez que le fichier s'appelle bien `.env` (et non `.env.txt`), qu'il est à la racine du projet, puis redémarrez l'application |
| « La clé API Gemini a été refusée » | Générez une nouvelle clé sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey) et remplacez-la dans **Paramètres > Fournisseur** |
| « Impossible de joindre Ollama » | Vérifiez qu'Ollama est démarré (`ollama list` doit répondre) et que l'adresse dans **Paramètres > Fournisseur** est correcte |
| « Le modèle ... n'est pas installé » | Installez-le avec `ollama pull <nom du modèle>` |
| « Le modèle ... ne peut pas lire les images » | Installez un modèle vision (`ollama pull llava`) et sélectionnez-le dans **Paramètres > Fournisseur** |
| Les réponses Ollama oublient le début de la conversation | Augmentez la fenêtre de contexte dans **Paramètres > Fournisseur** |
| Réponse vide | Augmentez la longueur maximale des réponses dans **Paramètres > Comportement** ou changez de modèle |
| « Limite de requêtes atteinte » | Patientez un instant : l'offre gratuite Gemini limite le nombre de requêtes par minute et par jour |
| Pas de coloration du code | Les bibliothèques d'affichage sont chargées par CDN : vérifiez la connexion Internet |
| Port 5000 déjà utilisé | Ajoutez `PORT=5001` dans `.env` |
| Dictée vocale indisponible | Utilisez Chrome ou Edge |
