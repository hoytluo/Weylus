var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
    LogLevel[LogLevel["TRACE"] = 4] = "TRACE";
})(LogLevel || (LogLevel = {}));
var log_pre;
var log_level = LogLevel.ERROR;
var no_log_messages = true;
var fps_out;
var frame_count = 0;
var last_fps_calc = performance.now();
var check_video;
function run(access_code, websocket_port, level) {
    window.onload = function () {
        log_pre = document.getElementById("log");
        log_pre.textContent = "";
        log_level = LogLevel[level];
        fps_out = document.getElementById("fps");
        check_video = document.getElementById("enable_video");
        window.addEventListener("error", function (e) {
            if (e.error) {
                var err = e;
                log(LogLevel.ERROR, err.filename + ":L" + err.lineno + ":" + err.colno + ": " + err.message + " Error object: " + JSON.stringify(err.error));
            }
            else if (e.target) {
                var ev = e;
                var src = e.target.src;
                if (ev.target instanceof HTMLVideoElement)
                    log(LogLevel.ERROR, "Failed to decode video, try reducing resolution or disabling hardware acceleration and reload the page. Error src: " + src);
                else
                    log(LogLevel.ERROR, "Failed to obtain resource, target: " + ev.target + " type: " + ev.type + " src: " + src + " Error object: " + JSON.stringify(ev));
            }
            else {
                log(LogLevel.WARN, "Got unknown event: " + JSON.stringify(e));
            }
            return false;
        }, true);
        init(access_code, websocket_port);
    };
}
function log(level, msg) {
    if (level > log_level)
        return;
    if (no_log_messages) {
        no_log_messages = false;
        document.getElementById("log_section").classList.remove("hide");
    }
    log_pre.textContent += LogLevel[level] + ": " + msg + "\n";
}
function frame_update_scale(x) {
    return Math.pow(x / 100, 3);
}
function frame_update_scale_inv(x) {
    return 100 * Math.pow(x, 1 / 3);
}
function calc_max_video_resolution(scale) {
    return [
        Math.round(scale * window.innerWidth * window.devicePixelRatio),
        Math.round(scale * window.innerHeight * window.devicePixelRatio)
    ];
}
function fresh_canvas() {
    var canvas_old = document.getElementById("canvas");
    var canvas = document.createElement("canvas");
    canvas.id = canvas_old.id;
    canvas_old.classList.forEach(function (cls) { return canvas.classList.add(cls); });
    canvas_old.replaceWith(canvas);
    return canvas;
}
function toggle_energysaving(energysaving) {
    var canvas = fresh_canvas();
    if (energysaving) {
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (settings) {
        if (energysaving) {
            settings.checks.get("enable_video").checked = false;
            settings.checks.get("enable_video").disabled = true;
            settings.checks.get("enable_video").dispatchEvent(new Event("change"));
        }
        else
            settings.checks.get("enable_video").disabled = false;
        new PointerHandler(settings.webSocket);
    }
}
var Settings = /** @class */ (function () {
    function Settings(webSocket) {
        var _this = this;
        this.webSocket = webSocket;
        this.checks = new Map();
        this.capturable_select = document.getElementById("window");
        this.frame_update_limit_input = document.getElementById("frame_update_limit");
        this.frame_update_limit_input.min = frame_update_scale_inv(1).toString();
        this.frame_update_limit_input.max = frame_update_scale_inv(1000).toString();
        this.frame_update_limit_output = this.frame_update_limit_input.nextElementSibling;
        this.scale_video_input = document.getElementById("scale_video");
        this.scale_video_output = this.scale_video_input.nextElementSibling;
        this.range_min_pressure = document.getElementById("min_pressure");
        this.client_name_input = document.getElementById("client_name");
        this.frame_update_limit_input.oninput = function (e) {
            _this.frame_update_limit_output.value = Math.round(frame_update_scale(_this.frame_update_limit_input.valueAsNumber)).toString();
        };
        this.scale_video_input.oninput = function (e) {
            var _a = calc_max_video_resolution(_this.scale_video_input.valueAsNumber), w = _a[0], h = _a[1];
            _this.scale_video_output.value = w + "x" + h;
        };
        this.visible = true;
        // Settings UI
        this.settings = document.getElementById("settings");
        this.settings.onclick = function (e) { return e.stopPropagation(); };
        var handle = document.getElementById("handle");
        // Settings elements
        this.settings.querySelectorAll("input[type=checkbox]").forEach(function (elem, _key, _parent) { return _this.checks.set(elem.id, elem); });
        this.load_settings();
        // event handling
        // client only
        handle.onclick = function () { _this.toggle(); };
        this.checks.get("lefty").onchange = function (e) {
            if (e.target.checked)
                _this.settings.classList.add("lefty");
            else
                _this.settings.classList.remove("lefty");
            _this.save_settings();
        };
        document.getElementById("vanish").onclick = function () {
            _this.settings.classList.add("vanish");
        };
        this.checks.get("stretch").onchange = function (e) {
            stretch_video();
            _this.save_settings();
        };
        this.check_aggressive_seek = this.checks.get("aggressive_seeking");
        this.check_aggressive_seek.onchange = function (e) {
            _this.save_settings();
        };
        this.checks.get("enable_video").onchange = function (e) {
            document.getElementById("video").classList.toggle("vanish", !e.target.checked);
            document.getElementById("canvas").classList.toggle("vanish", e.target.checked);
            _this.save_settings();
        };
        var upd_pointer = function () {
            _this.save_settings();
            new PointerHandler(_this.webSocket);
        };
        this.checks.get("enable_mouse").onchange = upd_pointer;
        this.checks.get("enable_stylus").onchange = upd_pointer;
        this.checks.get("enable_touch").onchange = upd_pointer;
        this.checks.get("energysaving").onchange = function (e) {
            _this.save_settings();
            toggle_energysaving(e.target.checked);
        };
        this.frame_update_limit_input.onchange = function () { return _this.save_settings(); };
        this.range_min_pressure.onchange = function () { return _this.save_settings(); };
        // server
        var upd_server_config = function () { _this.save_settings(); _this.send_server_config(); };
        this.checks.get("uinput_support").onchange = upd_server_config;
        this.checks.get("capture_cursor").onchange = upd_server_config;
        this.scale_video_input.onchange = upd_server_config;
        this.client_name_input.onchange = upd_server_config;
        document.getElementById("refresh").onclick = function () { return _this.webSocket.send('"GetCapturableList"'); };
        this.capturable_select.onchange = function () { return _this.send_server_config(); };
    }
    Settings.prototype.send_server_config = function () {
        var config = new Object(null);
        config["capturable_id"] = Number(this.capturable_select.value);
        for (var _i = 0, _a = [
            "uinput_support",
            "capture_cursor"
        ]; _i < _a.length; _i++) {
            var key = _a[_i];
            config[key] = this.checks.get(key).checked;
        }
        var _b = calc_max_video_resolution(this.scale_video_input.valueAsNumber), w = _b[0], h = _b[1];
        config["max_width"] = w;
        config["max_height"] = h;
        if (this.client_name_input.value)
            config["client_name"] = this.client_name_input.value;
        this.webSocket.send(JSON.stringify({ "Config": config }));
    };
    Settings.prototype.save_settings = function () {
        var settings = Object(null);
        for (var _i = 0, _a = this.checks.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], elem = _b[1];
            settings[key] = elem.checked;
        }
        settings["frame_update_limit"] = frame_update_scale(this.frame_update_limit_input.valueAsNumber).toString();
        settings["scale_video"] = this.scale_video_input.value;
        settings["min_pressure"] = this.range_min_pressure.value;
        settings["client_name"] = this.client_name_input.value;
        localStorage.setItem("settings", JSON.stringify(settings));
    };
    Settings.prototype.load_settings = function () {
        var settings_string = localStorage.getItem("settings");
        if (settings_string === null) {
            this.frame_update_limit_input.value = frame_update_scale_inv(33).toString();
            this.frame_update_limit_output.value = (33).toString();
            var _a = calc_max_video_resolution(this.scale_video_input.valueAsNumber), w = _a[0], h = _a[1];
            this.scale_video_output.value = w + "x" + h;
            return;
        }
        try {
            var settings_1 = JSON.parse(settings_string);
            for (var _i = 0, _b = this.checks.entries(); _i < _b.length; _i++) {
                var _c = _b[_i], key = _c[0], elem = _c[1];
                if (typeof settings_1[key] === "boolean")
                    elem.checked = settings_1[key];
            }
            var upd_limit = settings_1["frame_update_limit"];
            if (upd_limit)
                this.frame_update_limit_input.value = frame_update_scale_inv(upd_limit).toString();
            else
                this.frame_update_limit_input.value = frame_update_scale_inv(33).toString();
            this.frame_update_limit_output.value = Math.round(frame_update_scale(this.frame_update_limit_input.valueAsNumber)).toString();
            var scale_video = settings_1["scale_video"];
            if (scale_video)
                this.scale_video_input.value = scale_video;
            var _d = calc_max_video_resolution(this.scale_video_input.valueAsNumber), w = _d[0], h = _d[1];
            this.scale_video_output.value = w + "x" + h;
            var min_pressure = settings_1["min_pressure"];
            if (min_pressure)
                this.range_min_pressure.value = min_pressure;
            if (this.checks.get("lefty").checked) {
                this.settings.classList.add("lefty");
            }
            if (!this.checks.get("enable_video").checked || this.checks.get("energysaving").checked) {
                this.checks.get("enable_video").checked = false;
                if (this.checks.get("energysaving").checked)
                    this.checks.get("enable_video").disabled = true;
                document.getElementById("video").classList.add("vanish");
                document.getElementById("canvas").classList.remove("vanish");
            }
            if (this.checks.get("energysaving").checked) {
                toggle_energysaving(true);
            }
            var client_name = settings_1["client_name"];
            if (client_name)
                this.client_name_input.value = client_name;
        }
        catch (_e) {
            log(LogLevel.DEBUG, "Failed to load settings.");
            return;
        }
    };
    Settings.prototype.stretched_video = function () {
        return this.checks.get("stretch").checked;
    };
    Settings.prototype.pointer_types = function () {
        var ptrs = [];
        if (this.checks.get("enable_mouse").checked)
            ptrs.push("mouse");
        if (this.checks.get("enable_stylus").checked)
            ptrs.push("pen");
        if (this.checks.get("enable_touch").checked)
            ptrs.push("touch");
        return ptrs;
    };
    Settings.prototype.frame_update_limit = function () {
        return frame_update_scale(this.frame_update_limit_input.valueAsNumber);
    };
    Settings.prototype.toggle = function () {
        this.settings.classList.toggle("hide");
        this.visible = !this.visible;
    };
    Settings.prototype.onCapturableList = function (window_names) {
        var _this = this;
        var current_selection = undefined;
        if (this.capturable_select.selectedOptions[0])
            current_selection = this.capturable_select.selectedOptions[0].textContent;
        var new_index;
        this.capturable_select.innerText = "";
        window_names.forEach(function (name, i) {
            var option = document.createElement("option");
            option.value = String(i);
            option.innerText = name;
            _this.capturable_select.appendChild(option);
            if (name === current_selection)
                new_index = i;
        });
        if (new_index !== undefined)
            this.capturable_select.value = String(new_index);
        else if (current_selection)
            // Can't find the window, so don't select anything
            this.capturable_select.value = "";
    };
    return Settings;
}());
var settings;
var PEvent = /** @class */ (function () {
    function PEvent(eventType, event, target) {
        var targetRect = target.getBoundingClientRect();
        var diag_len = Math.sqrt(targetRect.width * targetRect.width + targetRect.height * targetRect.height);
        this.event_type = eventType.toString();
        this.pointer_id = event.pointerId;
        this.timestamp = Math.round(event.timeStamp * 1000);
        this.is_primary = event.isPrimary;
        this.pointer_type = event.pointerType;
        var btn = event.button;
        // for some reason the secondary and auxiliary buttons are ordered differently for
        // the button and buttons properties
        if (btn == 2)
            btn = 1;
        else if (btn == 1)
            btn = 2;
        this.button = (btn < 0 ? 0 : 1 << btn);
        this.buttons = event.buttons;
        this.x = (event.clientX - targetRect.left) / targetRect.width;
        this.y = (event.clientY - targetRect.top) / targetRect.height;
        this.movement_x = event.movementX ? event.movementX : 0;
        this.movement_y = event.movementY ? event.movementY : 0;
        this.pressure = Math.max(event.pressure, settings.range_min_pressure.valueAsNumber);
        this.tilt_x = event.tiltX;
        this.tilt_y = event.tiltY;
        this.width = event.width / diag_len;
        this.height = event.height / diag_len;
        this.twist = event.twist;
    }
    return PEvent;
}());
var WEvent = /** @class */ (function () {
    function WEvent(event) {
        /* The WheelEvent can have different scrolling modes that affect how much scrolling
         * should be done. Unfortunately there is not always a way to accurately convert the scroll
         * distance into pixels. Thus the following is a guesstimate and scales the WheelEvent's
         * deltaX/Y values accordingly.
         */
        var scale = 1;
        switch (event.deltaMode) {
            case 0x01: // DOM_DELTA_LINE
                scale = 10;
                break;
            case 0x02: // DOM_DELTA_PAGE
                scale = 1000;
                break;
            default: // DOM_DELTA_PIXEL
        }
        this.dx = Math.round(scale * event.deltaX);
        this.dy = Math.round(scale * event.deltaY);
        this.timestamp = Math.round(event.timeStamp * 1000);
    }
    return WEvent;
}());
// in milliseconds
var fade_time = 5000;
var vs_source = "\n  attribute vec3 aVertex;\n  uniform float uTime;\n  varying lowp vec4 vColor;\n\n  void main() {\n    float dt = uTime - aVertex[2];\n    gl_Position = vec4(aVertex[0], aVertex[1], 1.0, 1.0);\n    vColor = vec4(0.0, 170.0/255.0, 1.0, 1.0) * max(1.0 - dt/" + fade_time + ".0, 0.0);\n  }\n";
var fs_source = "\n  varying lowp vec4 vColor;\n\n  void main() {\n    gl_FragColor = vColor;\n  }\n";
var Painter = /** @class */ (function () {
    function Painter(canvas) {
        this.canvas = canvas;
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        this.gl = canvas.getContext("webgl");
        if (this.gl) {
            this.lines_active = new Map();
            this.lines_old = [];
            this.setupWebGL();
        }
    }
    Painter.prototype.loadShader = function (type, source) {
        var gl = this.gl;
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            log(LogLevel.WARN, "Failed to compile shaders: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    };
    Painter.prototype.setupWebGL = function () {
        var _this = this;
        var gl = this.gl;
        gl.enable(gl.BLEND);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        var vertex_shader = this.loadShader(gl.VERTEX_SHADER, vs_source);
        var fragment_shader = this.loadShader(gl.FRAGMENT_SHADER, fs_source);
        if (!vertex_shader || !fragment_shader)
            return;
        var shader_program = gl.createProgram();
        gl.attachShader(shader_program, vertex_shader);
        gl.attachShader(shader_program, fragment_shader);
        gl.linkProgram(shader_program);
        if (!gl.getProgramParameter(shader_program, gl.LINK_STATUS)) {
            log(LogLevel.WARN, "Unable to initialize the shader program: " + gl.getProgramInfoLog(shader_program));
            return;
        }
        this.vertex_attr = gl.getAttribLocation(shader_program, "aVertex");
        this.time_attr = gl.getUniformLocation(shader_program, "uTime");
        this.vertex_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
        gl.vertexAttribPointer(this.vertex_attr, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.vertex_attr);
        gl.useProgram(shader_program);
        this.initialized = true;
        requestAnimationFrame(function () { return _this.render(); });
    };
    Painter.prototype.render = function () {
        var _this = this;
        // only do work if necessary
        if (!check_video.checked && (this.lines_active.size > 0 || this.lines_old.length > 0)) {
            if (this.lines_old.length > 0) {
                if (performance.now() - this.lines_old[0][this.lines_old[0].length - 1] > fade_time)
                    this.lines_old.shift();
            }
            var gl = this.gl;
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform1f(this.time_attr, performance.now());
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
            for (var _i = 0, _a = this.lines_old; _i < _a.length; _i++) {
                var vertices = _a[_i];
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length / 3);
            }
            for (var _b = 0, _c = this.lines_active.values(); _b < _c.length; _b++) {
                var _d = _c[_b], _ = _d[0], vertices = _d[1];
                // sometimes there are no linesegments because there has been only a single
                // PointerEvent
                if (vertices.length == 0)
                    continue;
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length / 3);
            }
        }
        requestAnimationFrame(function () { return _this.render(); });
    };
    Painter.prototype.appendEventToLine = function (event) {
        var line = this.lines_active.get(event.pointerId);
        if (!line) {
            line = [null, []];
            this.lines_active.set(event.pointerId, line);
        }
        var max_pixels = Math.max(this.canvas.width, this.canvas.height);
        var x = event.clientX * window.devicePixelRatio / this.canvas.width * 2 - 1;
        var y = 1 - event.clientY * window.devicePixelRatio / this.canvas.height * 2;
        var delta = event.pressure + 0.4;
        var t = performance.now();
        // to draw a line segment, there has to be some previous position
        if (line[0]) {
            var _a = line[0], x0 = _a[0], y0 = _a[1], delta0 = _a[2], t0 = _a[3];
            // get vector perpendicular to the linesegment to calculate quadrangel around the
            // segment with appropriate thickness
            var dx = (y - y0);
            var dy = -(x - x0);
            var dd = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
            if (dd == 0) {
                return;
            }
            dx = dx / dd * max_pixels / this.canvas.width * 0.004;
            dy = dy / dd * max_pixels / this.canvas.height * 0.004;
            if (line[1].length == 0)
                line[1].push(x0 + delta0 * dx, y0 + delta0 * dy, t0, x0 - delta0 * dx, y0 - delta0 * dy, t0);
            line[1].push(x + delta * dx, y + delta * dy, t, x - delta * dx, y - delta * dy, t);
        }
        line[0] = [x, y, delta, t];
    };
    Painter.prototype.onstart = function (event) {
        this.appendEventToLine(event);
    };
    Painter.prototype.onmove = function (event) {
        if (this.lines_active.has(event.pointerId))
            this.appendEventToLine(event);
    };
    Painter.prototype.onstop = function (event) {
        var lines = this.lines_active.get(event.pointerId);
        if (lines) {
            if (lines[1].length > 0)
                this.lines_old.push(lines[1]);
            this.lines_active["delete"](event.pointerId);
        }
    };
    return Painter;
}());
var PointerHandler = /** @class */ (function () {
    function PointerHandler(webSocket) {
        var _this = this;
        var video = document.getElementById("video");
        var canvas = document.getElementById("canvas");
        this.webSocket = webSocket;
        this.pointerTypes = settings.pointer_types();
        video.onpointerdown = function (e) { return _this.onEvent(e, "pointerdown"); };
        video.onpointerup = function (e) { return _this.onEvent(e, "pointerup"); };
        video.onpointercancel = function (e) { return _this.onEvent(e, "pointercancel"); };
        video.onpointermove = function (e) { return _this.onEvent(e, "pointermove"); };
        var painter;
        if (!settings.checks.get("energysaving").checked)
            painter = new Painter(canvas);
        if (painter && painter.initialized) {
            canvas.onpointerdown = function (e) { _this.onEvent(e, "pointerdown"); painter.onstart(e); };
            canvas.onpointerup = function (e) { _this.onEvent(e, "pointerup"); painter.onstop(e); };
            canvas.onpointercancel = function (e) { _this.onEvent(e, "pointercancel"); painter.onstop(e); };
            canvas.onpointermove = function (e) { _this.onEvent(e, "pointermove"); painter.onmove(e); };
        }
        else {
            canvas.onpointerdown = function (e) { return _this.onEvent(e, "pointerdown"); };
            canvas.onpointerup = function (e) { return _this.onEvent(e, "pointerup"); };
            canvas.onpointercancel = function (e) { return _this.onEvent(e, "pointercancel"); };
            canvas.onpointermove = function (e) { return _this.onEvent(e, "pointermove"); };
        }
        // This is a workaround for the following Safari/WebKit bug:
        // https://bugs.webkit.org/show_bug.cgi?id=217430
        // I have no idea why this works but it does.
        video.ontouchmove = function (e) { return e.preventDefault(); };
        canvas.ontouchmove = function (e) { return e.preventDefault(); };
        for (var _i = 0, _a = [video, canvas]; _i < _a.length; _i++) {
            var elem = _a[_i];
            elem.onwheel = function (e) {
                _this.webSocket.send(JSON.stringify({ "WheelEvent": new WEvent(e) }));
            };
        }
    }
    PointerHandler.prototype.onEvent = function (event, event_type) {
        if (this.pointerTypes.includes(event.pointerType)) {
            this.webSocket.send(JSON.stringify({
                "PointerEvent": new PEvent(event_type, event, event.target)
            }));
            if (settings.visible) {
                settings.toggle();
            }
        }
    };
    return PointerHandler;
}());
var KEvent = /** @class */ (function () {
    function KEvent(event_type, event) {
        this.event_type = event_type;
        this.code = event.code;
        this.key = event.key;
        this.location = event.location;
        this.alt = event.altKey;
        this.ctrl = event.ctrlKey;
        this.shift = event.shiftKey;
        this.meta = event.metaKey;
    }
    return KEvent;
}());
var KeyboardHandler = /** @class */ (function () {
    function KeyboardHandler(webSocket) {
        var _this = this;
        this.webSocket = webSocket;
        var m = document.getElementById("main");
        m.onkeydown = function (e) {
            if (e.repeat)
                return _this.onEvent(e, "repeat");
            return _this.onEvent(e, "down");
        };
        m.onkeyup = function (e) { return _this.onEvent(e, "up"); };
        m.onkeypress = function (e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };
    }
    KeyboardHandler.prototype.onEvent = function (event, event_type) {
        this.webSocket.send(JSON.stringify({ "KeyboardEvent": new KEvent(event_type, event) }));
        event.preventDefault();
        event.stopPropagation();
        return false;
    };
    return KeyboardHandler;
}());
function frame_timer(webSocket) {
    // Closing or closed, so no more frames
    if (webSocket.readyState > webSocket.OPEN)
        return;
    var t = performance.now();
    if (t - last_fps_calc > 1500) {
        var fps = Math.round(frame_count / (t - last_fps_calc) * 10000) / 10;
        fps_out.value = fps.toString();
        frame_count = 0;
        last_fps_calc = t;
    }
    if (document.hidden) {
        requestAnimationFrame(function () { return frame_timer(webSocket); });
        return;
    }
    if (webSocket.readyState === webSocket.OPEN && check_video.checked)
        webSocket.send('"TryGetFrame"');
    setTimeout(function () { return frame_timer(webSocket); }, settings.frame_update_limit());
}
function handle_messages(webSocket, video, onConfigOk, onConfigError, onCapturableList) {
    var mediaSource = null;
    var sourceBuffer = null;
    var queue = [];
    var MAX_BUFFER_LENGTH = 20; // In seconds
    function upd_buf() {
        if (sourceBuffer == null)
            return;
        if (!sourceBuffer.updating && queue.length > 0 && mediaSource.readyState == "open") {
            var buffer_length = 0;
            if (sourceBuffer.buffered.length) {
                // Assume only one time range...
                buffer_length = sourceBuffer.buffered.end(0) - sourceBuffer.buffered.start(0);
            }
            if (buffer_length > MAX_BUFFER_LENGTH) {
                sourceBuffer.remove(0, sourceBuffer.buffered.end(0) - MAX_BUFFER_LENGTH / 2);
                // This will trigger updateend when finished
            }
            else {
                try {
                    sourceBuffer.appendBuffer(queue.shift());
                }
                catch (err) {
                    log(LogLevel.DEBUG, "Error appending to sourceBuffer:" + err);
                    // Drop everything, and try to pick up the stream again
                    if (sourceBuffer.updating)
                        sourceBuffer.abort();
                    sourceBuffer.remove(0, Infinity);
                }
            }
        }
    }
    webSocket.onmessage = function (event) {
        if (typeof event.data == "string") {
            var msg = JSON.parse(event.data);
            if (typeof msg == "string") {
                if (msg == "NewVideo") {
                    mediaSource = new MediaSource();
                    sourceBuffer = null;
                    video.src = URL.createObjectURL(mediaSource);
                    mediaSource.addEventListener("sourceopen", function (_) {
                        var mimeType = 'video/mp4; codecs="avc1.4D403D"';
                        if (!MediaSource.isTypeSupported(mimeType))
                            mimeType = "video/mp4";
                        sourceBuffer = mediaSource.addSourceBuffer(mimeType);
                        sourceBuffer.addEventListener("updateend", upd_buf);
                        // try to recover from errors by restarting the video
                        if (sourceBuffer.onerror)
                            sourceBuffer.onerror = function () { return settings.send_server_config(); };
                    });
                }
                else if (msg == "ConfigOk") {
                    onConfigOk();
                }
            }
            else if (typeof msg == "object") {
                if ("CapturableList" in msg)
                    onCapturableList(msg["CapturableList"]);
                else if ("Error" in msg)
                    alert(msg["Error"]);
                else if ("ConfigError" in msg) {
                    onConfigError(msg["ConfigError"]);
                }
            }
            return;
        }
        // not a string -> got a video frame
        queue.push(event.data);
        upd_buf();
        frame_count += 1;
        // only seek if there is data available, some browsers choke otherwise
        if (video.seekable.length > 0) {
            var seek_time = video.seekable.end(video.seekable.length - 1);
            if (video.readyState >= (settings.check_aggressive_seek.checked ? 3 : 4)
                // but make sure to catch up if the video is more than 3 seconds behind
                || seek_time - video.currentTime > 3) {
                if (isFinite(seek_time))
                    video.currentTime = seek_time;
                else
                    log(LogLevel.WARN, "Failed to seek to end of video.");
            }
        }
    };
}
function check_apis() {
    var apis = {
        "MediaSource": "This browser doesn't support MSE required to playback video stream, try upgrading!",
        "PointerEvent": "This browser doesn't support PointerEvents, input will not work, try upgrading!"
    };
    for (var n in apis) {
        if (!(n in window)) {
            log(LogLevel.ERROR, apis[n]);
        }
    }
}
function init(access_code, websocket_port) {
    check_apis();
    var authed = false;
    var protocol = document.location.protocol == "https:" ? "wss://" : "ws://";
    var webSocket = new WebSocket(protocol + window.location.hostname + ":" + websocket_port);
    webSocket.binaryType = "arraybuffer";
    settings = new Settings(webSocket);
    var video = document.getElementById("video");
    var canvas = document.getElementById("canvas");
    video.oncontextmenu = function (event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    };
    var toggle_fullscreen_btn = document.getElementById("fullscreen");
    if (document.exitFullscreen) {
        toggle_fullscreen_btn.onclick = function () {
            if (!document.fullscreenElement)
                document.body.requestFullscreen({ navigationUI: "hide" });
            else
                document.exitFullscreen();
        };
    }
    else {
        // if document.exitFullscreen is not present we are probably running on iOS/iPadOS.
        // As input is broken in fullscreen mode on these, do not offer fullscreen in the first
        // place.
        toggle_fullscreen_btn.parentElement.removeChild(toggle_fullscreen_btn);
    }
    var handle_disconnect = function (msg) {
        document.body.onclick = video.onclick = function (e) {
            e.stopPropagation();
            if (window.confirm(msg + " Reload page?"))
                location.reload();
        };
    };
    webSocket.onerror = function () { return handle_disconnect("Lost connection."); };
    webSocket.onclose = function () { return handle_disconnect("Connection closed."); };
    window.onresize = function () {
        stretch_video();
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        var _a = calc_max_video_resolution(settings.scale_video_input.valueAsNumber), w = _a[0], h = _a[1];
        settings.scale_video_output.value = w + "x" + h;
        if (authed)
            settings.send_server_config();
    };
    video.controls = false;
    video.onloadeddata = function () { return stretch_video(); };
    var is_connected = false;
    handle_messages(webSocket, video, function () {
        if (!is_connected) {
            new KeyboardHandler(webSocket);
            new PointerHandler(webSocket);
            frame_timer(webSocket);
            is_connected = true;
        }
    }, function (err) { return alert(err); }, function (window_names) { return settings.onCapturableList(window_names); });
    window.onunload = function () { webSocket.close(); };
    webSocket.onopen = function (event) {
        if (access_code)
            webSocket.send(access_code);
        authed = true;
        webSocket.send('"GetCapturableList"');
        settings.send_server_config();
    };
}
// object-fit: fill; <-- this is unfortunately not supported on iOS, so we use the following
// workaround
function stretch_video() {
    var video = document.getElementById("video");
    if (settings.stretched_video()) {
        video.style.transform = "scaleX(" + document.body.clientWidth / video.clientWidth + ") scaleY(" + document.body.clientHeight / video.clientHeight + ")";
    }
    else {
        var scale = Math.min(document.body.clientWidth / video.clientWidth, document.body.clientHeight / video.clientHeight);
        video.style.transform = "scale(" + scale + ")";
    }
}
