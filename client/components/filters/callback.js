(function () {
  'use strict';

  angular.module('app')
    .filter('callback', function () {
      return function (input, callback) {
        if (angular.isFunction(callback)) {
          if (arguments.length > 2) {
            return callback.apply(null, [input].concat([].slice.call(arguments, 2)));
          }
          return callback(input);
        }

        return input;
      }
    });

})();
