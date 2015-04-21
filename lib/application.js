// require packages
var async = require('async'),
  domain = require('domain'),
  http = require('http'),
  uuid = require('node-uuid');

// require maintenance
var router = require('./router'),
  utils = require('./maintenance/utils');

function Application() {
  /**
   * Router instance
   *
   * @var {Object}
   */
  this.router = router();

  /**
   * Change application settings
   *
   * @param {Object} settings Application settings
   */
  this.tune = function(settings) {
    if (!utils.validate.object(settings)) throw new TypeError('invalid settings');

    var _this = this;

    for (var prop in settings) {
      switch (prop) {
        case 'routing':
          if (['strict', 'nonstrict'].indexOf(settings[prop]) >= 0) _this.router.setupSettings(prop, settings[prop]);
          else throw new TypeError('invalid routing settings, expected "strict" or "nonstrict"');
        break;
      };
    };
  };

  /**
   * Proxy method of routing "addRoute"
   *
   * @param {Object} route New rule for routing, url parameters, possible query parameters, type of method
   * @param {Mixed} layers Use layer(s) for special route rule
   * @param {Function} callback Method for processing the request and returning result to the client
   */
  this.addRoute = function(route, layers, callback) {
    if (!callback) {
      callback = layers;
      layers = null;
    }

    // validate new rule
    if (!utils.validate.object(route)) throw new TypeError('invalid route');
    if (!utils.validate.string(route.url)) throw new TypeError('invalid route "url"');
    if (route.method && !utils.validate.string(route.method)) throw new TypeError('invalid route "method"');
    if (route.match && !utils.validate.object(route.match)) throw new TypeError('invalid route "match"');
    if (route.query && !utils.validate.object(route.query)) throw new TypeError('invalid route "query"');

    var unique_id = uuid.v4();

    route.id = unique_id;

    this.router.addRoute(route, callback);

    this.router.layers.addLocal(route.id, layers);
  };

  /**
   * Add route rules together
   *
   * @param {Array} routes Map with route rules
   * @param {Object} callbacks Object with callbacks
   */
  this.addRoutes = function(routes, callbacks) {
    var _this = this;

    for (var i = 0, params, obj, func; i < routes.length; i++) {
      if (!routes[i].callback) throw new TypeError('invalid route "callback"');

      params = routes[i].callback.split('.');
      obj = params.shift();
      func = params.shift();

      if (!callbacks[obj] || !callbacks[obj][func]) throw new TypeError('invalid callbacks');

      _this.addRoute({
        'method': routes[i].method,
        'url': routes[i].url,
        'match': routes[i].match,
        'query': routes[i].query
      }, callbacks[obj][func]);
    };
  };

  /**
   * Start new server, in other words, run application
   *
   * @param {Object} params Parameters for starting new server, such like port, host, use cluster
   */
  this.startServer = function(params) {
    if (!params) params = {};

    // default server parameters
    if (!params.port) params.port = 80;
    if (!params.host) params.host = 'localhost';

    if (params.cluster) {
      var cluster = require('cluster'),
        os = require('os');

      if (cluster.isMaster) {
        for (var i = 0, cpus = os.cpus().length; i < cpus; i++) {
          cluster.fork();
        };
      } else this.runApplication(params);
    } else this.runApplication(params);
  };

  /**
   * Proxy method of layers "addGlobal"
   *
   * @param {Mixed} args New middleware function(s)
   */
  this.useLayer = function(args) {
    this.router.layers.addGlobal(args);
  };

  /**
   * Check settings, start server, add other logic
   *
   * @param {Object} params Parameters for starting new server
   */
  this.runApplication = function(params) {
    var _this = this;

    http.createServer(function(req, res) {
      _this.processRequest(req, res);
    }).listen(params.port, params.host);
  };

  /**
   * Process every request to application
   *
   * @param {Object} req Standart NodeJS request object
   * @param {Object} res Standart NodeJS response object
   */
  this.processRequest = function(req, res) {
    var _this = this, dom = domain.create();

    // set response functionality
    res.json = function(code, content) {
      if (!utils.validate.integer(code)) throw new TypeError('invalid status code');

      this.statusCode = code;
      this.setHeader('content-type', 'application/json; charset=utf-8');
      this.end(JSON.stringify(content));
    };

    res.html = function(code, content) {
      if (!utils.validate.integer(code)) throw new TypeError('invalid status code');

      this.statusCode = code;
      this.setHeader('content-type', 'text/html; charset=utf-8');

      if (content) this.setHeader('content-length', Buffer.byteLength(content));

      this.end(content);
    };

    // set redirect functionality
    res.redirect = function(url, code) {
      if (!url) throw new TypeError('invalid url for redirecting');
      if (code !== 301 && code !== 302) throw new TypeError('invalid code for redirecting');

      this.statusCode = code;
      this.setHeader('location', (req.connection.encrypted ? 'https' : 'http') + '://' + req.headers.host + url);
      this.end();
    };

    // receive unhandled errors
    dom.on('error', function(err) {
      console.error(err.stack);

      res.html(500);
    });

    dom.add(req);
    dom.add(res);

    // execute method
    dom.run(function() {
      _this.router.parseQuery(req, res, function(err, found) {
        if (found && found.callback) {
          // add middleware layers
          async.mapSeries(_this.router.layers.getLocal(found.id), function(layer, next) {
            layer(req, res, next);
          }, function(err) {
            async.mapSeries(_this.router.layers.getGlobal(), function(layer, next) {
              layer(req, res, next);
            }, function(err) {
              found.callback(req, res);
            });
          });
        } else res.html(404);
      });
    });
  };
}

module.exports = function() {
  var source = new Application();

  var app = function(req, res) {
    app.processRequest(req, res);
  };

  utils.mixin(app, source);

  return app;
};