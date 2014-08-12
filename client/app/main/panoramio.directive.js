'use strict';

angular.module('app')
  .directive('panoramioList', function ($document, $window) {

    var apiUrl = $window.location.protocol + '//www.panoramio.com/wapi/wapi.js?v=1&hl=en';

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

    var blockId = 'panoramio-block';
    var tosBlockId = 'panoramio-tos';
    
    return {
      scope: {
        rect: '=panoramioList'
      },
      restrict: 'A',
      template: '<div><div id="' + blockId + '"></div><div id="' + tosBlockId + '"></div></div>',
      link: function ($scope, element, attr) {
        function createWidget() {
          var topBlock = new panoramio.TermsOfServiceWidget(tosBlockId, {width: 600});

          var defaultOptions = {
              croppedPhotos: panoramio.Cropping.TO_SQUARE,
              columns: 7,
              rows: 1,
              orientation: panoramio.PhotoListWidgetOptions.Orientation.HORIZONTAL,
              disableDefaultEvents: [panoramio.events.EventType.PHOTO_CLICKED],
              attributionStyle: panoramio.tos.Style.HIDDEN
          };

          var defaultRequest = {};

          var options = angular.extend({}, defaultOptions, {
            width: 800,
            height: 300,
          });
          var request = angular.extend({}, defaultRequest, {
            // rect: $scope.rect
            rect: {
              sw: {lat: 49.5123393, lng: 25.5002913}, 
              ne: {lat: 49.5799633, lng: 25.7090772}
            }
          });

          var widget = new panoramio.PhotoListWidget(blockId, request, options);
          panoramio.events.listen(widget, panoramio.events.EventType.PHOTO_CLICKED, function (e) {
              console.log(e.getPhoto().getPhotoTitle(), e.getPhoto().getPosition());
          });
          widget.setPosition(0);
        }

        var unwatch = $scope.$watch('rect', function (val) {
          if (null == val) return;
          unwatch();
          if ($window.panoramio) {
            createWidget();
          } else {
            loadScript(apiUrl, createWidget);
          }
        });
      }
    };
  });
