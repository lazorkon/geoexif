'use strict';

angular.module('app')
  .controller('MainCtrl', function ($scope, $window, $timeout, $http, $upload, $analytics) {
    var debug = true;

    $scope.debug = true;

    $scope.reset = function () {
      $scope.disableInput = false;
      $scope.data = null;
      $scope.upload = [];
      $scope.errors = null;
      $scope.progress = null;
      $scope.selected = null;
      $scope.uploadResult = [];
      $scope.selectedUrl = '';
    };

    $scope.reset();

    var onApiDone = function(response) {
      debug && console.log('MainCtrl.upload.done', response.data);
      $scope.data = null;
      $scope.selected = null;
      $scope.selectedUrl = '';
      $scope.disableInput = false;
      $timeout(function() {
        $scope.data = response.data;
        $scope.data.text = renderExifInfo(response.data);
      });
      if (response.data.location && response.data.location.ddd) {
        geocode(response.data.location.ddd);
      }
    };

    var renderExifInfo = function (data) {
      var result = {};
      var tmp;

      if (data.camera) {
        result.camera = [];

        tmp = data.camera.make;
        if (data.camera.model) tmp += (tmp ? ' ' : '') + data.camera.model;
        if (tmp) result.camera.push(tmp);

        if (data.camera.LensModel) result.camera.push(data.camera.LensModel);

        tmp = '';
        if (data.camera.exposureMode) tmp += (tmp ? ', ' : '') + data.camera.exposureMode;
        if (data.camera.exposureProgram) tmp += (tmp ? ', ' : '') + data.camera.exposureProgram;
        if (data.camera.exposureTime) tmp += (tmp ? ', ' : '') + data.camera.exposureTime;
        if (data.camera.fNumber) tmp += (tmp ? ', ' : '') + data.camera.fNumber;
        if (data.camera.ISO) tmp += (tmp ? ', ' : '') + 'ISO ' + data.camera.ISO;
        if (tmp) result.camera.push(tmp);
      }

      return result;
    };

    // https://developers.google.com/maps/documentation/geocoding/#ReverseGeocoding
    var geocode = function (coords) {
      var lat = +coords.lat, lng = +coords.lng;
      var url = 'http://maps.googleapis.com/maps/api/geocode/json?latlng=' + lat + ',' + lng + '&language=en&sensor=false';
      $http.get(url).then(function (response) {
        debug && console.log('MainCtrl.geocode.done', response.data);
        var data = response.data, info;
        if (data && data.results && data.results.length && (info = data.results[0])) {
          $scope.data.address = info.formatted_address;
        }
      });
    };

    var onApiFail = function(response) {
      debug && console.log('MainCtrl.upload.fail', response.data);
      $scope.errors = response.data;
      $scope.selected = null;
      $scope.selectedUrl = '';
      $scope.disableInput = false;
    };
  
    $scope.onFileSelect = function($files, mode) {
      $analytics.eventTrack('drag' === mode ? 'fileDrag' : 'fileSelect', {category: 'main'});
      debug && console.log('onFileSelect', $files);
      var i, c;
      $files.length > 1 && ($files = $files.slice(0, 1));
      $scope.selected = null;
      $scope.progress = null;
      $scope.errors = null;
      if ($scope.upload && $scope.upload.length > 0) {
        for (i = 0, c = $scope.upload.length; i < c; ++i) {
          if ($scope.upload[i] != null) {
            $scope.upload[i].abort();
          }
        }
      }
      
      var file = $files[0];
      $scope.upload = [];
      $scope.uploadResult = [];
      $scope.selected = file;
      // todo: fix validation
      if (file.type && file.type !== 'image/jpeg') {
        $scope.errors = 'Selected file is not JPEG image: "' + file.type + '"';
        return;
      }

      $scope.progress = -1;
      $scope.start(i);
    };

    $scope.start = function(index) {
      $scope.progress = 0;
      $scope.errors = null;
      $scope.upload[index] = $upload.upload({
        url: '/api/file/upload',
        method: 'POST',
        file: $scope.selected,
        fileFormDataName: 'file'
      });

      $scope.upload[index].then(onApiDone, onApiFail, function(e) {
        $scope.progress = Math.min(100, parseInt(100.0 * e.loaded / e.total));
      });
    };

    $scope.abort = function(index) {
      $scope.upload[index].abort(); 
      $scope.upload[index] = null;
    };
 
    $scope.getDragOverClass = function($event) {
      var items = $event.dataTransfer.items;
      var hasFile = false;
      if (items != null) {
        for (var i = 0 ; i < items.length; i++) {
          if (items[i].kind === 'file' && items[i].type === 'image/jpeg') {
            hasFile = true;
            break;
          }
        }
      } else {
        hasFile = true;
      }
      return hasFile ? 'image-over' : 'err-over';
    };

    $scope.onUrlSelect = function ($e) {
      var url = String($scope.selectedUrl).replace(/^\s+|\s+$/g, '');
      if ($scope.form.selectedUrl.$invalid || !url) {
        return;
      }
      $analytics.eventTrack('urlSelect', {category: 'main'});
      debug && console.log('MainCtrl.onUrlSelect', url);
      $scope.disableInput = true;
      $scope.selected = {name: url};
      $scope.progress = -1;
      $http.post('/api/file/url', {url: url}).then(onApiDone, onApiFail);
    };


    // [49, 50, 1.4, N']
    $scope.formatDMSCoord = function (slice) {
      var names = {'N': 'North', 'S': 'South', 'E': 'East', 'W': 'West'};
      return slice[0] + '° ' + slice[1] + "' " + slice[2] + '" ' + (slice[3] ? names[('' + slice[3]).toUpperCase()] : '');
    };

    // 49.833722
    $scope.formatDDDCoord = function (num) {
      return num ? Number(num).toFixed(6) : 0;
    };

  });
