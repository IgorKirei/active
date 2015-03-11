// require packages
var url = require('url');

// require maintenance
var utils = require('./maintenance/utils'),
  middleware = require('./maintenance/middleware'),
  query = require('./maintenance/query');

function Router() {
  /**
   * Application settings
   *
   * @var {Object}
   */
  this.settings = {};

  /**
   * List of routing rules
   *
   * @var {Array}
   */
  this.routes = [];

  /**
   * Middleware layers functionality
   *
   * @var {Object}
   */
  this.layers = middleware();

  /**
   * URL parameters
   *
   * @var {Object}
   */
  this.params;

  /**
   * All parsed parameters
   *
   * @var {Object}
   */
  this.parsed_all;

  /**
   * Parsed query parameters
   *
   * @var {Object}
   */
  this.parsed_query;

  /**
   * Parsed query files
   *
   * @var {Object}
   */
  this.parsed_files;

  /**
   * Request URI
   *
   * @var {String}
   */
  this.request_uri;

  /**
   * Request path, without query parameters
   *
   * @var {String}
   */
  this.request_path;

  /**
   * Request method
   *
   * @var {String}
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
    var methods = ['GET', 'POST', 'PUT', 'DELETE'];

    if (!route.method) route.method = 'GET';

    if (methods.indexOf(route.method) < 0) throw new Error('invalid method in route');

    for (var i = 0; i < this.routes.length; i++) {
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
    var _this = this;

    _this.params = {};
    _this.parsed_query = url.parse(req.url, true);
    _this.parsed_files = {};
    _this.request_uri = _this.parsed_query.href;
    _this.request_path = _this.parsed_query.pathname;
    _this.request_method = req.method;

    // parse content of request body
    query().parse(req, function(err, fields, files) {
      if (err) return callback(err);

      _this.parsed_all = utils.merge(_this.parsed_query.query, fields);
      _this.parsed_files = files;

      for (var i = 0, max = _this.routes.length; i < max; i++) {
        var route = _this.routes[i],
          path = route.url.replace(/\/+$/g, ''),
          match = route.match || [],
          method = route.method.toUpperCase(),
          query = route.query || {};

        if (_this.isMatch(path, match, method, query)) {
          _this.getParams(path);
          _this.getAdditional(req, res);

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
    var _this = this;

    if (/\?/.test(path)) path = path.replace('?', '\?');

    var tags = path.match(/{([a-z]{2,25})}/g) || [];

    tags.forEach(function(tag) {
      var name = tag.replace(/({|})/g, '');

      if (match[name]) path = path.replace(tag, utils.val2regexp(match[name]));
      else if (_this.settings.routing !== 'strict') path = path.replace(tag, '([a-zA-Z0-9-_%]{1,150})');
    });

    // need to compare parameters if routing is strict
    if (_this.settings.routing === 'strict') {
      if (!utils.compare(query, _this.parsed_all)) return false;
    }

    var rule = new RegExp('^' + path + '/?$', 'g');

    // need check also with trailing slash
    var changed_path = _this.request_path;

    if (!/\/$/.test(changed_path)) changed_path += '/';

    return changed_path.match(rule) && method === _this.request_method;
  };

  /**
   * Get incoming parameters
   *
   * @param {String} path Path "url" of route rule
   */
  this.getParams = function(path) {
    var path_keys = path.split('/'),
      request_keys = this.request_path.split('/');

    for (var i = 0; i < path_keys.length; i++) {
      var key = path_keys[i];

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
    req.referer = req.headers['referer'] ? url.parse(req.headers['referer'], true) : null;

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