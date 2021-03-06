'use strict';Object.defineProperty(exports, "__esModule", { value: true });

var _lodash = require('lodash');var _lodash2 = _interopRequireDefault(_lodash);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

/**
                                                                                                                                                                              * Let tests observe additions to an array (of messages) via helper methods:
                                                                                                                                                                              * - `.next` - Watch for the next new element
                                                                                                                                                                              * - `.find` - Fidn a specific element
                                                                                                                                                                              * - `.match` - Find element matching a pattern
                                                                                                                                                                              * - `.all` - Do something with every element
                                                                                                                                                                              *
                                                                                                                                                                              * Each return an object with result attributes:
                                                                                                                                                                              * - _value_ - the last observed value when conditions were met
                                                                                                                                                                              * - _state_ - the state of the observed when the conditions were met
                                                                                                                                                                              * - _count_ - the number of additions between first call and a result
                                                                                                                                                                              *
                                                                                                                                                                              * `find`, `match` and `all` accept a _limit_ (int) of additions to observe, as
                                                                                                                                                                              * well as an _iterator_ (function) to call with every addition.
                                                                                                                                                                              *
                                                                                                                                                                              * With `find` and `match`, if limit is reached before main condition met
                                                                                                                                                                              * _value_ will be null
                                                                                                                                                                              */exports.default =
class {
  /**
        * Get observer for array (this.observed should replace the original)
        * @param  {array} arrayToObserve Array to observe
        * @return {Observer}             Observer containing observed array
        */
  constructor(arrayToObserve = null) {
    this.observers = {};
    if (arrayToObserve != null) this.proxy(arrayToObserve);
  }

  /**
     * Proxy the array, call observers to when setting a value
     * Callbacks are passed an array with 0: the value, 1: the current array state
     * Applies only on setting an index (int), not propterties like length
     * @param  {array} arrayToObserve Array to observe
     * @return {array}                Observed (proxy) array
     */
  proxy(arrayToObserve) {
    let observers = this.observers;

    arrayToObserve.push = function () {
      Array.prototype.push.apply(this, arguments);
      for (let arg of arguments) {
        _lodash2.default.map(observers, (cb, id) => {
          cb.call(this, arg, _lodash2.default.clone(this), id);
        });
      }
      return true;
    };
    this.observed = arrayToObserve;
    /*
                                    this.observed = new Proxy(arrayToObserve, {
                                      set: function (target, property, value, receiver) {
                                        target[property] = value
                                        if (Number.isInteger(parseInt(property))) {
                                          _.map(observers, (cb, id) => {
                                            cb.call(this, value, _.clone(target), id)
                                          })
                                        }
                                        return true
                                      }
                                    })
                                    */
    return this.observed;
  }

  /**
     * Get the observed array
     * @return {array} Observed (proxy) array
     */
  get() {
    return this.observed;
  }

  /**
     * Add a callback to call with any addition to observed array
     * @param  {Function} cb Callback, given new value as argument
     * @return {string}      ID of callback in observer collection (for removing)
     */
  observe(cb) {
    let id = _lodash2.default.uniqueId('observer_');
    this.observers[id] = cb;
    return id;
  }

  /**
     * Remove a callback from observer collection
     * @param  {string} index ID of callback to remove
     */
  unobserve(index) {
    if (index in this.observers) delete this.observers[index];
  }

  /**
     * Remove all callbacks (reset observer collection)
     */
  unobserveAll() {
    this.observers = {};
  }

  /**
     * Watch for any new element
     * @return {Promise} Resolves with the next value added to observed array
     */
  next() {
    return new Promise((resolve, reject) => {
      this.observe((value, state, id) => {
        this.unobserve(id);
        return resolve({
          value: value,
          state: state,
          count: 1 });

      });
    });
  }

  /**
     * Look for a specific element (optionally up to limit or with iterator)
     * @param  {Mixed} needle        The element to find (e.g. [username, message])
     * @param  {Int} [limit]           Stop observing and resolve when reached
     * @param  {Function} [iterator] Run with every push
     * @return {Promise}             Resolves with result attributes
     */
  find(needle, ...args) {
    let count = 0;
    let limit = _lodash2.default.isInteger(args[0]) ? args.shift() : false;
    let iterator = _lodash2.default.isFunction(args[0]) ? args.shift() : false;
    return new Promise((resolve, reject) => {
      this.observe((value, state, id) => {
        if (iterator) iterator(value);
        count++;
        let found = _lodash2.default.isEqual(needle, value);
        let maxed = count === limit;
        if (found || maxed) {
          this.unobserve(id);
          if (found) {
            return resolve({
              value: value,
              state: state,
              count: count });

          }
          if (maxed) {
            return resolve({
              value: null,
              state: state,
              count: count });

          }
        }
      });
    });
  }

  /**
     * Look for element matching pattern (optionally up to limit or with iterator)
     * @param  {RegExp} regex        Pattern to match element (joined as string)
     * @param  {Int} [limit]         Stop observing and resolve when reached
     * @param  {Function} [iterator] Run with every push
     * @return {Promise}             Resolves with result atts and match object
    */
  match(regex, ...args) {
    let count = 0;
    let limit = _lodash2.default.isInteger(args[0]) ? args.shift() : false;
    let iterator = _lodash2.default.isFunction(args[0]) ? args.shift() : false;
    return new Promise((resolve, reject) => {
      this.observe((value, state, id) => {
        if (iterator) iterator(value);

        count++;
        let match = value.join(' ').match(regex);
        let maxed = count === limit;
        if (match || maxed) {
          this.unobserve(id);
          if (match) {
            return resolve({
              value: value,
              state: state,
              count: count,
              match: match });

          }
          if (maxed) {
            return resolve({
              value: null,
              state: state,
              count: count });

          }
        }
      });
    });
  }

  /**
     * Observe all additions, up to limit or with iterator (must have either)
     * @param  {Int} [limit]         Stop observing and resolve when reached
     * @param  {Function} [iterator] Run with every push
     * @return {Promise}             Resolves with result object attributes
     */
  all(...args) {
    let count = 0;
    let limit = _lodash2.default.isInteger(args[0]) ? args.shift() : false;
    let iterator = _lodash2.default.isFunction(args[0]) ? args.shift() : false;
    if (!limit && !iterator) throw new Error('Must be called with either limit or iterator');
    return new Promise((resolve, reject) => {
      this.observe((value, state, id) => {
        if (iterator) iterator(value);

        count++;
        if (count === limit) {
          this.unobserve(id);
          return resolve({
            value: value,
            state: state,
            count: count });

        }
      });
    });
  }};module.exports = exports['default'];
//# sourceMappingURL=observer.js.map