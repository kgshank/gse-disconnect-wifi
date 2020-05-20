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
/* jshint moz:true */

const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.convenience;
const SignalManager = Lib.SignalManager;

var SETTINGS_SCHEMA = "org.gnome.shell.extensions.disconnect-wifi";
var SHOW_RECONNECT_ALWAYS = "show-reconnect-always";

const _l = Lib._log;

function init() {
}

const DWifiSettingsWidget = new GObject.Class({
    Name : 'DWifi.Prefs.Widget',
    GTypeName : 'DWifiSettingsWidget',
    Extends : Gtk.Box,

    _init : function(params) {
        this.parent(params);
        this.orientation = Gtk.Orientation.VERTICAL;
        this.spacing = 0;

        // creates the settings
        this._settings = Lib.getSettings(SETTINGS_SCHEMA);

        // creates the ui builder and add the main resource file
        let uiFilePath = Me.path + "/ui/dwifi-prefs-dialog.glade";
        let builder = new Gtk.Builder();

        if (builder.add_from_file(uiFilePath) == 0) {

            let label = new Gtk.Label({
                label : _("Could not load the preferences UI file"),
                vexpand : true
            });

            this.pack_start(label, true, true, 0);
        } else {
            _l('JS LOG:_UI file receive and load: ' + uiFilePath);

            let mainContainer = builder.get_object("main-container");

            this.pack_start(mainContainer, true, true, 0);

            this._signalManager = new SignalManager();

            let showReconnectAlwaysSwitch = builder
                    .get_object("show-reconnect-always");

            this._settings.bind(SHOW_RECONNECT_ALWAYS,
                    showReconnectAlwaysSwitch, "active",
                    Gio.SettingsBindFlags.DEFAULT);
        }
    }
});

function buildPrefsWidget() {
    let _settingsWidget = new DWifiSettingsWidget();
    _settingsWidget.show_all();

    return _settingsWidget;
}
