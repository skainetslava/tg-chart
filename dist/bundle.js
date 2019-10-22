
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const data = {
      columns: [
        [
          "x",
          1542412800000,
          1542499200000,
          1542585600000,
          1542672000000,
          1542758400000,
          1542844800000,
          1542931200000,
          1543017600000,
          1543104000000,
          1543190400000,
          1543276800000,
          1543363200000,
          1543449600000,
          1543536000000,
          1543622400000,
          1543708800000,
          1543795200000,
          1543881600000,
          1543968000000,
          1544054400000,
          1544140800000,
          1544227200000,
          1544313600000,
          1544400000000,
          1544486400000,
          1544572800000,
          1544659200000,
          1544745600000,
          1544832000000,
          1544918400000,
          1545004800000,
          1545091200000,
          1545177600000,
          1545264000000,
          1545350400000,
          1545436800000,
          1545523200000,
          1545609600000,
          1545696000000,
          1545782400000,
          1545868800000,
          1545955200000,
          1546041600000,
          1546128000000,
          1546214400000,
          1546300800000,
          1546387200000,
          1546473600000,
          1546560000000,
          1546646400000,
          1546732800000,
          1546819200000,
          1546905600000,
          1546992000000,
          1547078400000,
          1547164800000,
          1547251200000,
          1547337600000,
          1547424000000,
          1547510400000,
          1547596800000,
          1547683200000,
          1547769600000,
          1547856000000,
          1547942400000,
          1548028800000,
          1548115200000,
          1548201600000,
          1548288000000,
          1548374400000,
          1548460800000,
          1548547200000,
          1548633600000,
          1548720000000,
          1548806400000,
          1548892800000,
          1548979200000,
          1549065600000,
          1549152000000,
          1549238400000,
          1549324800000,
          1549411200000,
          1549497600000,
          1549584000000,
          1549670400000,
          1549756800000,
          1549843200000,
          1549929600000,
          1550016000000,
          1550102400000,
          1550188800000,
          1550275200000,
          1550361600000,
          1550448000000,
          1550534400000,
          1550620800000,
          1550707200000,
          1550793600000,
          1550880000000,
          1550966400000,
          1551052800000,
          1551139200000,
          1551225600000,
          1551312000000,
          1551398400000,
          1551484800000,
          1551571200000,
          1551657600000,
          1551744000000,
          1551830400000,
          1551916800000,
          1552003200000
        ],
        [
          "y0",
          37,
          20,
          32,
          39,
          32,
          35,
          19,
          65,
          36,
          62,
          13,
          69,
          20,
          60,
          51,
          49,
          71,
          12,
          49,
          69,
          57,
          21,
          33,
          55,
          92,
          62,
          47,
          50,
          56,
          16,
          63,
          60,
          55,
          65,
          76,
          33,
          45,
          64,
          54,
          81,
          80,
          23,
          16,
          37,
          60,
          70,
          46,
          68,
          46,
          51,
          33,
          57,
          75,
          70,
          95,
          70,
          50,
          68,
          63,
          66,
          53,
          38,
          52,
          19,
          11,
          53,
          36,
          71,
          96,
          55,
          58,
          29,
          31,
          55,
          52,
          44,
          16,
          11,
          73,
          87,
          55,
          78,
          19,
          70,
          29,
          25,
          26,
          84,
          65,
          53,
          54,
          57,
          71,
          64,
          75,
          72,
          39,
          47,
          52,
          73,
          89,
          56,
          86,
          15,
          88,
          45,
          33,
          56,
          12,
          14,
          14,
          64
        ],
        [
          "y1",
          22,
          12,
          30,
          40,
          33,
          23,
          18,
          41,
          45,
          69,
          57,
          61,
          70,
          47,
          31,
          34,
          40,
          55,
          27,
          57,
          48,
          32,
          40,
          49,
          54,
          49,
          34,
          51,
          51,
          51,
          66,
          51,
          94,
          60,
          64,
          28,
          44,
          96,
          49,
          73,
          30,
          88,
          63,
          42,
          56,
          67,
          52,
          67,
          35,
          61,
          40,
          55,
          63,
          61,
          105,
          59,
          51,
          76,
          63,
          57,
          47,
          56,
          51,
          98,
          103,
          62,
          54,
          104,
          48,
          41,
          41,
          37,
          30,
          28,
          26,
          37,
          65,
          86,
          70,
          81,
          54,
          74,
          70,
          50,
          74,
          79,
          85,
          62,
          36,
          46,
          68,
          43,
          66,
          50,
          28,
          66,
          39,
          23,
          63,
          74,
          83,
          66,
          40,
          60,
          29,
          36,
          27,
          54,
          89,
          50,
          73,
          52
        ]
      ],
      types: { y0: "line", y1: "line", x: "x" },
      names: { y0: "#0", y1: "#1" },
      colors: { y0: "#3DC23F", y1: "#F34C44" }
    };

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const ratio = writable(0);
    const ratioMap = writable(32);

    const formateDate = (value, type) => {
        const day = new Date(value).getDate();
        const month = new Date(value).toLocaleString("en", {
          month: type
        });

        return `${day} ${month}`;
      };

    /* src\components\barMap.svelte generated by Svelte v3.12.1 */

    const file = "src\\components\\barMap.svelte";

    function create_fragment(ctx) {
    	var div5, div0, t0, div1, t1, div2, t2, div3, t3, div4, t4, canvas, dispose;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			t2 = space();
    			div3 = element("div");
    			t3 = space();
    			div4 = element("div");
    			t4 = space();
    			canvas = element("canvas");
    			attr_dev(div0, "class", "mask right svelte-xlovys");
    			set_style(div0, "transform", "translateX(" + (ctx.leftBorder + ctx.scale + widthBorder) + "px)");
    			set_style(div0, "width", "" + (1000 - ctx.scale - ctx.leftBorder) + "px");
    			add_location(div0, file, 217, 2, 4526);
    			attr_dev(div1, "class", "mask left svelte-xlovys");
    			set_style(div1, "transform", "translateX(" + (ctx.leftBorder - 1000) + "px)");
    			add_location(div1, file, 220, 2, 4672);
    			attr_dev(div2, "class", "handle svelte-xlovys");
    			set_style(div2, "transform", "translateX(" + (ctx.leftBorder + widthBorder) + "px)");
    			set_style(div2, "width", "" + ctx.scale + "px");
    			add_location(div2, file, 224, 2, 4767);
    			attr_dev(div3, "class", "border border_left svelte-xlovys");
    			set_style(div3, "transform", "translateX(" + ctx.leftBorder + "px)");
    			add_location(div3, file, 229, 2, 4930);
    			attr_dev(div4, "class", "border border_right svelte-xlovys");
    			set_style(div4, "transform", "translateX(" + (ctx.leftBorder + ctx.scale + widthBorder) + "px)");
    			add_location(div4, file, 233, 2, 5066);
    			attr_dev(canvas, "class", "map svelte-xlovys");
    			attr_dev(canvas, "width", "1000px");
    			attr_dev(canvas, "height", "50px");
    			set_style(canvas, "transform", "translateX(0px)");
    			add_location(canvas, file, 238, 2, 5228);
    			attr_dev(div5, "class", "map-wrapper svelte-xlovys");
    			add_location(div5, file, 216, 0, 4478);

    			dispose = [
    				listen_dev(window, "mousemove", ctx.handleMoveBorder),
    				listen_dev(window, "mouseup", ctx.resetMouseActions),
    				listen_dev(window, "mouseenter", ctx.resetMouseActions),
    				listen_dev(div2, "mousedown", ctx.mousedown_handler),
    				listen_dev(div3, "mousedown", ctx.handleDownLeftBorder),
    				listen_dev(div4, "mousedown", ctx.handleDownRightBorder)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div5, t0);
    			append_dev(div5, div1);
    			append_dev(div5, t1);
    			append_dev(div5, div2);
    			append_dev(div5, t2);
    			append_dev(div5, div3);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div5, t4);
    			append_dev(div5, canvas);
    			ctx.canvas_binding(canvas);
    			ctx.div5_binding(div5);
    		},

    		p: function update(changed, ctx) {
    			if (changed.leftBorder || changed.scale) {
    				set_style(div0, "transform", "translateX(" + (ctx.leftBorder + ctx.scale + widthBorder) + "px)");
    			}

    			if (changed.scale || changed.leftBorder) {
    				set_style(div0, "width", "" + (1000 - ctx.scale - ctx.leftBorder) + "px");
    			}

    			if (changed.leftBorder) {
    				set_style(div1, "transform", "translateX(" + (ctx.leftBorder - 1000) + "px)");
    				set_style(div2, "transform", "translateX(" + (ctx.leftBorder + widthBorder) + "px)");
    			}

    			if (changed.scale) {
    				set_style(div2, "width", "" + ctx.scale + "px");
    			}

    			if (changed.leftBorder) {
    				set_style(div3, "transform", "translateX(" + ctx.leftBorder + "px)");
    			}

    			if (changed.leftBorder || changed.scale) {
    				set_style(div4, "transform", "translateX(" + (ctx.leftBorder + ctx.scale + widthBorder) + "px)");
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div5);
    			}

    			ctx.canvas_binding(null);
    			ctx.div5_binding(null);
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    const widthBorder = 5;

    function instance($$self, $$props, $$invalidate) {
    	let $ratioMap;

    	validate_store(ratioMap, 'ratioMap');
    	component_subscribe($$self, ratioMap, $$value => { $ratioMap = $$value; $$invalidate('$ratioMap', $ratioMap); });

    	

      const dispatch = createEventDispatcher();

      let { positionChart, columnChart, xData, yData } = $$props;

      let canvasRef;
      let mapRef;
      const widthColumn = 1000 / xData.length;

      let isMouseDown = false;
      let isMovingRightBorder = false;
      let isMovingLeftBorder = false;

      let scale = 300;
      let offset = 0;

      let leftBorder = 0;
      let rightBorder = leftBorder + scale + 15;
      let distance;

      onMount(() => {
        if (!canvasRef.getContext) {
          return;
        }
        const ctx = canvasRef.getContext("2d");
        drawRectangle(ctx);

        ratio.update(() => columnChart / widthColumn);
      });

      afterUpdate(() => {
        offset = mapRef.offsetLeft;
      });

      const drawRectangle = ctx => {
        for (let i = 0; i < xData.length; i++) {
          const heightColumn = yData[i] * 0.5;
          ctx.fillStyle = "#64aded";
          ctx.fillRect(
            i * widthColumn,
            50 - heightColumn,
            widthColumn,
            heightColumn
          );
        }
      };

      const checkChartBorders = x => {
        if (x < 0) {
          return 0;
        }
        if (x + scale > 1000) {
          return 990 - scale;
        }

        return x;
      };

      const checkRightSlider = x => {
        if (rightBorder - leftBorder < 150 && x < rightBorder) {
          x = rightBorder;
        }
        return x;
      };

      const checkLeftSlider = x => {
        if (rightBorder - leftBorder < 150 && x > leftBorder) {
          x = leftBorder;
        }
        return x;
      };

      const handleSliderMove = e => {
        if (!isMouseDown) {
          return;
        }

        const x = e.clientX;

        if (!distance) {
          distance = x - leftBorder;
        }

        $$invalidate('leftBorder', leftBorder = checkChartBorders(x - distance));
        rightBorder = checkChartBorders(leftBorder + scale + widthBorder);

        dispatch("move", { positionXMap: leftBorder });
      };

      const handleDownRightBorder = e => {
        isMovingRightBorder = true;
      };

      const handleDownLeftBorder = e => {
        isMovingLeftBorder = true;
      };

      const handleMoveBorder = e => {
        if (isMouseDown) {
          handleSliderMove(e);
        }

        if (!isMovingRightBorder && !isMovingLeftBorder) {
          return;
        }

        if (isMovingRightBorder) {
          rightBorder = checkRightSlider(e.clientX - offset);
        } else {
          $$invalidate('leftBorder', leftBorder = checkLeftSlider(e.clientX - offset - 15));
        }

        const widthSlider = (rightBorder - widthBorder - leftBorder) / widthColumn;
        const newRatio = columnChart / widthColumn;

        ratioMap.update(() => widthSlider);
        ratio.update(() => newRatio);

        dispatch("changeScale", { leftBorder, newRatio });
      };

      const resetMouseActions = () => {
        isMovingLeftBorder = false;
        isMovingRightBorder = false;
        $$invalidate('isMouseDown', isMouseDown = false);
        distance = null;
      };

    	const writable_props = ['positionChart', 'columnChart', 'xData', 'yData'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<BarMap> was created with unknown prop '${key}'`);
    	});

    	const mousedown_handler = () => ($$invalidate('isMouseDown', isMouseDown = true));

    	function canvas_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('canvasRef', canvasRef = $$value);
    		});
    	}

    	function div5_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('mapRef', mapRef = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ('positionChart' in $$props) $$invalidate('positionChart', positionChart = $$props.positionChart);
    		if ('columnChart' in $$props) $$invalidate('columnChart', columnChart = $$props.columnChart);
    		if ('xData' in $$props) $$invalidate('xData', xData = $$props.xData);
    		if ('yData' in $$props) $$invalidate('yData', yData = $$props.yData);
    	};

    	$$self.$capture_state = () => {
    		return { positionChart, columnChart, xData, yData, canvasRef, mapRef, isMouseDown, isMovingRightBorder, isMovingLeftBorder, scale, offset, leftBorder, rightBorder, distance, $ratioMap };
    	};

    	$$self.$inject_state = $$props => {
    		if ('positionChart' in $$props) $$invalidate('positionChart', positionChart = $$props.positionChart);
    		if ('columnChart' in $$props) $$invalidate('columnChart', columnChart = $$props.columnChart);
    		if ('xData' in $$props) $$invalidate('xData', xData = $$props.xData);
    		if ('yData' in $$props) $$invalidate('yData', yData = $$props.yData);
    		if ('canvasRef' in $$props) $$invalidate('canvasRef', canvasRef = $$props.canvasRef);
    		if ('mapRef' in $$props) $$invalidate('mapRef', mapRef = $$props.mapRef);
    		if ('isMouseDown' in $$props) $$invalidate('isMouseDown', isMouseDown = $$props.isMouseDown);
    		if ('isMovingRightBorder' in $$props) isMovingRightBorder = $$props.isMovingRightBorder;
    		if ('isMovingLeftBorder' in $$props) isMovingLeftBorder = $$props.isMovingLeftBorder;
    		if ('scale' in $$props) $$invalidate('scale', scale = $$props.scale);
    		if ('offset' in $$props) offset = $$props.offset;
    		if ('leftBorder' in $$props) $$invalidate('leftBorder', leftBorder = $$props.leftBorder);
    		if ('rightBorder' in $$props) rightBorder = $$props.rightBorder;
    		if ('distance' in $$props) distance = $$props.distance;
    		if ('$ratioMap' in $$props) ratioMap.set($ratioMap);
    	};

    	$$self.$$.update = ($$dirty = { $ratioMap: 1, positionChart: 1 }) => {
    		if ($$dirty.$ratioMap) { $$invalidate('scale', scale = $ratioMap * widthColumn); }
    		if ($$dirty.positionChart) { $$invalidate('leftBorder', leftBorder = -positionChart || 0); }
    	};

    	return {
    		positionChart,
    		columnChart,
    		xData,
    		yData,
    		canvasRef,
    		mapRef,
    		isMouseDown,
    		scale,
    		leftBorder,
    		handleDownRightBorder,
    		handleDownLeftBorder,
    		handleMoveBorder,
    		resetMouseActions,
    		mousedown_handler,
    		canvas_binding,
    		div5_binding
    	};
    }

    class BarMap extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["positionChart", "columnChart", "xData", "yData"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "BarMap", options, id: create_fragment.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.positionChart === undefined && !('positionChart' in props)) {
    			console.warn("<BarMap> was created without expected prop 'positionChart'");
    		}
    		if (ctx.columnChart === undefined && !('columnChart' in props)) {
    			console.warn("<BarMap> was created without expected prop 'columnChart'");
    		}
    		if (ctx.xData === undefined && !('xData' in props)) {
    			console.warn("<BarMap> was created without expected prop 'xData'");
    		}
    		if (ctx.yData === undefined && !('yData' in props)) {
    			console.warn("<BarMap> was created without expected prop 'yData'");
    		}
    	}

    	get positionChart() {
    		throw new Error("<BarMap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set positionChart(value) {
    		throw new Error("<BarMap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get columnChart() {
    		throw new Error("<BarMap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set columnChart(value) {
    		throw new Error("<BarMap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get xData() {
    		throw new Error("<BarMap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xData(value) {
    		throw new Error("<BarMap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get yData() {
    		throw new Error("<BarMap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set yData(value) {
    		throw new Error("<BarMap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\barChart.svelte generated by Svelte v3.12.1 */

    const file$1 = "src\\components\\barChart.svelte";

    // (306:4) {#if tooltip}
    function create_if_block(ctx) {
    	var div, p0, t0_value = ctx.tooltip.date + "", t0, t1, p1, t2, span, t3_value = ctx.tooltip.views + "", t3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			p1 = element("p");
    			t2 = text("Views:\r\n          ");
    			span = element("span");
    			t3 = text(t3_value);
    			attr_dev(p0, "class", "date svelte-f2iz9e");
    			add_location(p0, file$1, 307, 8, 6988);
    			attr_dev(span, "class", "views svelte-f2iz9e");
    			add_location(span, file$1, 310, 10, 7065);
    			add_location(p1, file$1, 308, 8, 7032);
    			attr_dev(div, "class", "tooltip svelte-f2iz9e");
    			set_style(div, "top", "50px");
    			set_style(div, "left", "" + (ctx.tooltip.x - 65) + "px");
    			add_location(div, file$1, 306, 6, 6913);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p0);
    			append_dev(p0, t0);
    			append_dev(div, t1);
    			append_dev(div, p1);
    			append_dev(p1, t2);
    			append_dev(p1, span);
    			append_dev(span, t3);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.tooltip) && t0_value !== (t0_value = ctx.tooltip.date + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if ((changed.tooltip) && t3_value !== (t3_value = ctx.tooltip.views + "")) {
    				set_data_dev(t3, t3_value);
    			}

    			if (changed.tooltip) {
    				set_style(div, "left", "" + (ctx.tooltip.x - 65) + "px");
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(306:4) {#if tooltip}", ctx });
    	return block;
    }

    function create_fragment$1(ctx) {
    	var div4, div0, p0, t1, p1, t2_value = formateDate(ctx.xData[ctx.startDay], 'short') + "", t2, t3, t4_value = formateDate(ctx.xData[ctx.endDay], 'short') + "", t4, t5, div3, canvas, t6, div1, t7, div2, t8, div3_style_value, t9, current, dispose;

    	var if_block = (ctx.tooltip) && create_if_block(ctx);

    	var map = new BarMap({
    		props: {
    		positionChart: ctx.positionXMap,
    		columnChart: ctx.widthColumn,
    		xData: ctx.xData,
    		yData: ctx.yData
    	},
    		$$inline: true
    	});
    	map.$on("move", ctx.moveSlider);
    	map.$on("changeScale", ctx.handleChangeScale);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Bar Chart";
    			t1 = space();
    			p1 = element("p");
    			t2 = text(t2_value);
    			t3 = text(" - ");
    			t4 = text(t4_value);
    			t5 = space();
    			div3 = element("div");
    			canvas = element("canvas");
    			t6 = space();
    			div1 = element("div");
    			t7 = space();
    			div2 = element("div");
    			t8 = space();
    			if (if_block) if_block.c();
    			t9 = space();
    			map.$$.fragment.c();
    			attr_dev(p0, "class", "title svelte-f2iz9e");
    			add_location(p0, file$1, 278, 4, 6056);
    			add_location(p1, file$1, 279, 4, 6092);
    			attr_dev(div0, "class", "header svelte-f2iz9e");
    			add_location(div0, file$1, 277, 2, 6030);
    			attr_dev(canvas, "class", "cnvs");
    			attr_dev(canvas, "width", ctx.widthCanvas * 3);
    			attr_dev(canvas, "height", "504px");
    			set_style(canvas, "transform", "translateX(" + ctx.currentPositionX + "px)");
    			add_location(canvas, file$1, 292, 4, 6483);
    			attr_dev(div1, "class", "wrapper left svelte-f2iz9e");
    			set_style(div1, "transform", "translateX(" + ctx.limit + "px)");
    			add_location(div1, file$1, 300, 4, 6702);
    			attr_dev(div2, "class", "wrapper right svelte-f2iz9e");
    			set_style(div2, "transform", "translateX(" + (ctx.limit - ctx.widthColumn - 1000) + "px)");
    			add_location(div2, file$1, 301, 4, 6778);
    			attr_dev(div3, "class", "chart svelte-f2iz9e");
    			attr_dev(div3, "style", div3_style_value = ctx.isMouseDown ? 'cursor: grabbing' : 'cursor: grab');
    			add_location(div3, file$1, 283, 2, 6206);
    			attr_dev(div4, "class", "chart-one svelte-f2iz9e");
    			add_location(div4, file$1, 276, 0, 6003);

    			dispose = [
    				listen_dev(canvas, "mouseover", ctx.handleMouseEnter),
    				listen_dev(div3, "mousemove", ctx.handleMouseMove),
    				listen_dev(div3, "mousedown", ctx.handleMouseDown),
    				listen_dev(div3, "mouseleave", ctx.handleMouseLeave),
    				listen_dev(div3, "mouseup", ctx.mouseup_handler)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, p0);
    			append_dev(div0, t1);
    			append_dev(div0, p1);
    			append_dev(p1, t2);
    			append_dev(p1, t3);
    			append_dev(p1, t4);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, canvas);
    			ctx.canvas_binding(canvas);
    			append_dev(div3, t6);
    			append_dev(div3, div1);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div3, t8);
    			if (if_block) if_block.m(div3, null);
    			ctx.div3_binding(div3);
    			append_dev(div4, t9);
    			mount_component(map, div4, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.startDay) && t2_value !== (t2_value = formateDate(ctx.xData[ctx.startDay], 'short') + "")) {
    				set_data_dev(t2, t2_value);
    			}

    			if ((!current || changed.endDay) && t4_value !== (t4_value = formateDate(ctx.xData[ctx.endDay], 'short') + "")) {
    				set_data_dev(t4, t4_value);
    			}

    			if (!current || changed.currentPositionX) {
    				set_style(canvas, "transform", "translateX(" + ctx.currentPositionX + "px)");
    			}

    			if (!current || changed.limit) {
    				set_style(div1, "transform", "translateX(" + ctx.limit + "px)");
    			}

    			if (!current || changed.limit || changed.widthColumn) {
    				set_style(div2, "transform", "translateX(" + (ctx.limit - ctx.widthColumn - 1000) + "px)");
    			}

    			if (ctx.tooltip) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div3, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((!current || changed.isMouseDown) && div3_style_value !== (div3_style_value = ctx.isMouseDown ? 'cursor: grabbing' : 'cursor: grab')) {
    				attr_dev(div3, "style", div3_style_value);
    			}

    			var map_changes = {};
    			if (changed.positionXMap) map_changes.positionChart = ctx.positionXMap;
    			if (changed.widthColumn) map_changes.columnChart = ctx.widthColumn;
    			map.$set(map_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(map.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(map.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div4);
    			}

    			ctx.canvas_binding(null);
    			if (if_block) if_block.d();
    			ctx.div3_binding(null);

    			destroy_component(map);

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $ratio, $ratioMap;

    	validate_store(ratio, 'ratio');
    	component_subscribe($$self, ratio, $$value => { $ratio = $$value; $$invalidate('$ratio', $ratio); });
    	validate_store(ratioMap, 'ratioMap');
    	component_subscribe($$self, ratioMap, $$value => { $ratioMap = $$value; $$invalidate('$ratioMap', $ratioMap); });

    	

      let canvasRef;
      let chartRef;

      let ctx;

      const xData = data.columns[0].slice(1);
      const yData = data.columns[1].slice(1);

      let widthColumn = 30;
      let tooltip;
      let limit = 0;
      let currentPositionX = 0;
      let initialPositionX = 0;
      let isMouseDown = false;
      let positionXMap = 0;
      let offset = 0;
      let currentColumn;

      const widthCanvas = xData.length * widthColumn;
      const dataArray = xData.map((val, i) => i * widthColumn);

      let endDay;
      let startDay;

      onMount(() => {
        if (canvasRef.getContext) {
          ctx = canvasRef.getContext("2d");
          draw();
        }
      });

      afterUpdate(() => {
        offset = chartRef.offsetLeft;
      });

      const draw = () => {
        drawRectangle(ctx);
        drawAxis(ctx);
        drawTextX(ctx);
        drawTextY(ctx);
      };

      const drawRectangle = ctx => {
        for (let i = 0; i < xData.length; i++) {
          ctx.fillStyle = "#64aded";
          ctx.fillRect(
            i * widthColumn,
            500 - yData[i] * 5 - 40,
            widthColumn,
            yData[i] * 5
          );
        }
      };

      const drawAxis = ctx => {
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = "#EAEBF3";
          ctx.lineWidth = 0.3;
          ctx.beginPath();
          ctx.moveTo(widthColumn, 92 * i);
          ctx.lineTo(widthCanvas * 3 , 92 * i);
          ctx.stroke();
        }
      };

      const drawTextX = ctx => {
        ctx.fillStyle = "#a6a6a6";
        for (let i = 0; i < xData.length; i++) {
          if (i % 5 === 0) {
            const date = formateDate(xData[i], "short");
            ctx.font = "14px Roboto";
            ctx.fillText(date, widthColumn * (i + 1), 480);
          }
        }
      };

      const drawTextY = (ctx, y = 15) => {
        ctx.fillStyle = "#737373";
        for (let i = 0; i < 5; i++) {
          const date = formateDate(xData[i], "short");
          ctx.font = "14px Roboto";
          ctx.fillText(100 - i * 20, y, i * 92 - 5);
        }
      };

      const getLimitBorder = x => {
        if (!currentColumn || !isMouseDown) {
          currentColumn = findColumnIndex(x);
        }
        $$invalidate('limit', limit = currentColumn * widthColumn + widthColumn + currentPositionX);
      };

      const findColumnIndex = (x, dataArray = columns) => {
        const position = x - offset;
        return dataArray.findIndex(
          (column, i) => column <= position && position <= dataArray[i + 1]
        );
      };

      const checkTooltipBorders = x => {
        let rightX = x - offset;

        if (rightX < 100) {
          rightX = 100;
        }
        if (rightX > 940) {
          rightX = 940;
        }

        return rightX;
      };

      const updateDataTooltip = e => {
        const index = findColumnIndex(e.clientX);
        const dateColumn = formateDate(xData[index], "long");
        const viewsColumn = yData[index];

        $$invalidate('tooltip', tooltip = {
          ...tooltip,
          date: dateColumn,
          views: viewsColumn
        });
      };

      const updatePositionTooltip = e => {
        $$invalidate('tooltip', tooltip = {
          ...tooltip,
          x: checkTooltipBorders(e.clientX),
          y: e.clientY
        });
      };

      const renderTooltip = e => {
        if (!chartRef.contains(e.target)) {
          $$invalidate('tooltip', tooltip = null);
          return;
        }
        updateDataTooltip(e);
        updatePositionTooltip(e);
      };

      const checkChartBorders = (x, translate, widthChart) => {
        let position = translate;

        if (translate >= widthChart) {
          position = -widthChart;
          return position;
        }
        if (translate <= 0) {
          position = 0;
        } else {
          position = -translate;
        }

        return position;
      };

      const handleMouseMove = e => {
        if (isMouseDown) {
          const translate = -1 * (e.clientX - initialPositionX);

          $$invalidate('currentPositionX', currentPositionX = checkChartBorders(
            e.clientX,
            translate,
            widthCanvas - 1000
          ));
          $$invalidate('positionXMap', positionXMap = currentPositionX / $ratio);
          updatePositionTooltip(e);
        } else {
          renderTooltip(e);
        }
        getLimitBorder(e.clientX);
      };

      const handleMouseDown = e => {
        initialPositionX = e.pageX + -1 * currentPositionX;
        $$invalidate('isMouseDown', isMouseDown = true);
      };

      const handleMouseLeave = () => {
        $$invalidate('isMouseDown', isMouseDown = false);
        $$invalidate('tooltip', tooltip = null);
      };

      const handleMouseEnter = e => {
        renderTooltip(e);
      };

      const moveSlider = ({ detail }) => {
        const { positionXMap } = detail;
        $$invalidate('currentPositionX', currentPositionX = -positionXMap * $ratio);
      };

      const handleChangeScale = ({ detail }) => {
        if (!ctx) {
          return;
        }

        const { leftBorder } = detail;

        $$invalidate('widthColumn', widthColumn = 1000 / $ratioMap);
        $$invalidate('currentPositionX', currentPositionX = -leftBorder * $ratio);

        ctx.clearRect(0, 0, widthCanvas * 3, 504);
        draw();
      };

    	function canvas_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('canvasRef', canvasRef = $$value);
    		});
    	}

    	function div3_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('chartRef', chartRef = $$value);
    		});
    	}

    	const mouseup_handler = () => ($$invalidate('isMouseDown', isMouseDown = false));

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('canvasRef' in $$props) $$invalidate('canvasRef', canvasRef = $$props.canvasRef);
    		if ('chartRef' in $$props) $$invalidate('chartRef', chartRef = $$props.chartRef);
    		if ('ctx' in $$props) ctx = $$props.ctx;
    		if ('widthColumn' in $$props) $$invalidate('widthColumn', widthColumn = $$props.widthColumn);
    		if ('tooltip' in $$props) $$invalidate('tooltip', tooltip = $$props.tooltip);
    		if ('limit' in $$props) $$invalidate('limit', limit = $$props.limit);
    		if ('currentPositionX' in $$props) $$invalidate('currentPositionX', currentPositionX = $$props.currentPositionX);
    		if ('initialPositionX' in $$props) initialPositionX = $$props.initialPositionX;
    		if ('isMouseDown' in $$props) $$invalidate('isMouseDown', isMouseDown = $$props.isMouseDown);
    		if ('positionXMap' in $$props) $$invalidate('positionXMap', positionXMap = $$props.positionXMap);
    		if ('offset' in $$props) offset = $$props.offset;
    		if ('currentColumn' in $$props) currentColumn = $$props.currentColumn;
    		if ('endDay' in $$props) $$invalidate('endDay', endDay = $$props.endDay);
    		if ('startDay' in $$props) $$invalidate('startDay', startDay = $$props.startDay);
    		if ('columns' in $$props) columns = $$props.columns;
    		if ('$ratio' in $$props) ratio.set($ratio);
    		if ('$ratioMap' in $$props) ratioMap.set($ratioMap);
    	};

    	let columns;

    	$$self.$$.update = ($$dirty = { widthColumn: 1, currentPositionX: 1, startDay: 1 }) => {
    		if ($$dirty.widthColumn || $$dirty.currentPositionX) { columns = xData.map((val, i) => i * widthColumn + currentPositionX); }
    		if ($$dirty.currentPositionX || $$dirty.widthColumn || $$dirty.startDay) { {
            $$invalidate('startDay', startDay = Math.round(-currentPositionX / widthColumn));
            $$invalidate('endDay', endDay = startDay + Math.round(1000 / widthColumn));
          } }
    	};

    	return {
    		canvasRef,
    		chartRef,
    		xData,
    		yData,
    		widthColumn,
    		tooltip,
    		limit,
    		currentPositionX,
    		isMouseDown,
    		positionXMap,
    		widthCanvas,
    		endDay,
    		startDay,
    		handleMouseMove,
    		handleMouseDown,
    		handleMouseLeave,
    		handleMouseEnter,
    		moveSlider,
    		handleChangeScale,
    		canvas_binding,
    		div3_binding,
    		mouseup_handler
    	};
    }

    class BarChart extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "BarChart", options, id: create_fragment$1.name });
    	}
    }

    /* src\components\diagramMap.svelte generated by Svelte v3.12.1 */

    const file$2 = "src\\components\\diagramMap.svelte";

    function create_fragment$2(ctx) {
    	var div5, div0, t0, div1, t1, div2, t2, div3, t3, div4, t4, canvas, dispose;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			t2 = space();
    			div3 = element("div");
    			t3 = space();
    			div4 = element("div");
    			t4 = space();
    			canvas = element("canvas");
    			attr_dev(div0, "class", "mask right svelte-xlovys");
    			set_style(div0, "transform", "translateX(" + (ctx.leftBorder + ctx.scale + widthBorder$1) + "px)");
    			set_style(div0, "width", "" + (1000 - ctx.scale - ctx.leftBorder) + "px");
    			add_location(div0, file$2, 216, 2, 4592);
    			attr_dev(div1, "class", "mask left svelte-xlovys");
    			set_style(div1, "transform", "translateX(" + (ctx.leftBorder - 1000) + "px)");
    			add_location(div1, file$2, 219, 2, 4738);
    			attr_dev(div2, "class", "handle svelte-xlovys");
    			set_style(div2, "transform", "translateX(" + (ctx.leftBorder + widthBorder$1) + "px)");
    			set_style(div2, "width", "" + ctx.scale + "px");
    			add_location(div2, file$2, 223, 2, 4833);
    			attr_dev(div3, "class", "border border_left svelte-xlovys");
    			set_style(div3, "transform", "translateX(" + ctx.leftBorder + "px)");
    			add_location(div3, file$2, 228, 2, 4996);
    			attr_dev(div4, "class", "border border_right svelte-xlovys");
    			set_style(div4, "transform", "translateX(" + (ctx.leftBorder + ctx.scale + widthBorder$1) + "px)");
    			add_location(div4, file$2, 232, 2, 5132);
    			attr_dev(canvas, "class", "map svelte-xlovys");
    			attr_dev(canvas, "width", "1000px");
    			attr_dev(canvas, "height", "50px");
    			set_style(canvas, "transform", "translateX(0px)");
    			add_location(canvas, file$2, 237, 2, 5294);
    			attr_dev(div5, "class", "map-wrapper svelte-xlovys");
    			add_location(div5, file$2, 215, 0, 4544);

    			dispose = [
    				listen_dev(window, "mousemove", ctx.handleMoveBorder),
    				listen_dev(window, "mouseup", ctx.resetMouseActions),
    				listen_dev(window, "mouseenter", ctx.resetMouseActions),
    				listen_dev(div2, "mousedown", ctx.mousedown_handler),
    				listen_dev(div3, "mousedown", ctx.handleDownLeftBorder),
    				listen_dev(div4, "mousedown", ctx.handleDownRightBorder)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div5, t0);
    			append_dev(div5, div1);
    			append_dev(div5, t1);
    			append_dev(div5, div2);
    			append_dev(div5, t2);
    			append_dev(div5, div3);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div5, t4);
    			append_dev(div5, canvas);
    			ctx.canvas_binding(canvas);
    			ctx.div5_binding(div5);
    		},

    		p: function update(changed, ctx) {
    			if (changed.leftBorder || changed.scale) {
    				set_style(div0, "transform", "translateX(" + (ctx.leftBorder + ctx.scale + widthBorder$1) + "px)");
    			}

    			if (changed.scale || changed.leftBorder) {
    				set_style(div0, "width", "" + (1000 - ctx.scale - ctx.leftBorder) + "px");
    			}

    			if (changed.leftBorder) {
    				set_style(div1, "transform", "translateX(" + (ctx.leftBorder - 1000) + "px)");
    				set_style(div2, "transform", "translateX(" + (ctx.leftBorder + widthBorder$1) + "px)");
    			}

    			if (changed.scale) {
    				set_style(div2, "width", "" + ctx.scale + "px");
    			}

    			if (changed.leftBorder) {
    				set_style(div3, "transform", "translateX(" + ctx.leftBorder + "px)");
    			}

    			if (changed.leftBorder || changed.scale) {
    				set_style(div4, "transform", "translateX(" + (ctx.leftBorder + ctx.scale + widthBorder$1) + "px)");
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div5);
    			}

    			ctx.canvas_binding(null);
    			ctx.div5_binding(null);
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    const widthBorder$1 = 5;

    function instance$2($$self, $$props, $$invalidate) {
    	let $ratioMap;

    	validate_store(ratioMap, 'ratioMap');
    	component_subscribe($$self, ratioMap, $$value => { $ratioMap = $$value; $$invalidate('$ratioMap', $ratioMap); });

    	

      const dispatch = createEventDispatcher();

      let { positionChart, columnChart, xData, yData } = $$props;

      let canvasRef;
      let mapRef;
      const widthColumn = 1000 / xData.length;

      let isMouseDown = false;
      let isMovingRightBorder = false;
      let isMovingLeftBorder = false;

      let scale = 300;
      let offset = 0;

      let leftBorder = 0;
      let rightBorder = leftBorder + scale + 15;
      let distance;

      onMount(() => {
        if (!canvasRef.getContext) {
          return;
        }
        const ctx = canvasRef.getContext("2d");
        drawRectangle(ctx);

        ratio.update(() => columnChart / widthColumn);
      });

      afterUpdate(() => {
        offset = mapRef.offsetLeft;
      });

      const drawRectangle = ctx => {
        for (let i = 0; i < xData.length; i++) {
          const heightColumn = yData[i] * 0.5;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(i * widthColumn, 50 - heightColumn);
          ctx.lineTo((i + 1) * widthColumn, 50 - yData[i + 1] * 0.5);
          ctx.strokeStyle = "#C9AF4F";
          ctx.stroke();
        }
      };

      const checkChartBorders = x => {
        if (x < 0) {
          return 0;
        }
        if (x + scale > 1000) {
          return 990 - scale;
        }

        return x;
      };

      const checkRightSlider = x => {
        if (rightBorder - leftBorder < 150 && x < rightBorder) {
          x = rightBorder;
        }
        return x;
      };

      const checkLeftSlider = x => {
        if (rightBorder - leftBorder < 150 && x > leftBorder) {
          x = leftBorder;
        }
        return x;
      };

      const handleSliderMove = e => {
        if (!isMouseDown) {
          return;
        }

        const x = e.clientX;

        if (!distance) {
          distance = x - leftBorder;
        }

        $$invalidate('leftBorder', leftBorder = checkChartBorders(x - distance));
        rightBorder = checkChartBorders(leftBorder + scale + widthBorder$1);

        dispatch("move", { positionXMap: leftBorder });
      };

      const handleDownRightBorder = e => {
        isMovingRightBorder = true;
      };

      const handleDownLeftBorder = e => {
        isMovingLeftBorder = true;
      };

      const handleMoveBorder = e => {
        if (isMouseDown) {
          handleSliderMove(e);
        }

        if (!isMovingRightBorder && !isMovingLeftBorder) {
          return;
        }

        if (isMovingRightBorder) {
          rightBorder = checkRightSlider(e.clientX - offset);
        } else {
          $$invalidate('leftBorder', leftBorder = checkLeftSlider(e.clientX - offset - 15));
        }

        const widthSlider = (rightBorder - widthBorder$1 - leftBorder) / widthColumn;
        const newRatio = columnChart / widthColumn;

        ratioMap.update(() => widthSlider);
        ratio.update(() => newRatio);

        dispatch("changeScale", { leftBorder, newRatio });
      };

      const resetMouseActions = () => {
        isMovingLeftBorder = false;
        isMovingRightBorder = false;
        $$invalidate('isMouseDown', isMouseDown = false);
        distance = null;
      };

    	const writable_props = ['positionChart', 'columnChart', 'xData', 'yData'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<DiagramMap> was created with unknown prop '${key}'`);
    	});

    	const mousedown_handler = () => ($$invalidate('isMouseDown', isMouseDown = true));

    	function canvas_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('canvasRef', canvasRef = $$value);
    		});
    	}

    	function div5_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('mapRef', mapRef = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ('positionChart' in $$props) $$invalidate('positionChart', positionChart = $$props.positionChart);
    		if ('columnChart' in $$props) $$invalidate('columnChart', columnChart = $$props.columnChart);
    		if ('xData' in $$props) $$invalidate('xData', xData = $$props.xData);
    		if ('yData' in $$props) $$invalidate('yData', yData = $$props.yData);
    	};

    	$$self.$capture_state = () => {
    		return { positionChart, columnChart, xData, yData, canvasRef, mapRef, isMouseDown, isMovingRightBorder, isMovingLeftBorder, scale, offset, leftBorder, rightBorder, distance, $ratioMap };
    	};

    	$$self.$inject_state = $$props => {
    		if ('positionChart' in $$props) $$invalidate('positionChart', positionChart = $$props.positionChart);
    		if ('columnChart' in $$props) $$invalidate('columnChart', columnChart = $$props.columnChart);
    		if ('xData' in $$props) $$invalidate('xData', xData = $$props.xData);
    		if ('yData' in $$props) $$invalidate('yData', yData = $$props.yData);
    		if ('canvasRef' in $$props) $$invalidate('canvasRef', canvasRef = $$props.canvasRef);
    		if ('mapRef' in $$props) $$invalidate('mapRef', mapRef = $$props.mapRef);
    		if ('isMouseDown' in $$props) $$invalidate('isMouseDown', isMouseDown = $$props.isMouseDown);
    		if ('isMovingRightBorder' in $$props) isMovingRightBorder = $$props.isMovingRightBorder;
    		if ('isMovingLeftBorder' in $$props) isMovingLeftBorder = $$props.isMovingLeftBorder;
    		if ('scale' in $$props) $$invalidate('scale', scale = $$props.scale);
    		if ('offset' in $$props) offset = $$props.offset;
    		if ('leftBorder' in $$props) $$invalidate('leftBorder', leftBorder = $$props.leftBorder);
    		if ('rightBorder' in $$props) rightBorder = $$props.rightBorder;
    		if ('distance' in $$props) distance = $$props.distance;
    		if ('$ratioMap' in $$props) ratioMap.set($ratioMap);
    	};

    	$$self.$$.update = ($$dirty = { $ratioMap: 1, positionChart: 1 }) => {
    		if ($$dirty.$ratioMap) { $$invalidate('scale', scale = $ratioMap * widthColumn); }
    		if ($$dirty.positionChart) { $$invalidate('leftBorder', leftBorder = -positionChart || 0); }
    	};

    	return {
    		positionChart,
    		columnChart,
    		xData,
    		yData,
    		canvasRef,
    		mapRef,
    		isMouseDown,
    		scale,
    		leftBorder,
    		handleDownRightBorder,
    		handleDownLeftBorder,
    		handleMoveBorder,
    		resetMouseActions,
    		mousedown_handler,
    		canvas_binding,
    		div5_binding
    	};
    }

    class DiagramMap extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["positionChart", "columnChart", "xData", "yData"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "DiagramMap", options, id: create_fragment$2.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.positionChart === undefined && !('positionChart' in props)) {
    			console.warn("<DiagramMap> was created without expected prop 'positionChart'");
    		}
    		if (ctx.columnChart === undefined && !('columnChart' in props)) {
    			console.warn("<DiagramMap> was created without expected prop 'columnChart'");
    		}
    		if (ctx.xData === undefined && !('xData' in props)) {
    			console.warn("<DiagramMap> was created without expected prop 'xData'");
    		}
    		if (ctx.yData === undefined && !('yData' in props)) {
    			console.warn("<DiagramMap> was created without expected prop 'yData'");
    		}
    	}

    	get positionChart() {
    		throw new Error("<DiagramMap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set positionChart(value) {
    		throw new Error("<DiagramMap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get columnChart() {
    		throw new Error("<DiagramMap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set columnChart(value) {
    		throw new Error("<DiagramMap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get xData() {
    		throw new Error("<DiagramMap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xData(value) {
    		throw new Error("<DiagramMap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get yData() {
    		throw new Error("<DiagramMap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set yData(value) {
    		throw new Error("<DiagramMap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\diagram.svelte generated by Svelte v3.12.1 */

    const file$3 = "src\\components\\diagram.svelte";

    // (313:4) {#if tooltip}
    function create_if_block$1(ctx) {
    	var div, p0, t0_value = ctx.tooltip.date + "", t0, t1, p1, t2, span, t3_value = ctx.tooltip.views + "", t3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			p1 = element("p");
    			t2 = text("Views:\r\n          ");
    			span = element("span");
    			t3 = text(t3_value);
    			attr_dev(p0, "class", "date svelte-7gsqkn");
    			add_location(p0, file$3, 314, 8, 7286);
    			attr_dev(span, "class", "views svelte-7gsqkn");
    			add_location(span, file$3, 317, 10, 7363);
    			add_location(p1, file$3, 315, 8, 7330);
    			attr_dev(div, "class", "tooltip svelte-7gsqkn");
    			set_style(div, "top", "10px");
    			set_style(div, "left", "" + (ctx.tooltip.x - 65) + "px");
    			add_location(div, file$3, 313, 6, 7211);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p0);
    			append_dev(p0, t0);
    			append_dev(div, t1);
    			append_dev(div, p1);
    			append_dev(p1, t2);
    			append_dev(p1, span);
    			append_dev(span, t3);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.tooltip) && t0_value !== (t0_value = ctx.tooltip.date + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if ((changed.tooltip) && t3_value !== (t3_value = ctx.tooltip.views + "")) {
    				set_data_dev(t3, t3_value);
    			}

    			if (changed.tooltip) {
    				set_style(div, "left", "" + (ctx.tooltip.x - 65) + "px");
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(313:4) {#if tooltip}", ctx });
    	return block;
    }

    function create_fragment$3(ctx) {
    	var div2, div0, p0, t1, p1, t2_value = formateDate(ctx.xData[ctx.startDay], 'short') + "", t2, t3, t4_value = formateDate(ctx.xData[ctx.endDay], 'short') + "", t4, t5, div1, canvas, t6, div1_style_value, t7, current, dispose;

    	var if_block = (ctx.tooltip) && create_if_block$1(ctx);

    	var diagrammap = new DiagramMap({
    		props: {
    		positionChart: ctx.positionXMap,
    		columnChart: ctx.widthColumn,
    		xData: ctx.xData,
    		yData: ctx.yData
    	},
    		$$inline: true
    	});
    	diagrammap.$on("move", ctx.moveSlider);
    	diagrammap.$on("changeScale", ctx.handleChangeScale);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Diagram";
    			t1 = space();
    			p1 = element("p");
    			t2 = text(t2_value);
    			t3 = text(" - ");
    			t4 = text(t4_value);
    			t5 = space();
    			div1 = element("div");
    			canvas = element("canvas");
    			t6 = space();
    			if (if_block) if_block.c();
    			t7 = space();
    			diagrammap.$$.fragment.c();
    			attr_dev(p0, "class", "title svelte-7gsqkn");
    			add_location(p0, file$3, 290, 4, 6546);
    			add_location(p1, file$3, 291, 4, 6580);
    			attr_dev(div0, "class", "header svelte-7gsqkn");
    			add_location(div0, file$3, 289, 2, 6520);
    			attr_dev(canvas, "class", "cnvs");
    			attr_dev(canvas, "width", ctx.widthCanvas * 3);
    			attr_dev(canvas, "height", "504px");
    			set_style(canvas, "transform", "translateX(" + ctx.currentPositionX + "px)");
    			add_location(canvas, file$3, 304, 4, 6971);
    			attr_dev(div1, "class", "chart svelte-7gsqkn");
    			attr_dev(div1, "style", div1_style_value = ctx.isMouseDown ? 'cursor: grabbing' : 'cursor: grab');
    			add_location(div1, file$3, 295, 2, 6694);
    			attr_dev(div2, "class", "chart-two svelte-7gsqkn");
    			add_location(div2, file$3, 288, 0, 6493);

    			dispose = [
    				listen_dev(canvas, "mouseover", ctx.handleMouseEnter),
    				listen_dev(div1, "mousemove", ctx.handleMouseMove),
    				listen_dev(div1, "mousedown", ctx.handleMouseDown),
    				listen_dev(div1, "mouseleave", ctx.handleMouseLeave),
    				listen_dev(div1, "mouseup", ctx.mouseup_handler)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, p0);
    			append_dev(div0, t1);
    			append_dev(div0, p1);
    			append_dev(p1, t2);
    			append_dev(p1, t3);
    			append_dev(p1, t4);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, canvas);
    			ctx.canvas_binding(canvas);
    			append_dev(div1, t6);
    			if (if_block) if_block.m(div1, null);
    			ctx.div1_binding(div1);
    			append_dev(div2, t7);
    			mount_component(diagrammap, div2, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.startDay) && t2_value !== (t2_value = formateDate(ctx.xData[ctx.startDay], 'short') + "")) {
    				set_data_dev(t2, t2_value);
    			}

    			if ((!current || changed.endDay) && t4_value !== (t4_value = formateDate(ctx.xData[ctx.endDay], 'short') + "")) {
    				set_data_dev(t4, t4_value);
    			}

    			if (!current || changed.currentPositionX) {
    				set_style(canvas, "transform", "translateX(" + ctx.currentPositionX + "px)");
    			}

    			if (ctx.tooltip) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((!current || changed.isMouseDown) && div1_style_value !== (div1_style_value = ctx.isMouseDown ? 'cursor: grabbing' : 'cursor: grab')) {
    				attr_dev(div1, "style", div1_style_value);
    			}

    			var diagrammap_changes = {};
    			if (changed.positionXMap) diagrammap_changes.positionChart = ctx.positionXMap;
    			if (changed.widthColumn) diagrammap_changes.columnChart = ctx.widthColumn;
    			diagrammap.$set(diagrammap_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(diagrammap.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(diagrammap.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    			}

    			ctx.canvas_binding(null);
    			if (if_block) if_block.d();
    			ctx.div1_binding(null);

    			destroy_component(diagrammap);

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $ratio, $ratioMap;

    	validate_store(ratio, 'ratio');
    	component_subscribe($$self, ratio, $$value => { $ratio = $$value; $$invalidate('$ratio', $ratio); });
    	validate_store(ratioMap, 'ratioMap');
    	component_subscribe($$self, ratioMap, $$value => { $ratioMap = $$value; $$invalidate('$ratioMap', $ratioMap); });

    	

      let canvasRef;
      let chartRef;

      let ctx;

      const xData = data.columns[0].slice(1);
      const yData = data.columns[1].slice(1);

      let widthColumn = 30;
      let tooltip;
      let limit = 0;
      let currentPositionX = 0;
      let initialPositionX = 0;
      let isMouseDown = false;
      let positionXMap = 0;
      let offset = 0;
      let currentColumn;

      const widthCanvas = xData.length * widthColumn;
      const dataArray = xData.map((val, i) => i * widthColumn);

      let endDay;
      let startDay;

      onMount(() => {
        if (canvasRef.getContext) {
          ctx = canvasRef.getContext("2d");
          draw();
        }
      });

      afterUpdate(() => {
        offset = chartRef.offsetLeft;
      });

      const draw = () => {
        drawRectangle(ctx);
        drawAxis(ctx);
        drawTextX(ctx);
        drawTextY(ctx);
      };

      const drawRectangle = ctx => {
        for (let i = 0; i < xData.length; i++) {
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(i * widthColumn, 500 - yData[i] * 5);
          ctx.lineTo((i + 1) * widthColumn, 500 - yData[i + 1] * 5);
          ctx.strokeStyle = "#C9AF4F";
          ctx.stroke();
        }
      };

      const drawAxis = ctx => {
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = "#eee";
          ctx.lineWidth = 0.2;
          ctx.beginPath();
          ctx.moveTo(widthColumn, 92 * i);
          ctx.lineTo(widthCanvas * 3, 92 * i);
          ctx.strokeStyle = "#000";
          ctx.stroke();
        }
      };

      const drawTextX = ctx => {
        ctx.fillStyle = "#a6a6a6";
        for (let i = 0; i < xData.length; i++) {
          if (i % 5 === 0) {
            const date = formateDate(xData[i], "short");
            ctx.font = "14px Roboto";
            ctx.fillText(date, widthColumn * (i + 1), 480);
          }
        }
      };

      const drawTextY = (ctx, y = 15) => {
        ctx.fillStyle = "#737373";
        for (let i = 0; i < 5; i++) {
          const date = formateDate(xData[i], "short");
          ctx.font = "14px Roboto";
          ctx.fillText(100 - i * 20, y, i * 92 - 5);
        }
      };

      const getLimitBorder = x => {
        if (!currentColumn || !isMouseDown) {
          currentColumn = findColumnIndex(x);
        }
        limit = currentColumn * widthColumn + widthColumn + currentPositionX;
      };

      const findColumnIndex = (x, dataArray = columns) => {
        const position = x - offset;
        return dataArray.findIndex(
          (column, i) => column <= position && position <= dataArray[i + 1]
        );
      };

      const checkTooltipBorders = x => {
        let rightX = x - offset;

        if (rightX < 100) {
          rightX = 100;
        }
        if (rightX > 940) {
          rightX = 940;
        }

        return rightX;
      };

      const updateDataTooltip = e => {
        const index = findColumnIndex(e.clientX);
        const dateColumn = formateDate(xData[index], "long");
        const viewsColumn = yData[index];

        $$invalidate('tooltip', tooltip = {
          ...tooltip,
          date: dateColumn,
          views: viewsColumn
        });
      };

      const updatePositionTooltip = e => {
        $$invalidate('tooltip', tooltip = {
          ...tooltip,
          x: checkTooltipBorders(e.clientX),
          y: e.clientY
        });
      };

      const renderTooltip = e => {
        if (!chartRef.contains(e.target)) {
          $$invalidate('tooltip', tooltip = null);
          return;
        }
        updateDataTooltip(e);
        updatePositionTooltip(e);
      };

      const checkChartBorders = (x, translate, widthChart) => {
        let position = translate;

        if (translate >= widthChart) {
          position = -widthChart;
          return position;
        }
        if (translate <= 0) {
          position = 0;
        } else {
          position = -translate;
        }

        return position;
      };
      let prev;
      const drawPoint = e => {
        const index = findColumnIndex(e.clientX);

        if (prev === index) {
          return;
        }
        prev = index;

        ctx.clearRect(0, 0, widthCanvas * 3, 504);
        draw();

        ctx.beginPath();
        ctx.moveTo(index * widthColumn, 0);
        ctx.lineTo(index * widthColumn, 504);
         ctx.lineWidth = 0.3;
        ctx.strokeStyle = "#000";
        ctx.stroke();

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(index * widthColumn, 500 - yData[index] * 5, 5, 0, Math.PI * 2);
        ctx.strokeStyle = "#C9AF4F";
        ctx.stroke();
      };

      const handleMouseMove = e => {
        if (isMouseDown) {
          const translate = -1 * (e.clientX - initialPositionX);

          $$invalidate('currentPositionX', currentPositionX = checkChartBorders(
            e.clientX,
            translate,
            widthCanvas - 1000
          ));
          $$invalidate('positionXMap', positionXMap = currentPositionX / $ratio);
          updatePositionTooltip(e);
        } else {
          renderTooltip(e);
        }
        drawPoint(e);
        getLimitBorder(e.clientX);
      };

      const handleMouseDown = e => {
        initialPositionX = e.pageX + -1 * currentPositionX;
        $$invalidate('isMouseDown', isMouseDown = true);
      };

      const handleMouseLeave = () => {
        $$invalidate('isMouseDown', isMouseDown = false);
        $$invalidate('tooltip', tooltip = null);
      };

      const handleMouseEnter = e => {
        renderTooltip(e);
      };

      const moveSlider = ({ detail }) => {
        const { positionXMap } = detail;
        $$invalidate('currentPositionX', currentPositionX = -positionXMap * $ratio);
      };

      const handleChangeScale = ({ detail }) => {
        if (!ctx) {
          return;
        }

        const { leftBorder } = detail;

        $$invalidate('widthColumn', widthColumn = 1000 / $ratioMap);
        $$invalidate('currentPositionX', currentPositionX = -leftBorder * $ratio);

        ctx.clearRect(0, 0, widthCanvas * 3, 504);
        draw();
      };

    	function canvas_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('canvasRef', canvasRef = $$value);
    		});
    	}

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('chartRef', chartRef = $$value);
    		});
    	}

    	const mouseup_handler = () => ($$invalidate('isMouseDown', isMouseDown = false));

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('canvasRef' in $$props) $$invalidate('canvasRef', canvasRef = $$props.canvasRef);
    		if ('chartRef' in $$props) $$invalidate('chartRef', chartRef = $$props.chartRef);
    		if ('ctx' in $$props) ctx = $$props.ctx;
    		if ('widthColumn' in $$props) $$invalidate('widthColumn', widthColumn = $$props.widthColumn);
    		if ('tooltip' in $$props) $$invalidate('tooltip', tooltip = $$props.tooltip);
    		if ('limit' in $$props) limit = $$props.limit;
    		if ('currentPositionX' in $$props) $$invalidate('currentPositionX', currentPositionX = $$props.currentPositionX);
    		if ('initialPositionX' in $$props) initialPositionX = $$props.initialPositionX;
    		if ('isMouseDown' in $$props) $$invalidate('isMouseDown', isMouseDown = $$props.isMouseDown);
    		if ('positionXMap' in $$props) $$invalidate('positionXMap', positionXMap = $$props.positionXMap);
    		if ('offset' in $$props) offset = $$props.offset;
    		if ('currentColumn' in $$props) currentColumn = $$props.currentColumn;
    		if ('endDay' in $$props) $$invalidate('endDay', endDay = $$props.endDay);
    		if ('startDay' in $$props) $$invalidate('startDay', startDay = $$props.startDay);
    		if ('prev' in $$props) prev = $$props.prev;
    		if ('columns' in $$props) columns = $$props.columns;
    		if ('$ratio' in $$props) ratio.set($ratio);
    		if ('$ratioMap' in $$props) ratioMap.set($ratioMap);
    	};

    	let columns;

    	$$self.$$.update = ($$dirty = { widthColumn: 1, currentPositionX: 1, startDay: 1 }) => {
    		if ($$dirty.widthColumn || $$dirty.currentPositionX) { columns = xData.map((val, i) => i * widthColumn + currentPositionX); }
    		if ($$dirty.currentPositionX || $$dirty.widthColumn || $$dirty.startDay) { {
            $$invalidate('startDay', startDay = Math.round(-currentPositionX / widthColumn));
            $$invalidate('endDay', endDay = startDay + Math.round(1000 / widthColumn));
          } }
    	};

    	return {
    		canvasRef,
    		chartRef,
    		xData,
    		yData,
    		widthColumn,
    		tooltip,
    		currentPositionX,
    		isMouseDown,
    		positionXMap,
    		widthCanvas,
    		endDay,
    		startDay,
    		handleMouseMove,
    		handleMouseDown,
    		handleMouseLeave,
    		handleMouseEnter,
    		moveSlider,
    		handleChangeScale,
    		canvas_binding,
    		div1_binding,
    		mouseup_handler
    	};
    }

    class Diagram extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Diagram", options, id: create_fragment$3.name });
    	}
    }

    /* src\App.svelte generated by Svelte v3.12.1 */

    const file$4 = "src\\App.svelte";

    function create_fragment$4(ctx) {
    	var div1, div0, h3, t1, p, t3, t4, current;

    	var barchart = new BarChart({ $$inline: true });

    	var diagram = new Diagram({ $$inline: true });

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Chart Contest";
    			t1 = space();
    			p = element("p");
    			p.textContent = "These charts are made with canvas.";
    			t3 = space();
    			barchart.$$.fragment.c();
    			t4 = space();
    			diagram.$$.fragment.c();
    			attr_dev(h3, "class", "svelte-12xsfbl");
    			add_location(h3, file$4, 30, 4, 492);
    			attr_dev(p, "class", "svelte-12xsfbl");
    			add_location(p, file$4, 31, 4, 519);
    			attr_dev(div0, "class", "describe svelte-12xsfbl");
    			add_location(div0, file$4, 29, 2, 465);
    			attr_dev(div1, "class", "app svelte-12xsfbl");
    			add_location(div1, file$4, 28, 0, 445);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(div1, t3);
    			mount_component(barchart, div1, null);
    			append_dev(div1, t4);
    			mount_component(diagram, div1, null);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(barchart.$$.fragment, local);

    			transition_in(diagram.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(barchart.$$.fragment, local);
    			transition_out(diagram.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div1);
    			}

    			destroy_component(barchart);

    			destroy_component(diagram);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$4, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$4.name });
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
