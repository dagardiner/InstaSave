chrome.contextMenus.create({
	title: "Save Instagram Image", 
	contexts:["page", "selection", "link"], 
	documentUrlPatterns: ["https://www.instagram.com/","https://www.instagram.com/*"],
	onclick: function(info, tab){
    	console.log("Requesting Instagram download");
		chrome.tabs.sendMessage(tab.id, {event:'saveInstagramImage'});
	}
});
chrome.contextMenus.create({
	title: "Save Flickr Image", 
	contexts:["page", "selection", "link"], 
	documentUrlPatterns: ["https://www.flickr.com/photos/*","https://www.flickr.com/groups/*"],
	onclick: function(info, tab){
    	console.log("Requesting Flickr download");
		chrome.tabs.sendMessage(tab.id, {event:'saveFlickrImage'});
	}
});
var labsMenuItem = chrome.contextMenus.create({
	"documentUrlPatterns": [ window.location.protocol + "//" + window.location.hostname + "/*" ],
	"title":"Advanced/Labs Features",
	"contexts":["browser_action"],
});
chrome.contextMenus.create({
	title: "Enable SaveStorm (single-click download)",
	contexts: ["browser_action"],
	documentUrlPatterns: [ window.location.protocol + "//" + window.location.hostname + "/*" ],
	type: "checkbox",
	checked: false,
  	parentId:labsMenuItem,
	onclick: function(info, tab) {
		saveStorm = info.checked;
		chrome.tabs.query({}, function(tabs) {
			tabs.forEach(tab => {
				if(info.checked)
					chrome.tabs.sendMessage(tab.id, {event: "saveStorm"}, function(response) {});
				else
					chrome.tabs.sendMessage(tab.id, {event: "saveStormStop"}, function(response) {});
			})
			
		});
	}
});
chrome.contextMenus.create({
	title: "DL All Flickr Single-Image Tabs in Window",
	contexts: ["browser_action"],
	documentUrlPatterns: [ window.location.protocol + "//" + window.location.hostname + "/*" ],
  	parentId:labsMenuItem,
	onclick: function(info, tab) {
		chrome.tabs.query({"lastFocusedWindow": true}, function(tabs) {
			triggerSaveFlickrBatch(tabs, 0);
			//tabs.forEach(tab => {
			//	chrome.tabs.sendMessage(tab.id, {event: "saveFlickrImage"}, function(response) {});
			//});
			
		});
	}
});
function triggerSaveFlickrBatch(tabs, startIndex) {
	var endIndex = startIndex + 3;
	if(tabs.length < endIndex)
		endIndex = tabs.length;

	for (i = startIndex; i < endIndex; i++) { 
		//console.log("Sending DL request to " + tabs[i].id)
		chrome.tabs.sendMessage(tabs[i].id, {event: "saveFlickrImage"}, function(response) {});
	}

	if(endIndex < tabs.length) {
		setTimeout(triggerSaveFlickrBatch, 2000, tabs, endIndex);
	}
}

var saveStorm = false;
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){ 
	//console.log("notifying " + saveStorm)
	if(request.getSaveStorm) {
		sendResponse({saveStorm: saveStorm});
	}
});

chrome.browserAction.onClicked.addListener(function() {
	chrome.tabs.query({
		active: true,
		currentWindow: true
	  }, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {event: "saveIgStoryImage"}, function(response) {});
	  });
});
