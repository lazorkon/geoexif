'use strict';

angular.module('app')
  .directive('googleMap', function ($document, $window) {

    var apiUrl = '//maps.googleapis.com/maps/api/js?v=3&sensor=false&language=en'
      + '&callback=tmpOnMapLoad';

    function loadScript (src, callback) {
      var done = false;
      var head = document.getElementsByTagName('head')[0];
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.onreadystatechange = function () {
        if (this.readyState === 'complete') {
          if (done) return;
          done = true;
          callback();
        }
      }
      script.onload = function () {
        if (done) return;
        done = true;
        callback();
      };
      script.src = src;
      head.appendChild(script);
    }


    return {
      scope: {
        location: '=googleMap'
      },
      restrict: 'A',
      template: '<div></div>',
      link: function ($scope, element, attr) {
          var map, marker, apiLoaded;

          function createMap() {
            map = new google.maps.Map(element[0], {
              zoom: 15,
              center: new google.maps.LatLng($scope.location.lat, $scope.location.lng),
              mapTypeId: google.maps.MapTypeId.ROADMAP
            });
            marker = new google.maps.Marker({
              map: map,
              position: new google.maps.LatLng($scope.location.lat, $scope.location.lng)
            });
          }

          if ($scope.location) {
            if (apiLoaded) {
              createMap();
            } else {
              $window.tmpOnMapLoad = createMap;
              loadScript(apiUrl, function () { apiLoaded = true; });
            }
          }
      }
    };
  });
