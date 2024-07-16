/*******************************************************************************
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <http://www.gnu.org/licenses/>.
 * *****************************************************************************
 * Original Author: Gopi Sankar Karmegam
 ******************************************************************************/

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension, gettext as _, ngettext, pgettext} from 'resource:///org/gnome/shell/extensions/extension.js';
import NM from 'gi://NM';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {QuickSettingsItem} from 'resource:///org/gnome/shell/ui/quickSettings.js';
import { _log as _l, dump as _d, SignalManager, ssidToLabel, setLog } from './convenience.js';
import * as Constants from './definitions.js';

const RECONNECT_TEXT = "Reconnect"
const SPACE = " ";

const ADD_TIMEOUT_KEY = "ADD_DEVICE"
const RECONNECT_TIMEOUT_KEY = "RECONNECT_DEVICE"
const AP_CHANGE_TIMEOUT_KEY = "AP_CHANGE_TIMEOUT_KEY"

class WifiDevice {
    constructor(_device, _network, _gsettings) {
        _l("WifiDevice constructor")
        this._device = _device;
        this._network = _network;
        this._gsettings = _gsettings;
        this._client = _network._client;
        this._activeConnection = _device.active_connection;
        //this.accessPoint = device.active_access_point;
        this._timeOuts = new Map();
        
        this._signalManager = new SignalManager();

        this._extDeviceMenuSection = new PopupMenu.PopupMenuSection();
                
        this._addAllMenus();
        this._signalManager.addSignal(this._gsettings, "changed::" + Constants.SHOW_RECONNECT_ALWAYS, this._setReconnectVisibility.bind(this));
    }

