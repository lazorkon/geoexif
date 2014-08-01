'use strict';

var util = require('util');
var _ = require('lodash');
var ExifImage = require('exif').ExifImage;
// var File = require('./file.model');

/*
 * Upload file and extract exif
 * Example:
 * req.files: {
 *   file: { 
 *     fieldname: 'file',
 *     originalname: '300x300.png',
 *     name: '2014-07-31T17:48:33.483Z_dlctmpkua0pb9.png',
 *     encoding: '7bit',
 *     mimetype: 'image/png',
 *     path: '/home/lnu/dev/geo-exif/tmp/2014-07-31T17:48:33.483Z_dlctmpkua0pb9.png',
 *     extension: 'png',
 *     size: 622,
 *     truncated: false
 *   }
 * }
 */
exports.upload = function(req, res, next) {
  if (!req.files || !req.files.file) {
    next(new Error('File is not uploaded'));
  }

  var file = req.files.file;
  try {
    new ExifImage({ image: file.path }, function (err, info) {
      if (err) return next(err);
      console.log('file.upload exif: ', util.inspect(info, false, null));
      return res.json(200, convertExif(file, info));
    });
  } catch (error) {
    return next(error);
  }
};

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


// http://www.awaresystems.be/imaging/tiff/tifftags.html
function convertExif(file, info) {
  var data = {};
  data.file = {
    filename: file.originalname,
    extension: file.extension,
    size: file.size
  };

  if (!info || !info.exif || !info.exif.ExifVersion) {
    return data;
  }

  if (info.exif) {
    data.date = {
      original: info.exif.DateTimeOriginal,
      created: info.exif.CreateDate
    };
  }

  if (info.image) {
    data.resolution = {
      x: info.image.XResolution,
      y: info.image.YResolution 
    };
  }

  if (info.exif) {
    data.camera = {
      focalLength: info.exif.FocalLength,
      exposureMode: exifInfo.ExposureMode[info.exif.ExposureMode],
      exposureProgram: exifInfo.ExposureProgram[info.exif.ExposureProgram],
      exposureTime: info.exif.ExposureTime,
      fNumber: info.exif.FNumber,
      make: info.image.Make,
      model: info.image.Model
    };
  }
  
  data.location = getExifLocation(info);

  return data;
}


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
