ext.messages = {
	add: function (msg) {
		var message = {
			id: msg.id,
			text: ext.messages.handle(msg.body),
			date: msg.date,
			read: Boolean(msg.read_state),
			out: Boolean(msg.out),
			atts: msg.attachments || [],
			att: false,
			fwd: ext.messages.fwd(msg.fwd_messages, 0)
		}
		if (message.atts.length > 0) {
			var types = _.uniq(_.pluck(message.atts, 'type'));
			message.att = types.length > 1 ? 'multi' : types[0];
		}
		if(msg.chat_id) {
			message.chat = msg.chat_id;
			message.from = msg.user_id;
			ext.chats.load(msg.chat_id);
			if(getTime(true) - message.date < 5)
				ext.scope.chats[msg.chat_id].typing = 0;
		} else {
			message.user = msg.user_id;
			message.from = msg.out ? Number(localStorage.user) : msg.user_id;
		}
		ext.users.load(msg.from);
		ext.scope.messages[message.id] = _.extend(ext.scope.messages[message.id] || {}, message);
		ext.apply();
	},
	load: function (id) {
		ext.api('messages.getById', {
			message_ids: id
		}, function (resp) {
			ext.messages.add(resp.items[0]);
		});
	},
	html: function (str) {
		str = str.replace(/(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/g, function (url) {
			var link = url.substr(url.indexOf('://') + 3);
			if (str.length > 50)
				link = link.substr(0, 47) + '...';
			return '<a href="' + url + '" title="' + url + '">' + link + '</a>';
		});
		for(var i = 0; i < ext.emoji.codes.length; i++)
			str = str.replace(new RegExp(ext.emoji.symbols[i], 'gi'), '<img class="emoji" emoji="'+ext.emoji.codes[i]+'" src="http://vk.com/images/emoji/'+ext.emoji.codes[i]+'.png">');
		return str.replace(/\n/g, '<br>');
	},
	text: function (str) {
		str = str.replace(/<img[^>]+emoji="([^"]+)"[^>]*>/gi, function (str, code) {
			return ext.emoji.symbol(code);
		});
		var tmp = document.createElement('div');
		tmp.innerHTML = str;
		str = tmp.innerText || tmp.textContent || '';
		return trim(str);
	},
	handle: function (str) {
		return ext.messages.html(ext.messages.text(str));
	},
	fwd: function (fwd, lvl) {
		return lvl > 5 ? [false] : _.map(fwd, function (msg, i) {
			ext.users.load(msg.user_id);
			return {
				from: msg.user_id,
				text: ext.messages.handle(msg.body),
				date: msg.date,
				atts: msg.attachments || [],
				fwd: ext.messages.fwd(msg.fwd_messages, lvl + 1)
			}
		});
	},
	user: function (id) {
		return _.filter(ext.scope.messages, function (message) {
			return message.user == id;
		});
	},
	chat: function (id) {
		return _.filter(ext.scope.messages, function (message) {
			return message.chat == id;
		});
	},
	last: function (sel) {
		sel = ext.sel(sel);
		return _.last(sel.user ? ext.messages.user(sel.user) : ext.messages.chat(sel.chat));
	}
}