    _reconnect() {
        _l("Reconnect the device.." + this._device.get_permanent_hw_address())

        if (this._timeOuts.get(RECONNECT_TIMEOUT_KEY)) {
            _l("Removing Timeout");
            GLib.source_remove(this._timeOuts.get(RECONNECT_TIMEOUT_KEY));
            this._timeOuts.delete(RECONNECT_TIMEOUT_KEY)
        }

        if (this._device.state > NM.DeviceState.DISCONNECTED) {
            if (this._device.state != NM.DeviceState.DEACTIVATING && this._device.state != NM.DeviceState.DISCONNECTING) {
                this._device.disconnect(null);
            }
            _l("Adding Timeout");
            this._timeOuts.set(RECONNECT_TIMEOUT_KEY, GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, this._reconnect.bind(this)))
        }
        else {
            this._client.activate_connection_async((this._activeConnection?.connection || null), this._device, null, null, null);
        }
    }

    _getWifiMenuItem() {
        return this._network._wirelessToggle._items.get(this._device)
    }

    _addAllMenus() {
        if (this._timeOuts.has(ADD_TIMEOUT_KEY)) {
            _l("Removing device add Timeout");
            GLib.source_remove(this._timeOuts.get(ADD_TIMEOUT_KEY));
            this._timeOuts.delete(ADD_TIMEOUT_KEY)
        }

        _l("Adding menu..");
        var nmDeviceMenuItem = this._getWifiMenuItem();
        if (!nmDeviceMenuItem) {
            _l("Adding Timeout for new device");
            this._timeOuts.set(ADD_TIMEOUT_KEY, GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, this._addAllMenus.bind(this)))
            return;
        }
        _l(nmDeviceMenuItem.name + "---" + nmDeviceMenuItem._useSubmenu + "---" + nmDeviceMenuItem.get_vertical())

        this._extDeviceMenuSection.disconnectItem = this._extDeviceMenuSection.addAction(_("Disconnect"), this._disconnectDevice.bind(this));
        this._extDeviceMenuSection.disconnectItem.actor.visible = false;

        this._extDeviceMenuSection.reconnectItem = this._extDeviceMenuSection.addAction(_(RECONNECT_TEXT), this._reconnect.bind(this));
        this._extDeviceMenuSection.reconnectItem.actor.visible = false;
        
        nmDeviceMenuItem.set_vertical(true)
        nmDeviceMenuItem.add_child(this._extDeviceMenuSection.actor);
        this._signalManager.addSignal(nmDeviceMenuItem, 'notify::single-device-mode', this._sync.bind(this));
        this._signalManager.addSignal(this._device, 'state-changed', this._stateChanged.bind(this));
        this._signalManager.addSignal(this._device, 'notify::active-access-point', this._activeApChanged.bind(this))
        this._activeApChanged()
        this._stateChanged(this._device, this._device.state, this._device.state, undefined);
    }

    _activeApChanged(){
        _l("_activeApChanged ---")
        if (this._timeOuts.has(AP_CHANGE_TIMEOUT_KEY)) {
            _l("Removing device AP_CHANGE_TIMEOUT_KEY Timeout");
            GLib.source_remove(this._timeOuts.get(AP_CHANGE_TIMEOUT_KEY));
            this._timeOuts.delete(AP_CHANGE_TIMEOUT_KEY)
        }
        
        let newAccessPoint = this._device.active_access_point;
        if(!newAccessPoint || newAccessPoint == null || this.accessPoint == newAccessPoint){
            return;
        }
          
        this.accessPoint = newAccessPoint;
        var menuItem = this._getWifiMenuItem();
        if (!menuItem) {
            _l("Adding Timeout for new device");
            this._timeOuts.set(ADD_TIMEOUT_KEY, GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, this._addAllMenus.bind(this)))
            return;
        }

        _l("Find  DC menu..");
        let [network, apMenuItem]  = [...menuItem._networkItems.entries()]
            .find(([n]) => n.checkAccessPoint(this.accessPoint));

        _l(network);
        _l(apMenuItem);
       
        if (!apMenuItem) {
            _l("Adding Timeout for AP_CHANGE_TIMEOUT_KEY device");
            this._timeOuts.set(AP_CHANGE_TIMEOUT_KEY, GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, this._activeApChanged.bind(this)))
            return;
        }

        _l("Adding DC menu..");
        this.disconnectButton?.destroy();
        
        this.disconnectButton = new QuickSettingsItem({
            //style_class: 'icon-button',
            style_class: 'button',
            can_focus: true,
            icon_name : 'network-wireless-offline-symbolic',
            x_align: Clutter.ActorAlign.END,
            x_expand:true,
            label: _("Disconnect")
        });
        
        apMenuItem.add_child(this.disconnectButton)
        apMenuItem._label.y_align = Clutter.ActorAlign.CENTER
        this.disconnectButton.connect('clicked', this._disconnectDevice.bind(this));  
        this.disconnectButton.visible = false;  
    }

    _disconnectDevice() {
        this._device.disconnect(null);
    }

    _stateChanged(device, newstate, oldstate, reason) {
        _l(device.get_device_type() + "---" + newstate + "---" + oldstate + "---"+ device.state+ "---" + reason)
        if (device.get_device_type() != NM.DeviceType.WIFI) {
            _l("Return :" + 1)
            return;
        }

        if(device.active_connection) {
            this._activeConnection = device.active_connection;
        }

        this._sync();
           
        /*if(device.active_access_point) {
            this.accessPoint = device.active_access_point;
        }*/
    }

    _setReconnectVisibility() {
        let state = this._device.state;
        _l("Device Current State: " + state);

        let showReconnect = this._gsettings.get_boolean(Constants.SHOW_RECONNECT_ALWAYS);

        _l(this.accessPoint);
        _l(this._device.accessPoint);
        this._extDeviceMenuSection.reconnectItem.label.text =
            (this.accessPoint && this.accessPoint.get_ssid()) ? _(RECONNECT_TEXT) + SPACE
                + ssidToLabel(this.accessPoint.get_ssid()) : _(RECONNECT_TEXT);

        this._extDeviceMenuSection.reconnectItem.actor.visible
            = (state > NM.DeviceState.UNAVAILABLE && (showReconnect || state == NM.DeviceState.DISCONNECTED || state == NM.DeviceState.DISCONNECTING ));
    }

    /*_setDevicesReconnectVisibility() {
        this._devices.forEach((_myDevice) => this._setReconnectVisibility(_myDevice, _myDevice.device.state));
    }*/

    _sync(){
        this._extDeviceMenuSection.disconnectItem.actor.visible = (this._device.state > NM.DeviceState.DISCONNECTED) && !this._extDeviceMenuSection.actor.get_parent()?.singleDeviceMode;

        if(this.disconnectButton){
            this.disconnectButton.visible = this._device.state > NM.DeviceState.DISCONNECTED;            
        }

        this._setReconnectVisibility();
    }

    destroy(){
        this._getWifiMenuItem(this._device)?.set_vertical(false)
        this._timeOuts.forEach(GLib.source_remove);
        this._extDeviceMenuSection.destroy();  

        this.disconnectButton?.destroy();              
    } 
}

