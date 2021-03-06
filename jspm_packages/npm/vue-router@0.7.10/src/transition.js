/* */ 
import {
  warn,
  mapParams,
  isPromise
} from './util'

import {
  activate,
  deactivate,
  canActivate,
  canDeactivate,
  reuse,
  canReuse
} from './pipeline'

/**
 * A RouteTransition object manages the pipeline of a
 * router-view switching process. This is also the object
 * passed into user route hooks.
 *
 * @param {Router} router
 * @param {Route} to
 * @param {Route} from
 */

export default class RouteTransition {

  constructor (router, to, from) {
    this.router = router
    this.to = to
    this.from = from
    this.next = null
    this.aborted = false
    this.done = false
  }

  /**
   * Abort current transition and return to previous location.
   */

  abort () {
    if (!this.aborted) {
      this.aborted = true
      // if the root path throws an error during validation
      // on initial load, it gets caught in an infinite loop.
      const abortingOnLoad = !this.from.path && this.to.path === '/'
      if (!abortingOnLoad) {
        this.router.replace(this.from.path || '/')
      }
    }
  }

  /**
   * Abort current transition and redirect to a new location.
   *
   * @param {String} path
   */

  redirect (path) {
    if (!this.aborted) {
      this.aborted = true
      if (typeof path === 'string') {
        path = mapParams(path, this.to.params, this.to.query)
      } else {
        path.params = path.params || this.to.params
        path.query = path.query || this.to.query
      }
      this.router.replace(path)
    }
  }

  /**
   * A router view transition's pipeline can be described as
   * follows, assuming we are transitioning from an existing
   * <router-view> chain [Component A, Component B] to a new
   * chain [Component A, Component C]:
   *
   *  A    A
   *  | => |
   *  B    C
   *
   * 1. Reusablity phase:
   *   -> canReuse(A, A)
   *   -> canReuse(B, C)
   *   -> determine new queues:
   *      - deactivation: [B]
   *      - activation: [C]
   *
   * 2. Validation phase:
   *   -> canDeactivate(B)
   *   -> canActivate(C)
   *
   * 3. Activation phase:
   *   -> deactivate(B)
   *   -> activate(C)
   *
   * Each of these steps can be asynchronous, and any
   * step can potentially abort the transition.
   *
   * @param {Function} cb
   */

  start (cb) {
    const transition = this

    // determine the queue of views to deactivate
    let deactivateQueue = []
    let view = this.router._rootView
    while (view) {
      deactivateQueue.unshift(view)
      view = view.childView
    }
    let reverseDeactivateQueue = deactivateQueue.slice().reverse()

    // determine the queue of route handlers to activate
    let activateQueue = this.activateQueue =
      toArray(this.to.matched).map(match => match.handler)

    // 1. Reusability phase
    let i, reuseQueue
    for (i = 0; i < reverseDeactivateQueue.length; i++) {
      if (!canReuse(reverseDeactivateQueue[i], activateQueue[i], transition)) {
        break
      }
    }
    if (i > 0) {
      reuseQueue = reverseDeactivateQueue.slice(0, i)
      deactivateQueue = reverseDeactivateQueue.slice(i).reverse()
      activateQueue = activateQueue.slice(i)
    }

    // 2. Validation phase
    transition.runQueue(deactivateQueue, canDeactivate, () => {
      transition.runQueue(activateQueue, canActivate, () => {
        transition.runQueue(deactivateQueue, deactivate, () => {
          // 3. Activation phase

          // Update router current route
          transition.router._onTransitionValidated(transition)

          // trigger reuse for all reused views
          reuseQueue && reuseQueue.forEach(view => reuse(view, transition))

          // the root of the chain that needs to be replaced
          // is the top-most non-reusable view.
          if (deactivateQueue.length) {
            const view = deactivateQueue[deactivateQueue.length - 1]
            const depth = reuseQueue ? reuseQueue.length : 0
            activate(view, transition, depth, cb)
          } else {
            cb()
          }
        })
      })
    })
  }

  /**
   * Asynchronously and sequentially apply a function to a
   * queue.
   *
   * @param {Array} queue
   * @param {Function} fn
   * @param {Function} cb
   */

  runQueue (queue, fn, cb) {
    const transition = this
    step(0)
    function step (index) {
      if (index >= queue.length) {
        cb()
      } else {
        fn(queue[index], transition, () => {
          step(index + 1)
        })
      }
    }
  }

  /**
   * Call a user provided route transition hook and handle
   * the response (e.g. if the user returns a promise).
   *
   * If the user neither expects an argument nor returns a
   * promise, the hook is assumed to be synchronous.
   *
   * @param {Function} hook
   * @param {*} [context]
   * @param {Function} [cb]
   * @param {Object} [options]
   *                 - {Boolean} expectBoolean
   *                 - {Boolean} expectData
   *                 - {Function} cleanup
   */

  callHook (hook, context, cb, {
    expectBoolean = false,
    expectData = false,
    cleanup
  } = {}) {

    const transition = this
    let nextCalled = false

    // abort the transition
    const abort = () => {
      cleanup && cleanup()
      transition.abort()
    }

    // handle errors
    const onError = (err) => {
      // cleanup indicates an after-activation hook,
      // so instead of aborting we just let the transition
      // finish.
      cleanup ? next() : abort()
      if (err && !transition.router._suppress) {
        warn('Uncaught error during transition: ')
        throw err instanceof Error ? err : new Error(err)
      }
    }

    // advance the transition to the next step
    const next = (data) => {
      if (nextCalled) {
        warn('transition.next() should be called only once.')
        return
      }
      nextCalled = true
      if (transition.aborted) {
        cleanup && cleanup()
        return
      }
      cb && cb(data, onError)
    }

    // expose a clone of the transition object, so that each
    // hook gets a clean copy and prevent the user from
    // messing with the internals.
    const exposed = {
      to: transition.to,
      from: transition.from,
      abort: abort,
      next: next,
      redirect: function () {
        transition.redirect.apply(transition, arguments)
      }
    }

    // actually call the hook
    let res
    try {
      res = hook.call(context, exposed)
    } catch (err) {
      return onError(err)
    }

    // handle boolean/promise return values
    const resIsPromise = isPromise(res)
    if (expectBoolean) {
      if (typeof res === 'boolean') {
        res ? next() : abort()
      } else if (resIsPromise) {
        res.then((ok) => {
          ok ? next() : abort()
        }, onError)
      } else if (!hook.length) {
        next(res)
      }
    } else if (resIsPromise) {
      res.then(next, onError)
    } else if ((expectData && isPlainOjbect(res)) || !hook.length) {
      next(res)
    }
  }

  /**
   * Call a single hook or an array of async hooks in series.
   *
   * @param {Array} hooks
   * @param {*} context
   * @param {Function} cb
   * @param {Object} [options]
   */

  callHooks (hooks, context, cb, options) {
    if (Array.isArray(hooks)) {
      const res = []
      res._needMerge = true
      let onError
      this.runQueue(hooks, (hook, _, next) => {
        if (!this.aborted) {
          this.callHook(hook, context, (r, onError) => {
            if (r) res.push(r)
            onError = onError
            next()
          }, options)
        }
      }, () => {
        cb(res, onError)
      })
    } else {
      this.callHook(hooks, context, cb, options)
    }
  }
}

function isPlainOjbect (val) {
  return Object.prototype.toString.call(val) === '[object Object]'
}

function toArray (val) {
  return val
    ? Array.prototype.slice.call(val)
    : []
}
