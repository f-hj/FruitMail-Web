$(document).ready(() => {
	//default, practice
	$('input').keyup(function(e){
		if (e.keyCode == 13) {
			$(this).trigger("enterKey");
		}
	});
	$("[data-toggle=popover]").popover();
	$("[data-toggle=tooltip]").tooltip();

	//login page
	$("#user-text,#pass-text").bind("enterKey", () => {
		user.loginForm();
	})

	if (token.get()) {
		user.loadHomeData()
	}
})

var progressPercent = 10
var userConfigForm
var currentFolder = 'all'

var ui = {
	setFolders: (folders, cb) => {
		//empty it
		$('.drawer-element').remove()

		//add inbox
		$('#nav-drawer-content').append(generateFolder({
			name: 'inbox'
		}))

		//add all
		$('#nav-drawer-content').append(generateFolder({
			name: 'all'
		}, true))

		//add user folders
		folders.forEach(folder => {
			if (folder.name == 'inbox') {
				//custom stick
				$('#folder_inbox .stick').addClass('stick-' + folder.stick)
			} else if (folder.name == 'all') {
				//custom stick
				$('#folder_all .stick').addClass('stick-' + folder.stick)
			} else {
				//as usual
				$('#nav-drawer-content').append(generateFolder(folder))
			}
		})
		$('.drawer-element').click(ui.folderClick)
		callback(cb)
	},
	setMailItems: (mails, isAllFolder, cb) => {
		$('.nav-middle').fadeOut(100, () => {
			$('.nav-middle').html('')
			mails.forEach((mail, i) => {
				$('.nav-middle').append(generateMailItem(mail, i == 0, isAllFolder))
			})
			$('.mail').click(ui.mailClick)
			$('.nav-middle').fadeIn()
		})
		callback(cb)
	},
	setMail: (mail, cb) => {
		var m = generateMail(mail)
		$('.mail-content').fadeOut(100, () => {
			$('.mail-content').html(m.body)
			$('#mail-content-frame').remove()
			$('<iframe id="mail-content-frame"/>').appendTo('.inside').contents().find('body').append(m.content)
			$('#mail-content-frame').contents().find('head').append('<link href="css/fonts.css" rel="stylesheet">')
			$('#mail-content-frame').contents().find('head').append(`
				<style>
				body {
					font-family: 'PreludeWGL'
				}
				</style>
			`)
			var r = $('#mail-content-frame').contents().find('a')
			for (var i = 0 ; i < r.length ; i++) {
				r[i].setAttribute('target','_blank')
			}
			var r = $('#mail-content-frame').contents().find('img')
			for (var i = 0 ; i < r.length ; i++) {
				if (r[i].getAttribute('src').indexOf('cid:') != -1) {
					var cId = r[i].getAttribute('src').replace('cid:', '')
					var url = localServer + '/attachment/' + mail.id + '/' + cId + '?token=' + token.get()
					console.log(url)
					r[i].setAttribute('src', url)
				}
			}
			$('.mail-content').fadeIn()
		})
		//set Modal content
		$('#modal-attachments-body').html(generateAttachments(mail))
		callback(cb)
	},
	mailClick: (evt) => {
		var id = evt.currentTarget.id.split('_')[1]
		console.log('Mail: ' + id);
		ui.setActiveMail(id)
		ui.setMailId(id)
	},
	setActiveMail: (id) => {
		$('.mail-active').removeClass('mail-active')
		$('#mail_' + id).addClass('mail-active')
	},
	folderClick: (evt) => {
		var folder = evt.currentTarget.id.split('_')[1]
		console.log('Folder: ' + folder);
		ui.setActiveFolder(folder)
		ui.setCurrentMailsFolder(folder)
	},
	setActiveFolder: (f) => {
		$('.drawer-element span').removeClass('active')
		$('#folder_' + f + ' span').addClass('active')
	},
	setCurrentMailsFolder: (f) => {
		var mails = []
		if (f == 'all') {
			ui.setMailItems(ownMails, true)
			ui.setMail(ownMails[0])
			return
		}
		ownMails.forEach(mail => {
			if (mail.folder == f) {
				mails.push(mail)
			}
		})
		ui.setMailItems(mails)
		ui.setMail(mails[0])
	},
	setMailId: (id) => {
		ownMails.forEach(mail => {
			if (mail.id == id) {
				ui.setMail(mail)
			}
		})
	},
	setConfig: (conf, cb) => {
		$('#notification-sound').attr('src', 'sounds/' + conf.notificationSound)
		var str = JSON.stringify(conf, null, 4)
		console.log(str);
		$('#my-code-wrapper').html(str)
		/*var flask = new CodeFlask;
		flask.run('#user-config', { language: 'json' });
		flask.update(str)*/
		var flask = new CodeFlask;
		flask.run('#my-code-wrapper', { language: 'json' });
		userConfigForm = str
		flask.onUpdate(code => {
			userConfigForm = code
			try {
				JSON.parse(code)
				$('#save-button').removeClass('disabled')
			} catch (e) {
				$('#save-button').addClass('disabled')
			}
		})
		cb()
	},
	toHomeScreen: (val, cb) => {
		if (typeof val == 'boolean') {
			if (!val) {
				return
			}
		}
		$('.loading-content').fadeTo(500, 0, () => {
			$('.fullscreen').animate({width: '17.2%'}, 500, 'swing', () => {
				$('.nav-middle').hide();
				$('.nav-third').hide();
				$('#app-loading').hide();
				$('#nav-drawer-content').hide();
				$('#app-service').show();

				$('#nav-drawer-content').fadeTo(500, 1, () => {
					$('.nav-third').fadeTo(500, 1, () => {
						if (typeof cb == 'function') {
							cb()
						}
					})
				})
				setTimeout(() => {
					$('.nav-middle').fadeTo(500, 1)
				}, 250)
			})
		})
	},
	toLoadingScreen: (force) => {
		if (!force) {
			$('#login').fadeOut(400, () => {
				$('#loading').fadeIn(400)
			})
		} else {
			$('#app-loading').show()
			$('#app-service').hide()
			$('.fullscreen').animate({width: '100vw'}, 500, 'swing', () => {
				$('.progress').hide()
				$('.loading-content').fadeTo(500, 1)
			})
		}
	},
	setProgress: (percent, text) => {
		console.log(text);
		progressPercent += percent
		if (progressPercent > 100) {
			console.warn('progress is over than 100%')
		}
		$('.progressbar').animate({width: progressPercent + '%'}, 200, 'swing')
		$('.progress-text').html(text)
	},
	mailOnDragStart: (evt, id) => {
		evt.dataTransfer.setData('id', id)
	},
	folderOnDrop: (evt, name) => {
		evt.preventDefault()
		var data = evt.dataTransfer.getData('id');
		if (data) {
			console.log('drop mail ' + data + ' on ' + name)
			user.moveMail(data, name)
		} else {
			console.log('drop other thing on ' + name)
		}
	}
}

