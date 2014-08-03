'use strict';

angular.module('app')
  .directive('googleMap', function ($document, $window) {
    return {
      scope: {
        location: '=googleMap'
      },
      restrict: 'A',
      template: '<div></div>',
      link: function ($scope, element, attr) {
          var map, marker;
          if ($scope.location) {
            map = new google.maps.Map(element[0], {
              zoom: 10,
              center: new google.maps.LatLng($scope.location.lat, $scope.location.lng),
              mapTypeId: google.maps.MapTypeId.ROADMAP
            });
            marker = new google.maps.Marker({
              map: map,
              position: new google.maps.LatLng($scope.location.lat, $scope.location.lng)
            });
          }
      }
    };
  });
