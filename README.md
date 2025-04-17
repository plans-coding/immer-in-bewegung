# Immer in Bewegung 
Open source travel documentation app for self-hosting or serverless usage

Available in
* 🇬🇧 English
* 🇸🇪 Swedish
* 🇩🇰 Danish
* 🇩🇪 German
* 🇳🇱 Dutch

or define your own language.

## Online live demo
You can check out a demo app running at https://online.bewegung.app/.

## Principles
* Based on SQLite (use your favourite tool to edit the data, e.g. using os native app [DB Browser for SQLite](https://sqlitebrowser.org/) or browser based app [SQLite Online](https://sqliteonline.com/))
* Immer in Bewegung runs client side in your browser using WASM for reading the SQLite file
* If you self-host Immer in Bewegung the application can read the SQLite file from same server
* If you want to run directly via the online version https://online.bewegung.app/, you can bind your own data in https://online.bewegung.app/?p=source
* Features an optional integration to Immich (https://immich.app/)

## Read more
See quick start instructions at https://bewegung.app/docs/quick-start

## Edit database via web browser (live demo)
Bind same SQLite file as you used for viewing to https://libsqlstudio.com/local

## Edit database via web browser (self-host)
1. Expose your SQLite file by HTTP via https://github.com/tursodatabase/libsql
2. Open via Turso in https://libsqlstudio.com/local

## Screenshots
![img](https://raw.githubusercontent.com/plans-coding/iib-docs/refs/heads/main/img/iib-computer.png)
Image from: https://mockuphone.com/

## Licenses
* Immer in Bewegung: MIT license
* Bootstrap: MIT license
* Sqljs: MIT license
* Chartjs: MIT license
* Leaflet: BSD-2-Clause license
* Pagedjs: MIT license
