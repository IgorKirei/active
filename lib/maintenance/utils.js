const chalk = require("chalk");

exports.showError = err => {
  console.error(chalk.red(err.stack || err));

  process.exit(1);
};

exports.validate = {
  json: val => {
    try {
      JSON.parse(val);
    } catch (e) {
      return false;
    }

    return true;
  },
  object: val => {
    return (
      Object.prototype.toString.call(val) === "[object Object]" &&
      val instanceof Object &&
      val !== null
    );
  },
  array: val => {
    return Object.prototype.toString.call(val) === "[object Array]";
  },
  string: val => {
    return typeof val === "string";
  },
  integer: val => {
    return typeof val === "number";
  },
  bool: val => {
    return val === true || val === false;
  }
};

exports.merge = (arg1, arg2) => {
  if (!arg1 || !arg2) {
    exports.showError("merge() invalid arguments");
  }

  const result = {};

  for (let prop in arg1) {
    result[prop] = arg1[prop];
  }

  for (let prop in arg2) {
    result[prop] = arg2[prop];
  }

  return result;
};

exports.mixin = (target, add) => {
  if (!target || !add) {
    exports.showError("mixin() invalid arguments");
  }

  Object.getOwnPropertyNames(add).forEach(function(name) {
    if (!Object.prototype.hasOwnProperty.call(target, name)) {
      let descriptor = Object.getOwnPropertyDescriptor(add, name);

      Object.defineProperty(target, name, descriptor);
    }
  });

  return target;
};

exports.val2regexp = val => {
  if (exports.validate.string(val)) {
    return val;
  } else if (exports.validate.array(val)) {
    return "(" + val.join("|") + ")";
  } else {
    exports.showError("val2regexp() invalid argument");
  }
};

exports.compare = (arg1, arg2) => {
  let result = false;

  switch (true) {
    case exports.validate.object(arg1) && exports.validate.object(arg2):
      if (Object.keys(arg1).length === Object.keys(arg2).length) {
        let matched = true;

        for (let prop in arg1) {
          if (arg2[prop] === undefined) {
            matched = false;
          }
        }

        if (matched) {
          result = true;
        }
      }
      break;
  }

  return result;
};

exports.buff2arr = buff => {
  if (!Buffer.isBuffer(buff)) {
    exports.showError("buff2arr() invalid buffer");
  }

  const result = [];
  let len = buff.length;

  while (len--) {
    result.push(buff[len]);
  }

  result.reverse();

  return result;
};

exports.arr2buff = arr => {
  if (!exports.validate.array(arr)) {
    exports.showError("arr2buff() invalid array");
  }

  return Buffer.from(arr);
};

exports.arr2buff2str = arr => {
  return exports.arr2buff(arr).toString();
};
