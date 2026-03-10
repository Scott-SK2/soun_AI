# 🚀 Guide d'Installation de Soun en Local

## Prérequis

Avant de commencer, assurez-vous d'avoir installé :

1. **Node.js** (version 18 ou supérieure) - [Télécharger](https://nodejs.org/)
2. **PostgreSQL** - [Télécharger](https://www.postgresql.org/download/)
3. **Clé API OpenAI** - [Créer un compte](https://platform.openai.com/)

## 📋 Installation Étape par Étape

### 1. Installer les dépendances

Ouvrez un terminal dans le dossier du projet :

```bash
cd Soun/Soun
npm install
```

Cette commande va installer toutes les dépendances nécessaires (React, Express, OpenAI, etc.)

### 2. Configurer PostgreSQL

#### Option A : PostgreSQL en Local (Recommandé pour le développement)

1. **Installez PostgreSQL** sur votre système
   - Windows : Téléchargez l'installateur depuis postgresql.org
   - Mac : `brew install postgresql`
   - Linux : `sudo apt-get install postgresql`

2. **Créez une base de données** :

```bash
# Connectez-vous à PostgreSQL
psql -U postgres

# Dans le prompt PostgreSQL, exécutez :
CREATE DATABASE soun_db;

# Créez un utilisateur (optionnel mais recommandé)
CREATE USER soun_user WITH PASSWORD 'mon_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON DATABASE soun_db TO soun_user;

# Quittez avec \q
```

3. **URL de connexion** (à utiliser dans .env) :
```
DATABASE_URL=postgresql://soun_user:mon_mot_de_passe_securise@localhost:5432/soun_db
```

#### Option B : PostgreSQL Cloud avec Neon (Gratuit)

1. Créez un compte sur [Neon.tech](https://neon.tech)
2. Créez un nouveau projet
3. Copiez l'URL de connexion fournie (ressemble à : `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname`)

### 3. Obtenir une clé API OpenAI

1. Créez un compte sur [OpenAI Platform](https://platform.openai.com/)
2. Allez dans "API Keys"
3. Cliquez sur "Create new secret key"
4. **Copiez immédiatement la clé** (vous ne pourrez plus la voir après)
5. Ajoutez des crédits à votre compte (minimum ~5-10$)

### 4. Créer le fichier .env

1. **Copiez le fichier d'exemple** :
```bash
cp .env.example .env
```

2. **Éditez le fichier .env** avec vos vraies valeurs :

```bash
# Base de données PostgreSQL
DATABASE_URL=postgresql://soun_user:mon_mot_de_passe@localhost:5432/soun_db

# Clé API OpenAI (OBLIGATOIRE)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Secret pour les sessions (générez une chaîne aléatoire)
SESSION_SECRET=une-chaine-tres-longue-et-aleatoire-pour-securiser-les-sessions

# Port du serveur (optionnel)
PORT=5000
```

**💡 Astuce** : Pour générer un SESSION_SECRET sécurisé, vous pouvez utiliser :
```bash
# Sur Mac/Linux
openssl rand -base64 32

# Sur Windows (PowerShell)
-join ((65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### 5. Initialiser la base de données

Exécutez cette commande pour créer toutes les tables nécessaires :

```bash
npm run db:push
```

Vous devriez voir des messages confirmant la création des tables :
- users
- courses
- documents
- quizzes
- voice_commands
- study_levels
- etc.

### 6. Lancer l'application

```bash
npm run dev
```

Vous devriez voir :
```
Server running on http://localhost:5000
```

### 7. Accéder à l'application

Ouvrez votre navigateur et allez sur :
```
http://localhost:5000
```

🎉 **Félicitations !** Vous devriez voir la page de connexion de Soun.

---

## 🎯 Premiers Pas

1. **Créez un compte** : Cliquez sur "Register" et remplissez le formulaire
2. **Créez un cours** : Allez dans "Courses" et ajoutez votre premier cours
3. **Uploadez des documents** : Ajoutez des PDF, DOCX ou PPTX à votre cours
4. **Testez Soun** : Dites "Hey Soun, show me my courses" (nécessite un micro)

---

## 🛠️ Commandes NPM

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de développement avec hot-reload |
| `npm run build` | Compile l'application pour la production |
| `npm start` | Lance l'application compilée en production |
| `npm run check` | Vérifie les erreurs TypeScript sans compiler |
| `npm run db:push` | Synchronise le schéma de la base de données |

---

## ❓ Résolution de Problèmes

### Problème : "DATABASE_URL must be set"

**Solution** : Vérifiez que votre fichier `.env` existe et contient `DATABASE_URL=...`

### Problème : "Error: connect ECONNREFUSED"

**Solution** : PostgreSQL n'est pas démarré.
- Mac : `brew services start postgresql`
- Linux : `sudo service postgresql start`
- Windows : Démarrez le service PostgreSQL depuis "Services"

### Problème : "OpenAI API Error: Incorrect API key"

**Solution** : Vérifiez que votre `OPENAI_API_KEY` dans `.env` est correcte et active

### Problème : Port 5000 déjà utilisé

**Solution** : Changez le PORT dans `.env` :
```bash
PORT=3000
```

### Problème : "Module not found"

**Solution** : Réinstallez les dépendances :
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 🔒 Sécurité

⚠️ **IMPORTANT** :
- Ne partagez **JAMAIS** votre fichier `.env`
- Ne committez **JAMAIS** votre `.env` dans Git (il est dans `.gitignore`)
- Gardez vos clés API secrètes
- Utilisez des mots de passe forts pour PostgreSQL

---

## 📚 Documentation Supplémentaire

- **Architecture** : Consultez `replit.md` pour plus de détails
- **Schéma de la base de données** : `shared/schema.ts`
- **API Routes** : `server/routes.ts`

---

## 🆘 Besoin d'Aide ?

Si vous rencontrez des problèmes :
1. Vérifiez que toutes les étapes ont été suivies
2. Consultez les logs dans le terminal
3. Vérifiez que PostgreSQL est démarré
4. Vérifiez que votre clé OpenAI est valide et a des crédits

---

## 🎓 Structure du Projet

```
Soun/
├── client/              # Application React (Frontend)
│   ├── src/
│   │   ├── pages/      # Pages de l'application
│   │   ├── components/ # Composants réutilisables
│   │   ├── hooks/      # Hooks React personnalisés
│   │   └── context/    # Contextes React
│   └── index.html
├── server/              # Serveur Express (Backend)
│   ├── index.ts        # Point d'entrée du serveur
│   ├── routes.ts       # Routes API
│   ├── storage.ts      # Gestion des fichiers
│   └── services/       # Services IA
├── shared/
│   └── schema.ts       # Schéma de la base de données
├── package.json
└── .env                # Configuration (à créer)
```

Bon développement avec Soun ! 🚀
