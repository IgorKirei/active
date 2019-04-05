const utils = require("./utils");

function Middleware() {
  /**
   * List with layers for specific query, unique route rule
   */
  this.locals = [];

  /**
   * List with layers for all queries
   */
  this.globals = [];

  /**
   * Add middleware layers for specific query
   *
   * @param {String} route_id Unique identifier of route rule
   * @param {Mixed} layers Middleware layers
   */
  this.addLocal = function(route_id, layers) {
    if (!route_id) {
      utils.showError("addLocal() invalid route id");
    }

    if (!layers) {
      return;
    }

    if (!utils.validate.array(layers)) {
      layers = [layers];
    }

    const result = {
      id: route_id,
      layers: []
    };

    layers.forEach(layer => {
      if (typeof layer !== "function") {
        utils.showError("addLocal() need function for middleware layer");
      }

      if (!layer.length || layer.length !== 3) {
        utils.showError("addLocal() invalid function arguments");
      }

      result.layers.push(layer);
    });

    this.locals.push(result);
  };

  /**
   * Add middleware layers for all queries
   *
   * @param {Mixed} layers Middleware layers
   */
  this.addGlobal = function(layers) {
    if (!layers) {
      return;
    }

    if (!utils.validate.array(layers)) {
      layers = [layers];
    }

    layers.forEach(layer => {
      if (typeof layer !== "function") {
        utils.showError("addGlobal() need function for middleware layer");
      }

      if (!layer.length || layer.length !== 3) {
        utils.showError("addGlobal() invalid function arguments");
      }

      this.globals.push(layer);
    });
  };

  /**
   * Get middleware layer for specific query
   *
   * @param {String} routeId Unique identifier of route rule
   */
  this.applyLocal = function(routeId, req, res) {
    if (!routeId) {
      utils.showError("applyLocal() invalid route id");
    }

    const result = [];

    for (let i = 0; i < this.locals.length; i++) {
      if (this.locals[i].id !== routeId) {
        continue;
      }

      for (let k = 0; k < this.locals[i].layers.length; k++) {
        result.push(
          new Promise((resolve, reject) => {
            this.locals[i].layers[k](req, res, (err, data) => {
              if (err) {
                reject(err);
              } else {
                resolve(data);
              }
            });
          })
        );
      }
    }

    return Promise.all(result);
  };

  /**
   * Get middleware layers for all queries
   */
  this.applyGlobal = function(req, res) {
    const result = [];

    for (let i = 0; i < this.globals.length; i++) {
      result.push(
        new Promise((resolve, reject) => {
          this.globals[i](req, res, (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        })
      );
    }

    return Promise.all(result);
  };

  /**
   * Apply necessary middleware layers
   */
  this.applyLayers = function(routeId, req, res) {
    return this.applyLocal(routeId, req, res).then(() => {
      return this.applyGlobal(req, res);
    });
  };
}

module.exports = function() {
  return new Middleware();
};
