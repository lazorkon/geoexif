'use strict';

var debug = ('development' === process.env.NODE_ENV);

var _ = require('lodash');
var fs = require('fs');
var util = require('util');
var http = require('http');
var https = require('https');
var path = require('path');
var url = require('url');
var gm = require('gm');
var mmm = require('mmmagic');
var async = require('async');
var moment = require('moment');
// var File = require('./file.model');
var config = require('../../config/environment');
var exif = require('../../components/exif');


exports.url = function(req, res, next) {
  if (!req.body || !req.body.url) {
    return next(new Error('Wrong request'));
  }
  if (!reUrl.test(req.body.url)) {
    return next(new Error('Wrong url format'));
  }
  var helper = new FileHelper();
  helper.processRemote(req.body.url, function (err, data) {
    if (err) return next(err);
    res.json(200, data);
  });
};


/*
 * Upload file and extract exif
 * Example:
 * req.files: {
 *   file: { 
 *     fieldname: 'file',
 *     originalname: '300x300.jpg',
 *     name: '2014-07-31T17:48:33.483Z_dlctmpkua0pb9.jpg',
 *     encoding: '7bit',
 *     mimetype: 'image/jpeg',
 *     path: '/home/lnu/dev/geo-exif/tmp/2014-07-31T17:48:33.483Z_dlctmpkua0pb9.jpg',
 *     extension: 'jpg',
 *     size: 622,
 *     truncated: false
 *   }
 * }
 */
exports.upload = function(req, res, next) {
  if (!req.files || !req.files.file) {
    return next(new Error('File is not uploaded'));
  }

  var file = req.files.file;
  var helper = new FileHelper();
  helper.originalFilename = file.originalname;
  helper.processLocal(file.path, function (err, data) {
    if (err) return next(err);
    res.json(200, data);
  });
};


/**
 * Regular Expression for URL validation
 * Copyright (c) 2010-2013 Diego Perini (http://www.iport.it) License: MIT
 * @link https://gist.github.com/dperini/729294
 */
var reUrl = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/i;


function parseDate(str) {
  return moment(str, ['YYYY:MM:DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss', moment.ISO_8601]);
}

function formatSize(bytes, precision) {
  if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '';
  if (typeof precision === 'undefined') precision = 1;
  var units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'],
    number = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];
}

function validateMime(mime, filename) {
  // image/jpeg
  if (mime) {
    if (String(mime).indexOf('image/') === 0) {
      return true;
    }

    // gag: libmagic return "application/octet-stream" for some images like "raf", "rw2"
    var ext;
    if ('application/octet-stream' === mime && path && (ext = path.extname(filename)) && ('.raf' === ext || '.rw2' === ext)) {
      return true;
    }
  }
  return false;
}

function MaxSizeExceededError(message, fileSize, maxSize) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = "MaxSizeExceededError";
  this.message = message || 'File size'
    + (fileSize ? ' ' + formatSize(maxSize) : '')
    + ' exceeded allowed ' + (maxSize ? formatSize(maxSize) : 'limit');
}
util.inherits(MaxSizeExceededError, Error);

function FileUnavailableError(message) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = "FileUnavailableError";
  this.message = message || 'File is not available';
}
util.inherits(FileUnavailableError, Error);
function NotImageError(message, mime) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = "NotImageError";
  this.mime = mime;
  this.message = message || 'File is not a supported' + (mime ? '"' + mime + '"' : '');
}
util.inherits(NotImageError, Error);


function FileHelper() {}

FileHelper.prototype.getClientId = function () {
  return (new Date()).getTime().toString(36) + Math.random().toString(36).substring(8);
};

FileHelper.prototype.processRemote = function (imageUrl, callback) {
  var self = this;
  this.clientId = this.getClientId();
  this.originalFilename = path.basename(imageUrl);
  this.remoteValidate(imageUrl, function (err) {
    self.remoteDownload(imageUrl, config.path.tmp + '/' + self.clientId, function (err) {
      if (err) return callback(err);
      self.processLocal(config.path.tmp + '/' + self.clientId, callback);
    });
  });
};

