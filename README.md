# 📘 Documentation du module xcraft-core-daemon

## Aperçu

Le module `xcraft-core-daemon` fournit des outils pour gérer le cycle de vie des processus démons dans l'écosystème Xcraft. Il permet de démarrer, arrêter et redémarrer des scripts Node.js en tant que services d'arrière-plan, tout en gérant leur état via des fichiers PID.

## Sommaire

- [Structure du module](#structure-du-module)
- [Fonctionnement global](#fonctionnement-global)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Interactions avec d'autres modules](#interactions-avec-dautres-modules)
- [Configuration avancée](#configuration-avancée)
- [Détails des sources](#détails-des-sources)
- [Cas d'utilisation typiques](#cas-dutilisation-typiques)
- [Gestion des erreurs](#gestion-des-erreurs)

## Structure du module

Le module expose une classe principale `Daemon` qui encapsule toutes les fonctionnalités nécessaires pour gérer un processus démon:

- Création et gestion de fichiers PID
- Démarrage de processus (avec ou sans mode détaché)
- Arrêt propre des processus via signaux
- Vérification de l'état d'exécution

## Fonctionnement global

Le module fonctionne en créant une instance de la classe `Daemon` pour chaque service que vous souhaitez gérer. Cette instance maintient l'état du processus et permet d'interagir avec lui via des méthodes comme `start()`, `stop()` et `restart()`.

Lorsqu'un démon est démarré, un fichier PID est créé dans le répertoire `var/run/` de l'installation Xcraft. Ce fichier est utilisé pour suivre l'état du processus et permettre son arrêt ultérieur.

## Exemples d'utilisation

### Démarrer un serveur en tant que démon

```javascript
const Daemon = require('xcraft-core-daemon');

// Créer une instance pour gérer un serveur
const serverDaemon = new Daemon(
  'myServer', // Nom du serveur
  './path/to/server.js', // Chemin vers le script du serveur
  {
    detached: true, // Exécuter en arrière-plan
    env: process.env, // Variables d'environnement
  },
  false, // Désactiver les logs
  myResponseAPI // API de réponse Xcraft (optionnel)
);

// Démarrer le serveur
serverDaemon.start();

// Plus tard, arrêter le serveur
serverDaemon.stop();
```

### Démarrer un serveur avec débogage

```javascript
const Daemon = require('xcraft-core-daemon');

const serverDaemon = new Daemon(
  'debugServer',
  './server.js',
  {
    detached: false,
    inspectPort: 9230, // Port pour le débogueur Node.js
  },
  true, // Activer les logs
  myResponseAPI
);

serverDaemon.start();
```

## Interactions avec d'autres modules

Le module `xcraft-core-daemon` interagit principalement avec:

- **[xcraft-core-etc]**: Pour charger la configuration Xcraft et déterminer l'emplacement des fichiers PID
- **[xcraft-core-process]**: Pour gérer le lancement des processus avec les options appropriées

## Configuration avancée

Le module ne possède pas de fichier `config.js` spécifique, mais il utilise la configuration globale de Xcraft pour déterminer l'emplacement des fichiers PID.

### Variables d'environnement

| Variable       | Description                                       | Exemple | Valeur par défaut |
| -------------- | ------------------------------------------------- | ------- | ----------------- |
| `XCRAFT_DEBUG` | Active le mode débogage avec l'inspecteur Node.js | `1`     | Non défini        |

## Détails des sources

### `index.js`

Ce fichier contient la classe `Daemon` qui est le cœur du module. Elle gère le cycle de vie complet des processus démons.

#### Méthodes publiques

- **`constructor(serverName, serverScript, options, logs, resp)`** - Initialise une nouvelle instance de Daemon avec le nom du serveur, le chemin vers le script, les options de configuration, les paramètres de journalisation et l'API de réponse Xcraft.

- **`start()`** - Démarre le démon. Vérifie d'abord si un processus avec le même PID existe déjà. Si le processus n'est pas en cours d'exécution, il lance un nouveau processus et écrit son PID dans un fichier.

- **`stop()`** - Arrête le démon en envoyant un signal SIGTERM au processus identifié par le fichier PID, puis supprime ce fichier.

- **`restart()`** - Arrête puis redémarre le démon.

- **`isOurDaemon()`** - Vérifie si le processus actuel est géré par cette instance de Daemon.

- **`get proc()`** - Accesseur qui retourne l'objet processus sous-jacent.

#### Options de configuration

La méthode `start()` accepte un objet d'options avec les propriétés suivantes:

| Option        | Description                                     | Type    | Valeur par défaut                             |
| ------------- | ----------------------------------------------- | ------- | --------------------------------------------- |
| `detached`    | Exécute le processus en arrière-plan            | Boolean | -                                             |
| `stdio`       | Configuration des flux d'entrée/sortie          | String  | 'ignore' ou 'pipe' selon `detached` et `logs` |
| `env`         | Variables d'environnement pour le processus     | Object  | `process.env`                                 |
| `bin`         | Chemin vers l'exécutable à utiliser             | String  | `process.execPath` (Node.js)                  |
| `argv`        | Arguments supplémentaires à passer au script    | Array   | `[]`                                          |
| `inspectPort` | Port pour l'inspecteur Node.js en mode débogage | Number  | 9229                                          |

## Cas d'utilisation typiques

1. **Serveur Xcraft**: Le module peut optionellement être utilisé pour démarrer et gérer le serveur Xcraft lui-même.

2. **Services d'arrière-plan**: Idéal pour les services qui doivent continuer à fonctionner indépendamment du processus principal.

3. **Processus de longue durée**: Pour les tâches qui s'exécutent pendant une longue période et qui doivent être gérées de manière fiable.

## Gestion des erreurs

Le module gère plusieurs cas d'erreur:

- Vérification si un processus avec le PID enregistré existe réellement
- Suppression des fichiers PID orphelins lorsque le processus n'existe plus
- Gestion des erreurs lors du démarrage ou de l'arrêt des processus

---

_Cette documentation a été mise à jour automatiquement._

[xcraft-core-etc]: https://github.com/Xcraft-Inc/xcraft-core-etc
[xcraft-core-process]: https://github.com/Xcraft-Inc/xcraft-core-process