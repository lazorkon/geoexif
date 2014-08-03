'use strict';

angular.module('app')
  .controller('MainCtrl', function ($scope, $window, $timeout, $http, $upload) {
    var debug = true;

    $scope.reset = function () {
      $scope.disableInput = false;
      $scope.data = null;
      $scope.upload = [];
      $scope.errors = null;
      $scope.progress = [];
      $scope.selectedFiles = [];
      $scope.uploadResult = [];
      $scope.selectedUrl = '';
    };

    $scope.reset();

    var onApiDone = function(response) {
      debug && console.log('MainCtrl.upload.done', response.data);
      $scope.selectedFiles = [];
      $scope.selectedUrl = '';
      $scope.disableInput = false;
      $timeout(function() {
        $scope.data = response.data;
      });
    };

    var onApiFail = function(response) {
      debug && console.log('MainCtrl.upload.fail', response.data);
      $scope.errors = response.data;
      $scope.selectedFiles = [];
      $scope.selectedUrl = '';
      $scope.disableInput = false;
    };
  
    $scope.onFileSelect = function($files) {
      debug && console.log('onFileSelect', $files);
      var i, c;
      $files.length > 1 && ($files = $files.slice(0, 1));
      $scope.selectedFiles = [];
      $scope.progress = [];
      $scope.errors = null;
      if ($scope.upload && $scope.upload.length > 0) {
        for (i = 0, c = $scope.upload.length; i < c; ++i) {
          if ($scope.upload[i] != null) {
            $scope.upload[i].abort();
          }
        }
      }
      
      $scope.upload = [];
      $scope.uploadResult = [];
      $scope.selectedFiles = $files;
      var file;
      for (i = 0, c = $files.length; i < c; ++i) {
        file = $files[i];
        if ('image/jpeg' !== file.type) {
          $scope.errors = 'Selected file is not JPEG image';
          continue;
        }
        $scope.progress[i] = -1;
        $scope.start(i);
      }
    };

    $scope.start = function(index) {
      $scope.progress[index] = 0;
      $scope.errors = null;
      $scope.upload[index] = $upload.upload({
        url: '/api/file/upload',
        method: 'POST',
        file: $scope.selectedFiles[index],
        fileFormDataName: 'file'
      });

      $scope.upload[index].then(onApiDone, onApiFail, function(e) {
        $scope.progress[index] = Math.min(100, parseInt(100.0 * e.loaded / e.total));
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
      debug && console.log('MainCtrl.onUrlSelect', url);
      $scope.disableInput = true;
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