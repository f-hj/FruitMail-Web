var token = {
	get: () => {
		return localStorage.getItem("Token") ? localStorage.getItem("Token") : '';
	},
	set: (val) => {
		localStorage.setItem('Token', val)
	}
}

var localServer = 'https://mail-2.fruitice.fr'

function callback(cb) {
	if (typeof cb == 'function') {
		cb()
	} else if (typeof cb != 'undefined') {
		console.warn('Callback is not a function')
	}
}

var utils = {
	escapeScripts: (str) => {
		var regex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
		return regex.exec(str)
	},
	jq: str => {
    return str.replace( /(:|\.|\[|\]|,|=|@|\(|\)|\ )/g, "\\$1" );
	}
}

var H = {
	get: function(url, callback) {
		if (localServer) {
			url = localServer + url
		}
		if (typeof callback != 'undefined' && typeof callback != 'function') {
			return;
		}
		else {
			$.ajax({
		        url: url,
		        type: 'GET',
		        headers: {
		            'Token': token.get()
		        },
		        success: function(t) {
					if (typeof callback == 'function') {
						callback(t);
					}
				},
		        dataType: 'json',
		        contentType: 'application/json'
		    });
		}
	},
	post: function(url, data, callback) {
		if (localServer) {
			url = localServer + url
		}
		if (typeof data == 'function') {
			callback = data;
			data = '';
			return;
		}
		else if (typeof callback != 'undefined' && typeof callback != 'function') {
			return;
		}
		else {
			$.ajax({
		        url: url,
		        type: 'POST',
		        headers: {
		            'Token': token.get()
		        },
		        data: JSON.stringify(data),
		        success: function(t) {
					if (typeof callback == 'function') {
						callback(t);
					}
				},
		        dataType: 'json',
		        contentType: 'application/json'
		    });
		}
	},
	delete: function(url, data, callback) {
		if (localServer) {
			url = localServer + url
		}
		if (typeof data == 'function') {
			return;
		}
		else if (typeof callback != 'undefined' && typeof callback != 'function') {
			return;
		}
		else {
			$.ajax({
		        url: url,
		        type: 'DELETE',
		        headers: {
		            'Token': token.get()
		        },
				data: JSON.stringify(data),
		        success: function(t) {
					if (typeof callback == 'function') {
						callback(t);
					}
				},
		        dataType: 'json',
		        contentType: 'application/json'
		    });
		}
	},
	put: function(url, data, callback) {
		if (localServer) {
			url = localServer + url
		}
		if (typeof data == 'function') {
			return;
		}
		else if (typeof callback != 'undefined' && typeof callback != 'function') {
			return;
		}
		else {
			$.ajax({
		        url: url,
		        type: 'PUT',
		        headers: {
		            'Token': token.get()
		        },
		        data: JSON.stringify(data),
		        success: function(t) {
					if (typeof callback == 'function') {
						callback(t);
					}
				},
		        dataType: 'json',
		        contentType: 'application/json'
		    });
		}
	},
	patch: function(url, data, callback) {
		if (localServer) {
			url = localServer + url
		}
		if (typeof data == 'function') {
			return;
		}
		else if (typeof callback != 'undefined' && typeof callback != 'function') {
			return;
		}
		else {
			$.ajax({
		        url: url,
		        type: 'PATCH',
		        headers: {
		            'Token': token.get()
		        },
		        data: JSON.stringify(data),
		        success: function(t) {
					if (typeof callback == 'function') {
						callback(t);
					}
				},
		        dataType: 'json',
		        contentType: 'application/json'
		    });
		}
	}
}
