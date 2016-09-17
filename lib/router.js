'use strict';

// require packages
const url = require('url');

// require maintenance
const utils = require('./maintenance/utils');
const middleware = require('./maintenance/middleware');
const query = require('./maintenance/query');

function Router() {
  /**
   * Application settings
   */
  this.settings = {};

  /**
   * List of routing rules
   */
  this.routes = [];

  /**
   * Middleware layers functionality
   */
  this.layers = middleware();

  /**
   * URL parameters
   */
  this.params;

  /**
   * All parsed parameters
   */
  this.parsed_all;

  /**
   * Parsed query parameters
   */
  this.parsed_query;

  /**
   * Parsed query files
   */
  this.parsed_files;

  /**
   * Request URI
   */
  this.request_uri;

  /**
   * Request path, without query parameters
   */
  this.request_path;

  /**
   * Request method
   */
  this.request_method;

  /**
   * Use application settings
   *
   * @param {String} param Setting name
   * @param {String} value Setting value
   */
  this.setupSettings = function(param, value) {
    this.settings[param] = value;
  };

  /**
   * Add new rule for routing, set callback
   *
   * @param {Object} route New rule for routing, url parameters, possible query parameters, type of method
   * @param {Function} callback Method for processing the request and returning result to the client
   */
  this.addRoute = function(route, callback) {
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];

    if (!route.method) route.method = 'GET';

    if (methods.indexOf(route.method) < 0) throw new Error('invalid method in route');

    for (let i = 0; i < this.routes.length; i++) {
      if (this.routes[i].url === route.url && this.routes[i].method === route.method) throw new Error('same url in route');
    };

    route.callback = callback;

    this.routes.push(route);
  };

  /**
   * Parse url for query parameters
   *
   * @param {Object} req Standart NodeJS request object
   * @param {Object} res Standart NodeJS response object
   * @param {Function} callback Execute after finish parsing
   */
  this.parseQuery = function(req, res, callback) {
    const self = this;

    self.params = {};
    self.parsed_query = url.parse(req.url, true);
    self.parsed_files = {};
    self.request_uri = self.parsed_query.href;
    self.request_path = self.parsed_query.pathname;
    self.request_method = req.method;

    // parse content of request body
    query().parse(req, function(err, fields, files) {
      if (err) return callback(err);

      self.parsed_all = utils.merge(self.parsed_query.query, fields);
      self.parsed_files = files;

      for (let i = 0, max = self.routes.length; i < max; i++) {
        let route = self.routes[i],
          path = route.url.replace(/\/+$/g, ''),
          match = route.match || [],
          method = route.method.toUpperCase(),
          query = route.query || {};

        if (self.isMatch(path, match, method, query)) {
          self.getParams(path);
          self.getAdditional(req, res);

          return callback(null, route);
        }
      };

      callback();
    });
  };

  /**
   * Compare query and routing rule
   *
   * @param {String} path "url" parameter of route rule
   * @param {Object} match "match" parameter of route rule
   * @param {String} method "method" parameter of route rule
   * @param {Object} query "query" parameter of route rule
   *
   * @return {Boolean}
   */
  this.isMatch = function(path, match, method, query) {
    const self = this;

    if (/\?/.test(path)) path = path.replace('?', '\?');

    const tags = path.match(/{([a-z_]{2,25})}/g) || [];

    tags.forEach(function(tag) {
      let name = tag.replace(/({|})/g, '');

      if (match[name]) path = path.replace(tag, utils.val2regexp(match[name]));
      else if (self.settings.routing !== 'strict') path = path.replace(tag, '([a-zA-Z0-9\-_%\.]{1,100})');
    });

    // need to compare parameters if routing is strict
    if (self.settings.routing === 'strict') {
      if (!utils.compare(query, self.parsed_all)) return false;
    }

    const rule = new RegExp('^' + path + '/?$', 'g');

    // need check also with trailing slash
    let changed_path = self.request_path;

    if (!/\/$/.test(changed_path)) changed_path += '/';

    return changed_path.match(rule) && method === self.request_method;
  };

  /**
   * Get incoming parameters
   *
   * @param {String} path Path "url" of route rule
   */
  this.getParams = function(path) {
    const path_keys = path.split('/');
    const request_keys = this.request_path.split('/');

    for (let i = 0; i < path_keys.length; i++) {
      let key = path_keys[i];

      if (!/({|})/.test(key)) continue;

      key = key.replace(/({|})/g, '');

      if (request_keys[i] && !this.params[key]) this.params[key] = request_keys[i];
    };
  };

  /**
   * Add additional data
   *
   * @param {Object} req Standart NodeJS request object
   * @param {Object} res Standart NodeJS response object
   */
  this.getAdditional = function(req, res) {
    // get client ip
    req.client_ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;

    // get referer info
    req.referer = req.headers.referer ? url.parse(req.headers.referer, true) : null;

    // set path parameters
    req.params = this.params;

    // set incoming text fields
    req.query = this.parsed_all;

    // set incoming files
    req.files = this.parsed_files;
  };
}

module.exports = function() {
  return new Router;
};