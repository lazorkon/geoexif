'use strict';

angular.module('geoExifApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ui.router',
  'pasvaz.bindonce',
  'angularFileUpload'
])
  .config(function ($stateProvider, $urlRouterProvider, $locationProvider, $httpProvider) {
    $urlRouterProvider
      .otherwise('/');

    $locationProvider.html5Mode(true);
  })

  .run(function ($rootScope, $location) {

  })

;