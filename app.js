var last_target = null;
var saveStorm = false;
document.addEventListener('mousedown', function(event){
  //possibility: check that the mouse button == 2
  last_target = event.target;
  if(saveStorm)
    saveImage(saveStorm);
}, true);

chrome.runtime.sendMessage({getSaveStorm: true}, function(response) {
  if(response.saveStorm) {
    enableSaveStorm();
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){ 
  if(request.event == "saveStorm") {
    enableSaveStorm();
  } 
  else if(request.event == "saveStormStop") {
    saveStorm = false;
  } 
  else {
    saveImage(request.event); 
  }
});

function enableSaveStorm() {
  if(window.location.href.indexOf("instagram") > 0) {
      saveStorm = "saveInstagramImage";
    } else if (window.location.href.indexOf("flickr") > 0) {
      saveStorm = "saveFlickrImage";
    }
}

function saveImage(requestType){
  try {
    var filePath = "unknown";
    var fileName = "download";
    var filenamePrefix = "";

    if(requestType == "saveInstagramImage") {
      //get the file path
      filePath = last_target.parentNode.childNodes[0].childNodes[0];
      //var shortcodeBaseUrl = last_target.parentNode.href.split("?")[0]; // + '?__a=1'
      //console.log(shortcodeBaseUrl);

      if(filePath.childNodes.length > 0) {
        filePath = filePath.childNodes[0];
      }
      if(filePath.childNodes.length > 0) {
        filePath = filePath.childNodes[0];
      }
      filePath = filePath.src;

      if (filePath.startsWith("blob:")) {
        //Extension sandbox cannot get to window objects - but his is the path we're getting to
        //window._sharedData.entry_data.PostPage[0].graphql.shortcode_media.dash_info.video_dash_manifest.split("BaseURL\u003e")[1].split(".mp4")[0] + ".mp4"
        //Video - post page
        try {
          var singlePostVideoFilePath = [].filter.call(document.getElementsByTagName("script"), e => e.innerHTML.startsWith("window._sharedData"))[0].innerHTML.split("BaseURL\\u003e")[1].split(".mp4")[0] + ".mp4"
          if(singlePostVideoFilePath) {
            filePath = singlePostVideoFilePath;
          }
        }
        catch(err) {}
        //video - timeline or user page
        try {
          var bottomContainer = last_target.parentNode.parentNode.parentNode.parentNode.parentNode.childNodes[2];
          var postDataUrl = "";
          console.log(bottomContainer);
          if(bottomContainer.childNodes.length < 5) //if no likes yet, one fewer <section> tags - we're really just looking for the second div tag in the bottomContainer
            postDataUrl = bottomContainer.childNodes[2].childNodes[0].href + '?__a=1';
          else 
            postDataUrl = bottomContainer.childNodes[3].childNodes[0].href + '?__a=1';
          var videoMetadataRequest = new XMLHttpRequest();
          videoMetadataRequest.open('GET', postDataUrl, false);  // `false` makes the request synchronous
          videoMetadataRequest.send(null);
          if (videoMetadataRequest.status === 200) {
            var videoFilePath = videoMetadataRequest.responseText.split("<BaseURL>")[1].split(".mp4")[0] + ".mp4"
            if(videoFilePath) {
              filePath = videoFilePath;
            }
          }

          //var singlePostVideoFilePath = [].filter.call(document.getElementsByTagName("script"), e => e.innerHTML.startsWith("window._sharedData"))[0].innerHTML.split("BaseURL\\u003e")[1].split(".mp4")[0] + ".mp4"
          //if(singlePostVideoFilePath) {
          //  filePath = singlePostVideoFilePath;
          //}
        }
        catch(err) {
          console.log(err);
        }
      }

      //get the username
      try
      {
        var userNameNode = last_target;
        while (userNameNode.tagName != "ARTICLE" && userNameNode.tagName != "BODY") {
          userNameNode = userNameNode.parentNode;
        }
        if(userNameNode.tagName != "BODY") {
          userNameNode = userNameNode.childNodes[0].childNodes[1].childNodes[0].childNodes[0].childNodes[0];
          filenamePrefix = userNameNode.textContent + "_";
        }
      }
      catch(err) {}
      //try again with the updated syntax
      if (filenamePrefix == "") {
        try
        {
          filenamePrefix = last_target.parentNode.href.split("=")[1] + "_";
        }
        catch(err) {}
      }

      fileName = filePath.split('/').pop();

      //Handle issue reported by user where files had random characters appended after their extension
      if(/\.jpg(.+)/.test(fileName)) {
      	fileName = fileName.split(".jpg")[0] + ".jpg";
      }
    }
    else if (requestType == "saveFlickrImage") {
      //Groups or Sets
      try {
        var imageDiv = last_target.parentNode.parentNode.parentNode;
        var style = imageDiv.currentStyle || window.getComputedStyle(imageDiv, false)
        filePath = style.backgroundImage.slice(4, -1).replace(/"/g, "");
        filePath = filePath.replace(/_.\.j/g, ".j").replace(".j", "_b.j");
        fileName = last_target.getAttribute("aria-label");
      }
      catch(err) { }
    
      //individual photos - from source, max image size
      if(!filePath || filePath.length == 0 || filePath == "unknown") {
        try {
          filePath = Object.values(JSON.parse(document.getElementsByClassName("modelExport")[0].innerHTML.split("modelExport:")[1].split("auth")[0].trim().slice(0, -1)).main["photo-models"][0].sizes).sort(function(a,b){return b.width-a.width;})[0].url;
        }
        catch(err) { }
      }
      
      //individual photos - from metadata
      if(!filePath || filePath.length == 0 || filePath == "unknown") {
        var metas = document.getElementsByTagName('meta');
        for (var i=0;i<metas.length;i++) {
          if (metas[i].getAttribute("property") == "og:image") {
            filePath = metas[i].getAttribute("content");
          }
        }
      }
    
      //Filename for individual files
      if(!fileName || fileName.length == 0 || fileName == "download") {
        var metas = document.getElementsByTagName('meta');
        for (var i=0;i<metas.length;i++) {
          if (metas[i].getAttribute("name") == "title") {
            fileName = metas[i].getAttribute("content");
          }
        }
      }

      fileName = fileName.replace(/\./g, " ");
    }
    else {
      console.log("Download request made with unknown type");
      console.log(event);
      return;
    }

    if(filePath != "unknown") {
      console.log("Downloading " + fileName + " from " + filePath);
      //Logic based on https://stackoverflow.com/questions/934012/get-image-data-in-javascript
      var page = this;
      var xhr = new XMLHttpRequest();
      xhr.open('get', filePath);
      xhr.timeout = 2000;
      xhr.responseType = 'blob';
      xhr.onload = function(){
        var anchor = document.createElement('a');
        var objectURL = URL.createObjectURL(xhr.response);
        anchor.setAttribute('href', objectURL);
        anchor.setAttribute('download', filenamePrefix + fileName);
        anchor.click();
        setTimeout(function() {
          window.URL.revokeObjectURL(objectURL);
        }, 1000);
      };
      xhr.send();
    }
    else {
      console.log("Image URL not found.");
    }

  }
  catch(err) {
      console.log("Invalid image, cannot be saved...", err);
  }
}
