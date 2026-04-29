import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const TopBarTextIndicator = GObject.registerClass(
    class TopBarTextIndicator extends PanelMenu.Button {
        _init(settings) {
            super._init(0.0, 'Linnin TopBar Text');

            this._settings = settings;
            this._label = new St.Label({
                text: '',
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'panel-button',
            });
            this.add_child(this._label);

            this._timeoutId = null;
            this._apiTimeoutId = null;
            this._settingsConnections = [];

            this._sentenceText = this._settings.get_string('sentence-text') || '';
            this._sentenceFrom = this._settings.get_string('sentence-from') || '';

            this._settingsConnections.push(
                this._settings.connect('changed::text', () => this._updateText())
            );
            this._settingsConnections.push(
                this._settings.connect('changed::update-interval', () => this._startTimer())
            );
            this._settingsConnections.push(
                this._settings.connect('changed::enable-dynamic', () => this._updateText())
            );
            this._settingsConnections.push(
                this._settings.connect('changed::api-interval', () => this._startApiTimer())
            );

            this._updateText();
            this._startTimer();
            this._fetchSentence();
            this._startApiTimer();
        }

        _startTimer() {
            if (this._timeoutId) {
                GLib.source_remove(this._timeoutId);
                this._timeoutId = null;
            }

            const interval = this._settings.get_int('update-interval');
            if (interval > 0 && this._settings.get_boolean('enable-dynamic')) {
                this._timeoutId = GLib.timeout_add_seconds(
                    GLib.PRIORITY_DEFAULT,
                    interval,
                    () => {
                        this._updateText();
                        return GLib.SOURCE_CONTINUE;
                    }
                );
            }
        }

        _startApiTimer() {
            if (this._apiTimeoutId) {
                GLib.source_remove(this._apiTimeoutId);
                this._apiTimeoutId = null;
            }

            const interval = this._settings.get_int('api-interval');
            if (interval > 0) {
                this._apiTimeoutId = GLib.timeout_add_seconds(
                    GLib.PRIORITY_DEFAULT,
                    interval,
                    () => {
                        this._fetchSentence();
                        return GLib.SOURCE_CONTINUE;
                    }
                );
            }
        }

        _fetchSentence() {
            const url = this._settings.get_string('api-url');
            if (!url) return;

            try {
                const proc = Gio.Subprocess.new(
                    ['curl', '-s', '--noproxy', '*', url],
                    Gio.SubprocessFlags.STDOUT_PIPE
                );
                proc.communicate_utf8_async(null, null, (proc, res) => {
                    try {
                        const [, stdout] = proc.communicate_utf8_finish(res);
                        if (stdout) {
                            const json = JSON.parse(stdout);
                            if (json.code === 200 && json.data) {
                                this._sentenceText = json.data.okbang || '';
                                this._sentenceFrom = json.data.fromWho || '';
                                this._settings.set_string('sentence-text', this._sentenceText);
                                this._settings.set_string('sentence-from', this._sentenceFrom);
                                this._updateText();
                            }
                        }
                    } catch (e) {
                        log(`Linnin TopBar Text: Failed to parse response: ${e}`);
                    }
                });
            } catch (e) {
                log(`Linnin TopBar Text: Failed to fetch sentence: ${e}`);
            }
        }

        _getCpuUsage() {
            try {
                const file = Gio.File.new_for_path('/proc/stat');
                const [success, contents] = file.load_contents(null);
                const lines = new TextDecoder().decode(contents).split('\n');
                const cpuLine = lines[0];
                const parts = cpuLine.split(/\s+/);
                const user = parseInt(parts[1]) || 0;
                const nice = parseInt(parts[2]) || 0;
                const system = parseInt(parts[3]) || 0;
                const idle = parseInt(parts[4]) || 0;
                const total = user + nice + system + idle;
                const used = user + nice + system;
                return total > 0 ? Math.round((used / total) * 100) : 0;
            } catch (e) {
                return 0;
            }
        }

        _getMemoryUsage() {
            try {
                const file = Gio.File.new_for_path('/proc/meminfo');
                const [success, contents] = file.load_contents(null);
                const lines = new TextDecoder().decode(contents).split('\n');
                let total = 0, available = 0;
                for (const line of lines) {
                    if (line.startsWith('MemTotal:')) {
                        total = parseInt(line.split(/\s+/)[1]) || 0;
                    } else if (line.startsWith('MemAvailable:')) {
                        available = parseInt(line.split(/\s+/)[1]) || 0;
                    }
                }
                if (total > 0) {
                    const used = total - available;
                    return Math.round((used / total) * 100);
                }
                return 0;
            } catch (e) {
                return 0;
            }
        }

        _updateText() {
            let text = this._settings.get_string('text');

            if (this._settings.get_boolean('enable-dynamic')) {
                const now = new Date();
                text = text.replace(/{time}/g, now.toLocaleTimeString());
                text = text.replace(/{date}/g, now.toLocaleDateString());
                text = text.replace(/{cpu}/g, `${this._getCpuUsage()}%`);
                text = text.replace(/{memory}/g, `${this._getMemoryUsage()}%`);
                
                const okbangDisplay = this._sentenceText ? 
                    `${this._sentenceText}${this._sentenceFrom ? ' —— ' + this._sentenceFrom : ''}` : '';
                text = text.replace(/{okbang}/g, okbangDisplay);
            }

            this._label.set_text(text);
        }

        destroy() {
            if (this._timeoutId) {
                GLib.source_remove(this._timeoutId);
                this._timeoutId = null;
            }
            if (this._apiTimeoutId) {
                GLib.source_remove(this._apiTimeoutId);
                this._apiTimeoutId = null;
            }
            this._settingsConnections.forEach(conn => {
                this._settings.disconnect(conn);
            });
            this._settingsConnections = [];
            super.destroy();
        }
    }
);

export default class LinninTopBarTextExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._settings = null;
        this._positionConnection = null;
    }

    enable() {
        this._settings = this.getSettings();
        this._indicator = new TopBarTextIndicator(this._settings);

        const position = this._settings.get_string('position');
        this._addToPanel(position);

        this._positionConnection = this._settings.connect('changed::position', () => {
            const newPos = this._settings.get_string('position');
            this._indicator.container.get_parent()?.remove_child(this._indicator.container);
            this._addToPanel(newPos);
        });
    }

    _addToPanel(position) {
        const panelBox = position === 'left' ? Main.panel._leftBox :
                        position === 'center' ? Main.panel._centerBox :
                        Main.panel._rightBox;
        panelBox.add_child(this._indicator.container);
    }

    disable() {
        if (this._positionConnection) {
            this._settings.disconnect(this._positionConnection);
            this._positionConnection = null;
        }
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._settings = null;
    }
}