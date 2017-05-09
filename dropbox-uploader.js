function run() {
  FSWrapper.getFileList('.').forEach(function(file) {
    var parts = file.split('/');
    var filename = parts[parts.length - 1];
    DropboxWrapper.search(filename).then((name) => {
      console.log(file);
    });
  });
};

var FSWrapper = (function() {
  var fs = require('fs');

  var getFileList = function(dir) {
    var files = [];

    fs.readdirSync(dir).forEach(function(file) {
      if(fs.statSync(dir + '/' + file).isDirectory()) {
        files = files.concat(getFileList(dir + '/' + file));
      } else {
        files.push(dir + '/' + file);
      }
    });

    return files;
  };

  return {
    'getFileList': getFileList
  };
})();

var DropboxWrapper = (function() {
  var https = require('https');

  var searchOptions = {
    hostname: 'api.dropboxapi.com',
    path: '/2/files/search',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer OWLeBHEPYqEAAAAAAADCCbyVrJlEKbY8048EBU2pxQ1wmYrSiTwV7xTzUj8xXYCj',
      'Content-Type': 'application/json'
    }
  };

  var getMatchName = function(obj) {
    return obj.metadata ? obj.metadata.name : undefined;
  };

  var handleResponse = function(res) {
    var promise = new Promise((resolve, reject) => {
      var data;
      var chunks = [];

      res.on('end', function() {
        data = chunks.join();
        var parsed = JSON.parse(data);

        var filenames = [];

        if(Array.isArray(parsed.matches)) {
          parsed.matches.forEach(function(match) {
            filenames.push(getMatchName(match));
          })
        }

        resolve(filenames);
      });

      res.on('data', function(data) {
        chunks.push(data);
      });
    });

    return promise;
  };

  var search = function(filename) {
    var promise = new Promise((resolve, reject) => {
      var request = https.request(searchOptions, function(response) {
        handleResponse(response).then((filenames) => {
          var matched = false;

          filenames.forEach((file) => {
            if(file == filename) {
              matched = true;
              return false;
            }
          })

          if(!matched) {
            resolve(filename);
          }
        });
      });

      request.on('error', function(error) {
        console.log('Dropbox search error.', error);
      });

      var data = JSON.stringify({
        "path": "",
        "query": filename
      });

      request.write(data);
      request.end();
    });

    return promise;
  };

  // public api
  return {
    'search': search
  };
})();

run();
