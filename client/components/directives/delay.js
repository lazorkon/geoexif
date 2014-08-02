(function () {
  'use strict';

  angular.module('app')
    .directive('delay', ['$window', function ($window) {
      return {
        require: 'ngModel',
        link: function (scope, element, attr, ctrl) {
          var group = attr.delayGroup || '';

          ctrl.$viewChangeListeners.push(function () {
            if (groupTimeout[group]) {
              $window.clearTimeout(groupTimeout[group]);
            }
            groupTimeout[group] = $window.setTimeout(function () {
              scope.$apply(function () {
                scope.$eval(attr.delay);
              });
            }, attr.delayTimeout || 500);
          });

          element.on('$destroy', function () {
            if (groupTimeout[group]) {
              $window.clearTimeout(groupTimeout[group]);
              groupTimeout[group] = null;
            }
          });

        }

      };
    }]);

  var groupTimeout = {};
})();
