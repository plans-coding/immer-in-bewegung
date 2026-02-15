# Immer in Bewegung 
Open source travel documentation app for self-hosting or serverless usage

## Online live demo
You can check out a demo app running at https://online.bewegung.app/.

## Principles
* Based on SQLite (use your favourite tool to edit the data, e.g. using os native app [DB Browser for SQLite](https://sqlitebrowser.org/) or browser based app [SQLite Online](https://sqliteonline.com/))
* Immer in Bewegung runs client side in your browser using WASM for reading the SQLite file
* If you self-host Immer in Bewegung the application can read the SQLite file from same server
* If you want to run directly via the online version https://online.bewegung.app/, you can bind your own data in https://online.bewegung.app/?path=source
* Features an optional integration to Immich (https://immich.app/)

## Licenses
* Immer in Bewegung: MIT license
* Chartjs: MIT license
* MapLibre: Check their repository
* Pagedjs: MIT license
