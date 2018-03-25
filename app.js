var last_target = null;
document.addEventListener('mousedown', function(event){
  //possibility: check that the mouse button == 2
  last_target = event.target;
}, true);

chrome.extension.onRequest.addListener(function(event){
  try {
    //Try and get image source URL for timeline page or single-post page
    var filenamePrefix = "";

	//get the file path
	filePath = last_target.parentNode.childNodes[0].childNodes[0];

	if(filePath.childNodes.length > 0) {
		filePath = filePath.childNodes[0];
	}
	if(filePath.childNodes.length > 0) {
		filePath = filePath.childNodes[0];
	}
	filePath = filePath.src;

	//get the username
	var userNameNode = last_target;
	while (userNameNode.tagName != "ARTICLE" && userNameNode.tagName != "BODY") {
		userNameNode = userNameNode.parentNode;
	}
	if(userNameNode.tagName != "BODY")
	{
		userNameNode = userNameNode.childNodes[0].childNodes[1].childNodes[0].childNodes[0].childNodes[0]
		filenamePrefix = userNameNode.textContent + "_";
	}

    var fileName = filePath.split('/').pop();

    //Logic based on https://stackoverflow.com/questions/934012/get-image-data-in-javascript
    var page = this;
    var xhr = new XMLHttpRequest();
    xhr.open('get', filePath);
    xhr.responseType = 'blob';
    xhr.onload = function(){
      var fr = new FileReader();
      fr.onload = function(){
		var anchor = document.createElement('a');
	    anchor.setAttribute('href', this.result);
	    anchor.setAttribute('download', filenamePrefix + fileName);
        anchor.click();
      };
      fr.readAsDataURL(xhr.response);
    };
    xhr.send();

  }
  catch(err) {
      console.log("Invalid image, cannot be saved...", err);
  }
});
