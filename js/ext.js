var ext = {
	api: function (method, params, callback) {
		var time = new Date().getTime();
		var passed = time - ext.apiLast;
		if(passed < 350)
			_.delay(ext.api, 355 - passed, method, params, callback);
		else {
			ext.apiLast = time;
			params = params || {};
			if(localStorage.token)
				params.access_token = localStorage.token;
			params.v = '5.4';
			$.post('https://api.vk.com/method/'+method, params, function (resp) {
				if(resp.error) {	
					if(resp.error.error_code == 100 && method == 'messages.getChat')
						callback(false);
					else {
						console.error('vk.api.error.'+resp.error.error_code, resp.error.error_msg);
						if(resp.error.error_code == 10)
							_.delay(function () {
								ext.api(method, params, callback);
							}, 1000);
						else if(resp.error.error_code == 5 || resp.error.error_code == 7)
							ext.auth(function () {
								ext.api(method, params, callback);
							});
						else
							callback(false);
					}
				} else {
				   //console.log(method, resp.response);
					if(callback)
						callback(resp.response);
				}
			});
		}
	},
	apiLast: 0,
	auth: function (callback) {
		localStorage.removeItem('token');
		if(confirm('Разрешить расширению доступ к аккаунту ВКонтакте?')) {
			chrome.windows.create({
				url:'https://oauth.vk.com/authorize?client_id=3983688&v=5.3&response_type=token&display=popup&scope=messages,friends,photos,audio,video,groups,offline&redirect_uri=http://oauth.vk.com/blank.html',
				type: 'popup'
			}, function(win) {
				var tab = win.tabs[0];
				var listener = function(tabId, changeInfo) {
					if(tabId == tab.id && changeInfo.status == 'complete')
						chrome.tabs.get(tabId, function(tab){
							if(tab.url.indexOf('://oauth.vk.com/blank.html#access') > -1) {
								var url = tab.url;
								chrome.tabs.onUpdated.removeListener(listener);
								chrome.windows.remove(win.id);
								var data = {};
								var a = url.substr(url.indexOf('#') + 1).split('&');
								for (var i in a) {
									var b = a[i].split('=');
									data[decodeURIComponent(b[0])] = decodeURIComponent(b[1]);
								}
								localStorage.token = data.access_token;
								localStorage.user = data.user_id;
								$(callback);
							}
							if(tab.url.indexOf('://oauth.vk.com/blank.html#error') > -1) {
								chrome.tabs.onUpdated.removeListener(listener);
								chrome.windows.remove(win.id);
							}
						});
				};
				chrome.tabs.onUpdated.addListener(listener);
			});
		}
	},
	check: _.throttle(function () {
		if(localStorage.token)
			ext.api('account.getCounters', {}, function (resp) {
				localStorage.counters = _.isArray(resp) ? '{}' : JSON.stringify(resp);
				chrome.browserAction.setBadgeText({
					text: String(resp.messages || '')
				});
			});
	}, 500),
	sound: function () {
		new Audio('bb2.mp3').play();
	},
	sel: function (id) {
		var sel = id;
		id = id || ext.scope.sel;
		var type = id ? (String(id).substr(0, 1) == 'c' ? 'chat' : 'user') : false;
		id = Number(type == 'chat' ? String(id).substr(1) : id);
		return {
			chat: type == 'chat' ? id : false,
			user: type == 'user' ? id : false,
			type: type,
			sel: sel,
			id: id
		}
	},
	open: function () {
		if(localStorage.token)
			chrome.tabs.query({
				url: chrome.runtime.getURL('page.html')
			}, function (result) {
				if(result.length > 0)
					chrome.tabs.update(result[0].id, {
						active: true
					});
				else
					chrome.tabs.create({
						url: 'page.html'
					});
			});
		else
			ext.auth(ext.open);
	},
	apply: _.throttle(function () {
		ext.scope.counters = JSON.parse(localStorage.counters || '{}');
		var sel = ext.sel();
		ext.scope.chat = sel.chat;
		ext.scope.user = sel.user;
		if (ext.scope.sel)
			ext.scope.dialogs = [];
		else {
			ext.scope.dialogs = _.sortBy(_.compact(_.union(_.map(ext.scope.users, function (user, id) {
				return _.last(ext.messages.user(id));
			}), _.map(ext.scope.chats, function (chat, id) {
				return _.last(ext.messages.chat(id));
			}))), function (dialog) {
				return dialog.date;
			});
			ext.scope.dialogs.reverse();
		}
		ext.scope.unreads = { total: 0 };
		ext.scope.dialog = [];
		_.each(ext.scope.messages, function (message) {
			if (!message.read && !message.out) {
				var id = message.user || 'c' + message.chat;
				ext.scope.unreads[id] = (ext.scope.unreads[id] || 0) + 1;
				ext.scope.unreads.total++;
			}
			if (ext.scope.chat && ext.scope.chat == message.chat || ext.scope.user && ext.scope.user == message.user)
				ext.scope.dialog.push(message);
		});
		ext.scope.$apply();
		var hash = '#/' + (ext.scope.sel ? str_replace(ext.scope.sel, ext.scope.sel + '!', ext.scope.peers.join('_')) : ext.scope.peers.join('_'));
		if (location.hash != hash)
			location.hash = hash;
	}, 100),
	hash: function () {
		var hash = location.hash.substr(2);
		var peers = [];
		var sel = false;
		if (hash)
			_.each(hash.split('_'), function (peer) {
				var id = str_replace('!', '', peer);
				peers.push(id);
				if (peer != id)
					sel = id;
			});
		return [sel, peers];
	},
	scroll: {
		bottom: 0,
		hold: false,
		atBottom: function () {
			return $(document).scrollTop() == $(document).height() - $(window).height();
		},
		toBottom: function () {
			$(document).scrollTop($(document).height() - $(window).height());
		},
		atTop: function () {
			return $(document).scrollTop() == 0;
		},
		toTop: function () {
			$(document).scrollTop(0);
		}
	}
}
function getTime(sec) {
	return sec ? Math.round(new Date().getTime() / 1000) : new Date().getTime();
}
function log () {
	console.log(arguments);
}
function str_replace(e, d, a, f) { var b = 0, c = 0, g = "", h = "", k = 0, l = 0; e = [].concat(e); d = [].concat(d); var m = "[object Array]" === Object.prototype.toString.call(d), n = "[object Array]" === Object.prototype.toString.call(a); a = [].concat(a); f && (this.window[f] = 0); b = 0; for (k = a.length; b < k; b++) if ("" !== a[b]) for (c = 0, l = e.length; c < l; c++) g = a[b] + "", h = m ? void 0 !== d[c] ? d[c] : "" : d[0], a[b] = g.split(e[c]).join(h), f && a[b] !== g && (this.window[f] += (g.length - a[b].length) / e[c].length); return n ? a : a[0] };
function trim(a,e){var c,d=0,b=0;a+="";c=e?(e+"").replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g,"$1"):" \n\r\t\f\x0B\u00a0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000";d=a.length;for(b=0;b<d;b++)if(-1===c.indexOf(a.charAt(b))){a=a.substring(b);break}d=a.length;for(b=d-1;0<=b;b--)if(-1===c.indexOf(a.charAt(b))){a=a.substring(0,b+1);break}return-1===c.indexOf(a.charAt(0))?a:""};