const assert = require("assert");

const utils = require("../lib/maintenance/utils");

describe("utils", () => {

  describe("validate.json()", () => {
    it("success", () => {
      assert.equal(utils.validate.json("{}"), true);
    });

    it("fail", () => {
      assert.equal(utils.validate.json(""), false);
    });
  });

  describe("validate.object()", () => {
    it("success", () => {
      assert.equal(utils.validate.object({}), true);
    });

    it("fail", () => {
      assert.equal(utils.validate.object(null), false);
    });
  });

  describe("validate.array()", () => {
    it("success", () => {
      assert.equal(utils.validate.array([]), true);
    });

    it("fail", () => {
      assert.equal(utils.validate.array(null), false);
    });
  });

  describe("validate.string()", () => {
    it("success", () => {
      assert.equal(utils.validate.string(""), true);
    });

    it("fail", () => {
      assert.equal(utils.validate.string(null), false);
    });
  });

  describe("validate.integer()", () => {
    it("success", () => {
      assert.equal(utils.validate.integer(13), true);
    });

    it("fail", () => {
      assert.equal(utils.validate.integer(null), false);
    });
  });

  describe("validate.bool()", () => {
    it("success", () => {
      assert.equal(utils.validate.bool(true), true);
    });

    it("fail", () => {
      assert.equal(utils.validate.bool(""), false);
    });
  });

  describe("merge()", () => {
    it("success", () => {
      const one = {
        name: true
      };
      const two = {
        surname: true
      };

      const merged = utils.merge(one, two);

      assert.equal(one.name, merged.name);
    });
  });

  describe("mixin()", () => {
    it("success", () => {
      const one = {
        name: true
      };
      const two = {
        surname: true
      };

      const merged = utils.mixin(one, two);

      assert.equal(one.surname, two.surname);
    });
  });

  describe("val2regexp()", () => {
    it("success (with string)", () => {
      const val = "string";

      assert.equal(val, utils.val2regexp(val));
    });

    it("success (with array)", () => {
      const val = ["one", "two"];

      assert.equal("(one|two)", utils.val2regexp(val));
    });
  });

  describe("compare()", () => {
    it("success", () => {
      const one = {
        name: true
      };
      const two = {
        name: true
      };

      assert.equal(utils.compare(one, two), true);
    });

    it("fail", () => {
      const one = {
        name: true
      };
      const two = {
        surname: true
      };

      assert.equal(utils.compare(one, two), false);
    });
  });

  describe("buff2arr()", () => {

  });

  describe("arr2buff()", () => {

  });

  describe("arr2buff2str()", () => {
    it("success", () => {
      const arr = [58, 59];

      assert.equal(utils.arr2buff2str(arr), ":;");
    });
  });
});
