ext.chats = {
	def: function (id) {
		return {
			id: id,
			name: 'DELETED',
			abbr: 'DELETED',
			photo: 'http://vk.com/images/camera_b.gif',
			users: [],
			loaded: 0,
			typing: 0
		}
	},
	load: function (id, forced) {
		if(!ext.scope.chats[id] || forced) {
		    if (!ext.scope.chats[id]) {
		        ext.scope.chats[id] = ext.chats.def(id);
		        ext.apply();
			}
			ext.api('messages.getChat', {
				chat_id: id,
				fields: ext.users.fields
			}, function (resp) {
				if(resp) {
					var chat = {
						id: id,
						name: resp.title,
						photo: resp.photo_100 || 'http://vk.com/images/camera_b.gif',
						users: _.pluck(resp.users, 'id')
					}
					ext.scope.chats[id] = _.extend(ext.chats.def(id), _.extend(ext.scope.chats[id] || {}, chat));
					ext.apply();
					_.each(resp.users, ext.users.add);
				}
			});
		}
		return ext.scope.chats[id];
	}
}