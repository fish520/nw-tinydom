/*
* Author: Small-Fish <xiaoyu44@139.com>
* jQuery-like, partially compatible.
* todo: 
*	next()[nodeType=1], not(selector)[opposite to filter], offset(), data(),
*	insert(find.selector, sel-or-dom-or-$)
*	remove these: width, height (replace by offset())
* closest (对于处理事件委托非常有用。)
*
* 单一/批量结果返回类型并未统一，原则：不要为错误的逻辑做兼容。(KISS)
*
* 注意：attr(), css(), html() 的get操作，返回规则不一致，未细致了解。
* trick: $([sel1, sel2, sel3, ...]) 的方式可以保证获取元素的顺序。
*	进一步说，通过attr()提取出来的属性集也具有相应的顺序，在提取多个元素的属性时会很方便。
*/

(function (global, undefined) {

	"use strict";

	var doc = document,

	_toString = ({}).toString,

	_push = [].push,

	rews = /\s+/g,

	/**
	 * We deal with Elements only, 
	 * like "[object Comment]" is a instance of Node, but not Element.
	 * Note: This function is only called internally, using the new keyword.
	 * @param o	[ selector | Element | Array | any ]
	 * @return a object having the selected elements hosted in `this`
	 */
	E = function(o) {

		var elements;

		if(!o) {
			return ;
		}

		if(o instanceof $) {
			return o;
		}

		if(typeof o == "string") {
			if ( o.charAt(0) === "<" && o.charAt( o.length - 1 ) === ">" && o.length >= 3 ) {
				// Assume that strings that start and end with <> are HTML and skip the regex check
				// core_push.apply(_, arraylike) throws (in QtWebKit, eg iPad)
				elements = doc.createElement("div");
				elements.innerHTML = o;
				_push.apply(this, elements.childNodes);	// 但是，这包括了文本和注释节点，$不具备对它的处理能力
			} else {
				_push.apply(this, doc.querySelectorAll(o));
			}
		} else if(Array.isArray(o)) {
			for(var i=0,l=o.length; i<l; i++) {
				elements = new E(o[i]);	// in a recursive way, we get a flat array finally
				// merge the elements in case we got any instances of $
				elements.length > 0 && _push.apply(this, elements);
			}
		} else if(o instanceof Element) {
			_push.apply(this, [o]);
		} else {
			elements = _toString.call(o);
			if(elements == '[object NodeList]' || elements == '[object HTMLCollection]') {
				_push.apply(this, o);
			} else if(elements == '[object Function]') {
				doc.addEventListener("DOMContentLoaded", o, false);
			} else {
				_push.apply(this, [o]);//typeof o === "object" ? [o] : [doc]);
			}
		}
	},

	$ = function (o) {
		return new E(o);
	};
/*
	function merge(a, b){
		if(!a || !b) return ;
		var i = -1,
			al = a.length,
			bl = b.length;

		while( ++i < bl ) { a[al+i] = b[i]; }
		a.length = al + bl;
	}
*/
	// handler要引用参数s，不能移到外部
	function getHandler(s){
		s = s.valueOf();
		return function(e){
			var events = this.__events__;
			var handlers = events && events[e.type];
			if(handlers) {
				handlers = handlers[s] && handlers[s]._delegates_;
				if(!handlers || !handlers.length) return ;
			}
			var element = e.target;
			// if only we have a magic method like this: parent.matchSelector(element, s) ...
			var targets = $(this).find(s).toArray();	// note: it's live !

			// simple optimize
			var tagName = /^\w+(?=[^\s]*$)/.exec(s);
			if(tagName){
				tagName = tagName[0].toUpperCase();
				while(element && element.tagName !== tagName){
					element = element.parentNode;
				}
			}

			// note: an element's parentNode will be null if it's removed directly from the DOM tree.
			while(element && element !== this){
				if(targets.indexOf(element) != -1) {
					for(var i=0,l=handlers.length; i<l; i++){
						handlers[i](e, element);
					}
					break;
				}
				element = element.parentNode;
			}
		};
	};


	E.prototype = $.fn = $.prototype = {

		constructor: $,
		length: 0,
		push: [].push,
		sort: [].sort,
		splice: [].splice,

		chain: function(o){
			var next = $(o);
			/*(next instanceof $) && */(next.__prev__ = this);
			return next;
		},

		attr: function(k, v) {
			var type = typeof k;
			var list;
			if(type == 'string') {
				if(v !== undefined) {	// set
					this.each(function() {
						this.setAttribute(k, v);
					});
				} else {	// get
					list = [];
					this.each(function() {
						list.push(this.getAttribute(k));
					});
					return list.length === 1 ? list[0] : list;
				}
			} else if(type == 'object') {	// batch set
				this.each(function() {
					for(var i in k) {
						this.setAttribute(i, k[i]);
					}
				});
			}
			return this;
		},

		css: function (k, v) {
			var type = typeof k;
			if(type == 'string') {
				if(v !== undefined) {	// set
					this.each(function() {
						this.style[k] = v;
					});
				} else {	// get (only first)
					if(doc.defaultView) {
						var style = doc.defaultView.getComputedStyle(this[0], null);
						return style ? (k in style ? style[ k ] : style.getPropertyValue( k )) : null;
					} else {
						return /*this[0].style[k] || */this[0].currentStyle[k];
					}
				}
			} else if(type == 'object') {	// batch set
				this.each(function() {
					for(var i in k) {
						this.style[i] = k[i];
					}
				});
			}
			return this;
		},

		// SF: X Y , X>Y, X+Y, X~Y 的区别？
		/* immediate child nodes */
		children: function(selector) {
			var _$ = this.chain();
			var list = [];

			this.each(function() {
				for(var n = this.firstChild; n; n=n.nextSibling) {
					if(n.nodeType === 1) {
						list.push(n);
					}
				}
			});
			_push.apply(_$, list);

			return (typeof selector !== "string") ? _$ : this.chain(_$.filter(selector));
		},

		each: function(fn) {
			for (var i=0,l=this.length; i<l; i++) {
				fn.call(this[i], i);
			}
			return this;
		},

		/* search in all child nodes */
		/*
		* querySelectorAll(":first-child") ?
		* querySelectorAll中可以使用调用元素自身的选择器！(但必须是class或id，不能是tagName)
		*/
		find: function(selector) {
			var _$ = this.chain();
			
			this.each(function() {
				var list = this.querySelectorAll(selector || '*');
				_push.apply(_$, list);
			});
			return _$;
		},

		/**
		* filter the result.
		* @param sf: a selector or a function
		* eg. `div[title] [id]` (wrong) `div[title][id]` (yes)
		*/
		filter: function(sf) {
			var _$ = this.chain();
			var list = [];
			var elements = [];

			if(typeof sf === "function") {
				this.each(function(i) {
					sf.call(this, i) && list.push(this);
				});
			} else if(typeof sf === "string"){
				_push.apply(elements, doc.querySelectorAll(sf));
				this.each(function() {
					elements.indexOf(this) >=0 && list.push(this);
				});
			}
			_push.apply(_$, list);
			return _$;
		},

		// not jQuery style
		map: function(fn) {
			var list = [];
			for (var i=0,l=this.length; i<l; i++) {
				list.push(fn.call(this[i], i));
			}
			return list;
		},

		/**
		* 将DOM节点追加到当前的每个元素内
		*/// todo:
		append: function(selector) {
			var target = $(selector);
			var len = this.length;
			var i, j, l;

			for (j=0, l=target.length; j<l; j++) {
				for (i=0; i<len; i++) {
					this[i].appendChild(target[j]);
				}
			}
			return this;
		},

		appendTo: function(selector) {
			var parent = $(selector)[0];
			if(parent && parent.nodeType) {
				for (var i=0,l=this.length; i<l; i++) {
					parent.appendChild(this[i]);	// no Exception care
				}
			}
			return this;
		},

		prependTo: function(selector) {
			var parent = $(selector)[0];
			if(parent && parent.nodeType) {
				for (var i=0,l=this.length; i<l; i++) {
					parent.insertBefore(this[i], parent.firstChild);
				}
			}
			return this;
		},

		// remove matched elements from DOM, not current collection
		remove: function(selector) {
			if(!selector) {
				this.each(function() {
					var p = this.parentNode;
					p && p.removeChild(this);
				});
			} else if(typeof selector == "string") {
				this.each(function() {
					var node = this.parentNode;
					if(! node) return ;
					var list = node.querySelectorAll(selector);
					for(var i=0,l=list.length; i<l; i++) {
						this == list[i] && node.removeChild(list[i]);
					}
				});
			}
			return this;
		},

		html: function(val) {
			if(val == undefined) {
				return this.map(function(){
					return this.innerHTML;
				});
			} else {
				return this.each(typeof val === "function" ? function(i) {
					this.innerHTML = val.call(this, i);
				} : function() {
					this.innerHTML = val;
				});
			}
		},

		closest: function(tagName){

			var _$ = this.chain(), list = [];
			tagName = String(tagName).toUpperCase();

			this.each(function(){
				var e = this;
				while(e && e.tagName != tagName){
					e = e.parentNode;
				}
				e && list.push(e);
			});

			_push.apply(_$, list);
			return _$;
		},

		parent: function(selector){

			var _$ = this.chain(), list = [], e = [];
			var filter = String(selector);

			if(filter) {
				_push.apply(e, doc.querySelectorAll(selector));
			}
			this.each(filter ? function(i) {
				var p = this.parentNode;
				e.indexOf(p) != -1 && list.push(p);
			} : function(){
				var p = this.parentNode;
				p && list.push(p);
			});

			_push.apply(_$, list);
			return _$;
		},
/*
		parent: function(selector){
			var _$, list = [];

			if(typeof selector != "string") {
				_$ = this.chain();
				this.each(function(){
					var p = this.parentNode;
					p && list.push(p);
				});
				_push.apply(_$, list);
				return _$;
			}

			_push.apply(list, doc.querySelectorAll(selector));

			return this.chain(this.filter(function(){
				return list.indexOf(this.parentNode) != -1;
			}).parent());
		},
*/
		parents: function(selector){

			var list = [], _$ = this.chain();

			if(typeof selector == "string") {
				//SF: concerning performance, any better alternatives ?
				_push.apply(list, doc.querySelectorAll(selector));
				this.each(function() {
					for(var i=0,l=list.length; i<l; i++){
						if($.contains(list[i], this)) _$.push(list[i]);	// use push directly ?!
					}
				});
			} else {
				this.each(function(){
					var element = this;
					while(element = element.parentNode){
						list.push(element);
					}
				});
				_push.apply(_$, list);
			}
			return _$;
		},

		addClass: function(v) {

			if(!v || typeof v != "string") {
				return this;
			}
			
			v = v.split(rews);
			
			this.each(doc.body.classList ? function() {
				for(var i=0,l=v.length; i<l; i++) {
					this.classList.add(v[i]);
				}
			} : function() {
				if(!this.className) {
					this.className = v.join(" ");
				} else {
					var c = ' ' + this.className + ' ';
					for(var i=0,l=v.length; i<l; i++) {
						if(!~c.indexOf(' '+v[i]+' ')) {
							c += v[i] + ' ';
						}
					}
					this.className = c.trim();	// note: trim not supported in IE8
				}
			});

			return this;
		},

		removeClass: function(v) {

			if(arguments.length === 0) {
				this.each(function() {
					this.className = "";
				});
			}

			if(typeof v != "string") {
				return this;
			}

			v = v.split(rews);

			this.each(doc.body.classList ? function() {
				for(var i=0, l=v.length; i<l; i++) {
					this.classList.remove(v[i]);
				}
			} : function() {
				if(this.className) {
					var c = (" " + this.className + " ").replace(rews, " ");
					for(var i=0, l=v.length; i<l; i++) {
						while(c.indexOf(" "+v[i]+" ") > -1) {
							c = c.replace(" "+v[i]+" ", " ");
						}
					}
					this.className = v ? c.trim() : "";
				}
			});

			return this;
		},

		hasClass: function(v) {

			if(typeof v != "string") {
				return false;
			}
			var c = (" " + this.map(function(){
				return this.className;
			}).join(" ") + " ").replace(rews, " ");

			v = v.split(rews);
			for(var i=0, l=v.length; i<l; i++) {
				if(c.indexOf(" "+v[i]+" ") === -1) {
					return false;
				}
			}
			return true;
		},

		toggleClass: function(a, b, aTob){
			var len = arguments.length;
			if(len == 1) {
				this.hasClass(a) ? this.removeClass(a) : this.addClass(a);
			} else if(len > 1) {
				if(aTob || len==2 && this.hasClass(a)) {
					this.removeClass(a).addClass(b);
				} else {
					this.removeClass(b).addClass(a);
				}
			}
			return this;
		},

		on: function(e, fn) {
			if(typeof e == 'object') {
				for(var i in e) {
					this.on(i, e[i]);
				}
			} else if(typeof e == 'string' && typeof fn == 'function') {
				e = e.trim().split(rews);

				this.each(function() {
					var events = this.__events__ || (this.__events__ = {});
					var handlers;
					for(var i=0,l=e.length; i<l; i++) {
						handlers = events[e[i]] || (events[e[i]] = {});
						if(handlers["**"] === undefined)	{
							handlers["**"] = [];
						}
						this.addEventListener(e[i], fn, false);
						handlers["**"].push(fn);
					}
				});
			}
			return this;
		},

		once: function(e, s, f){
			var self = this;
			var once;
			if(typeof f === "function"){
				once = function(){
					self.off(e, s, once);
					//f.apply(this, arguments);
					f(arguments);
				};
				return this.delegate(e, s, once);
			} else if(typeof s === "function"){
				once = function(){
					self.off(e, once);
					//f.apply(this, arguments);
					s(arguments);
				};
				return this.on(e, once);
			}
			return this;
		},

		/*
		* "click"
		* "click", fn
		* "click", ".li"
		* "click", ".li", fn
		*/
		off: function(e, s, f) {
			if(typeof e == 'object') {
				for(var i in e) {
					this.off(i, e[i]);
				}
				return this;
			}

			if(typeof e == 'string') {
				e = e.trim().split(rews);
			}

			this.each(function() {
				var i, k, l, hl, key, handler, handlers;
				var events = this.__events__;
				if(!events) return ;

				switch(typeof s)
				{
				case 'function':
					for(i=0,l=e.length; i<l; i++) {
						key = e[i];
						handlers = events[key] && events[key]["**"];
						if(!handlers || !handlers.length) continue;

						for(k=0,hl=handlers.length; k<hl; k++) {
							if(s === handlers[k]){
								this.removeEventListener(key, s, false);
								handlers.splice(k, 1);
								// 有可能重复添加同一handler（但addEventListener多次添加同一个函数处理不会多次触发），所以没有break
							}
						}
					}
					break;
				case 'undefined':
					for(i=0,l=e.length; i<l; i++) {
						key = e[i];
						handler = events[key];

						handlers = [];
						for(k in handler) {
							if(handler.hasOwnProperty(k) === false) continue;
							if(k === "**") {
								handlers = handlers.concat(handler[k]);
							} else {
								handlers.push(handler);
							}
							console.log("remove listener: " + key + "_" + k);
						}
						for(k=0,l=handlers.length; k<l; k++) {
							this.removeEventListener(key, handlers[k], false);
						}
						delete events[key];
					}
					break;
				case 'string':
					for(i=0,l=e.length; i<l; i++) {
						key = e[i];
						handler = events[key] && events[key][s];
						if(!handler || !handler._delegates_) continue;
						var handlers = handler._delegates_;
						if(typeof f === 'function') {
							for(k=0,hl=handlers.length; k<hl; k++) {
								if(f === handlers[k]) {
									handlers.splice(k, 1);
								}
							}
							handlers.length === 0 && (delete events[key][s]);
						} else {
							this.removeEventListener(key, handler, false);
							console.log("remove listener: " + key + "_" + s);
							delete events[key][s];	// delete不能传引用(`delete handler` is not OK)
						}
					}
					break;
				}
			});
			return this;
		},
		/* 
		* problem :
		* No guarantee of order as the bubble principle, putting aside the fact that you have 
		* no trustable way to imitate the `stopPropagation()` method in a delegated handler,
		* because these handlers are bound to the same parent element and the event is already
		* bubbled to the target element before you called the handler. (oh I'm crazy...)
		* In a rare case you may need only the first triggered event handler, then the method 
		* `stopImmediatePropagation()` may help, but note that this is a API of DOM-Level-3. 
		*
		* Maybe the only way is to use a self-defined event object by the rule of W3C, that's just what jQuery did.
		*/
		// or `live` ?
		delegate: function(e, s, fn) {
			if(typeof e === 'string' && typeof fn === 'function') {
				e = e.trim().split(rews);

				this.each(function() {
					var key, handler, handlers;
					var events = this.__events__ || (this.__events__ = {});
					for(var i=0,l=e.length; i<l; i++) {
						key = e[i];
						handlers = events[key] || (events[key] = {});
						handler = handlers[s] || (handlers[s] = getHandler(s));
						if(handler._delegates_ === undefined) {
							handler._delegates_ = [];	// 代理的处理事件集
							this.addEventListener(key, handler, false);
						}
						handler._delegates_.push(fn);
						console.log("delegate listener: " + key+"_"+s);
					}
				});
			}
			return this;
		},

		// 弱爆，兼容问题？
		// SF: 如果连续trigger("click"),会不会转化为dblclick？
		trigger: function(e) {
			var map = {
				"HTMLEvents": "abort blur change error focus load reset resize scroll select submit unload",
				"UIEevents": "keydown keypress keyup",
				"MouseEvents": "click dblclick mousedown mousemove mouseout mouseover mouseup"
			};
			var eventType = "MutationEvent";
			for(var i in map){
				if(map[i].indexOf(e) >= 0) eventType = i;
			}
			this.each(function(){
				var ev = doc.createEvent(eventType);
				ev.initEvent(e, true, true);
				this.dispatchEvent(ev);
			});
		},

		// no css-hooks for the `css(k, v)` method, so we provide some shortcuts
		width: function() {
			return ( parseFloat(this.css("width")) || (this[0] || {}).offsetWidth );
		},

		height: function() {
			return ( parseFloat(this.css("height")) || (this[0] || {}).offsetHeight );
		},

		show: function(disp) {	// note: avoid odd behavior like `show("none")`
			typeof disp != "string" && (disp = "");
			return this.each(function() {this.style.display = disp;});
		},

		hide: function() {
			return this.each(function() {this.style.display = "none";});
		},

		empty: function() {
			return this.each(function() {this.textContent = "";});
		},

		get: function(i) {
			return (i = i | 0) < 0 ? this[this.length + i] : this[i];
		},

		eq: function(i) {
			return this.chain( this.get(i) );
		},

		end: function() {
			return this.__prev__ || this.constructor();
		},

		// release the chain (if too long or contains too many elements) so as to save some memory.
		isolate: function() {
			delete this.__prev__;
			return this;
		},

		toArray: function(){
			var ary;
			return _push.apply(ary = [], this), ary;
		}
	};

	$.get = function(id) {
		return typeof id === "string" ? doc.getElementById(id) : id;
	};

	$.contains = function(nodeA, nodeB) {
		return 0 !== (nodeA.compareDocumentPosition(nodeB) & 0xF0);
	};

	$.mixin = function(o) {
		/*
		Object.keys(o).forEach(function(key){$.fn[key] = o[key]});
		*/
		for (var p in o) {
			o.hasOwnProperty(p) && ($.fn[p] = o[p]);
		}
	};

	global.$ = $;

})(this);
