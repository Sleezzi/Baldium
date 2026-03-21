# Baldium

Baldium est un projet français et Open Source. Il est composé d'un dashboard et d'une API. L'API est relié à un serveur Minecraft, le dashboard se connecte ensuite à l'API avec un WebSocket. Les administrateurs de serveur Minecraft peuvent ainsi gérer plus facilement les joueurs, les fichiers, les mods du serveur ainsi que de grader un suivit des performances du serveur.

Le tous est fait pour tourner sur Docker.

## Installation
```
git clone https://github.com/Sleezzi/Baldium.git
```
## Lancement
Avant de lancer l'api, veiller a compléter le fichier ***.env*** (variables sensibles). Ensuite, vérifiez le contenu de ***compose.yml***. Vous pouvez suivre la [documentation](https://wiki.sleezzi.fr/baldium/compose.yml) pour vous aider.
```
docker compose up -d
```

## Contact
Si vous avez un problème vous pouvez me contacter a [contact@sleezzi.fr](mailto:contact@sleezzi.fr), si vous trouvez un bug merci de le signaler [ici](https://github.com/Sleezzi/Baldium/issues)