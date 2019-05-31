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
    this.parsed_query = url.parse(req.url, true);
    this.request_uri = this.parsed_query.href;
    this.request_path = this.parsed_query.pathname;
    this.request_method = req.method;

    const route = this.matchUrl();

    if (!route) {
      return Promise.resolve();
    }

    req.route = {};
    for (let key in route) {
      if (typeof route[key] === "function") {
        continue;
      }
      req.route[key] = route[key];
    }

    req.query = {};
    req.files = {};
    req.params = {};

    if (route.fileParsing === false) {
      return Promise.resolve(route);
    }

    const query = new Query(req);

    return query.parseBody().then(({ fields, files }) => {
      this.parsed_all = utils.merge(this.parsed_query.query, fields);

      req.query = this.parsed_all;
      req.files = files;
      req.params = this.getParams(route.url);;

      this.setBasicData(req, res);

      return Promise.resolve(route);
    });
  };

  /**
   * Compare current request to available route rules
   *
   * @return {Object}
   */
  this.matchUrl = function() {
    for (let i = 0; i < this.routes.length; i++) {
      if (
        this.isMatch(
          this.routes[i].url,
          this.routes[i].match,
          this.routes[i].method
        )
      ) {
        return this.routes[i];
      }
    }
  };

  /**
   * Compare current request to specified route rule
   *
   * @param {String} path "url" parameter of route rule
   * @param {Object} match "match" parameter of route rule
   * @param {String} method "method" parameter of route rule
   *
   * @return {Boolean}
   */
  this.isMatch = function(path, match = {}, method) {
    if (/\?/.test(path)) {
      path = path.replace("?", "\\?");
    }

    const tags = path.match(/{([a-z_]{1,50})}/gi) || [];

    tags.forEach(tag => {
      let name = tag.replace(/({|})/g, "");

      if (match[name]) {
        path = path.replace(tag, utils.val2regexp(match[name]));
      } else {
        path = path.replace(tag, "([a-zA-Z0-9-_%.]{1,100})");
      }
    });

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
    const params = {};
    const path_keys = path.split("/");
    const request_keys = this.request_path.split("/");

    for (let i = 0; i < path_keys.length; i++) {
      let key = path_keys[i];

      if (!/({|})/.test(key)) {
        continue;
      }

      key = key.replace(/({|})/g, "");

      if (request_keys[i] && !params[key]) {
        params[key] = request_keys[i];
      }
    }

    return params;
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
  };
}

module.exports = function() {
  return new Router();
};
