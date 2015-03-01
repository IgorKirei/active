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
    'object': function(val) {
        return Object.prototype.toString.call(val) === '[object Object]' && val instanceof Object && val !== null;
    },
    'array': function(val) {
        return Object.prototype.toString.call(val) === '[object Array]';
    },
    'string': function(val) {
        return typeof val === 'string';
    }
};

exports.extend = function(origin, add) {
    if (!origin || !add) throw new Error('invalid arguments');

    for (var prop in add) {
        if (!origin[prop]) origin[prop] = add[prop];
    };

    return origin;
};

exports.merge = function(arg1, arg2) {
    if (!arg1 || !arg2) throw new Error('invalid arguments');

    var result = {};

    for (var prop in arg1) {
        result[prop] = arg1[prop];
    };

    for (var prop in arg2) {
        result[prop] = arg2[prop];
    };

    return result;
};

exports.val2regexp = function(val) {
    if (typeof val === 'string') return val;
    else if (exports.validate.array(val)) return '(' + val.join('|') + ')';
    else throw new Error('invalid argument');
};

exports.compare = function(arg1, arg2) {
    var result = false;

    switch (true) {
        case exports.validate.object(arg1) && exports.validate.object(arg2):
            if (Object.keys(arg1).length === Object.keys(arg2).length) {
                var matched = true;

                for (var prop in arg1) {
                    if (arg2[prop] === undefined) matched = false;
                };

                if (matched) result = true;
            }
        break;
    };

    return result;
};

exports.split = function(str, separator) {
    var result = [], tmp = str.split(separator), len = tmp.length;

    while (len--) {
        if (tmp[len] !== undefined && tmp[len].length) result.push(tmp[len]);
    }

    result.reverse();

    return result;
};

exports.buff2arr = function(buff) {
    if (!Buffer.isBuffer(buff)) throw new TypeError('invalid buffer');

    var result = [], len = buff.length;

    while (len--) {
        result.push(buff[len]);
    }

    result.reverse();

    return result;
};

exports.arr2buff = function(arr) {
    if (!exports.validate.array(arr)) throw new TypeError('invalid array');

    return new Buffer(arr);
};

exports.subPositions = function(base, sub) {
    if (!exports.validate.array(base)) throw new TypeError('invalid "base" array');
    if (!exports.validate.array(sub)) throw new TypeError('invalid "sub" array');

    var positions = [],
        max_i = base.length,
        max_j = sub.length,
        next, found;

    // iterate point
    var i = 0;

    while (i < max_i) {
        if (sub.indexOf(base[i]) < 0) i++;
        else {
            next = i;
            found = true;

            for (var j = 0; j < max_j; j++) {
                if (!found) break;

                if (sub[j] !== base[next]) found = false;
                else next++;
            };

            if (found) {
                positions.push({'start': i, 'end': --next});

                i += max_j;
            } else i++;
        }
    };

    return positions;
};