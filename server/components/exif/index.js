'use strict';

// required exiv2

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var moment = require('moment');


// http://phpjs.org/functions/escapeshellarg/
function escapeshellarg(arg) {
  var ret = '';
  ret = arg.replace(/[^\\]'/g, function(m, i, s) {
    return m.slice(0, 1) + '\\\'';
  });
  return "'" + ret + "'";
}

function splitLine(line) {
  var result = [], re = /\s+/g, match, count = 4, baseIdx = 0, idx;
  while (--count > 0 && (match = re.exec(line))) {
    result.push(line.substring(baseIdx, match.index));
    baseIdx = re.lastIndex;
  }
  if (0 === count) {
    result.push(line.substring(baseIdx));
  }
  return result;
}

function parseDate(str) {
  return moment(str, ['YYYY:MM:DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss', moment.ISO_8601]);
}

var reCood = /([\d.]+)deg(?:\s+([\d.]+)')?(?:\s+([\d.]+)")?/i;
function extractCood(text) {
  var m = reCood.exec(text), result;
  if (m) {
    result = [parseFloat(m[1]), parseFloat(m[2] || 0), parseFloat(m[3] || 0)];
  } else {
    console.warn('Can not parse exif gps "' + text + '"');
  }
  return result;
}

var reFloat = /([\d.]+)/i;
function extractFloat(text) {
 var m = reFloat.exec(text);
 return m ? parseFloat([1]) : undefined;
}

function parseExif(imagePath, callback) {
  exec('exiv2 -qpt ' + escapeshellarg(imagePath), function (err, stdout, stderr) {
    if (err) return callback(err);

    var result = {};
    var lines = String(stdout).split('\n'), line;
    for (var i = 0, c = lines.length; i < c; ++i) {
      line = splitLine(lines[i]);
      result[line[0]] = line[3];
    }
    callback(null, result);
  });
}

function convert (file, info) {
  var tmp, data = {};
  data.file = {
    filename: file.filename,
    extension: path.extname(file.filename).substring(1),
    size: file.size
  };

  if (!info) {
    return data;
  }

  data.date = {
    original: (tmp = parseDate(info['Exif.Photo.DateTimeOriginal'])) ? tmp.toISOString() : undefined,
    originalAgo: (tmp = parseDate(info['Exif.Photo.DateTimeOriginal'])) ? tmp.fromNow() : undefined,
  };

  if (file.resolution) {
    data.resolution = {};
    data.resolution.x = file.resolution.width;
    data.resolution.y = file.resolution.height;
  } else if (info['Exif.Image.XResolution'] && info['Exif.Image.YResolution']) {
    data.resolution.x = info['Exif.Image.XResolution'];
    data.resolution.y = info['Exif.Image.YResolution'];
  }
  if (file.resolution) {
    data.resolution.megapixels = +(data.resolution.x * data.resolution.y / 1000000).toFixed(1);
  }

  data.camera = {
    focalLength: info['Exif.Photo.FocalLength'],
    exposureMode: info['Exif.Photo.ExposureMode'],
    exposureProgram: info['Exif.Photo.ExposureProgram'],
    exposureTime: info['Exif.Photo.ExposureTime'],
    fNumber: info['Exif.Photo.FNumber'],
    ISO: info['Exif.Photo.ISOSpeedRatings'],
    make: info['Exif.Image.Make'],
    model: info['Exif.Image.Model'],
    LensModel: info['Exif.Photo.LensModel']
  };

  var lat, lng;
  if (info['Exif.GPSInfo.GPSLatitude'] && info['Exif.GPSInfo.GPSLongitude'] 
    && (lat = extractCood(info['Exif.GPSInfo.GPSLatitude'])) && (lng = extractCood(info['Exif.GPSInfo.GPSLongitude']))
  ) {
    data.location = {};
    var decimalLat = lat[0] + (lat[1] / 60.0) + (lat[2] / 3600.0);
    var decimalLng = lng[0] + (lng[1] / 60.0) + (lng[2] / 3600.0);
    var latRef = (/\s*North\s*/i.test(info['Exif.GPSInfo.GPSLatitudeRef'])) ? 'N' : 'S';
    var lngRef = (/\s*East\s*/i.test(info['Exif.GPSInfo.GPSLongitudeRef'])) ? 'E' : 'W';
    if (latRef === 'S') {
      decimalLat = 0 - decimalLat;
    }
    if (lngRef === 'W') {
      decimalLng = 0 - decimalLng;
    }
    // Degrees, minutes and seconds
    data.location.dms = {
      lat: lat.slice().concat(latRef),
      lng: lng.slice().concat(lngRef)
    };
    // Decimal degrees
    data.location.ddd = {
      lat: decimalLat,
      lng: decimalLng
    };
  }

  return data;
}


exports.parse = parseExif;
exports.convert = convert;

