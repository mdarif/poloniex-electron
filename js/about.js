(() => {
	const remote = require('electron').remote;
	const mainWindow = remote.getCurrentWindow();

	function bindEvents() {
		$('#close-btn').on('click', () => mainWindow.close());
	}

	function init() {
		bindEvents();
	}

	init();

})();