var last_target = null;
var saveStorm = false;

window.addEventListener('click', function(e){
	if(e.button == 0 && e.ctrlKey){
    //IG added a listener that prevents ctrl+click from opening the link in a new tab - this prevents that block from being triggered
		e.stopPropagation();
	}
}, true);

//For IG TV Stories, right-clicking is disabled to prevent downloading; this re-enables the right-click context menu
document.addEventListener('contextmenu', function(e){
  e.stopPropagation();
}, true);

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

function parseAdditionalData(docToParse) {
  var dataBlob;
  var scriptElements = docToParse.getElementsByTagName("script");
  for(let i = 0; i < scriptElements.length && !dataBlob; i++)
  {
    if(scriptElements[i].innerHTML.startsWith("window.__additionalDataLoaded"))
      dataBlob = scriptElements[i].innerHTML;
  }
  if(dataBlob)
  {
    var keyName = dataBlob.split("(")[1].split(",")[0];
    var dataValue = dataBlob.split(keyName)[1].slice(1); //Remove leading comma
    dataValue = dataValue.slice(0, dataValue.length - 2); //Remove trailing );
    
    keyName = keyName.slice(1, keyName.length - 1); //Remove quotes
    data = JSON.parse(dataValue);

    try {
      if(dataValue.includes("video_dash_manifest")) {
        var manifest = data.graphql.shortcode_media.dash_info.video_dash_manifest
        data.videoManifest = manifest.replaceAll("&amp;", "&");
      }
    } catch(ex) {}

    if(!document.bonusData) document.bonusData = {};
    document.bonusData[keyName] = data;

    //console.log(document.bonusData);

    return data;
  }
}
parseAdditionalData(document);


