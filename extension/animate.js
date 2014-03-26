
var tween = {
	easeOutQuad: function(t, b, c, d){
		return - c * (t /= d) * (t - 2) + b;
	},
	sineInOut: function(t, b, c, d) {
		return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
	},
	sineIn: function(t, b, c, d) {
		return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
	},
	sineOut: function(t, b, c, d) {
		return c * Math.sin(t/d * (Math.PI/2)) + b;
	}
}

$.mixin({

	_init: function(p){
		var i, j = 0, b, m, s = [[],[],[],[]], re = /^([+\-]=)?([+\-]?[\d.]+)([a-z%]*)$/i ;
		if(this[0]._rs != 4) this[0]._rs = 0;
		for(i in p) {
			b = parseFloat(this.css(i)) || 0;
			m = null;
			if(isNaN(p[i])){
				m = p[i].match(re);

				if(m == null){
					this[0].style[i] = p[i];
					continue;
				}
				if(!m[1]&&b==m[2] || m[1]&&m[2]==0){
					continue;
				}
			} else if(b==p[i]){
				continue;
			}

			s[0][j] = i;
			s[1][j] = b;
			if(m != null) {
				s[2][j] = m[1] ? parseFloat(m[1]=='+=' ? m[2] : -m[2]) : (parseFloat(m[2]) - s[1][j]);
				s[3][j] = m[3];
				m = null;	// note !
			} else {
				s[2][j] = parseFloat(p[i]) - s[1][j];
				s[3][j] = '';
			}
			j++;
		}
		return s;
	},

	rollback: function(urgent){
		var e = this[0], text = {}, p = e._data;
		if(!p) return ;
		e._rollback = true;
		if(urgent || e._rs == 3){
			clearInterval(e._timer);
			e._rs = 4;
			for(var i=0,len=p[0].length; i<len; i++){
				text[p[0][i]] = p[1][i] + p[3][i];
			}
			e._rollback = false;
			this._go(text, e._time, null, e.delay);
		}
	},

	stop: function(clearQueue, gotoEnd){
		var e = this[0], state = e._rs;
		if(state == 4) return this;
		if(clearQueue){
			e.delay = 0;
			if(state == 0) e._rs = 3;
			else if(state == 1) {
				clearInterval(e._timer);
				e._rs = 3;
			}
			delete e.queue;	// not [] !
			console.log(e.queue);
		}

		if(state == 1) {
			e._delaying = 0;
		} else if(state==2) {
			clearInterval(e._timer);

			if(gotoEnd){
				this._end();
			} else {
				e._rs = 3;
			}
			clearQueue || this._go.apply(this, e.queue.shift());	// !!!Can not call 'shift' of undefined !!!
		}

		return this;
	},

	_end: function(){
		var e = this[0], prop = e._data, text = "";
		if(!prop) {console.error("ERROR: _data is null");return ;}
		for(var i=0,len=prop[0].length; i<len; i++){
			text += prop[0][i] + ':' + (prop[1][i] + prop[2][i]) + prop[3][i] + ';';
		}
		e.style.cssText += text;
		if(e._rollback){
			this.rollback(true);
		} else {
			e._rs = 3;
		}
		if(e._callback) {
			e._callback.call(e);
			delete e._callback;
		}
		else{
			delete e._data;
		}
	},

	_go: function(styles, time, fn, delay){
		var self = this, e = this[0], p, start, len;
		if(!styles || e._rs < 3) {
			return ;
		}
		e._data = this._init(styles);
		e._time = time;
		e._callback = fn;
		e._delaying = delay;

		start = +new Date, p = e._data, len = p[0].length;
		function await(){
			if(+new Date - start < e._delaying) return requestAnimationFrame(await);
			//e._delaying = 0;	// added @2013-8-25
			start = +new Date;
			function doIt(){
				var i, d = +new Date - start, text = '';
				if (d > time){
					d = time;
					self._end();
					if(e._rs==3) self._go.apply(self, e.queue.shift());
					return ;
				}
				for(i=0; i<len; i++){
					text += p[0][i] + ':' + tween['easeOutQuad'](d, p[1][i], p[2][i], time) + p[3][i] + ';';
				}
				e.style.cssText += text;
				requestAnimationFrame(doIt);
			}
			requestAnimationFrame(doIt);
			if(e._rs != 4) e._rs = 2;
		}
		requestAnimationFrame(await);
		// todo: 不要使用setInterval, 耗时过长可能导致栈堆积
		// http://bonsaiden.github.io/JavaScript-Garden/zh/#other.timeouts

		if(e._rs != 4) e._rs = 1;
	},

	delay: function(time){
		this[0].delay = Math.max(parseInt(time), 0) || 0;
		return this;
	},

	animate: function(styles, dur, fn){
		var time = (isNaN(dur) ? {fast:200, normal:400, slow:600}[dur] : parseInt(dur)) || 400;
		var e = this[0];
		if(!e.queue) {
			e.queue = [];
			e._rs = 3;
		}

		if(e._rs == 3 && e.queue.length == 0) {
			this._go(styles, time, fn, e.delay || 0, false);
		} else {
			e.queue.push([styles, time, fn, e.delay]);
		}
		e.delay = 0;
		return this;
	}
	/* _rs: [0: INITIALIZING, 1: DELAYING, 2: RUNNING, 3: ENDED, 4: ROLLINGBACK] */
});
