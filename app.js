var last_target = null;
document.addEventListener('mousedown', function(event){
  //possibility: check that the mouse button == 2
  last_target = event.target;
}, true);

chrome.extension.onRequest.addListener(function(event){
  try {
    //Try and get image source URL for timeline page or single-post page
    var filePath = last_target.getAttribute("data-reactid");
    if(filePath) {
	    filePath = 'http' + filePath.split('http')[1];
	    filePath = filePath.split('?')[0];
	    filePath = filePath.replace('=2', ':').replace('=1', '.').replace('=1', '.').replace('=1', '.').replace('=1', '.').replace('=1', '.').replace('=1', '.').replace('=1', '.').replace('=1', '.').replace('=1', '.').replace('=1', '.');

	    //Try and get image source URL for user overview page
	    if(filePath == 'httpundefined') {
	      var elementIdContainer = last_target.getAttribute("data-reactid");
	      var elementId = elementIdContainer.substring(0, elementIdContainer.length - 2);
	      var element = document.querySelectorAll('[data-reactid="' + elementId + '"]')[0];
	      while(element.tagName != 'img' && element.childNodes && element.childNodes.length > 0) {
	        element = element.childNodes[0];
	      }
	      filePath = element.getAttribute("src").split('?')[0];
	    }
	} else {
		filePath = last_target.parentNode.childNodes[0].childNodes[0];
		if(filePath.childNodes.length > 0) {
			filePath = filePath.childNodes[0];
		}
		filePath = filePath.src;
	}

	//Remove any resizing or cropping that was done to the image
    var re1 = /\/[sp]\d{3,4}x\d{3,4}\//;
    var re2 = /\/c\d{1,4}.\d{1,4}.\d{1,4}.\d{1,4}\//;
    filePath = filePath.replace(re1, '/').replace(re2, '/');

    //console.log(filePath);
    
    //save image directly, based on sample from http://stackoverflow.com/questions/2897619/using-html5-javascript-to-generate-and-save-a-file
    var fileName = filePath.split('/').pop();
    var pom = document.createElement('a');
    pom.setAttribute('href', filePath);
    pom.setAttribute('download', fileName);
    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
  }
  catch(err) {
      console.log("Invalid image, cannot be saved...", err);
  }
});