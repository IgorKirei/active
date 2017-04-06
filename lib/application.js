'use strict';

// require packages
const chalk = require('chalk');
const cluster = require('cluster');
const domain = require('domain');
const os = require('os');
const http = require('http');
const uuid = require('uuid');

// require maintenance
const router = require('./router');
const utils = require('./maintenance/utils');

function Application() {
  /**
   * Settings
   */
  this.settings = {};

  /**
   * Router instance
   */
  this.router = router();

  /**
   * Change application settings
   *
   * @param {Object} settings Application settings
   */
  this.tune = (settings) => {
    if (!utils.validate.object(settings)) throw new TypeError('invalid settings');

    const self = this;

    for (let prop in settings) {
      switch (prop) {
      case 'routing':
        if (['strict', 'nonstrict'].indexOf(settings[prop]) >= 0) self.router.setupSettings(prop, settings[prop]);
        else throw new TypeError('invalid routing settings, expected "strict" or "nonstrict"');
        break;
      case 'cors':
        if (typeof settings[prop] === 'boolean') self.settings[prop] = settings[prop];
        else throw new TypeError('invalid cors settings, expected boolean value');
        break;
      case 'debug':
        if (typeof settings[prop] === 'boolean') self.settings[prop] = settings[prop];
        else throw new TypeError('invalid debug settings, expected boolean value');
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
  this.addRoute = (route, layers, callback) => {
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

    route.id = uuid.v4();

    this.router.addRoute(route, callback);

    this.router.layers.addLocal(route.id, layers);
  };

  /**
   * Add route rules together
   *
   * @param {Array} routes Map with route rules
   * @param {Object} callbacks Object with callbacks
   */
  this.addRoutes = (routes, callbacks) => {
    const self = this;

    for (let i = 0, params, obj, func; i < routes.length; i++) {
      if (!routes[i].callback) throw new TypeError('invalid route "callback"');

      params = routes[i].callback.split('.');
      obj = params.shift();
      func = params.shift();

      if (!callbacks[obj] || !callbacks[obj][func]) throw new TypeError('invalid callbacks');

      self.addRoute({
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
  this.startServer = (params) => {
    if (!params) params = {};

    // default server parameters
    if (!params.port) {
      params.port = 80;
    }
    if (!params.host) {
      params.host = 'localhost';
    }

    if (params.cluster) {
      if (cluster.isMaster) {
        for (let i = 0, cpus = os.cpus().length; i < cpus; i++) {
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
  this.useLayer = (args) => {
    this.router.layers.addGlobal(args);
  };

  /**
   * Check settings, start server, add other logic
   *
   * @param {Object} params Parameters for starting new server
   */
  this.runApplication = (params) => {
    const self = this;

    http.createServer(function(req, res) {
      self.processRequest(req, res);
    }).listen(params.port, params.host);
  };

  /**
   * Request finished
   */
  this.finishRequest = () => {
    // show debug information
    if (this.settings.debug) {
      const spentTime = Date.now() - this.req.startTime;

      console.log(chalk.gray(this.req.url) + ' ' + chalk.cyan(spentTime + 'ms'));
    }
  };

  /**
   * Process every request to application
   *
   * @param {Object} req Standart NodeJS request object
   * @param {Object} res Standart NodeJS response object
   */
  this.processRequest = (req, res) => {
    const self = this, dom = domain.create();

    self.req = req;
    self.res = res;

    req.startTime = Date.now();

    // set response functionality
    res.json = function(code, content) {
      if (!utils.validate.integer(code)) throw new TypeError('invalid status code');

      this.statusCode = code;
      this.setHeader('content-type', 'application/json; charset=utf-8');
      this.end(JSON.stringify(content));

      self.finishRequest();
    };

    res.html = function(code, content) {
      if (!utils.validate.integer(code)) throw new TypeError('invalid status code');

      this.statusCode = code;
      this.setHeader('content-type', 'text/html; charset=utf-8');

      if (content) this.setHeader('content-length', Buffer.byteLength(content));

      this.end(content);

      self.finishRequest();
    };

    // set redirect functionality
    res.redirect = function(url, code) {
      if (!url) throw new TypeError('invalid url for redirecting');
      if (code !== 301 && code !== 302) throw new TypeError('invalid code for redirecting');

      this.statusCode = code;
      this.setHeader('location', (req.connection.encrypted ? 'https' : 'http') + '://' + req.headers.host + url);
      this.end();

      self.finishRequest();
    };

    // cross-origin resource sharing
    if (self.settings.cors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'HEAD,GET,PUT,POST,PATCH,DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Accept,Authorization,Content-Type,Content-Length,Origin,X-Requested-With');

      if (req.method === 'OPTIONS') return res.html(200);
    }

    // receive unhandled errors
    dom.on('error', (err) => {
      console.error(err.stack);

      res.html(500);
    });

    dom.add(req);
    dom.add(res);

    // execute method
    dom.run(() => {
      self.router.parseQuery(req, res, (err, found) => {
        if (found && found.callback) {
          // apply middleware layers
          self.router.layers.applyAll(found.id, req, res)
            .then(() => {
              found.callback(req, res);
            })
            .catch(err => {
              console.error(err);
            });
        } else {
          res.html(404);
        }
      });
    });
  };
}

module.exports = function() {
  const source = new Application();

  const app = function(req, res) {
    app.processRequest(req, res);
  };

  utils.mixin(app, source);

  return app;
};