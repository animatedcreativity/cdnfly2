exports = module.exports = function(config) {
  var sanitize = require("node-sanitize-options");
  var request = require("request");
  var fs = require("fs");
  var app = {
    status: require("./status.js")(),
    sanitize: sanitize,
    wrapper: require("node-promise-wrapper"),
    config: sanitize.options(config, require("./config.js")()),
    mime: require("mime-types"),
    request: function(options) {
      return new Promise(function(resolve, reject) {
        request(options, function(error, response, body) {
          if (typeof body !== "undefined") {
            try {
              var result = JSON.parse(body);
              resolve(result);
            } catch (error) {
              resolve(body.toString());
            }
          } else {
            reject(error);
          }
        });
      });
    },
    downloadFile: function(config, path, localPath) {
      return new Promise(async function(resolve, reject) {
        config = app.sanitize.options(config, app.config);
        var headers = {
          email: config.email,
          apiKey: config.apiKey,
          domain: config.domain,
          object: path,
          method: "GET"
        };
        request
        .post({url: config.api + "/file", headers: headers}, function(error, response, body) {
          if (typeof response.headers["last-modified"] !== "undefined") {
            resolve({status: app.status.success, file: localPath});
          } else {
            reject({status: app.status.downloadError, error: "Download error."});
          }
        })
        .pipe(fs.createWriteStream(localPath));
      });
    },
    readFile: function(config, path) {
      return new Promise(async function(resolve, reject) {
        config = app.sanitize.options(config, app.config);
        var headers = {
          email: config.email,
          apiKey: config.apiKey,
          domain: config.domain,
          object: path,
          method: "GET"
        };
        request
        .post({url: config.api + "/file", headers: headers}, function(error, response, body) {
          if (typeof response.headers["last-modified"] !== "undefined") {
            try {
              var json = JSON.parse(body);
              resolve(json);
            } catch (error) {
              resolve(body);
            }
          } else {
            reject({status: app.status.downloadError, error: "Download error."});
          }
        });
      });
    },
    uploadFile: function(config, name, localPath) {
      return new Promise(async function(resolve, reject) {
        config = app.sanitize.options(config, app.config);
        var contentType = app.mime.lookup(localPath);
        var headers = {
          email: config.email,
          apiKey: config.apiKey,
          domain: config.domain,
          object: name,
          method: "PUT",
          "content-type": contentType
        };
        request.put({url: config.api + "/file", headers: headers, body: fs.createReadStream(localPath)}, function(error, response, body) {
          if (typeof response.headers["x-amz-request-id"] !== "undefined") {
            resolve({status: app.status.success, file: localPath});
          } else {
            reject({status: app.status.uploadError, error: "Upload error."});
          }
        });
      });
    },
    uploadLink: function(config, name, link) {
      return new Promise(async function(resolve, reject) {
        config = app.sanitize.options(config, app.config);
        var headers = {
          email: config.email,
          apiKey: config.apiKey,
          domain: config.domain,
          object: name,
          method: "PUT"
        };
        request.get(link)
        .on('error', function(error) {
          reject({status: app.status.uploadError, error: "Upload error."});
        }).on('response', function(response) {
          headers.contentType = response.headers['content-type']
        }).pipe(
          request.put({url: config.api + "/file", headers: headers}, function(error, response, body) {
            if (typeof response.headers["x-amz-request-id"] !== "undefined") {
              resolve({status: app.status.success, link: link});
            } else {
              reject({status: app.status.uploadError, error: "Upload error."});
            }
          })
        );
      });
    },
    writeFile: function(config, name, contents, contentType) {
      return new Promise(async function(resolve, reject) {
        config = app.sanitize.options(config, app.config);
        var headers = {
          email: config.email,
          apiKey: config.apiKey,
          domain: config.domain,
          object: name,
          method: "PUT",
          "content-type": contentType
        };
        request.put({url: config.api + "/file", headers: headers, body: contents}, function(error, response, body) {
          if (typeof response.headers["x-amz-request-id"] !== "undefined") {
            resolve({status: app.status.success, message: "Done."});
          } else {
            reject({status: app.status.uploadError, error: "Write error."});
          }
        });
      });
    },
    list: function(config, name) {
      return new Promise(async function(resolve, reject) {
        config = app.sanitize.options(config, app.config);
        var headers = {
          email: config.email,
          apiKey: config.apiKey,
          domain: config.domain,
          object: name,
          method: "LIST"
        };
        request.post({url: config.api + "/file/list", headers: headers}, function(error, response, body) {
          var contentType = response.headers["content-type"];
          if (contentType.split("application/json").length > 1) {
            resolve(JSON.parse(body));
          } else {
            reject({status: app.status.listError, error: "List error."});
          }
        });
      });
    }
  }
  return app;
};