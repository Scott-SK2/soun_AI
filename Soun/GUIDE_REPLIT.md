# 🌐 Guide de Déploiement Soun sur Replit

## Pourquoi Replit ?

✅ **Aucune installation locale** - Tout fonctionne dans le cloud
✅ **PostgreSQL inclus** - Base de données automatiquement configurée
✅ **Gratuit** - Plan gratuit largement suffisant pour commencer
✅ **Accessible partout** - Utilisez l'app depuis n'importe quel navigateur
✅ **Déploiement en 1 clic** - Tout est automatisé

---

## 📋 Prérequis

Vous avez seulement besoin de :
1. ✅ Un compte GitHub (gratuit)
2. ✅ Un compte Replit (gratuit)
3. 🔑 Une clé API OpenAI (~5-10€ de crédits)

**C'est tout !** Pas de PostgreSQL, Node.js ou autre logiciel à installer.

---

## 🚀 Installation en 5 Minutes

### Étape 1 : Créer un compte Replit

1. Allez sur [replit.com](https://replit.com)
2. Cliquez sur **"Sign up"**
3. Connectez-vous avec votre compte **GitHub** (recommandé)

### Étape 2 : Importer le Projet depuis GitHub

1. Dans Replit, cliquez sur **"Create Repl"**
2. Sélectionnez **"Import from GitHub"**
3. Collez l'URL de votre repository :
   ```
   https://github.com/Scott-SK2/Soun
   ```
4. Cliquez sur **"Import from GitHub"**
5. Replit va automatiquement détecter que c'est un projet Node.js

### Étape 3 : Configurer PostgreSQL (1 clic)

1. Dans l'interface Replit, cherchez **"Tools"** dans le menu de gauche
2. Cliquez sur **"Database"** ou cherchez "PostgreSQL" dans les outils
3. Cliquez sur **"Add PostgreSQL"**
4. ✅ Replit va automatiquement :
   - Créer une base de données PostgreSQL
   - Ajouter `DATABASE_URL` dans les variables d'environnement

### Étape 4 : Configurer les Variables d'Environnement

1. Dans Replit, ouvrez l'onglet **"Secrets"** (icône de cadenas 🔒)
2. Ajoutez ces variables :

| Clé | Valeur | Explication |
|-----|--------|-------------|
| `DATABASE_URL` | *(Déjà configuré automatiquement)* | URL de la base PostgreSQL |
| `OPENAI_API_KEY` | `sk-proj-xxxxx...` | Votre clé OpenAI |
| `SESSION_SECRET` | Cliquez sur "Generate" | Secret pour les sessions |

**Pour obtenir votre clé OpenAI :**
1. Allez sur [platform.openai.com](https://platform.openai.com/)
2. Connectez-vous et allez dans "API Keys"
3. Créez une nouvelle clé secrète
4. Copiez-la et collez-la dans Replit
5. Ajoutez ~5-10€ de crédits sur votre compte OpenAI

### Étape 5 : Initialiser la Base de Données

1. Dans le **Shell** de Replit (en bas de l'écran), exécutez :
   ```bash
   cd Soun
   npm run db:push
   ```
2. Attendez que toutes les tables soient créées ✅

### Étape 6 : Lancer l'Application

1. Cliquez sur le bouton **"Run"** ▶️ en haut de l'écran
2. Replit va :
   - Installer automatiquement les dépendances (`npm install`)
   - Lancer le serveur (`npm run dev`)
3. Après ~30 secondes, vous verrez une fenêtre avec votre application ! 🎉

### Étape 7 : Accéder à l'Application

Une fois lancée, Replit vous donne une URL publique comme :
```
https://votre-projet.votre-username.repl.co
```

**Vous pouvez partager cette URL** avec n'importe qui pour accéder à votre application !

---

## 🎯 Configuration Recommandée dans Replit

### Fichier `.replit` (Configuration automatique)

Replit devrait détecter automatiquement la configuration, mais vérifiez que le fichier `.replit` contient :

```toml
run = "cd Soun && npm run dev"
entrypoint = "Soun/server/index.ts"

[nix]
channel = "stable-22_11"

[deployment]
run = ["sh", "-c", "cd Soun && npm run build && npm start"]
deploymentTarget = "cloudrun"
```

### Garder l'Application Toujours Active

**Problème** : Le plan gratuit de Replit "endort" l'app après inactivité.

**Solutions** :

1. **UptimeRobot** (Gratuit) :
   - Créez un compte sur [uptimerobot.com](https://uptimerobot.com)
   - Ajoutez votre URL Replit comme "monitor"
   - UptimeRobot va "ping" votre app toutes les 5 minutes pour la garder active

2. **Replit Deployments** (Payant ~7$/mois) :
   - Cliquez sur "Deploy" dans Replit
   - Votre app sera toujours active avec une URL dédiée

---

## 🔧 Commandes Utiles dans le Shell Replit

| Commande | Description |
|----------|-------------|
| `cd Soun && npm run dev` | Lancer le serveur de dev |
| `cd Soun && npm run db:push` | Synchroniser la base de données |
| `cd Soun && npm run check` | Vérifier les erreurs TypeScript |
| `psql $DATABASE_URL` | Se connecter à PostgreSQL |

---

## ✅ Checklist de Vérification

Avant de lancer, vérifiez que :

- [ ] Le projet est importé depuis GitHub
- [ ] PostgreSQL est activé (Tools → Database)
- [ ] `DATABASE_URL` est dans les Secrets
- [ ] `OPENAI_API_KEY` est configuré avec une vraie clé
- [ ] `SESSION_SECRET` est généré
- [ ] `npm run db:push` a été exécuté sans erreur
- [ ] Le bouton "Run" lance l'application

---

## ❓ Problèmes Courants

### Problème : "DATABASE_URL must be set"

**Solution** :
1. Vérifiez que PostgreSQL est activé dans Tools → Database
2. Redémarrez le Repl (Stop puis Run)

### Problème : "OpenAI API Error"

**Solution** :
1. Vérifiez que votre clé commence par `sk-proj-` ou `sk-`
2. Vérifiez que vous avez des crédits sur votre compte OpenAI
3. La clé doit être dans Secrets, pas dans le code

### Problème : L'application ne démarre pas

**Solution** :
1. Ouvrez le Shell et exécutez :
   ```bash
   cd Soun
   rm -rf node_modules
   npm install
   npm run dev
   ```

### Problème : "Error: ENOENT: no such file or directory"

**Solution** :
Le projet est dans un sous-dossier. Assurez-vous que vos commandes commencent par `cd Soun`.

---

## 🎓 Utilisation de l'Application

Une fois lancée :

1. **Créez un compte** sur la page de Register
2. **Créez un cours** dans la section Courses
3. **Uploadez des documents** (PDF, DOCX, PPTX)
4. **Utilisez Soun** : Dites "Hey Soun, show me my courses" 🎤

---

## 🔒 Sécurité

⚠️ **Important** :
- Ne partagez **jamais** vos Secrets (surtout `OPENAI_API_KEY`)
- Ne commitez **jamais** de fichier `.env` dans GitHub
- Les Secrets Replit sont chiffrés et sécurisés
- Changez votre `SESSION_SECRET` régulièrement

---

## 📊 Coûts

| Service | Coût | Notes |
|---------|------|-------|
| **Replit (Free)** | 0€ | Suffisant pour commencer |
| **Replit (Hacker)** | ~7$/mois | App toujours active, plus rapide |
| **PostgreSQL** | 0€ | Inclus dans Replit |
| **OpenAI API** | ~5-10€ | Paiement à l'usage, très faible consommation |

**Total pour débuter** : ~5-10€ (juste pour OpenAI)

---

## 🆘 Besoin d'Aide ?

Si vous rencontrez des problèmes :

1. Vérifiez la console dans Replit (en bas)
2. Consultez les logs du serveur
3. Vérifiez que toutes les variables Secrets sont configurées
4. Essayez de redémarrer le Repl

---

## 🎉 Avantages de Replit vs Local

| Critère | Replit | Local |
|---------|--------|-------|
| Installation | ✅ Aucune | ❌ PostgreSQL, Node.js, etc. |
| Configuration | ✅ 5 minutes | ❌ 30-60 minutes |
| Accès | ✅ Partout, n'importe quel appareil | ❌ Seulement sur votre PC |
| URL publique | ✅ Automatique | ❌ Nécessite ngrok ou autre |
| Sauvegarde | ✅ Automatique sur GitHub | ❌ Manuel |
| Collaboration | ✅ Facile (multiplayer) | ❌ Compliqué |

---

## 🚀 Prochaines Étapes

Après avoir configuré Replit :

1. ✅ Testez l'application avec des documents de test
2. ✅ Invitez des amis à tester (partagez l'URL)
3. ✅ Configurez UptimeRobot pour garder l'app active
4. ✅ Explorez les fonctionnalités de Soun (voice, quizz, etc.)

---

**Bon déploiement sur Replit ! 🎊**

Si vous avez des questions, n'hésitez pas !
