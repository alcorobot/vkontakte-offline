chrome.runtime.onInstalled.addListener(function (details) {
	if (details.reason == 'update' && chrome.runtime.getManifest().version == '3.0.1')
		localStorage.clear();
});
chrome.runtime.onStartup.addListener($.noop);
chrome.alarms.onAlarm.addListener(ext.check);
chrome.alarms.getAll(function (alarms) {
	if (alarms.length == 0)
		chrome.alarms.create('runtime', {
			delayInMinutes: 1,
			periodInMinutes: 1
		});
});
chrome.runtime.onMessage.addListener(function (message) {
	if(message.check)
		ext.check();
});
chrome.browserAction.onClicked.addListener(ext.open);
ext.check();