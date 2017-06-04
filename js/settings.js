(() => {
	const fs = require('fs');
	const settingsHandler = require('./settings-handler');
	const {remote, ipcRenderer} = require('electron');
	const mainWindow = remote.getCurrentWindow();
	
	var settings = {};

	function readSettings() {
		settingsHandler.read().then(function(data) {
			settings = data;
			updateSettings();
		});
	}

	function updateSettings() {
		$('#api-key').val(settings.apikey);
		$('#secret').val(settings.secret);
	}

	function bindEvents() {
		$('#close-btn').on('click', () => mainWindow.close());
		$('#save').on('click', () => onSave());
	}

	function onSave() {
		settings.apikey = $('#api-key').val();
		settings.secret = $('#secret').val();

		settingsHandler.update({
			apikey: settings.apikey,
			secret: settings.secret
		}).then(() => {
			ipcRenderer.send('message', 'true');
			mainWindow.close();
		});
	}

	function init() {
		updateSettings();
		readSettings();
		bindEvents();
	}

	init();
})();