function generateFolder(folder, active) {
	var str = '<div ondragover="event.preventDefault()" ondrop="ui.folderOnDrop(event, \'' + folder.name + '\')" id="folder_' + folder.name + '" class="drawer-element">\r\n'

	if (folder.stick) {
		str += '<div class="stick stick-' + folder.stick + '"></div>\r\n'
	} else {
		str += '<div class="stick"></div>\r\n'
	}

	if (active) {
		str += '<span class="active">' + folder.name + '</span>\r\n'
	} else {
		str += '<span>' + folder.name + '</span>\r\n'
	}

	return str + '</div>'
}

function generateMailItem(mail, active, isAllFolder) {
	var folder = user.getFolderByName(mail.folder)
	var stick = ''
	var disp = ''
	if (folder) {
		stick = folder.stick
		if (folder.hide && isAllFolder) {
			disp = ' style="display: none"'
		}
	}

	var str = '<div' + disp + ' draggable="true" ondragstart="ui.mailOnDragStart(event, \'' + mail.id + '\')" class="mail' + (active ? ' mail-active' : '') + '" id="mail_' + mail.id + '"><div class="subject"><div class="title">' + filterXSS(mail.subject) + '</div>'
	if (mail.date) {
		str += '<div class="date">' + moment(mail.date).calendar() + '</div></div>'
	} else {
		str += '<div class="date">' + 'invalid date' + '</div></div>'
	}
	str += '<div class="author">' + (stick ? '<div class="stick stick-' + stick + '"></div>' : '') + '<div class="folder">' + (mail.from[0].name ? mail.from[0].name : mail.from[0].address) + '</div>'
	if (mail.read) {
		str += '<img src="img/done.svg" alt="read">'
	}
	str += '</div><div class="content">' + filterXSS(mail.text) + '</div>'
	str += '</div>'
	return str
}

function generateMail(mail) {
	if (!mail) {
		return "<center>Rien... C'est triste.</center>"
	}
	var subject = filterXSS(mail.subject)
	var date = mail.date ? moment(mail.date).calendar() : 'invalid date'
	var stick = user.getStickFromFolder(mail.folder)
	stick = (stick ? '<div class="stick stick-' + stick + '"></div>' : '')
	var author = mail.from[0].name ? mail.from[0].name : mail.from[0].address
	var error = ''
	/*if (mail.spf == 'failed') {
		error = '<span class="error">SPF'
		if (mail.dkim == 'failed') {
			error += ', DKIM</span>'
		} else {
			error += '</span>'
		}
	} else {*/
		if (mail.dkim == 'failed') {
			error = '<span class="error">DKIM</span>'
		}
	//}
	var attachement = ''
	if (mail.attachments && mail.attachments.length > 0) {
		attachement = `<div class="attachement" onclick="$('#myModalAttachments').modal()">
			${mail.attachments.length}
			<img src="img/attach.svg" alt="attach" />
		</div>`
	}
	var content = mail.html ? mail.html : mail.text
	//content = filterXSS(content)
	var s = `<div class="header">
		<div>
			<div class="title">
				${subject}
			</div>
			<div class="date">
				${date}
			</div>
		</div>
		<div>
			<span class="author">
				${stick}
				<span class="folder">${author}</span>
				${error}
			</span>
			${attachement}
		</div>
	</div>
	<div class="inside">
	</div>`
	return {body: s, content: content}
}

function generateAttachments(mail) {
	var str = ''
	if(mail.attachments && mail.attachments.length > 0) {
		mail.attachments.forEach(att => {
			var url = localServer + '/attachment/' + mail.id + '/' + att.contentId + '?token=' + token.get()
			if (att.contentType.indexOf('audio') != -1) {
				str += '<p>' + att.fileName + '</p>'
				str += '<audio controls src="' + url + '"></audio>'
			} else if (att.contentType.indexOf('image') != -1) {
				str += '<p>' + att.fileName + '</p>'
				str += '<img width="100%" src="' + url + '">'
			} else {
				str += '<a target="_blank" href="' + url + '">' + att.fileName + '</a>'
			}
			str += '<br />'
		})
	}
	return str
}
