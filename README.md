# Gnome Shell Extension - Disconnect Wifi
Adds Disconnect option for Wireless devices

### Installation Instructions

The official method to install this extension is from [extensions.gnome.org](https://extensions.gnome.org/extension/904/disconnect-wifi/).

To install the extension from source, clone the repository and place it in the `$HOME/.local/share/gnome-shell/extensions` directory
```bash
cd ~/.local/share/gnome-shell/extensions/

# Remove older version
rm -rf "*disconnect-wifi@kgshank.net*"

# Clone current version
git clone https://github.com/kgshank/gse-disconnect-wifi.git

# Install it
cp -r gse-disconnect-wifi/disconnect-wifi@kgshank.net .
rm -rf "gse-disconnect-wifi"
```

Enable the extensions from [GNOME Tweaks](https://wiki.gnome.org/Apps/Tweaks).

### Gnome shell versions compatible
* 41
* 40
* 3.38
* 3.36
* 3.34
* 3.32
* For older versions install from [extensions.gnome.org](https://extensions.gnome.org/extension/904/disconnect-wifi/).

### [Change log](CHANGELOG.md)


