ext.actions = {
	open: function (id) {
		ext.scroll.hold = true;
		ext.scroll.bottom = 0;
		if (id)
			ext.scope.peers = _.union(ext.scope.peers, [id]);
		ext.scope.sel = id || false;
		var sel = ext.sel(id);
		if (sel.user) {
			ext.users.load(sel.user);
			if(ext.scope.users[sel.user].loaded < 50)
				ext.actions.load(id);
		}
		if (sel.chat) {
			ext.chats.load(sel.chat);
			if(ext.scope.chats[sel.chat].loaded < 50)
				ext.actions.load(id);
		}
		ext.apply();
		ext.actions.focus();
	},
	close: function (id) {
		ext.scroll.hold = false;
		ext.scope.peers = _.without(ext.scope.peers, id);
		if (ext.scope.sel == id)
			ext.scope.sel = false;
		ext.apply();
	},
	top: function () {
		ext.scroll.toTop();
	},
	read: function (id) {
		if (id) {
			var sel = ext.sel(id);
			ext.api('messages.markAsRead', {
				user_id: sel.user ? sel.user : sel.chat + 2000000000
			});
			ext.actions.focus();
		} else
			ext.api('messages.markAsRead', {
				message_ids: _.pluck(_.filter(ext.scope.messages, function (message) {
					return !message.read && !message.out;
				}), 'id').join(',')
			});
	},
	load: function (sel) {
		sel = ext.sel(sel);
		if (sel.user || sel.chat) {
			var offset = sel.user ? ext.messages.user(sel.user).length : ext.messages.chat(sel.chat).length;
			if (sel.user && offset >= ext.scope.users[sel.user].loaded || sel.chat && offset >= ext.scope.chats[sel.chat].loaded) {
				if(sel.user)
					ext.scope.users[sel.user].loaded += 50;
				else
					ext.scope.chats[sel.chat].loaded += 50;
				ext.api('messages.getHistory', {
					count: 50,
					offset: offset,
					user_id: sel.user ? sel.user : sel.chat + 2000000000
				}, function (resp) {
					_.each(resp.items, ext.messages.add);
				});
			}
		}
	},
	logout: function () {
		localStorage.clear();
		chrome.runtime.reload();
	},
	widget: function () {
		VK.Widgets.Group('vk_groups', {
			mode: 2,
			wide: 1,
			width: 'auto',
			height: window.innerHeight - 100,
			color1: 'FFFFFF',
			color2: '0059b3',
			color3: '222'
		}, 61282449);
	},
	height: _.throttle(function () {
		if (ext.scope.sel) {
			if(ext.scroll.hold)
				ext.scroll.toBottom();
			else
				window.scrollTo(0, document.body.offsetHeight - ext.scroll.bottom);
			$('#messages').css('margin-bottom', ($('#panel').height() + 50) + 'px');
		}
	}, 5),
	focus: function () {
		var msg = document.getElementById('message');
		if(msg)
			msg.focus();
	},
	attVideo: function (owner_id, id, access_key) {
		var $this = $(this);
		ext.api('video.get', {
			videos: owner_id + '_' + id + '_' + access_key
		}, function (resp) {
			if (resp.count == 1) {
				$this.replaceWith('<iframe src="' + resp.items[0].player + '" width="607" height="360" frameborder="0"></iframe>');
				ext.actions.height();
			}
		});
	},
	attAudio: function (url) {
		$(this).replaceWith('<audio src="' + url + '" autoplay controls></audio>');
		ext.actions.height();
	},
	attDoc: function (url1, url2) {
		$(this).attr('src', $(this).attr('src') == url1 ? url2 : url1);
		ext.actions.height();
	},
	image: function (url) {
		$('#image img').attr('src', url);
		$image.fadeIn(200);
	},
	search: function () {
		var query = $(this).val();
		ext.scope.query = query;
		if (query.length > 0) {
			ext.scope.results = _.compact(_.map(ext.scope.users, function (user) {
				if (user.name.toLowerCase().search(query.toLowerCase()) >= 0)
					return user.id;
			})).slice(0, 3);
			ext.actions.performSearch(query);
		} else
			ext.scope.results = [];
		ext.apply();
	},
	performSearch: _.debounce(function (query) {
		ext.api('users.search', {
			q: query,
			count: 5,
			fields: ext.users.fields
		}, function (resp) {
			if (resp.count > 0) {
				var results = [];
				_.each(resp.items, function (user) {
					if (user.can_write_private_message) {
						results.push(user.id);
						ext.users.add(user);
					}
				});
				if (ext.scope.query == query) {
					ext.scope.results = _.union(ext.scope.results, results);
					ext.apply();
				}
			}
		});
	}, 500),
	message: function (event) {
		var txt = this;
		var $txt = $(this);
		if (event.type == 'paste') {
			var text = ext.messages.html(ext.messages.text(event.originalEvent.clipboardData.getData('text/html') || event.originalEvent.clipboardData.getData('text/plain') || ''));
			document.execCommand("insertHTML", false, text);
			return false;
		}
		if (event.type == 'keydown' && event.keyCode == 13 && !event.shiftKey) {
			var val = ext.messages.text(txt.innerHTML);
			txt.innerHTML = '';
			var atts = [];
			_.each(ext.scope.atts[ext.scope.sel], function (att, id) {
				if (att.data) {
					atts.push('photo' + att.data.owner_id + '_' + att.data.id);
					delete ext.scope.atts[ext.scope.sel][id];
				}
			});
			if (str_replace(' ', '', val).length > 0 || atts.length > 0) {
				
				ext.apply();
				var after = function (resp) {
					ext.actions.read(ext.scope.sel);
				}
				if (ext.scope.chat)
					ext.api('messages.send', {
						chat_id: ext.scope.chat,
						message: val,
						attachment: atts.join(','),
						guid: getTime(),
						type: 1
					}, after);
				else
					message.user = ext.scope.user;
					ext.api('messages.send', {
						user_id: ext.scope.user,
						message: val,
						attachment: atts.join(','),
						guid: getTime(),
						type: 1
					}, after);
			}
			return false;
		}
		if (event.type == 'keyup') {
			ext.actions.height();
		}
		if (event.type == 'dragenter') {
			$txt.addClass('drag');
		}
		if (event.type == 'dragleave') {
			$txt.removeClass('drag');
		}
		if (event.type == 'drop') {
			event.preventDefault();
			$txt.removeClass('drag');
			ext.actions.files(event);
		}
	},
	smile: function (code) {
		document.getElementById('message').focus();
		document.execCommand("insertHTML", false, ext.messages.html(ext.emoji.symbol(code)));
	},
	files: function (event) {
		ext.actions.focus();
		var files = [];
		if (event.type == 'change')
			files = $('#files input')[0].files;
		if (event.type == 'drop')
			files = event.originalEvent.dataTransfer.files;
		_.each(files, function (file) {
			var id = [ext.scope.sel, _.uniqueId('att')];
			if (!ext.scope.atts[id[0]])
				ext.scope.atts[id[0]] = {};
			if (_.keys(ext.scope.atts[id[0]]).length < 10 && _.indexOf(['image/jpeg', 'image/png', 'image/gif'], file.type) >= 0) {
				ext.scope.atts[id[0]][id[1]] = {
					procent: 0,
					name: file.name,
					data: false,
					error: false
				}
				ext.apply();
				var formData = new FormData();
				formData.append('photo', file);
				ext.api('photos.getMessagesUploadServer', {}, function (resp) {
					$.ajax({
						url: resp.upload_url,
						type: 'POST',
						xhr: function () {
							var myXhr = $.ajaxSettings.xhr();
							if (myXhr.upload) {
								myXhr.upload.addEventListener('progress', function (e) {
									if (e.lengthComputable && ext.scope.atts[id[0]][id[1]]) {
										ext.scope.atts[id[0]][id[1]].procent = Math.round(e.loaded * 100 / e.total)
										ext.apply();
									}
								}, false);
							}
							return myXhr;
						},
						success: function (resp) {
							ext.api('photos.saveMessagesPhoto', resp, function (resp) {
								if (ext.scope.atts[id[0]][id[1]]) {
									ext.scope.atts[id[0]][id[1]].data = resp[0];
									ext.apply();
								}
							});
						},
						error: function (jqXHR, textStatus, errorThrown) {
							if (ext.scope.atts[id[0]][id[1]]) {
								ext.scope.atts[id[0]][id[1]].error = textStatus;
								ext.apply();
							}
						},
						data: formData,
						cache: false,
						contentType: false,
						dataType: 'json',
						processData: false
					});
				});
			}
		});
	},
	unload: function (id) {
		delete ext.scope.atts[ext.scope.sel][id];
		ext.apply();
	}
}