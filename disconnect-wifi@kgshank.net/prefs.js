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

import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import * as Constants from './definitions.js';
//import {_log as _l, dump as _d, SignalManager} from './convenience.js';

var SETTINGS_SCHEMA = "org.gnome.shell.extensions.disconnect-wifi";


export default class DWifiPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Create a preferences page, with a single group
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Appearance'),
            description: _('Configure the appearance of the extension'),
        });
        page.add(group);

        // Create a new preferences row
        var row = new Adw.SwitchRow({
            title: _('Show Reconnect option always'),
            subtitle: _('Show the reconnect option even when a Wifi network is connected'),
        });
        group.add(row);

        // Create a settings object and bind the row to the `show-indicator` key
        window._settings = this.getSettings();
        window._settings.bind(Constants.SHOW_RECONNECT_ALWAYS, row, 'active',
            Gio.SettingsBindFlags.DEFAULT);

        row = new Adw.SwitchRow({
            title: _('Enable Debug'),
            subtitle: _('Enable this option to show the debug messages'),
        });
        group.add(row);

        // Create a settings object and bind the row to the `show-indicator` key
        window._settings = this.getSettings();
        window._settings.bind(Constants.ENABLE_DEBUG, row, 'active',
            Gio.SettingsBindFlags.DEFAULT);
    }
}