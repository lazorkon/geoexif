'use strict';

angular.module('app', [
  'ngCookies',
  'ngAnimate',
  'ngSanitize',
  'ui.router',
  'ui.keypress',
  'pasvaz.bindonce',
  'angularFileUpload',
  'ZeroClipboard',
  'angulartics', 
  'angulartics.google.analytics'
])
  .config(function ($stateProvider, $urlRouterProvider, $locationProvider, $httpProvider) {
    $urlRouterProvider
      .otherwise('/');

    $locationProvider.html5Mode(true);
  })

  .run(function ($rootScope, $location) {

  })

;