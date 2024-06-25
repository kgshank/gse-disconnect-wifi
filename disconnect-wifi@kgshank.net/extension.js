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
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import NM from 'gi://NM';
import GLib from 'gi://GLib';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {_log as _l, dump as _d, SignalManager, ssidToLabel} from './convenience.js';
import * as Prefs from './prefs.js';
//import * as Network from 'resource:///org/gnome/shell/ui/status/network.js'
//const Network = await import('resource:///org/gnome/shell/ui/status/network.js');

//const _l = Convenience._log
//const _d = Convenience.dump

const Gettext = imports.gettext.domain('disconnect-wifi');
const _ = Gettext.gettext;


const RECONNECT_TEXT = "Reconnect"
const SPACE = " ";

export default class WifiDisconnector extends Extension {
    enable() {
        this._nAttempts = 0;
        this._signalManager = new SignalManager();
        this._activeConnections = {};
        this._accessPoints = {};
        this._gsettings =  this.getSettings();
        // Note: Make sure don't initialize anything after this
        import('resource:///org/gnome/shell/ui/status/network.js').then(this._checkDevices.bind(this)).catch(error =>
            logError(error, 'Failed to setup quick settings'));
        /*
        this._checkDevices().catch(error =>
            logError(error, 'Failed to setup quick settings'));
*/
    }

