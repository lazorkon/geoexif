'use strict';

angular.module('geoExifApp')
  .controller('MainCtrl', function ($scope, $upload) {
    $scope.data = null;
  
    $scope.onFileSelect = function($files) {
      var file = $files[0];
      $scope.upload = $upload.upload({
        url: '/api/file/upload',
        method: 'POST',
        headers: {'header-key': 'header-value'},
        //withCredentials: true,
        file: file,
        //fileName: 'doc.jpg' or ['1.jpg', '2.jpg', ...] // to modify the name of the file(s)
        // customize file formData name ('Content-Desposition'), server side file variable name. 
        //fileFormDataName: myFile, //or a list of names for multiple files (html5). Default is 'file' 
        // customize how data is added to formData. See #40#issuecomment-28612000 for sample code
        //formDataAppender: function(formData, key, val){}
      }).then(function (response) {
        console.info('--- upload done ', response);
        $scope.data = response.data;
      }, function (response) {
        console.info('--- upload fail ', response);
      }, function (response) {
        console.info('--- upload progress ', response);
        // console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
      }); 

      console.log('--- upload', $scope.upload);

    };

  });