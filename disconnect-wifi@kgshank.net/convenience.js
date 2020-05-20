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

const Gettext = imports.gettext;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;

var DEBUG = true;

const _logWrap = (log != undefined)?log:global.log;

/**
 * initTranslations:
 * 
 * @domain: (optional): the gettext domain to use
 * 
 * Initialize Gettext to load translations from extensionsdir/locale. If
 * @domain is not provided, it will be taken from metadata['gettext-domain']
 */
function initTranslations(domain) {
    let extension = ExtensionUtils.getCurrentExtension();

    domain = domain || extension.metadata['gettext-domain'];

    // check if this extension was built with "make zip-file", and thus
    // has the locale files in a subfolder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell
    let localeDir = extension.dir.get_child('locale');
    if (localeDir.query_exists(null))
        Gettext.bindtextdomain(domain, localeDir.get_path());
    else
        Gettext.bindtextdomain(domain, Config.LOCALEDIR);
}

function getSettings(schema) {
    let extension = ExtensionUtils.getCurrentExtension();

    schema = schema || extension.metadata['settings-schema'];

    const GioSSS = Gio.SettingsSchemaSource;

    // check if this extension was built with "make zip-file", and thus
    // has the schema files in a sub-folder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell (and therefore schemas are available
    // in the standard folders)
    let schemaDir = extension.dir.get_child('schemas');
    let schemaSource;
    if (schemaDir.query_exists(null))
        schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),GioSSS.get_default(),false);
    else
        schemaSource = GioSSS.get_default();

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj)
        throw new Error('Schema ' + schema + ' could not be found for extension '
                + extension.metadata.uuid + '. Please check your installation.');

    return new Gio.Settings({ settings_schema: schemaObj });
}

var Signal =  class Signal{

    constructor(signalSource, signalName, callback) {
        this._signalSource = signalSource;
        this._signalName = signalName;
        this._signalCallback = callback;
    }

    connect(){
        this._signalId = this._signalSource.connect(this._signalName, this._signalCallback);
    }

    disconnect() {
        if(this._signalId) {
            GObject.Object.prototype.disconnect.call(this._signalSource, this._signalId);
            this._signalId = null;
        }
    }
}

var SignalManager = class SignalManager {

    constructor() {
        this._signals = [];
        this._signalsBySource = {};
    }

    addSignal(signalSource, signalName, callback) {
        let obj = null;
        if(signalSource && signalName && callback) {
            obj = new Signal(signalSource, signalName, callback);
            obj.connect();
            this._signals.push(obj);
            if(!this._signalsBySource[signalSource]) {
                this._signalsBySource[signalSource] = [];
            }
            let item = this._signalsBySource[signalSource];
            item.push(obj);
        }
        return obj;
    }

    disconnectAll() {
        this._signals.forEach(function(obj) {obj.disconnect();});
    }

    disconnectBySource(signalSource) {
        if(this._signalsBySource[signalSource]) {
            let signalBySource = this._signalsBySource[signalSource];
            signalBySource.forEach(function(obj) {obj.disconnect();});
        }
    }
}


function setLog(value) {
    DEBUG = value;
}

function _log(msg) {
    if ( DEBUG == true ) {
        _logWrap("DWifi Debug: " + msg);
    }
}

function dump(obj) {
    var propValue;
    for(var propName in obj) {
        try{		    
            propValue = obj[propName];
            _log(propName + propValue);
        }
        catch(e){_log(propName + "!!!Error!!!");}
    } 
}
