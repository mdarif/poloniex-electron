const fs = require('fs');
const extend = require('extend');
const Q = require('q');
const file = './config.json';

function readSettings() {
	var defer = Q.defer();

	fs.readFile(file, 'utf-8', function(err, data) {
		if(err) defer.reject(new Error(err));

		defer.resolve( JSON.parse(data) );
	});

	return defer.promise;
}

function updateSetting(newSettings) {
	var defer = Q.defer();
	
	readSettings().then(function(settings) {
		settings = extend(settings, newSettings);

		fs.writeFile(file, JSON.stringify(settings), 'utf8', (err) => {
			if(err) defer.reject(new Error(err));

			defer.resolve();
		});
	});

	return defer.promise;
}

module.exports = {
	read: readSettings,
	update: updateSetting
};