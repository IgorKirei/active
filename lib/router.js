const url = require("url");

const utils = require("./maintenance/utils");
const middleware = require("./maintenance/middleware");
const Query = require("./maintenance/query");

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
   * @param {String} name Setting name
   * @param {Boolean} value Setting value
   */
  this.setupSettings = function(name, value) {
    this.settings[name] = value;
  };

  /**
   * Add new rule for routing, set callback
   *
   * @param {Object} route New rule for routing, url parameters, possible query parameters, type of method
   * @param {Function} callback Method for processing the request and returning result to the client
   */
  this.addRoute = function(route, callback) {
    const methods = ["GET", "POST", "PUT", "DELETE"];

    if (!route.method) {
      route.method = "GET";
    }

    if (!methods.includes(route.method)) {
      utils.showError("addRoute() invalid method in route");
    }

    if (
      this.routes.find(
        item => item.url === route.url && item.method === route.method
      )
    ) {
      utils.showError("addRoute() duplicated url and method");
    }

    route.callback = callback;

    this.routes.push(route);
  };

  /**
   * Parse url for query parameters
   *
   * @param {Object} req
   * @param {Object} res
   */
  this.parseQuery = function(req, res) {
    this.params = {};
    this.parsed_query = url.parse(req.url, true);
    this.request_uri = this.parsed_query.href;
    this.request_path = this.parsed_query.pathname;
    this.request_method = req.method;

    const query = new Query();

    return query
      .parseFields(req)
      .then(fields => {
        this.parsed_all = utils.merge(this.parsed_query.query, fields);

        req.query = this.parsed_all;

        for (let i = 0; i < this.routes.length; i++) {
          let route = this.routes[i];
          let path = route.url.replace(/\/+$/g, "");
          let match = route.match || [];
          let method = route.method.toUpperCase();
          let query = route.query || {};

          if (this.isMatch(path, match, method, query)) {
            this.getParams(path);
            this.setBasicData(req, res);

            return Promise.resolve(route);
          }
        }

        return Promise.resolve();
      })
      .then(route => {
        if (route.fileParsing === false) {
          return Promise.resolve(route);
        }

        return query.parseFiles(req).then(files => {
          req.files = files;

          return Promise.resolve(route);
        });
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
    if (/\?/.test(path)) {
      path = path.replace("?", "\\?");
    }

    const tags = path.match(/{([a-z_]{1,50})}/gi) || [];

    tags.forEach(tag => {
      let name = tag.replace(/({|})/g, "");

      if (match[name]) {
        path = path.replace(tag, utils.val2regexp(match[name]));
      } else if (!this.settings.strictRouting) {
        path = path.replace(tag, "([a-zA-Z0-9-_%.]{1,100})");
      }
    });

    // need to compare parameters if routing is strict
    if (this.settings.strictRouting) {
      if (!utils.compare(query, this.parsed_all)) {
        return false;
      }
    }

    const rule = new RegExp("^" + path + "/?$", "g");

    // need check also with trailing slash
    let changed_path = this.request_path;

    if (!/\/$/.test(changed_path)) {
      changed_path += "/";
    }

    return changed_path.match(rule) && method === this.request_method;
  };

  /**
   * Get incoming parameters
   *
   * @param {String} path Path "url" of route rule
   */
  this.getParams = function(path) {
    const path_keys = path.split("/");
    const request_keys = this.request_path.split("/");

    for (let i = 0; i < path_keys.length; i++) {
      let key = path_keys[i];

      if (!/({|})/.test(key)) {
        continue;
      }

      key = key.replace(/({|})/g, "");

      if (request_keys[i] && !this.params[key]) {
        this.params[key] = request_keys[i];
      }
    }
  };

  /**
   * Customize Req and Res
   *
   * @param {Object} req
   * @param {Object} res
   */
  this.setBasicData = function(req, res) {
    // get client ip
    req.client_ip =
      req.headers["x-real-ip"] ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress;

    // get referer info
    req.referer = req.headers.referer
      ? url.parse(req.headers.referer, true)
      : null;

    // set path parameters
    req.params = this.params;
  };
}

module.exports = function() {
  return new Router();
};
