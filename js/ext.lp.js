ext.lp = {
	last: 0,
	pts: false,
	id: false,
	listen: function (key, server, ts) {
		var id = _.uniqueId();
		ext.lp.id = id;
		$.getJSON('https://' + server, {
			act: 'a_check',
			key: key,
			ts: ts,
			wait: 25,
			mode: 96
		}, function (resp) {
			//console.log('LongPoll', resp);
			if (ext.lp.id == id) {
				ext.lp.last = getTime();
				if (resp.failed)
					ext.lp.connect();
				else {
					ext.lp.pts = resp.pts;
					_.each(resp.updates, ext.lp.update);
					ext.lp.listen(key, server, resp.ts);
				}
			} else
				console.warn('LongPoll outdated');
		});
		if (!ext.lp.pts)
			ext.api('messages.setActivity', {
				user_id: ext.scope.account,
				type: 'typing'
			});
	},
	connect: function () {
		ext.lp.id = false;
		ext.api('messages.getLongPollServer', {
			use_ssl: 1,
			need_pts: 0
		}, function (resp) {
			ext.lp.load();
			ext.lp.listen(resp.key, resp.server, resp.ts);
		});
	},
	load: function () {
		ext.api('messages.getLongPollHistory', {
			pts: ext.lp.pts,
			onlines: true
		}, function (resp) {
			ext.lp.last = getTime();
			ext.lp.pts = resp.new_pts;
			_.each(resp.history, ext.lp.update);
			_.each(resp.messages.items, ext.messages.add);
			_.each(resp.profiles, ext.users.add);
			ext.check();
		});
	},
	update: function (upd) {
		if (upd[0] == 3 && upd[2] == 1) { // Сообщение прочитано
			chrome.runtime.sendMessage({ check: true });
			if (ext.scope.messages[upd[1]]) {
				ext.scope.messages[upd[1]].read = getTime(true);
				ext.apply();
			} else
				ext.messages.load(upd[1]);
		}
		if (upd[0] == 4 && upd[4]) { // Новое сообщение (Не LongPollHistory)
			if (upd[2] & 8192 || upd[2] & 512) // Из беседы или с прикреплениями
				ext.messages.load(upd[1]);
			else {
				var message = {
					id: upd[1],
					text: ext.messages.handle(upd[6]),
					date: upd[4],
					read: false,
					out: Boolean(upd[2] & 2),
					atts: [],
					att: false,
					fwd: [],
					from: upd[2] & 2 ? ext.scope.account : upd[3],
					user: upd[3]
				}
				ext.users.load(upd[3]);
				ext.scope.users[upd[3]].typing = 0;
				ext.scope.messages[message.id] = _.extend(ext.scope.messages[message.id] || {}, message);
				ext.apply();
			}
			if (!Boolean(upd[2] & 2)) {
				chrome.runtime.sendMessage({ check: true });
				ext.sound();
			}
		}
		if (upd[0] == 8 || upd[0] == 9) { // Друг стал онлайн или оффлайн
			ext.users.load(0 - upd[1], true);
		}
		if (upd[0] == 51) { // Изменение параметров беседы
			ext.chats.load(upd[1], true);
		}
		if (upd[0] == 61) { // Пользователь набирает текст в диалоге
			ext.users.load(upd[1]);
			ext.scope.users[upd[1]].typing = getTime(true);
			ext.apply();
			_.delay(ext.apply, 6000);
		}
		if (upd[0] == 62) { // Пользователь набирает текст в беседе
			console.log(upd);
			ext.scope.chats[upd[2]].typing = getTime(true);
			ext.apply();
			_.delay(ext.apply, 6000);
		}
	},
	event: function (sel, text, icon) {
		
	}
}