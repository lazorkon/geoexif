'use strict';

angular.module('geoExifApp')
  .controller('MainCtrl', function ($scope, $window, $timeout, $upload) {
    var debug = true;

    $scope.data = null;
  
    $scope.fileReaderSupported = $window.FileReader != null && (window.FileAPI == null || FileAPI.html5 != false);

    $scope.onFileSelect = function($files) {
      var i, c;
      $scope.selectedFiles = [];
      $scope.progress = [];
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
      $scope.dataUrls = [];
      for (i = 0, c = $files.length; i < c; ++i) {
        var $file = $files[i];
        if ($scope.fileReaderSupported && $file.type.indexOf('image') > -1) {
          var fileReader = new FileReader();
          fileReader.readAsDataURL($files[i]);
          var loadFile = function(fileReader, index) {
            fileReader.onload = function(e) {
              $timeout(function() {
                $scope.dataUrls[index] = e.target.result;
              });
            }
          }(fileReader, i);
        }

        $scope.progress[i] = -1;
        $scope.start(i);
      }
    };

    $scope.start = function(index) {
      $scope.progress[index] = 0;
      $scope.errorMsg = null;
      $scope.upload[index] = $upload.upload({
        url: '/api/file/upload',
        method: 'POST',
        file: $scope.selectedFiles[index],
        fileFormDataName: 'file'
      });

      $scope.upload[index].then(function(response) {
        debug && console.log('MainCtrl.upload.done', response.data);
        $timeout(function() {
          $scope.data = response.data;
        });
      }, function(response) {
        debug && console.log('MainCtrl.upload.fail', response.data);
        $scope.error = response.data;
      }, function(e) {
        $scope.progress[index] = Math.min(100, parseInt(100.0 * e.loaded / e.total));
      });
    };
  
    $scope.dragOverClass = function($event) {
      var items = $event.dataTransfer.items;
      var hasFile = false;
      if (items != null) {
        for (var i = 0 ; i < items.length; i++) {
          if (items[i].kind == 'file') {
            hasFile = true;
            break;
          }
        }
      } else {
        hasFile = true;
      }
      return hasFile ? "dragover" : "dragover-err";
    };

  });