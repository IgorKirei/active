exports.getTimestamp = function() {
    return Math.round((new Date).getTime() / 1000);
};

exports.validate = {
    'email': function(val) {
        return /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,4}))$/g.test(val);
    },
    'text': function(val) {
        return /^[а-яёіїєґa-z0-9?!.:;,\"\-\_\(\)\/\*\[\]\<\>\=\s]{1,500}$/gi.test(val);
    },
    'number': function(val) {
        return /^[0-9]$/.test(val);
    },
    'json': function(val) {
        try {
            JSON.parse(val);
        } catch (e) {
            return false;
        }

        return true;
    },
    'array': function(val) {
        return Object.prototype.toString.call(val) === '[object Array]';
    }
};

exports.extend = function(origin, add) {
    if (!origin || !add) throw new Error('invalid arguments');

    var keys = Object.keys(add);

    for (var prop in add) {
        if (!origin[prop]) origin[prop] = add[prop];
    };

    return origin;
};

exports.val2regexp = function(val) {
    if (typeof val === 'string') return val;
    else if (exports.validate.array(val)) return '(' + val.join('|') + ')';
    else throw new Error('invalid argument');
};