    //async _checkDevices() {
    _checkDevices() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        _l("Check Devices")
        //await import('resource:///org/gnome/shell/ui/status/network.js');
        //const Main = await import('resource:///org/gnome/shell/ui/main.js');
        this._network = Main.panel.statusArea.quickSettings._network;
        _l(this._network._client)
        //_d(Main.panel.statusArea.quickSettings._indicators)
        if (this._network) {
            if (!this._network._client) {
                // Shell not initialized completely wait for max of
                // 100 * 1s
                if (this._nAttempts++ < 100) {
                    this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, this._checkDevices.bind(this));
                }
            } else {
                this._client = this._network._client;

                _l(this._network._wirelessToggle)
                for (let device of this._network._wirelessToggle._nmDevices) {
                    this._deviceAdded(this._client, device);
                }
                this._signalManager.addSignal(this._client, 'device-added', this._deviceAdded.bind(this));
                this._signalManager.addSignal(this._client, 'device-removed', this._deviceRemoved.bind(this));
                this._signalManager.addSignal(this._gsettings, "changed::" + Prefs.SHOW_RECONNECT_ALWAYS, this._setDevicesReconnectVisibility.bind(this));
            }
        }
    }

    _deviceAdded(client, device) {
        if (device.get_device_type() != NM.DeviceType.WIFI) {
            return;
        }

        if (device.active_connection) {
            this._activeConnections[device] = device.active_connection;
        }

        if (device.active_access_point) {
            this._accessPoints[device] = device.active_access_point;
        }
        this._addAllMenus(device);
    }

    _addAllMenus(device) {
        if (device) {
            _l("Adding menu..");

            /*
            if (!device._delegate) {
                _l("Device delegate not ready, waiting...");
                if (!device.timeout) {
                    device.timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => { this._addAllMenus(device) });
                    return true;
                } else {
                    return true;
                }
            }

            if (device.timeout) {
                GLib.source_remove(device.timeout);
                device.timeout = null;
            }*/

            //device.section.addMenuItem//

            /*
            this._mainSection = new PopupMenu.PopupMenuSection();
        this.add_child(this._mainSection.actor);

        this._submenuItem = new PopupMenu.PopupSubMenuMenuItem('', true);
        this._mainSection.addMenuItem(this._submenuItem);
        this._submenuItem.hide();

        this.section = new PopupMenu.PopupMenuSection();
        this._mainSection.addMenuItem(this.section);
*/
            var menuItem = this._network._wirelessToggle._items.get(device)
            _l(menuItem.name + menuItem._useSubmenu)
            //_d(menuItem)
            //menuItem.section.addMenuItem('Menu Item', () => console.log('activated'));
            var section2 = new PopupMenu.PopupMenuSection();
            menuItem._mainSection.box.add_child(section2.actor);
            //section2.addAction('Menu Item', () => console.log('activated'));
            _l("Addied menu..");
            _l(device)

            let menu = section2;

            if (!menuItem.disconnectItem) {
                menuItem.disconnectItem = menu.addAction(_("Disconnect"), () => device.disconnect(null));
                //menu.moveMenuItem(menuItem.disconnectItem, 2);
            }
            menuItem.disconnectItem.actor.visible = false;

            if (!menuItem.reconnectItem) {
                menuItem.reconnectItem = menu.addAction(_(RECONNECT_TEXT), () => { this._reconnect(device); });
                //menu.moveMenuItem(menuItem.reconnectItem, 3);
            }

            menuItem.reconnectItem.actor.visible = false;

            this._stateChanged(device, device.state, device.state, null);

            this._signalManager.addSignal(device, 'state-changed', this._stateChanged.bind(this));
        }
        return false;
    }

    _reconnect(device) {
        _l(device + "=Device")

        if (this._RtimeoutId) {
            _l("Removing Timeout");
            GLib.source_remove(this._RtimeoutId);
            this._RtimeoutId = null;
        }
        _l(device.state);

        if (device.state > NM.DeviceState.DISCONNECTED) {
            if (device.state != NM.DeviceState.DEACTIVATING && device.state != NM.DeviceState.DISCONNECTING) {
                device.disconnect(null);
            }
            _l("Adding Timeout");
            this._RtimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => this._reconnect(device));
        }
        else {
            let _activeConnection = this._activeConnections[device];

            if (_activeConnection) {
                this._client.activate_connection_async(_activeConnection.connection, device, null, null, null);
            } else {
                this._client.activate_connection_async(null, device, null, null, null);
            }
        }
    }

    _stateChanged(device, newstate, oldstate, reason) {
        _l(device + "---" + newstate + "---" + oldstate + "---" + reason)
        if (device.get_device_type() != NM.DeviceType.WIFI) {
            _l("Return :" +1)
            return;
        }

        if (device.active_connection) {
            this._activeConnections[device] = device.active_connection;
        }

        if (device.active_access_point) {
            this._accessPoints[device] = device.active_access_point;
        }

        var menuItem = this._network._wirelessToggle._items.get(device)

        if (!menuItem) {
            _l("Return :" +2)
            return;
        }

        if (menuItem.disconnectItem) {
            menuItem.disconnectItem.actor.visible
                = newstate > NM.DeviceState.DISCONNECTED;
                _l("Return :" + 4 + (newstate > NM.DeviceState.DISCONNECTED))
        }
        else {
            _l("Return :" +3)
        }

        this._setReconnectVisibility(device, newstate);
    }

    _setReconnectVisibility(device, state) {
        _l("Device Current State: " + state);
        var menuItem = this._network._wirelessToggle._items.get(device)
        if (menuItem.reconnectItem) {
            
            let showReconnect = this._gsettings.get_boolean(Prefs.SHOW_RECONNECT_ALWAYS);

            let accessPoint = this._accessPoints[device];
            menuItem.reconnectItem.label.text =
                (accessPoint && accessPoint.get_ssid()) ? _(RECONNECT_TEXT) + SPACE
                    + ssidToLabel(accessPoint.get_ssid()) : _(RECONNECT_TEXT);

                    menuItem.reconnectItem.actor.visible
                = (state == NM.DeviceState.DISCONNECTED || state == NM.DeviceState.DISCONNECTING || showReconnect);
                
        }
    }

    _deviceRemoved(client, device) {
        if (device.get_device_type() != NM.DeviceType.WIFI) {
            return;
        }
        if (this._activeConnections && this._activeConnections[device]) {
            this._activeConnections[device] = null;
        }

        if (this._accessPoints && this._accessPoints[device]) {
            this._accessPoints[device] = null;
        }

        var menuItem = this._network._wirelessToggle._items.get(device)

        if (!menuItem) {
            return;
        }

        if (menuItem.disconnectItem) {
            menuItem.disconnectItem.destroy();
            menuItem.disconnectItem = null;
        }

        if (menuItem.reconnectItem) {
            menuItem.reconnectItem.destroy();
            menuItem.reconnectItem = null;
        }

        this._signalManager.disconnectBySource(device);
    }

    _setDevicesReconnectVisibility() {
        if (this._network && this._network._wirelessToggle._nmDevices) {
            for (let device of this._network._wirelessToggle._nmDevices) {
                this._setReconnectVisibility(device, device.state);
            };
        }
    }

    disable() {
        if (this._network && this._network._wirelessToggle._nmDevices) {
            for (let device of this._network._wirelessToggle._nmDevices) {
                this._stateChanged(device, device.state, device.state, "");
            };
        }
        this._signalManager.disconnectAll();
    }
};