FileHelper.prototype.processLocal = function (imagePath, callback) {
  var self = this;
  var ext = path.extname(imagePath).substring(1) || 'jpg';
  this.clientId = this.getClientId();
  this.imageName = this.clientId + '.' + ext;
  this.thumbName = this.clientId + '-thumb.jpg';

  var magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
  magic.detectFile(imagePath, function(err, mime) {
    if (err) return callback(err);
    if (!validateMime(mime, imagePath)) {
      return callback(new NotImageError(null, mime));
    }

    fs.stat(imagePath, function (err, stat) {
      if (err) return callback(err);
      if (stat.size > config.maxFileSize) {
        return callback(new MaxSizeExceededError(null, stat.size, config.maxFileSize));
      }

      async.parallel({
        exif: function (callback) {
          exif.parse(imagePath, function (err, info) {
            if (err) {
              if (err instanceof exif.ExifParseError) {
                debug && console.log('no exif');
                return callback(null, null);
              }
              return callback(err);
            }
            debug && console.log('exif: ', info);
            callback(null, info);
          });
        },
        thumb: function (callback) {
          var result = null;
          gm(imagePath)
            .size(function (err, value) {
              if (err) return;
              if (value) {
                result = result || {};
                result.width = value.width;
                result.height = value.height;
              }
            })
            .thumbnail(300, 300)
            // .autoOrient()
            .write(config.path.usr + '/' + self.thumbName, function (err) {
              if (err) {
                debug && console.log('can not make thumbnail', err);
                return callback(null); // suppress error
              }
              result = result || {};
              result.url = '/usr/' + self.thumbName;
              callback(null, result);
            });
        }
      }, function (err, data) {
        var result;
        if (!err) {
          try {
            result = self.convertExif({
              filename: self.originalFilename || path.basename(imagePath),
              size: stat.size,
              resolution: data.thumb
            }, data.exif);
          } catch (e) {
            err = e;
          }
        }

        if (err) {
          fs.unlink(imagePath, function () {});
          fs.unlink(config.path.usr + '/' + self.thumbName, function () {});
          return callback(err);
        }

        fs.unlink(imagePath, function () {});

        if (data.thumb && data.thumb.url) {
          result.file.thumbUrl = data.thumb.url;
        }
        // result.file.thumbUrl = '/usr/' + self.thumbName;
        // result.file.imageUrl = '/usr/' + self.imageName;

        console.log('---', result, data);

        setTimeout((function (tmpImagePath) {
          return function () {
            fs.unlink(tmpImagePath, function () {});
          };
        })(config.path.usr + '/' + self.thumbName), 5000);

        
        callback(null, result);

        // fs.rename(imagePath, config.path.usr + '/' + self.imageName, function (err) {
        //   if (err) return callback(err);
        //   callback(null, result);
        // });

      });

    });


  });

        
};

FileHelper.prototype.validateResponse = function (response, callback) {
  if (response.statusCode !== 200) {
    return callback(new FileUnavailableError());
  }
  if (!validateMime(response.headers['content-type'])) {
    return callback(new NotImageError(null, response.headers['content-type']));
  }
  if (response.headers['content-length'] > config.maxFileSize) {
    return callback(new MaxSizeExceededError(null, response.headers['content-length'], config.maxFileSize));
  }

  callback(null);
};

FileHelper.prototype.remoteValidate = function (imageUrl, callback) {
  var options = url.parse(imageUrl);
  options.method = 'HEAD';
  var self = this;
  var obj = ('https:' === options.protocol) ? https : http;
  var request = obj.request(options, function (response) {
    self.validateResponse(response, callback);
  });
  request.end();
};

FileHelper.prototype.remoteDownload = function (imageUrl, dest, callback) {
  var self = this;
  var file = fs.createWriteStream(dest);
  var obj = ('https:' === url.parse(imageUrl).protocol) ? https : http;
  var request = obj.get(imageUrl, function(response) {
    self.validateResponse(response, function (err) {
      if (err) return callback(err);
      response.pipe(file);
      file.on('finish', function() {
        file.close(callback);
      });
    });
  }).on('error', function(err) {
    fs.unlink(dest, function () {});
    callback(err);
  });
  request.end();
};

// http://www.awaresystems.be/imaging/tiff/tifftags.html
FileHelper.prototype.convertExif = function (file, info) {
  return exif.convert(file, info);
};
