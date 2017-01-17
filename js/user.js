var userData
var ownMails
var ownFolders

var user = {
	loginForm: () => {
		user.login($('#user-text').val(), $('#pass-text').val(), (err) => {
			if (err) {
				//TODO: error in UI
				return
			}
			user.loadHomeData()
		})
	},
	loadHomeData: (disableFinalAnimation) => {
		var states = []
		var nStates = 3
		ui.toLoadingScreen()
		ui.setProgress(0, 'Chargement des données')
		setTimeout(() => {
			ui.setProgress(0, 'Problème réseau ?')
		}, 3000)

		//websocket
		ws.connect(() => {
			ui.setProgress(10, 'WebSocket connected')
		})

		ws.error(() => {
			ui.toLoadingScreen(true)
			ui.setProgress(0, 'Server disconnected')
		})

		ws.reconnect(() => {
			ui.toHomeScreen()
		})

		//get conf
		user.getConfig(config => {

			ui.setProgress(10, 'Traitement user')
			ui.setConfig(config, () => {
				ui.setProgress(10, 'User terminé')
				states.push('config')
				if (!disableFinalAnimation) {
					ui.toHomeScreen(states.length == nStates)
				}
			})
		})

		//get folders
		user.getFolders(folders => {
			ui.setProgress(10, 'Traitement des dossiers')
			ownFolders = folders
			ui.setFolders(folders, () => {
				console.log(folders);
				ui.setProgress(10, 'Dossiers terminés')
				states.push('folders')
				if (!disableFinalAnimation) {
					ui.toHomeScreen(states.length == nStates)
				}
			})

			//get mails
			user.getMails(mails => {
				ui.setProgress(10, 'Traitement des mails')
				ownMails = mails
				ui.setMailItems(mails, true, () => {
					ui.setProgress(10, 'Mails terminés')
					states.push('mails')
					if (!disableFinalAnimation) {
						ui.toHomeScreen(states.length == nStates)
					}
				})
				mails.sort((a, b) => {
					return b.date - a.date
				})
				ui.setMail(mails[0])

			})

		})

	},
	login: (user, pass, cb) => {
		H.post('/login', {
			user: user,
			pass: pass
		}, (res) => {
			console.log(res);
			if (res.err) {
				cb(res.err)
				return
			}
			token.set(res.token)
			userData = res.user
			cb(false)
		})
	},
	getFolders: (cb) => {
		H.get('/folders', cb)
	},
	getMails: (cb) => {
		H.get('/msgs', cb)
	},
	getMail: (id, cb) => {
		H.get('/msg/' + id, cb)
	},
	getConfig: (cb) => {
		H.get('/userConfig', cb)
	},
	updateConfigForm: () => {
		try {
			var d = JSON.parse(userConfigForm)
			$('#save-button').addClass('disabled')
			H.post('/userConfig', d, (res) => {
				console.log(res);
				$('#myModal').modal('hide');
				$('#save-button').removeClass('disabled')
				user.loadHomeData(true)
			})
		} catch (e) {
			alert(e)
		}
	},
	getStickFromFolder: (folder) => {
		var s
		ownFolders.forEach((f) => {
			if (f.name == folder) {
				s = f.stick
			}
		})
		return s
	},
	moveMailInternaly: (mailId, folder) => {
		ownMails.forEach(mail => {
			if (mail.id == mailId) {
				mail.folder = folder
			}
		})
		ui.setCurrentMailsFolder(currentFolder)
	},
	moveMail: (mailId, folder) => {
		H.post('/msg/' + mailId + '/move?to=' + folder, {}, res => {
			if (res.success) {
				user.moveMailInternaly(mailId, folder)
			}
		})
	},
	getFolderByName: (name) => {
		var fol
		ownFolders.forEach(f => {
			if (f.name == name) {
				fol = f
			}
		})
		return fol
	}
}
