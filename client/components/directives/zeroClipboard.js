(function () {
  'use strict';

  angular.module('ZeroClipboard', [])
    .constant('clipConfig', {
      swfPath: 'bower_components/zeroclipboard/dist/ZeroClipboard.swf'
    })
    
    .run(['clipConfig', function (clipConfig) {
      ZeroClipboard.config(clipConfig);
    }])

    .directive('clipCopy', ['$window', function ($window) {
      return {
        restrict: 'A',
        scope: {},
        link: function (scope, element, attr) {
          if (null == $window.ZeroClipboard || ZeroClipboard.isFlashUnusable()) {
            element.css('display', 'none');
            return;
          }

          ZeroClipboard.on('error', function () {
            element.css('display', 'none');
          });

          var client = new $window.ZeroClipboard(element);
         
          client.on('ready', function (readyEvent) {

            client.on('copy', function (event) {
              event.clipboardData.setData(
                'text/plain', 
                attr.clipCopy ? scope.$eval(attr.clipCopy) : attr.clipCopyText
              );
            });

            client.on('aftercopy', function (event) {
              if (angular.isDefined(attr.clipAfterCopy)) {
                scope.$apply(function () {
                  scope.$parent.$eval(attr.clipAfterCopy);
                });
              }
            });

            scope.$on('$destroy', function () {
              client.destroy();
            });
          });
        }
      };
    }]);

})();