function saveImage(requestType){
  try {
    var filePath = false;
    var fileName = "download";

    if(requestType == "saveIgStoryImage") {
      var fileExtension = ".jpg";

      //photo
      var srcSet = document.getElementsByTagName("img")[1].srcset
      if(!srcSet) { // Updated ui structure introduced around 12/10/2020
        srcSet = document.getElementsByTagName("img")[0].srcset
      }
      //filePath = srcSet.split(",").slice(-1)[0].split(" ")[0];
      filePath = srcSet.split(",")[0].split(" ")[0]; //Updated logic around 12/25/2020 from above
      fileName = document.getElementsByClassName("notranslate")[0].text;
      
      //video
      if(document.getElementsByTagName("video")[0]) {
        var tag = document.getElementsByTagName("video")[0];
        if(tag.childNodes.length > 0) {
          filePath = tag.childNodes[0].src;
        }
        else {
          //This is when the icon is pressed on an IG TV post page, not a story - but IG TV disables right-click
          filePath = tag.src;
          fileName = document.getElementsByTagName("article")[0].childNodes[0].childNodes[1].childNodes[0].childNodes[0].childNodes[0].textContent
        }
        fileExtension = ".mp4";
      }

      var dateObject = document.getElementsByTagName("time")[0];
      if(dateObject && dateObject.dateTime)
        fileName += " " + dateObject.dateTime.split(".")[0].replace("T", " ")
      fileName += fileExtension;
    }
    else if(requestType == "saveInstagramImage") {
      //get the file path
      var imgContainer = last_target.parentNode;

      //If the click was on a tag, we need to go up a bit further
      if(imgContainer.tagName == "SPAN")
        imgContainer = imgContainer.parentNode.parentNode;
      filePathNode = imgContainer.childNodes[0].childNodes[0];

      if(filePathNode.childNodes.length > 0) {
        filePathNode = filePathNode.childNodes[0];
      }
      if(filePathNode.childNodes.length > 0) {
        filePathNode = filePathNode.childNodes[0];
      }
      filePath = filePathNode.src;

      // User Profile Page click on small icon in user feed - need to retrieve full URL from target link
      if (!filePath) {
        var postPageRequest = new XMLHttpRequest();
        postPageRequest.onreadystatechange = function() {
          if (this.readyState == 4 && this.status == 200) {
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(this.response,"text/html");
            var newData = parseAdditionalData(xmlDoc);

            if(newData) {
              var url;
              if(newData.graphql.shortcode_media.video_url)
                url = newData.graphql.shortcode_media.video_url;
              else {
                try{ 
                  //the last items is the largest resolution
                  url = newData.graphql.shortcode_media.display_resources[newData.graphql.shortcode_media.display_resources.length - 1].src;
                } catch {}
              }

              if(url) 
                performSave(getIgFilename(url, newData.graphql.shortcode_media.owner.username), url);
              else 
                console.log("Cannot find save URL");
            }
          }
        };
        postPageRequest.open('GET', last_target.parentNode.parentNode.href);
        postPageRequest.send(null);
        return;
      }

      //If it's a video, need some more logic to get to the proper link on this page
      if (!filePath || filePath.startsWith("blob:")) {
        try {
          filePath = false;

          // Main Feed page logic
          if (document.bonusData && document.bonusData["feed"]) {
            var posterUrl = filePathNode.poster;
              
            var edges = document.bonusData["feed"].user.edge_web_feed_timeline.edges;
            for(let i = 0; i < edges.length && !filePath; i++) {
              if(edges[i].node.display_url == posterUrl)
              filePath = edges[i].node.video_url;
            }
          }
          // Individual Post page logic
          else if(document.bonusData && document.bonusData[window.location.pathname]) {
            // Getting it from BonusData is the preferred method, because it includes audio+video; the video manifest logic only returns video.

            // This handles a single-video post
            if(document.bonusData[window.location.pathname].graphql.shortcode_media.video_url) {
              filePath = document.bonusData[window.location.pathname].graphql.shortcode_media.video_url;
            }
            // This handles a video in a multi-image post
            else {
              var posterUrl = filePathNode.poster;
              if (document.bonusData[window.location.pathname].graphql.shortcode_media.edge_sidecar_to_children) {
                var edges = document.bonusData[window.location.pathname].graphql.shortcode_media.edge_sidecar_to_children.edges;
                for(let i = 0; i < edges.length && !filePath; i++) {
                  if(edges[i].node.display_url == posterUrl) {
                    filePath = edges[i].node.video_url
                  }
                }
              }

              //This is a catch-all using non-ideal logic, which should hopefully never be hit
              if(!filePath && document.bonusData[window.location.pathname].videoManifest) {
                var videoManifest = document.bonusData[window.location.pathname].videoManifest;
                filePath = videoManifest.split('mimeType="video/mp4"')[1].split('<BaseURL>')[1].split('</BaseURL>')[0];
              }
            }
          }
          // User Profile page logic - need to load the post page to get the BonusData object and the media URLs
          else {
            var posterUrl = filePathNode.poster;

            var postPageRequest = new XMLHttpRequest();
            postPageRequest.onreadystatechange = function() {
              if (this.readyState == 4 && this.status == 200) {
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(this.response,"text/html");
                var newData = parseAdditionalData(xmlDoc);

                if(newData) {
                  var url = false;
                  //single Video post
                  if(newData.graphql.shortcode_media.video_url) {
                    url = newData.graphql.shortcode_media.video_url;
                  }
                  // multi-image post
                  else {
                    if (newData.graphql.shortcode_media.edge_sidecar_to_children) {
                      var edges = newData.graphql.shortcode_media.edge_sidecar_to_children.edges;
                      for(let i = 0; i < edges.length && !url; i++) {
                        if(edges[i].node.display_url == posterUrl) {
                          url = edges[i].node.video_url
                        }
                      }
                    }
                  }

                  if(url) 
                    performSave(getIgFilename(url, newData.graphql.shortcode_media.owner.username), url);
                  else 
                    console.log("Cannot find save URL");
                }
              }
            };
            postPageRequest.open('GET', window.location.href);
            postPageRequest.send(null);
            return;

          }
        }
        catch(err) {
          console.log(err);
        }
      }

      if(filePath)
        fileName = getIgFilename(filePath, "");
      else
        console.log("File to download not found.");
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

    performSave(fileName, filePath);
  }
  catch(err) {
      console.log("Invalid image, cannot be saved...", err);
  }
}
function getIgFilename(filePath, usernamePrefix) {
  try {
    //get the username
    try
    {
      var userNameNode = last_target;
      while (userNameNode.tagName != "ARTICLE" && userNameNode.tagName != "BODY") {
        userNameNode = userNameNode.parentNode;
      }
      if(userNameNode.tagName != "BODY") {
        userNameNode = userNameNode.childNodes[0].childNodes[1];
        while (userNameNode.tagName != "A") {
          userNameNode = userNameNode.childNodes[0];
        }
        usernamePrefix = userNameNode.textContent;
      }
    }
    catch(err) {}

    if (usernamePrefix != "") {
      usernamePrefix = usernamePrefix + "_";
    }

    fileName = filePath.split('/').pop();

    //Handle issue reported by user where files had random characters appended after their extension
    if(/\.jpg(.+)/.test(fileName)) {
      fileName = fileName.split(".jpg")[0] + ".jpg";
    }
    if(/\.mp4(.+)/.test(fileName)) {
      fileName = fileName.split(".mp4")[0] + ".mp4";
    }
  }
  catch(err) {
      console.log("Invalid image, cannot be saved...", err);
  }

  return usernamePrefix + fileName;
}

function performSave(fileName, filePath) {
  try {
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
        anchor.setAttribute('download',  fileName);
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
