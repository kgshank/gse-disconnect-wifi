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

//import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import NM from 'gi://NM';
//import Config from 'resource:///org/gnome/shell/misc/config.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

var DEBUG = true;

const _logWrap = (log != undefined)?log:global.log;

export class Signal{

    constructor(signalSource, signalName, callback) {
        this._signalSource = signalSource;
        this._signalName = signalName;
        this._signalCallback = callback;
    }

    connect(){
        this._signalId = this._signalSource.connectObject(this._signalName, this._signalCallback);
    }

    disconnect() {
        if(this._signalId) {
            GObject.Object.prototype.disconnect.call(this._signalSource, this._signalId);
            this._signalId = null;
        }
    }
}

export class SignalManager {

    constructor() {
        this._signalsBySource = new Map();
    }

    addSignal(signalSource, signalName, callback) {
        let obj = undefined;
        if(signalSource && signalName && callback) {
            obj = new Signal(signalSource, signalName, callback);
            obj.connect();
            
            if(!this._signalsBySource.has(signalSource)) {
                this._signalsBySource.set(signalSource, []);
            }
            this._signalsBySource.get(signalSource).push(obj);
        }
        return obj;
    }

    disconnectAll() {
        this._signalsBySource.forEach(signals => signals.forEach(obj => obj.disconnect()));
    }

    disconnectBySource(signalSource) {
        this._signalsBySource.get(signalSource)?.forEach(obj => obj.disconnect());        
    }
}

export function setLog(value) {
    DEBUG = value;
}

export function _log(msg) {
    if ( DEBUG == true ) {
        _logWrap("DWifi Debug: " + msg);
    }
}

export function dump(obj) {
    var propValue;
    for(var propName in obj) {
        try{		    
            propValue = obj[propName];
            _log(propName + ": " + propValue);
        }
        catch(e){_log(propName + "!!!Error!!!");}
    } 
}

export function ssidToLabel(ssid) {
    let label = NM.utils_ssid_to_utf8(ssid.get_data());
    if (!label)
        label = _('<unknown>');
    return label;
}