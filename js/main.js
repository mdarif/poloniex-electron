(() => {
	const path = require('path');
	const url = require('url');
	const cryptoJs = require('crypto');
	const settingsHandler = require('./settings-handler');
	const {remote} = require('electron');
	const mainWindow = remote.getCurrentWindow();
	const $balanceSheetTable = $('#balance-sheet-table');

	var settings = {};

	function openChildWindow(page, width, height) {
		let child = new remote.BrowserWindow({
			width: width,
			height: height,
			parent: mainWindow,
			modal: true,
			show: false,
			alwayOnTop: true,
			frame: false
		});

		child.webContents.openDevTools();

		child.loadURL(url.format({
			pathname: path.join(__dirname + '/' + page),
			protocol: 'file',
			slashes: true
		}));

		child.once('ready-to-show', () => {
			child.show();
		});
	}

	function onMaximize() {
		if (!mainWindow.isMaximized()) {
			mainWindow.maximize();          
		} else {
			mainWindow.unmaximize();
		}
	}

	function getBtcPriceZebpay() {
		var defer = $.Deferred();

    $.ajax({
      url: 'https://www.zebapi.com/api/v1/market/ticker/btc/inr',
      method: 'GET',
      success: defer.resolve,
      error: defer.reject
    });

    return defer.promise();
  }

  function getTickerAllMarkets() {
  	var defer = $.Deferred();

    $.ajax({
      url: 'https://poloniex.com/public?command=returnTicker',
      method: 'GET',
      success: defer.resolve,
      error: defer.reject
    });

    return defer.promise();
  }

  function getAccountBalances() {
  	var defer = $.Deferred();
  	var parameters  = {
			command: 'returnCompleteBalances',
			nonce: getNonce()
		};

		$.ajax({
			type: 'POST',
			url: 'https://poloniex.com/tradingApi',
			data: parameters,
			headers: getPoloniexHeaders(parameters),
			success: function(data) {
				var filteredData = {};

				if(data.error)
					defer.reject({
						responseText: JSON.Stringify(data.error)
					});

				Object.keys(data).forEach(function(key) {
					if(data[key].btcValue !== '0.00000000') filteredData[key] = data[key];
				});

				defer.resolve(filteredData);
			},
			error: defer.reject
		});

		return defer.promise();
  }

	function getOpenOrders() {
		var defer = $.Deferred();
		var parameters  = {
			command: 'returnOpenOrders',
			currencyPair: 'all',
			nonce: getNonce()
		};

		$.ajax({
			type: 'POST',
			url: 'https://poloniex.com/tradingApi',
			data: parameters,
			headers: getPoloniexHeaders(parameters),
			success: function(data) {
				var filteredData = {};

				if(data.error)
						defer.reject({
							responseText: JSON.Stringify(data.error)
						});

				Object.keys(data).forEach(function(key) {
					if(data[key].length) filteredData[key] = data[key];
				});

				defer.resolve(filteredData);
			},
			error: defer.reject
		});

		return defer.promise();
	}

	function getNonce() {
		settings.nonce++;

		settingsHandler.update({
			nonce: settings.nonce
		})

		return settings.nonce;
	}

	function getPoloniexData() {
		$.when(
			getOpenOrders(),
			getBtcPriceZebpay(),
			getTickerAllMarkets()
		)
		.then((openOrders, zabpay, tickerAllMarkets) => {
			getAccountBalances().then(
				accountBalances => updateView(openOrders, zabpay, tickerAllMarkets, accountBalances)
			);
		})
		.fail((data) => {
			$('#ajax-error').removeClass('hidden-xs-up').html(
				JSON.parse(data.responseText).error
			);
		});
	}

	function updateView(openOrders, zabpay, tickerAllMarkets, accountBalances) {
		var html = '';
		var totalBtcLastPrice = 0;
		var zabpaySellPrice = zabpay[0].sell;
		var ordersTotalBtc = 0;

		Object.keys(accountBalances).forEach((key) => {
			var available = parseFloat(accountBalances[key].available);
			var onOrders = parseFloat(accountBalances[key].onOrders);
			var totalCoins = available + onOrders;
			var lastPrice = tickerAllMarkets[0]['BTC_' + key] ? tickerAllMarkets[0]['BTC_' + key].last : 0;
			var btcTotalLastPrice = lastPrice * totalCoins;
			var orders = {total:0, html: ''};
			var btcValueOrders = 0;

			if(openOrders['BTC_' + key]) {
				orders = getOrdersHtml(openOrders['BTC_' + key]);
			}

			btcValueOrders = orders.total + (available * lastPrice);

			if(key === 'BTC') {
				btcTotalLastPrice = available;
				btcValueOrders = available;
			}

			ordersTotalBtc += btcValueOrders;
			totalBtcLastPrice += btcTotalLastPrice;

			html += `<tr>\
										<td class="text-left">${key}</td>\
										<td>${available.toFixed(8)}</td>\
										<td>${onOrders}${orders.html}</td>\
										<td>${totalCoins.toFixed(8)}</td>\
										<td>${lastPrice}</td>\
										<td>${(btcTotalLastPrice).toFixed(8)}</td>\
										<td>${(btcValueOrders).toFixed(8)}</td>\
									</tr>`;
		});

		$balanceSheetTable.find('tbody').html(html);
		$('#total-btc').html(totalBtcLastPrice.toFixed(8));
		$('#zabpay-btc-sell-value').html(zabpaySellPrice);
		$('#total-btc-in-rs').html((totalBtcLastPrice * zabpaySellPrice).toFixed(2));
		$('#order-total-btc').html(ordersTotalBtc.toFixed(8));
		$('#btc-difference').html(
			Math.abs(totalBtcLastPrice - ordersTotalBtc).toFixed(8)
		);
		$('#total-order-btc-in-rs').html((ordersTotalBtc * zabpaySellPrice).toFixed(2));
		$('#total-diff-in-rs').html(
			(
				Math.abs(totalBtcLastPrice - ordersTotalBtc) * zabpaySellPrice
			).toFixed(2)
		);

		setTimeout(getPoloniexData, 1800);
	}

	function getOrdersHtml(orders) {
		var total = 0;
		var html = `<table class="orders-table">\
							<thead>\
								<tr>\
									<th>Amount</th>\
									<th>Rate</th>\
									<th>Total</th>\
								</tr>\
							</thead>\
							<tbody>\
							${orders.map(order => {
								total += parseFloat(order.total);

								return `<tr>\
									<td>${order.amount}</td>\
									<td>${order.rate}</td>\
									<td>${order.total}</td>\
								</tr>`;
							}).join('')}\
							</tbody>\
							<tfoot>\
								<tr>\
									<td class="text-left" colspan="2">Total</td>\
									<td>${total}</td>
								</tr>\
							</tfoot>\
						</table>`;

		return {
			total: total,
			html: html
		};
	}

	function getPoloniexHeaders(parameters) {
		var paramString, signature;

		paramString = Object.keys(parameters).map(function(param) {
	     return encodeURIComponent(param) + '=' + encodeURIComponent(parameters[param]);
	  }).join('&');

	  signature = cryptoJs.createHmac('sha512', settings.sceret).update(paramString).digest('hex');

	  return {
	    Key: settings.apikey,
	    Sign: signature
	  };
	}

	function getSettings() {
		settingsHandler.read().then(data => {
			settings = data;

			if(settings.apikey === "" || settings.sceret === "") {
				showSettingsDialog();
			} else {
				$balanceSheetTable.show();
				getPoloniexData();
			}
		});
	}

	function bindEvents() {
		$('#about-btn').on('click', () => openChildWindow('about.html', 400, 250));
		$('#settings-btn').on('click', () => showSettingsDialog());
		$('#minimize-win-btn').on('click', () => mainWindow.minimize());
		$('#maximize-win-btn').on('click', () => onMaximize());
		$('#close-win-btn').on('click', () => mainWindow.close());

		remote.ipcMain.on('message', (event, data) => {
			getSettings()
		});
	}

	function showSettingsDialog() {
		openChildWindow('settings.html', 600, 260)
	}

	function init() {
		getSettings();
		bindEvents();
	}

	init();
})();