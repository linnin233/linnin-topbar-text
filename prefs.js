import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class LinninTopBarTextPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: 'Display Settings',
        });
        page.add(group);

        const textRow = new Adw.EntryRow({
            title: 'Text to Display',
            text: settings.get_string('text'),
        });
        textRow.connect('changed', () => {
            settings.set_string('text', textRow.text);
        });
        settings.connect('changed::text', () => {
            if (textRow.text !== settings.get_string('text')) {
                textRow.text = settings.get_string('text');
            }
        });
        group.add(textRow);

        const positionRow = new Adw.ComboRow({
            title: 'Position',
            model: new Gtk.StringList({
                strings: ['Left', 'Center', 'Right'],
            }),
            selected: positionToIndex(settings.get_string('position')),
        });
        positionRow.connect('notify::selected', () => {
            settings.set_string('position', indexToPosition(positionRow.selected));
        });
        settings.connect('changed::position', () => {
            const idx = positionToIndex(settings.get_string('position'));
            if (positionRow.selected !== idx) {
                positionRow.selected = idx;
            }
        });
        group.add(positionRow);

        const intervalRow = new Adw.SpinRow({
            title: 'Update Interval (seconds)',
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 60,
                step_increment: 1,
                value: settings.get_int('update-interval'),
            }),
            snap_to_ticks: true,
        });
        intervalRow.connect('changed', () => {
            settings.set_int('update-interval', parseInt(intervalRow.value) || 1);
        });
        settings.connect('changed::update-interval', () => {
            if (intervalRow.value !== settings.get_int('update-interval')) {
                intervalRow.value = settings.get_int('update-interval');
            }
        });
        group.add(intervalRow);

        const enableDynamicRow = new Adw.SwitchRow({
            title: 'Enable Dynamic Variables',
            subtitle: 'Process {time}, {date}, {cpu}, {memory}, {okbang}',
            active: settings.get_boolean('enable-dynamic'),
        });
        enableDynamicRow.connect('notify::active', () => {
            settings.set_boolean('enable-dynamic', enableDynamicRow.active);
        });
        settings.connect('changed::enable-dynamic', () => {
            if (enableDynamicRow.active !== settings.get_boolean('enable-dynamic')) {
                enableDynamicRow.active = settings.get_boolean('enable-dynamic');
            }
        });
        group.add(enableDynamicRow);

        const apiGroup = new Adw.PreferencesGroup({
            title: 'API Settings',
        });
        page.add(apiGroup);

        const apiUrlRow = new Adw.EntryRow({
            title: 'API URL',
            text: settings.get_string('api-url'),
        });
        apiUrlRow.connect('changed', () => {
            settings.set_string('api-url', apiUrlRow.text);
        });
        settings.connect('changed::api-url', () => {
            if (apiUrlRow.text !== settings.get_string('api-url')) {
                apiUrlRow.text = settings.get_string('api-url');
            }
        });
        apiGroup.add(apiUrlRow);

        const apiIntervalRow = new Adw.SpinRow({
            title: 'API Fetch Interval (seconds)',
            adjustment: new Gtk.Adjustment({
                lower: 10,
                upper: 3600,
                step_increment: 10,
                value: settings.get_int('api-interval'),
            }),
            snap_to_ticks: true,
        });
        apiIntervalRow.connect('changed', () => {
            settings.set_int('api-interval', parseInt(apiIntervalRow.value) || 60);
        });
        settings.connect('changed::api-interval', () => {
            if (apiIntervalRow.value !== settings.get_int('api-interval')) {
                apiIntervalRow.value = settings.get_int('api-interval');
            }
        });
        apiGroup.add(apiIntervalRow);

        const helpGroup = new Adw.PreferencesGroup({
            title: 'Dynamic Variables',
        });
        page.add(helpGroup);

        const helpRow = new Adw.ActionRow({
            title: 'Available Variables',
            subtitle: '{time} - Current time\n{date} - Current date\n{cpu} - CPU usage\n{memory} - Memory usage\n{okbang} - Sentence from API',
        });
        helpGroup.add(helpRow);

        window._settings = settings;
    }
}

function positionToIndex(position) {
    switch (position) {
        case 'left': return 0;
        case 'center': return 1;
        case 'right': return 2;
        default: return 2;
    }
}

function indexToPosition(index) {
    switch (index) {
        case 0: return 'left';
        case 1: return 'center';
        case 2: return 'right';
        default: return 'right';
    }
}