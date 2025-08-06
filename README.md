# MapiGuesser

Geo Guessing game using Mapillary 360° panoramas and MapLibre GL JS.


## Setup

1. `cp js/config.example.js js/config.js` and set your Mapillary API key in `js/config.js`.
2. Serve the directory with any static file server and open `index.html` in a browser.

## Features

* Random Mapillary 360° panorama per round
* 5 minute countdown timer
* Guess location by placing a pin on the map
* Score based on distance between guess and actual location
* Base map toggle between OpenStreetMap and aerial imagery
* Map projection toggle between Web Mercator and globe
