'use strict';

var _ = require('lodash');
var fs = require('fs');
var http = require('http');
var path = require('path');
var url = require('url');
var gm = require('gm');
var mmm = require('mmmagic');
var async = require('async');
var moment = require('moment');
var ExifImage = require('exif').ExifImage;
// var File = require('./file.model');
var config = require('../../config/environment');


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


var exifInfo = {
  ExposureMode: {
    '0': 'Auto exposure',
    '1': 'Manual exposure',
    '2': 'Auto bracket'  
  },

  ExposureProgram: {
    '0': 'Not defined',
    '1': 'Manual',
    '2': 'Normal program',
    '3': 'Aperture priority',
    '4': 'Shutter priority',
    '5': 'Creative program',
    '6': 'Action program',
    '7': 'Portrait mode',
    '8': 'Landscape mode'    
  }
};



function getExifLocation(info) {
  if (!info.gps || !info.gps.GPSLatitude || !info.gps.GPSLongitude) {
    return null;
  }
  var lat = info.gps.GPSLatitude;
  var lng = info.gps.GPSLongitude;
  var decimalLat = lat[0] + (lat[1] / 60.0) + (lat[2] / 3600.0);
  var decimalLng = lng[0] + (lng[1] / 60.0) + (lng[2] / 3600.0);

  if (info.gps.GPSLatitudeRef != 'N') {
    decimalLat = 0 - decimalLat;
  }
  if (info.gps.GPSLongitudeRef != 'E') {
    decimalLng = 0 - decimalLng;
  }
  return { 
    // Degrees, minutes and seconds
    dms: {
      lat: lat.slice().concat(info.gps.GPSLatitudeRef),
      lng: lng.slice().concat(info.gps.GPSLongitudeRef)
    },

    // Decimal degrees
    ddd: {
      lat: decimalLat, 
      lng: decimalLng
    }
  };
}

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

function MaxSizeExceededError(message, fileSize, maxSize) {
  Error.call(this);
  this.name = "MaxSizeExceededError";
  this.message = message || 'File size'
    + (fileSize ? ' ' + formatSize(maxSize) : '')
    + ' exceeded allowed ' + (maxSize ? formatSize(maxSize) : 'limit');
}
MaxSizeExceededError.prototype = new Error();
MaxSizeExceededError.prototype.constructor = MaxSizeExceededError;

function FileUnavailableError(message) {
  Error.call(this);
  this.name = "FileUnavailableError";
  this.message = message || 'File is not available';
}
FileUnavailableError.prototype = new Error();
FileUnavailableError.prototype.constructor = FileUnavailableError;

function NotJpegError(message, mime) {
  Error.call(this);
  this.name = "NotJpegError";
  this.message = message || 'File is not a JPEG image';
}
NotJpegError.prototype = new Error();
NotJpegError.prototype.constructor = NotJpegError;



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
  this.thumbName = this.clientId + '-thumb.' + ext;

  var magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
  magic.detectFile(imagePath, function(err, mime) {
    if (err) return callback(err);
    if (mime !== 'image/jpeg') {
      return callback(new NotJpegError(null, mime));
    }

    fs.stat(imagePath, function (err, stat) {
      if (err) return callback(err);
      if (stat.size > config.maxFileSize) {
        return callback(new MaxSizeExceededError(null, stat.size, config.maxFileSize));
      }

      async.parallel({
        exif: function (callback) {
          new ExifImage({ image: imagePath }, function (err, info) {
            if (err) return callback(err);
            var data;
            try {
              data = self.convertExif({
                filename: self.originalFilename || path.basename(imagePath),
                size: stat.size
              }, info);
              callback(null, data);
            } catch (e) {
              callback(e);
            }
          });
        },
        thumb: function (callback) {
          gm(imagePath)
            .resize(300)
            .write(config.path.usr + '/' + self.thumbName, function (err) {
              if (err) return callback(err);
              callback(null);
            });
        }
      }, function (err, data) {
        if (err) {
          fs.unlink(imagePath, function (err) { if (err) console.log(err); });
          fs.unlink(config.path.usr + '/' + self.thumbName, function (err) { if (err) console.log(err); });
          return callback(err);
        }

        fs.rename(imagePath, config.path.usr + '/' + self.imageName, function (err) {
          if (err) return callback(err);
          var result = data.exif;
          result.file.thumbUrl = '/usr/' + self.thumbName;
          result.file.imageUrl = '/usr/' + self.imageName;
          callback(null, result);
        });

      });

    });


  });

        
};

FileHelper.prototype.validateResponse = function (response, callback) {
  if (response.statusCode !== 200) {
    return callback(new FileUnavailableError());
  }
  if (response.headers['content-type'] !== 'image/jpeg') {
    return callback(new NotJpegError(null, response.headers['content-type']));
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
  var request = http.request(options, function (response) {
    self.validateResponse(response, callback);
  });
  request.end();
};

FileHelper.prototype.remoteDownload = function (imageUrl, dest, callback) {
  var self = this;
  var file = fs.createWriteStream(dest);
  var request = http.get(imageUrl, function(response) {
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
  var tmp, data = {};
  data.file = {
    filename: file.filename,
    extension: path.extname(file.filename).substring(1),
    size: file.size
  };

  if (!info || !info.exif || !info.exif.ExifVersion) {
    return data;
  }

  if (info.exif) {
    data.date = {
      original: (tmp = parseDate(info.exif.DateTimeOriginal)) ? tmp.toISOString() : undefined,
      created: (tmp = parseDate(info.exif.CreateDate)) ? tmp.toISOString() : undefined,
      originalAgo: (tmp = parseDate(info.exif.DateTimeOriginal)) ? tmp.fromNow() : undefined,
      createdAgo: (tmp = parseDate(info.exif.CreateDate)) ? tmp.fromNow() : undefined
    };
  }

  if (info.image) {
    data.resolution = {
      x: info.image.XResolution,
      y: info.image.YResolution,
      megapizels: Math.floor(info.image.XResolution * info.image.YResolution / 1000000).toFixed(1)
    };
    if (data.resolution.megapizels === '0.0') data.resolution.megapizels = 0;
  }

  if (info.exif) {
    data.camera = {
      focalLength: info.exif.FocalLength,
      focalLengthIn35mmFormat: info.exif.FocalLengthIn35mmFormat,
      exposureMode: exifInfo.ExposureMode[info.exif.ExposureMode],
      exposureProgram: exifInfo.ExposureProgram[info.exif.ExposureProgram],
      exposureTime: info.exif.ExposureTime < 1 ? '1/' + Math.floor(1 / info.exif.ExposureTime) : info.exif.ExposureTime,
      fNumber: info.exif.FNumber,
      make: info.image.Make,
      model: info.image.Model
    };
  }
  
  data.location = getExifLocation(info);

  return data;
};
