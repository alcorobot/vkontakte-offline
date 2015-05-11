$(function () {
	$window = $(window);
	$document = $(document);
	$body = $('body');
	$image = $('#image');
	ext.scope = angular.element(document.body).scope();
	ext.api('execute.init', {
		fields: ext.users.fields,
		count: 50
	}, function (resp) {
		ext.lp.listen(resp[0][0], resp[0][1], resp[0][2]);
		_.each(resp[1], ext.messages.add);
		_.each(resp[2], ext.users.add);
		if (ext.scope.sel)
			ext.actions.open(ext.scope.sel);
		setInterval(function () {
			ext.api('users.get', {
				user_ids: _.union(ext.scope.peers, [ext.scope.account]).join(','),
				fields: ext.users.fields
			}, function (resp) {
				_.each(resp, ext.users.add);
			});
			if (getTime() - ext.lp.last > 30000) {
				console.warn('LongPoll lost');
				ext.lp.connect();
			}
		}, 10000);
	});
	$window.on('popstate', function () {
		var hash = ext.hash();
		ext.scope.sel = hash[0];
		ext.scope.peers = hash[1];
		ext.apply();
	});
	$window.on('resize', _.debounce(function () {
		ext.actions.height();
	}));
	$document.on('scroll', _.throttle(function () {
		ext.scroll.bottom = document.body.offsetHeight - window.scrollY;
		ext.scroll.hold = ext.scroll.atBottom();
		if (ext.scope.sel && window.scrollY < 500)
			ext.actions.load(ext.scope.sel);
	}, 50));
	$body.on('load', 'img', ext.actions.height);
	$body.on('click', 'a[href^=http]', function () {
		window.open($(this).attr('href'));
		return false;
	});
	$body.on('click', '[action-click]', function () {
		var action = String($(this).attr('action-click')).split(',');
		ext.actions[action[0]].apply(this, _.rest(action));
	});
	$body.on('mousewheel', '#smiles', function (event) {
		if (event.originalEvent.deltaY > 0 && this.scrollTop == this.scrollHeight - this.clientHeight || event.originalEvent.deltaY < 0 && this.scrollTop == 0)
			return false;
	});
	$body.on('keyup', '#search', ext.actions.search);
	$body.on('keydown keyup paste dragenter dragleave drop', '#message', ext.actions.message);
	$body.on('click', '#message img', function (event) {
		var range = document.createRange();
		var sel = window.getSelection();
		if (event.offsetX < 8)
			range.setStartBefore(this);
		else
			range.setStartAfter(this);
		range.collapse(true);
		sel.removeAllRanges();
		sel.addRange(range);
	});
	$body.on('change', '#files input', ext.actions.files);
	$image.click(function () {
		$image.fadeOut(200);
	});
});
if (!location.hash)
	history.replaceState({}, '', '#/');
ext.emoji.symbols = _.map(ext.emoji.codes, function (code, i) {
	ext.emoji.smiles += '<img action-click="smile,' + code + '" src="http://vk.com/images/emoji/' + code + '.png">';
	return ext.emoji.symbol(code);
});
moment.lang('ru');
var less = {
	logLevel: 0
}
var $window, $document, $body, $image;
angular.module('dialogsApp', ['ngSanitize']).config(['$compileProvider', function ($compileProvider) {
	$compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
}]).controller('DialogsCtrl', function ($scope) {
	$scope.version = chrome.runtime.getManifest().version;
	$scope.account = localStorage.user;
	var hash = ext.hash();
	$scope.sel = hash[0];
	$scope.peers = hash[1];
	$scope.query = '';
	$scope.results = [];
	$scope.atts = {};
	$scope.messages = {};
	$scope.users = {};
	$scope.chats = {};
	$scope.smiles = ext.emoji.smiles;
	$scope.tmpl = function (name) {
		return 'tmpl/'+name+'.html';
	}
	$scope.peer = function (id) {
		var sel = ext.sel(id);
		return sel.chat ? ext.chats.load(sel.chat).name : ext.users.load(sel.user).name;
	}
	$scope.peerTyping = function (id) {
		var sel = ext.sel(id);
		var time = sel.chat ? ext.chats.load(sel.chat).typing : ext.users.load(sel.user).typing;
		return getTime(true) - time < 5;
	}
	$scope.addition = function (curr, prev) {
		return prev ? Boolean(curr.atts.length + curr.fwd.length + prev.atts.length + prev.fwd.length == 0 && curr.from == prev.from && curr.date - prev.date < 300) : false;
	}
	$scope.fromNow = function (time) {
		time = moment.unix(time).fromNow();
		time = str_replace('минута', 'минуту', time);
		time = str_replace('секунда', 'секунду', time);
		return time;
	}
	$scope.date = function (time) {
		return time ? moment.unix(time).format('DD.MM.YY') : moment().format('DD.MM.YY');
	}
	$scope.time = function (time) {
		return time ? moment.unix(time).format('HH:mm:ss') : moment().format('HH:mm:ss');
	}
	$scope.datetime = function (time) {
		return moment.unix(time).format('D MMM YYYY в H:mm');
	}
	$scope.num = function (num, s0, s1, s2) {
		num = String(num);
		var n1 = num.length == 1 ? 0 : Number(num.substr(num.length - 2, 1));
		var n2 = Number(num.substr(num.length - 1, 1));
		if (n1 != 1 && n2 == 1)
			return s1;
		if (n2 > 1 && n2 < 5 && n1 != 1)
			return s2;
		return s0;
	}
	$scope.duration = function (s) {
		var h = (s - s % 3600) / 3600;
		s = s % 3600;
		var m = (s - s % 60) / 60;
		s = s % 60;
		if (s < 10)
			s = '0' + s;
		if (h > 0 && m < 10)
			m = '0' + m;
		return (h > 0 ? h + ':' : '') + m + ':' + s;
	}
	$scope.size = function (b) {
		return Math.round(b / 10485.76) / 100;
	}
	$scope.getTime = getTime;
}).directive('compile', ['$compile', function ($compile) {
	return function (scope, element, attrs) {
		scope.$watch(
			function (scope) {
				return scope.$eval(attrs.compile);
			},
			function (value) {
				element.html(value);
				$compile(element.contents())(scope);
			}
		);
	};
}]).directive('action', ['$timeout', function ($timeout) {
	return {
		link: function ($scope, elements, attrs) {
			$timeout(function () {
				var action = String(attrs.action).split(',');
				ext.actions[action[0]].apply(elements[0], _.rest(action));
			}, 0);
		}
	};
}]);