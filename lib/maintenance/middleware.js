// require packages
var utils = require('./utils');

function Middleware() {
    /**
     * List with layers for specific query, unique route rule
     *
     * @var {Array}
     */
    this.locals = [];

    /**
     * List with layers for all queries
     *
     * @var {Array}
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

        var result = {'id': route_id, 'layers': []};

        layers.forEach(function(layer) {
            if (typeof layer !== 'function') throw new TypeError('need function for middleware layer');

            if (!layer.length || layer.length !== 3) throw new TypeError('invalid function arguments');

            result.layers.push(layer);
        });

        this.locals.push(result);
    };

    /**
     * Get middleware layer for specific query
     *
     * @param {String} route_id Unique identifier of route rule
     */
    this.getLocal = function(route_id) {
        if (!route_id) throw new Error('invalid route id');

        var that = this, result = [];

        for (var i = 0, max = that.locals.length; i < max; i++) {
            if (that.locals[i].id === route_id) result = that.locals[i].layers;
        };

        return result;
    };

    /**
     * Add middleware layers for all queries
     *
     * @param {Mixed} layers Middleware layers
     */
    this.addGlobal = function(layers) {
        var that = this;

        if (layers && !utils.validate.array(layers)) layers = [layers];
        else layers = [];

        layers.forEach(function(layer) {
            if (typeof layer !== 'function') throw new TypeError('need function for middleware layer');

            if (!layer.length || layer.length !== 3) throw new TypeError('invalid function arguments');

            that.globals.push(layer);
        });
    };

    /**
     * Get middleware layers for all queries
     */
    this.getGlobal = function() {
        return this.globals;
    };
}

module.exports = function() {
    return new Middleware;
};