export default class WifiDisconnector extends Extension {
    enable() {
        _l("Extension enable")
        this._gsettings = this.getSettings();
        setLog(this._gsettings.get_boolean(Constants.ENABLE_DEBUG))
        this._nAttempts = 0;
        this._signalManager = new SignalManager();
        this._devices = new Map();
        // Note: Make sure don't initialize anything after this
        (async () => {
            try {
                await import('resource:///org/gnome/shell/ui/status/network.js')
                this._checkDevices();
            }
            catch (error) {
                _l(error)
            }
        })();
    }

    _checkDevices() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            delete this._timeoutId;
        }
        _l("Check Devices")
        this._network = Main.panel.statusArea.quickSettings._network;
        if (this._network) {
            if (!this._network._client) {
                // Shell not initialized completely wait for max of
                // 100 * 1s
                if (this._nAttempts++ < 100) {
                    this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, this._checkDevices.bind(this));
                }
            } else {
                _l(this._network._client)
                this._client = this._network._client;
                this._wirelessToggle = this._network._wirelessToggle
                _l(this._network._wirelessToggle)
                this._wirelessToggle._nmDevices.forEach((device) => this._deviceAdded(this._client, device));
                this._signalManager.addSignal(this._client, 'device-added', this._deviceAdded.bind(this));
                this._signalManager.addSignal(this._client, 'device-removed', this._deviceRemoved.bind(this));                
                this._signalManager.addSignal(this._gsettings, "changed::" + Constants.ENABLE_DEBUG, () => setLog(this._gsettings.get_boolean(Constants.ENABLE_DEBUG)));
            }
        }
    }

    _deviceAdded(client, device) {
        if (device.get_device_type() != NM.DeviceType.WIFI) {
            return;
        }

        _l("Adding the device.." + device.get_permanent_hw_address())

        this._getWifiDevice(device, true);       
    }    

    _getWifiDevice(device, createNewOnNull = true) {
        var _myDevice = this._devices.get(device);
        if (!_myDevice && createNewOnNull) {
            _myDevice = new WifiDevice(device, this._network, this._gsettings);
            this._devices.set(device, _myDevice);
        }

        return _myDevice;
    }

    _deviceRemoved(client, device) {
        if (device.get_device_type() != NM.DeviceType.WIFI) {
            return;
        }
        _l("Removing the device.." + device.get_permanent_hw_address())
        
        this._removeDeviceUI(this._getWifiDevice(device, false))
    }

    _removeDeviceUI(_myDevice) {
        if (!_myDevice) {
            return;
        }
        
        _myDevice.destroy();
        this._signalManager.disconnectBySource(_myDevice.device);
    }    

    disable() {
        _l("Extension disable")
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);            
        }
        this._devices.forEach(this._removeDeviceUI.bind(this));
        this._signalManager.disconnectAll();
    }
};
