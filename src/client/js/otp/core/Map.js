/* This program is free software: you can redistribute it and/or
   modify it under the teMap.jsrms of the GNU Lesser General Public License
   as published by the Free Software Foundation, either version 3 of
   the License, or (at your option) any later version.
   
   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
   
   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>. 
*/

otp.namespace("otp.core");

otp.core.Map = otp.Class({

    webapp          : null,

    lmap            : null,
    layerControl    : null,
    
    contextMenu             : null,
    contextMenuModuleItems  : null,
    contextMenuLatLng       : null,
    
    baseLayers  : {},
    
    initialize : function(webapp) {
        var this_ = this;
        this.webapp = webapp;
                
        //var baseLayers = {};
        var defaultBaseLayer = null;
        
        for(var i=0; i<otp.config.baseLayers.length; i++) { //otp.config.baseLayers.length-1; i >= 0; i--) {
            var layerConfig = otp.config.baseLayers[i];

            var layerProps = { };
            if(layerConfig.attribution) layerProps['attribution'] = layerConfig.attribution;
            if(layerConfig.subdomains) layerProps['subdomains'] = layerConfig.subdomains;

            var layer = new L.TileLayer(layerConfig.tileUrl, layerProps);

                this.baseLayers[layerConfig.name] = layer;
            if(i == 0) defaultBaseLayer = layer;            
                
                if(typeof layerConfig.getTileUrl != 'undefined') {
                    layer.getTileUrl = otp.config.getTileUrl;
            }
        }
        
        var mapProps = { 
            layers  : [ defaultBaseLayer ],
            center : (otp.config.initLatLng || new L.LatLng(0,0)),
            zoom : (otp.config.initZoom || 2),
            zoomControl : false
        }
        if(otp.config.minZoom) mapProps['minZoom'] = otp.config.minZoom;  //_.extend(mapProps, { minZoom : otp.config.minZoom });
        if(otp.config.maxZoom) mapProps['maxZoom'] = otp.config.maxZoom; //_.extend(mapProps, { maxZoom : otp.config.maxZoom });
        
        this.lmap = new L.Map('map', mapProps);
        
        
      /*Locates user's current location if geoLocation in config.js is set to true*/
        var marker = new L.marker();
        var tempM = new L.marker();
        var accCircle = new L.circle();
        var tempA = new L.circle();
        count=0;
        
        if(otp.config.geoLocation){
                    this.lmap.locate({watch: true});
                    this.lmap.on('locationfound', onLocationFound);
            };
            
            /* sets a marker at the current location */
            function onLocationFound(e){            	
            	var locationSpot = L.Icon.extend({
            		options: {
            			iconUrl: resourcePath + 'images/locationSpot.svg',
            			iconSize: new L.Point(10,10),
            		}
            	});
            	count = count+1;
            	tempM = marker;
            	tempA = accCircle;
            	var locSpot = new locationSpot();
            	marker = L.marker(e.latlng,{icon : locSpot,}).bindPopup('Current Location');
            	accCircle = L.circle(e.latlng,e.accuracy,{color:"blue", opacity: .25, fillOpacity: .1, weight: 3});
            	//adds new marker and accuracy circle
            	this.addLayer(marker);
            	this.addLayer(accCircle);
            	//if statement will make it so the map only zooms on the first function call
            	if (count == 1){this.setView(e.latlng, 17);};
            	//following removes the last set of map markers on the last function call
            	this.removeLayer(tempM);
            	this.removeLayer(tempA);
            };
            
            /*Live Map stuff*/
            //Bull Runner Live Bus Icon
            var bullRunnerIcon = L.Icon.extend({
            	options: {
            		iconUrl : resourcePath + 'images/busLocation.png',
            		iconSize: new L.Point(15,15)
            	}
            });
            //Function to get the Vehicle Position information and set Markers
            var vehicles = {};
            function liveMap(){
            	//Pulls the Vehicle Positions from the Rest API 
            	var url = otp.config.hostname + '/' +  otp.config.restService + "/ws/vehicle_positions";
            	$.ajax(url, {
            			type: 'GET',
            			dataType: 'JSON',
            			async: false,
            			timeout: 30000,
            			success: function(data){
	            			var x;
	            			for (x = 0; x < data.vehicles.length; x++){
	            				//console.log("Vehicle "+x+": id:"+data.vehicles[x].id+" lat:"+data.vehicles[x].lat+" lon:"+data.vehicles[x].lon);
	            			}
	            			vehicles = data.vehicles;
	            			setMarkers();
            			}
            	});
            	//console.log(vehicles);
            };
            liveMap();
            
        	//Sets markers for each vehicle
            function setMarkers(){
				var v;
				for(v=0; v < vehicles.length; v++){
					var brIcon = new bullRunnerIcon();
					var coord = L.latLng(vehicles[v].lat,vehicles[v].lon);
					busMarkers = L.marker(coord,{icon : brIcon,}).bindPopup('Bus: ' + vehicles[v].id + " Route: " + vehicles[v].routeId).addTo(this_.lmap);
				}
            }
       
            
            /* here are the controls for layers and zooming on the map */
        L.control.layers(this.baseLayers).addTo(this.lmap);
        L.control.zoom({ position : 'topright' }).addTo(this.lmap);
        //this.lmap.addControl(new L.Control.Zoom({ position : 'topright' }));
        
      
        if(!otp.config.initLatLng) {
            var url = otp.config.hostname + '/' + otp.config.restService + '/metadata';
            $.ajax(url, {
                data: { routerId : otp.config.routerId },            
                dataType: 'JSON',
                success: function(data) {
                    this_.lmap.fitBounds([
                        [data.lowerLeftLatitude, data.lowerLeftLongitude],
                        [data.upperRightLatitude, data.upperRightLongitude]
                    ]);
                }
            });
        }
       

        /*var baseMaps = {
            'Base Layer' : tileLayer 
        };*/
        
        var overlays = { };
        
        if(typeof otp.config.overlayTileUrl != 'undefined') {
                    var overlayTileLayer = new L.TileLayer(otp.config.overlayTileUrl);
                    //this.lmap.addLayer(overlayTileLayer);
                    //overlays['Overlay'] = overlayTileLayer;
        }
        
        //this.layerControl = new L.Control.Layers(baseMaps, overlays);
        //this.layerControl.addTo(this.lmap);
        
        this.lmap.on('click', function(event) {
            webapp.mapClicked(event);        
        });

        this.lmap.on('viewreset', function(event) {
            webapp.mapBoundsChanged(event);        
        });

        this.lmap.on('dragend', function(event) {
            webapp.mapBoundsChanged(event);        
        });
        
        // setup context menu
        var this_ = this;
        
        this.contextMenu = new otp.core.MapContextMenu(this);
      
        this.activated = true;
        
    },
    
    addContextMenuItem : function(text, clickHandler) {
        this.contextMenu.addModuleItem(text, clickHandler);
    },
    
    activeModuleChanged : function(oldModule, newModule) {
        
        //console.log("actModChanged: "+oldModule+", "+newModule);
        
        // hide module-specific layers for "old" module, if applicable
        if(oldModule != null) {
            for(var layerName in oldModule.mapLayers) {
                
                var layer = oldModule.mapLayers[layerName];
                this.lmap.removeLayer(layer);                
                //this.layerControl.removeLayer(layer);
            }
        }

        // show module-specific layers for "new" module
        for(var layerName in newModule.mapLayers) {
            var layer = newModule.mapLayers[layerName];
            this.lmap.addLayer(layer);
            var this_ = this;
        }
        
        // change default BaseLayer, if specified
        if(newModule.defaultBaseLayer) {
            for(layerName in this.baseLayers) {
                var baseLayer = this.baseLayers[layerName];
                if(layerName == newModule.defaultBaseLayer)
                    this.lmap.addLayer(baseLayer, true);
                else 
                    this.lmap.removeLayer(baseLayer);
            }
        }
        
        // refresh the map context menu
        this.contextMenu.clearModuleItems();
        newModule.addMapContextMenuItems();
    },
    
    setBounds : function(bounds)
    {
            this.lmap.fitBounds(bounds);
    },
    
    $ : function() {
        return $("#map");
    },
    
    CLASS_NAME : "otp.core.Map"
});