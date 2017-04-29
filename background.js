chrome.contextMenus.create({
	title: "Save Instagram Image", 
	contexts:["page", "selection", "link"], 
	documentUrlPatterns: ["https://www.instagram.com/","https://www.instagram.com/*"],
	onclick: function(info, tab){
		chrome.tabs.sendRequest(tab.id, 'saveInstagramImage')
		}
});