'use strict';

// require packages
const utils = require('./utils');

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
    if (!route_id) throw new Error('invalid route id');

    if (layers && !utils.validate.array(layers)) layers = [layers];
    else layers = [];

    const result = {
      'id': route_id,
      'layers': []
    };

    layers.forEach(function(layer) {
      if (typeof layer !== 'function') throw new TypeError('need function for middleware layer');

      if (!layer.length || layer.length !== 3) throw new TypeError('invalid function arguments');

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
    const self = this;

    if (layers && !utils.validate.array(layers)) layers = [layers];
    else layers = [];

    layers.forEach(function(layer) {
      if (typeof layer !== 'function') throw new TypeError('need function for middleware layer');

      if (!layer.length || layer.length !== 3) throw new TypeError('invalid function arguments');

      self.globals.push(layer);
    });
  };

  /**
   * Get middleware layer for specific query
   *
   * @param {String} routeId Unique identifier of route rule
   */
  this.applyLocal = function(routeId, req, res) {
    if (!routeId) {
      throw new Error('invalid route id');
    }

    const self = this;
    const result = [];

    for (let i = 0; i < self.locals.length; i++) {
      if (self.locals[i].id === routeId) {
        for (let k = 0; k < self.locals[i].layers.length; k++) {
          result.push(new Promise((resolve, reject) => {
            self.locals[i].layers[k](req, res, (err, data) => {
              if (err) {
                reject(err);
              } else {
                resolve(data);
              }
            });
          }));
        };
      }
    };

    return Promise.all(result);
  };

  /**
   * Get middleware layers for all queries
   */
  this.applyGlobal = function(req, res) {
    const self = this;
    const result = [];

    for (let i = 0; i < self.globals.length; i++) {
      result.push(new Promise((resolve, reject) => {
        self.globals[i](req, res, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      }));
    };

    return Promise.all(result);
  };

  /**
   * Apply necessary middleware layers
   */
  this.applyAll = function(routeId, req, res) {
    const self = this;

    return self.applyLocal(req, res)
      .then(() => {
        return self.applyGlobal(req, res)
      });
  };
}

module.exports = function() {
  return new Middleware;
};