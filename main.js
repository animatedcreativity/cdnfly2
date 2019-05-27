exports = module.exports = function(config) {
  var sanitize = require("node-sanitize-options");
  var request = require("request");
  var fs = require("fs");
  var zip = require("zip-stream");
  var unzip = require("unzip-stream");
  var streamToString = require("stream-to-string");
  var app = {
    status: require("./status.js")(),
    sanitize: sanitize,
    wrapper: require("node-promise-wrapper"),
    config: sanitize.options(config, require("./config.js")()),
    mime: require("mime-types"),
    downloadFile: function(config, path, localPath, zipMode) {
      if (typeof zipMode === "undefined") zipMode = false;
      return new Promise(async function(resolve, reject) {
        config = app.sanitize.options(config, app.config);
        var headers = {
          email: config.email,
          apiKey: config.apiKey,
          domain: config.domain,
          object: zipMode === true ? path + ".zip" : path,
          method: "GET"
        };
        var build = function() {
          return request
          .post({url: config.api + "/file", headers: headers}, function(error, response, body) {
            if (typeof response !== "undefined" && typeof response.headers["last-modified"] !== "undefined") {
              resolve({status: app.status.success, file: localPath});
            } else {
              reject({status: app.status.downloadError, error: "Download error."});
            }
          });
        };
        if (zipMode === true) {
          var parseStream = unzip.Parse()
          try {
            build()
            .pipe(parseStream)
            .on("entry", function (entry) {
              var filePath = entry.path;
              if (filePath === path.split("/").pop()) {
                entry.pipe(fs.createWriteStream(localPath));
              } else {
                entry.autodrain();
              }
            });
          } catch (error) {
            reject(error);
          }
        } else {
          build()
          .pipe(fs.createWriteStream(localPath));
        }
      });
    },
    readFile: function(config, path, zipMode) {
      if (typeof zipMode === "undefined") zipMode = false;
      return new Promise(async function(resolve, reject) {
        config = app.sanitize.options(config, app.config);
        var headers = {
          email: config.email,
          apiKey: config.apiKey,
          domain: config.domain,
          object: zipMode === true ? path + ".zip" : path,
          method: "GET"
        };
        var resolved = false;
        var build = function() {
          return request
          .post({url: config.api + "/file", headers: headers}, function(error, response, body) {
            if (zipMode === false) {
              if (typeof response !== "undefined" && typeof response.headers["last-modified"] !== "undefined") {
                try {
                  var json = JSON.parse(body);
                  resolve(json);
                } catch (error) {
                  resolve(body);
                }
              } else {
                reject({status: app.status.downloadError, error: "Download error."});
              }
            }
          });
        };
        if (zipMode === true) {
          build()
          .pipe(unzip.Parse())
          .on("entry", async function (entry) {
            var filePath = entry.path;
            if (filePath === path.split("/").pop()) {
              var data = await streamToString(entry);
              try {
                var json = JSON.parse(data);
                resolve(json);
              } catch (error) {
                resolve(data);
              }
            } else {
              entry.autodrain();
            }
          });
        } else {
          build();
        }
      });
    },
    uploadFile: function(config, name, localPath, zipMode) {
      if (typeof zipMode === "undefined") zipMode = false;
      return new Promise(async function(resolve, reject) {
        config = app.sanitize.options(config, app.config);
        var contentType = app.mime.lookup(localPath);
        var headers = {
          email: config.email,
          apiKey: config.apiKey,
          domain: config.domain,
          object: zipMode === true ? name + ".zip" : name,
          method: "PUT",
          "content-type": zipMode === true ? "application/zip, application/octet-stream" : contentType
        };
        var build = function() {
          return request.put({url: config.api + "/file", headers: headers}, function(error, response, body) {
            if (typeof response !== "undefined" && typeof response.headers["x-amz-request-id"] !== "undefined") {
              resolve({status: app.status.success, file: localPath});
            } else {
              reject({status: app.status.uploadError, error: "Upload error."});
            }
          })
        };
        if (zipMode === true) {
          var archive = new zip();
          archive.on("error", function(err) {
            throw err;
          }).entry(fs.createReadStream(localPath), {name: localPath.split("/").pop()}, function(err, entry) {
            if (err) throw err;
            archive.finish();
          }).pipe(build());
        } else {
          build();
        }
      });
    },
    uploadLink: function(config, name, link, zipMode) {
      if (typeof zipMode === "undefined") zipMode = false;
      return new Promise(async function(resolve, reject) {
        config = app.sanitize.options(config, app.config);
        var headers = {
          email: config.email,
          apiKey: config.apiKey,
          domain: config.domain,
          object: zipMode === true ? name + ".zip" : name,
          method: "PUT"
        };
        var build = function() {
          return request.put({url: config.api + "/file", headers: headers}, function(error, response, body) {
            if (typeof response !== "undefined" && typeof response.headers["x-amz-request-id"] !== "undefined") {
              resolve({status: app.status.success, link: link});
            } else {
              reject({status: app.status.uploadError, error: "Upload error."});
            }
          });
        };
        var stream = request.get(link)
        .on('error', function(error) {
          reject({status: app.status.uploadError, error: "Upload error."});
        }).on('response', function(response) {
          headers.contentType = zipMode === true ? "application/zip, application/octet-stream" : response.headers['content-type'];
        });
        if (zipMode === true) {
          var archive = new zip();
          archive.on("error", function(err) {
            throw err;
          }).entry(stream, {name: name.split("/").pop()}, function(err, entry) {
            if (err) throw err;
            archive.finish();
          }).pipe(build());
        } else {
          build();
        }
      });
    },
    writeFile: function(config, name, contents, contentType, zipMode) {
      if (typeof zipMode === "undefined") zipMode = false;
      return new Promise(async function(resolve, reject) {
        config = app.sanitize.options(config, app.config);
        var headers = {
          email: config.email,
          apiKey: config.apiKey,
          domain: config.domain,
          object: zipMode === true ? name + ".zip" : name,
          method: "PUT",
          "content-type": zipMode === true ? "application/zip, application/octet-stream" : contentType
        };
        var build = function() {
          return request.put({url: config.api + "/file", headers: headers}, function(error, response, body) {
            if (typeof response !== "undefined" && typeof response.headers["x-amz-request-id"] !== "undefined") {
              resolve({status: app.status.success, message: "Done."});
            } else {
              reject({status: app.status.uploadError, error: "Write error."});
            }
          });
        };
        if (zipMode === true) {
          var archive = new zip();
          archive.on("error", function(err) {
            throw err;
          }).entry(contents, {name: name.split("/").pop()}, function(err, entry) {
            if (err) throw err;
            archive.finish();
          }).pipe(build());
        } else {
          build();
        }
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