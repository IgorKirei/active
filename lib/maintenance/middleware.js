var utils = require('./utils');

function Middleware() {
    this.locals = [];

    this.globals = [];

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

    this.getLocal = function(route_id) {
        if (!route_id) throw new Error('invalid route id');

        var that = this, result = [];

        for (var i = 0, max = that.locals.length; i < max; i++) {
            if (that.locals[i].id === route_id) result = that.locals[i].layers;
        };

        return result;
    };

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

    this.getGlobal = function() {
        return this.globals;
    };
}

module.exports = function() {
    return new Middleware;
};