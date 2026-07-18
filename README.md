# Baldium
Easily manage your Minecraft server with Baldium, a powerful and intuitive dashboard that lets you handle mods, players, files, and configuration.

Baldium is a French open-source project consisting of an API that connects to the Minecraft server via RCON and to Docker via the socket.

## Installation
```
git clone https://github.com/Sleezzi/Baldium.git
```
## Launching
Before starting the API, make sure to fill in the ***.env*** file (sensitive variables). Then, check the contents of ***compose.yml***. You can refer to the [documentation](https://wiki.sleezzi.fr/baldium/compose.yml) for assistance.
Finally, simply run the following command:
```
docker compose up -d
```

## Contact
If you encounter any issues, you can contact us at [contact@sleezzi.fr](mailto:contact@sleezzi.fr) or via [Discord](https://sleezzi.fr/discord). If you find a bug, please report it [here](https://github.com/Sleezzi/Baldium/issues).