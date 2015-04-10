const Lang = imports.lang;
const Main = imports.ui.main;
const GObject = imports.gi.GObject;
const NetworkManager = imports.gi.NetworkManager;
const NMClient = imports.gi.NMClient;
const Mainloop = imports.mainloop;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Gettext = imports.gettext.domain('disconnect-wifi');
const _ = Gettext.gettext;

function init() {
    Convenience.initTranslations("disconnect-wifi");
}

const WifiDisconnector = new Lang.Class({
    Name : 'WifiDisconnector',
    _init : function() {
        this._nAttempts = 0;
        this._wifiDevices = {};
	this._checkDevices();
    },
    
    _checkDevices : function() {
	if(this._timeoutId){
           Mainloop.source_remove(this._timeoutId);
           this._timeoutId = null;
        }
	let _network = Main.panel.statusArea.aggregateMenu._network;
        if (_network) {
            if (!_network._client || !_network._settings) {
                // Shell not initialised completely wait for max of
                // 100 * 1 sec
                if (this._nAttempts++ < 100) {
                    this._timeoutId = Mainloop.timeout_add(1000, Lang.bind(this,
                            this._checkDevices));
                }
            } else {
                this._client = _network._client;
                this._settings = _network._settings;
                this._deviceAddedId = this._client.connect(
                        'device-added', Lang.bind(this,
                                this._deviceAdded));
                this._deviceRemovedId = this._client.connect(
                        'device-removed', Lang.bind(this,
                                this._deviceRemoved));
                let _nmDevices = _network._nmDevices;
    
                for ( var i = 0; i < _nmDevices.length; i++) {
                    this._deviceAdded(this._client, _nmDevices[i]);
                }
            }
        }
    },
    
    _deviceAdded : function(client, device) {
        if (device.get_device_type() != NetworkManager.DeviceType.WIFI) {
            return;
        }

        let _this = this;
        this._wifiDevices[device.udi] = new Object();
        if(this._wifiDevices[device.udi].timeoutId){
            Mainloop.source_remove(this._wifiDevices[device.udi].timeoutId);
            this._wifiDevices[device.udi].timeoutId = null;
        }
        if (!device._delegate) {
            this._wifiDevices[device.udi].timeoutId = Mainloop.timeout_add(1000, function() {
                _this._deviceAdded(client, device);
            });
            return;
        }
    
        this._wifiDevices[device.udi].device = device;
        let wrapper = device._delegate;
    
        if (!this._wifiDevices[device.udi].disconnectItem) {
            
            this._wifiDevices[device.udi].disconnectItem 
                    = wrapper.item.menu.addAction(_("Disconnect"), 
                            function() {
                                device.disconnect(null, null);
                            });
                   
        }

        if (!this._wifiDevices[device.udi].reconnectItem) {
           
            this._wifiDevices[device.udi].reconnectItem 
                    = wrapper.item.menu.addAction("", 
                            function() {
                                _this._reconnect(device);
                            });
        } 
        this._stateChanged(device, device.state, device.state, null);   
    
        if (!this._wifiDevices[device.udi].stateChangeId) {
            this._wifiDevices[device.udi].stateChangeId
                = device.connect('state-changed', Lang.bind(this, this._stateChanged));
        }

    },

    _reconnect : function(device) {
        if (this._wifiDevices[device.udi].active_connection) {
            this._client.activate_connection(
                this._settings.get_connection_by_path(this._wifiDevices[device.udi].active_connection.connection),
                     device,null,null,null);
        } else {
            this._client.activate_connection(null,device,null,null,null);
        }
    },

    _stateChanged :  function(device, newstate, oldstate, reason) {
    	if (device.get_device_type() != NetworkManager.DeviceType.WIFI) {
            return;
        }
    	
        if (this._wifiDevices[device.udi].disconnectItem) {
            this._wifiDevices[device.udi].disconnectItem.actor.visible 
                    = (newstate > NetworkManager.DeviceState.DISCONNECTED);
        }

        if (device.active_access_point) {
            this._wifiDevices[device.udi].accessPoint = device.active_access_point;
        }

        if (device.active_connection) {
            this._wifiDevices[device.udi].active_connection = device.active_connection;
        }

        if (this._wifiDevices[device.udi].reconnectItem) {
            this._wifiDevices[device.udi].reconnectItem.actor.visible 
                    = (newstate == NetworkManager.DeviceState.DISCONNECTED) 
                         && this._wifiDevices[device.udi].active_connection;
            this._wifiDevices[device.udi].reconnectItem.label.text = 
                    (this._wifiDevices[device.udi].accessPoint) ? _("Reconnect")+" " 
                    + imports.ui.status.network.ssidToLabel(this._wifiDevices[device.udi].accessPoint.get_ssid()) : _("Reconnect");
        }
    },
    
    _deviceRemoved : function(client, device) {
        if (device.get_device_type() != NetworkManager.DeviceType.WIFI) {
            return;
        }

        if (this._wifiDevices[device.udi].disconnectItem) {
            this._wifiDevices[device.udi].disconnectItem.destroy();
            this._wifiDevices[device.udi].disconnectItem = null;
        }

        if (this._wifiDevices[device.udi].reconnectItem) {
            this._wifiDevices[device.udi].reconnectItem.destroy();
            this._wifiDevices[device.udi].reconnectItem = null;
        }

        if (this._wifiDevices[device.udi].stateChangeId) {
            GObject.Object.prototype.disconnect.call(device,
                    this._wifiDevices[device.udi].stateChangeId);
            this._wifiDevices[device.udi].stateChangeId = null;
        }

        if (this._wifiDevices[device.udi].device) {
            this._wifiDevices[device.udi].device = null;
        }
        delete this._wifiDevices[device.udi];
    },

    destroy : function() {
        for ( var udi in this._wifiDevices) {
            if (this._wifiDevices.hasOwnProperty(udi)) {
                this._deviceRemoved(this._client,
                        this._wifiDevices[udi].device);
            }
        }
        this._client.disconnect(this._deviceAddedId);
        this._client.disconnect(this._deviceRemovedId);
    }
});

let _instance;
function enable() {
    _instance = new WifiDisconnector();
}

function disable() {
    _instance.destroy();
    _instance = null;
}

