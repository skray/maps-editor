var L = require('leaflet');
var mapapi = require('./mapapi');
var MarkerForm = require('./MarkerForm');
var InfoMarker = require('./InfoMarker');
require('leaflet-draw');

L.Icon.Default.imagePath = 'images';

var layers = [];
var map;
var mapData;
var current = 0;
var drawnItems = new L.FeatureGroup();

init();

function init() {
    mapapi.getMap(getQueryParams().id)
        .then(buildMap);
}

function buildMap(mapResponse) {
    // hold data
    mapData = mapResponse;

    //mapquest
    // map = L.map('map', {
    //     layers: MQ.mapLayer(),
    //     center: center,
    //     zoom: initialZoom
    // });
    //mapbox
    map = L.map('map').setView(mapData.center, mapData.zoom);

    L.tileLayer('http://{s}.tiles.mapbox.com/v3/seankennethray.map-zjkq5g6o/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18
    }).addTo(map);

    // Initialise the FeatureGroup to store editable layers
    map.addLayer(drawnItems);

    // Initialise the draw control and pass it the FeatureGroup of editable layers
    var drawControl = new L.Control.Draw({
        draw: {
            marker: {
                repeatMode: true
            }
        },
        edit: {
            featureGroup: drawnItems
        }
    });
    map.addControl(drawControl);

    if(mapData.line) {
        drawnItems.addLayer(new L.polyline(mapData.line));
    }

    if(mapData.markers) {
        mapData.markers.forEach(function addEm(latLng, i, arr) {
            arr[i] = addMarker(latLng);
        });
    }

    registerHandlers();
}

function addMarker(latLng) {
    var layer = new InfoMarker(latLng, mapData, {draggable: true});
    drawnItems.addLayer(layer);
    return layer;
}

function registerHandlers() {
    map.on('draw:created', function (e) {
        var type = e.layerType,
            layer = e.layer;

        if (type === 'marker') {
            var infoMarker = addMarker(e.layer.getLatLng());
            mapData.markers.push(infoMarker);
            MarkerForm.show(infoMarker);
        }

        if(type == 'polyline') {
            mapData.line = e.layer.getLatLngs();
            mapapi.saveMap(mapData);
        }

        drawnItems.addLayer(layer);
    });

    map.on('draw:edited', function drawEdited(e) {
        e.layers.eachLayer(function eachLayer(layer) {
            if(layer instanceof L.Polyline) {
                mapData.line = layer.getLatLngs();
                mapapi.saveMap(mapData);    
            }
        });    
    });

    map.on('draw:deleted', function (e) {
        e.layers.eachLayer(function(layer) {
            mapapi.del(layer.marker);
        });
    });
}

function getQueryParams() {
    var query_string = {};
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        if (typeof query_string[pair[0]] === "undefined") {
          query_string[pair[0]] = pair[1];
        } else if (typeof query_string[pair[0]] === "string") {
          var arr = [ query_string[pair[0]], pair[1] ];
          query_string[pair[0]] = arr;
        } else {
          query_string[pair[0]].push(pair[1]);
        }
    }
    return query_string;
}