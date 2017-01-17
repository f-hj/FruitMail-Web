var wsCtrl
var reconnectCb
var errorCb
var inError = false


var ws = {
	connect: () => {

		if (localServer) {
			wsCtrl = new WebSocket(localServer.replace('https', 'wss'))
		} else {
			wsCtrl = new WebSocket('ws://' + location.host)
		}

		wsCtrl.onopen = function() {
			console.log('WS opened');
			if (token.get()) {
				ws.send({
					a: 'token',
					token: token.get()
				})
			}
			if (reconnectCb && inError) {
				reconnectCb()
				inError = false
			}
		}

		wsCtrl.onerror = (err) => {
			if (!inError) {
				inError = true
				reconnecting()
				errorCb()
			}
		}
		wsCtrl.onclose = (err) => {
			if (!inError) {
				inError = true
				reconnecting()
				errorCb()
			}
		}


		wsCtrl.onmessage = function(data) {
			console.log(JSON.parse(data.data));
			
			var res = JSON.parse(data.data)
			if (res.a == 'mail') {
				$('#notification-sound').trigger('play')
			}
		}

	},
	send: (obj) => {
		wsCtrl.send(JSON.stringify(obj))
	},
	error: (cb) => {
		errorCb = cb
	},
	reconnect: (cb) => {
		reconnectCb = cb
	}
}

function reconnecting() {
	var reconnectInt = setInterval(() => {
		if (inError) {
			ws.connect()
		} else {
			clearInterval(reconnectInt)
		}
	}, 1000)
}
