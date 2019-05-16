const chalk = require("chalk");
const uuid = require("uuid");

const router = require("./router");
const utils = require("./maintenance/utils");

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
  this.tune = settings => {
    if (!utils.validate.object(settings)) {
      utils.showError("tune() invalid settings");
    }

    for (let name in settings) {
      if (name !== "strictRouting" && name !== "cors" && name !== "debug") {
        return utils.showError("tune() invalid name");
      }

      if (settings[name] !== true && settings[name] !== false) {
        return utils.showError("tune() invalid value, expected boolean");
      }

      switch (name) {
        case "strictRouting":
          this.router.setupSettings(name, settings[name]);
          break;
        case "cors":
        case "debug":
          this.settings[name] = settings[name];
          break;
      }
    }
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
    if (!utils.validate.object(route)) {
      utils.showError("addRoute() invalid route");
    }
    if (!utils.validate.string(route.url)) {
      utils.showError('addRoute() invalid route "url"');
    }
    if (route.method && !utils.validate.string(route.method)) {
      utils.showError('addRoute() invalid route "method"');
    }
    if (route.match && !utils.validate.object(route.match)) {
      utils.showError('addRoute() invalid route "match"');
    }
    if (route.query && !utils.validate.object(route.query)) {
      utils.showError('addRoute() invalid route "query"');
    }
    if (
      route.fileParsing !== undefined &&
      !utils.validate.bool(route.fileParsing)
    ) {
      utils.showError('addRoute() invalid route "fileParsing"');
    }

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
    for (let i = 0; i < routes.length; i++) {
      if (!routes[i].callback) {
        utils.showError('addRoutes() invalid route "callback"');
      }

      let params = routes[i].callback.split(".");
      let obj = params.shift();
      let func = params.shift();

      if (!callbacks[obj] || !callbacks[obj][func]) {
        utils.showError("addRoutes() invalid callbacks");
      }

      this.addRoute(
        {
          method: routes[i].method,
          url: routes[i].url,
          match: routes[i].match,
          query: routes[i].query,
          fileParsing: routes[i].fileParsing
        },
        callbacks[obj][func]
      );
    }
  };

  /**
   * Proxy method of layers "addGlobal"
   *
   * @param {Mixed} args New middleware function(s)
   */
  this.useLayer = args => {
    this.router.layers.addGlobal(args);
  };

  /**
   * Request finished
   */
  this.finishRequest = () => {
    // show debug information
    if (this.settings.debug) {
      const spentTime = Date.now() - this.req.startTime;

      console.log(
        chalk.gray(this.req.url) + " " + chalk.cyan(spentTime + "ms")
      );
    }
  };

  /**
   * Process every request to application
   *
   * @param {Object} req
   * @param {Object} res
   */
  this.processRequest = (req, res) => {
    const self = this;

    self.req = req;
    self.res = res;

    req.startTime = Date.now();

    // set response functionality
    res.json = function(code, content) {
      if (!utils.validate.integer(code)) {
        utils.showError("res.json() invalid status code");
      }

      this.statusCode = code;
      this.setHeader("content-type", "application/json; charset=utf-8");
      this.end(JSON.stringify(content));

      self.finishRequest();
    };

    res.html = function(code, content) {
      if (!utils.validate.integer(code)) {
        utils.showError("res.html() invalid status code");
      }

      this.statusCode = code;
      this.setHeader("content-type", "text/html; charset=utf-8");

      if (content) {
        this.setHeader("content-length", Buffer.byteLength(content));
      }

      this.end(content);

      self.finishRequest();
    };

    // set redirect functionality
    res.redirect = function(url, code) {
      if (!url) {
        utils.showError("res.redirect() invalid url for redirecting");
      }
      if (code !== 301 && code !== 302) {
        utils.showError("res.redirect() invalid code for redirecting");
      }

      this.statusCode = code;
      this.setHeader(
        "location",
        (req.connection.encrypted ? "https" : "http") +
          "://" +
          req.headers.host +
          url
      );
      this.end();

      self.finishRequest();
    };

    // cross-origin resource sharing
    if (self.settings.cors) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "HEAD,GET,PUT,POST,PATCH,DELETE"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Accept,Authorization,Content-Type,Content-Length,Origin,X-Requested-With"
      );

      if (req.method === "OPTIONS") {
        return res.html(200);
      }
    }

    self.router
      .parseQuery(req, res)
      .then(route => {
        if (!route) {
          return res.html(404);
        }

        self.router.layers.applyLayers(route.id, req, res).then(() => {
          route.callback(req, res);
        });
      })
      .catch(err => {
        utils.showError(err);
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
