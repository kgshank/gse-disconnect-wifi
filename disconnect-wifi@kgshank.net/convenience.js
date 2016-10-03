/******************************************************************************
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

Orignal Author: Gopi Sankar Karmegam
******************************************************************************/
    	
const Lang = imports.lang;
const Gettext = imports.gettext;

const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;

/**
 * initTranslations:
 * @domain: (optional): the gettext domain to use
 *
 * Initialize Gettext to load translations from extensionsdir/locale.
 * If @domain is not provided, it will be taken from metadata['gettext-domain']
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



const Signal = new Lang.Class({
    Name: 'Signal',

    _init: function(signalSource, signalName, callback) {
        this._signalSource = signalSource;
        this._signalName = signalName;
        this._signalCallback = callback;
    },

    connect: function() {
        this._signalId = this._signalSource.connect(this._signalName, this._signalCallback);
    },

    disconnect: function() {
        if(this._signalId) {
            this._signalSource.disconnect(this._signalId);
            this._signalId = null;
        }
    }
});

const SignalManager = new Lang.Class({
	Name: 'SignalManager',

	_init: function() {
		this._signals = [];
		this._signalsBySource = {};
	},

	addSignal: function(signalSource, signalName, callback) {
		let obj = null;
		if(signalSource && signalName && callback) {
            obj = new Signal(signalSource, signalName, callback);
            obj.connect();
            this._signals.push(obj);
            if(!this._signalsBySource[signalSource]) {
            	this._signalsBySource[signalSource] = [];
            }
            this._signalsBySource[signalSource].push(obj)
        }
		return obj;
    },

    disconnectAll: function() {
        this._signals.forEach(function(obj) {obj.disconnect();});
    },
    
    disconnectBySource: function() {
    	if(this._signalsBySource[signalSource]) {
    		this._signalsBySource[signalSource].forEach(function(obj) {obj.disconnect();});
        }
    }
});