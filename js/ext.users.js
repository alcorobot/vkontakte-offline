ext.users = {
	fields: 'sex,photo_100,online,screen_name,last_seen,can_write_private_message',
	def: function (id) {
		return {
			id: id,
			name: 'DELETED',
			abbr: 'DELETED',
			photo: 'http://vk.com/images/camera_b.gif',
			last: 0,
			page: 'id'+id,
			sex: 1,
			online: 0,
			loaded: 0,
			typing: 0
		}
	},
	add: function (usr) {
		if(!usr.deactivated) {
			var user = {
				id: usr.id,
				name: usr.first_name+' '+usr.last_name,
				abbr: usr.first_name,
				photo: usr.photo_100,
				last: usr.last_seen ? usr.last_seen.time : 0,
				page: usr.screen_name,
				sex: (usr.sex != 1),
				online: usr.online ? (usr.online_mobile ? 2 : 1) : 0
			}
			ext.scope.users[user.id] = _.extend(ext.users.def(user.id), _.extend(ext.scope.users[user.id] || {}, user));
			ext.apply();
		}
	},
	load: function (id, forced) {
	    if (!ext.scope.users[id] || forced) {
	        if (!ext.scope.users[id]) {
	            ext.scope.users[id] = ext.users.def(id);
	            ext.apply();
			}
			ext.api('users.get', {
				user_ids: id,
				fields: ext.users.fields
			}, function (resp) {
				ext.users.add(resp[0]);
			});
		}
	    return ext.scope.users[id];
	}
}