(function () {
  'use strict';

  angular.module('app')
  
    .filter('prefix', function () {
      return function (input, str) {
        return input ? str + input : input;
      }
    })

    .filter('suffix', function () {
      return function (input, str) {
        return input ? input + str : input;
      }
    });

})();
