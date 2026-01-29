function SkyportEngine() {
    var e, r = 9001;
    debug ? e = "connect.devskyport.com" : "1a" === sys_platform ? e = "connect.skyport.io" : (e = "connectcl.skyport.io", r = 9002);
    var a = fwId.brand + fwId.model + fwVer.toFixed(2),
        t = settingsJSON.tModelNum,
        n = !1,
        o = 5,
        c = 0,
        s = "/home/volatile/skyport_root.pem",
        i = "/home/secure/skyport_public.pem",
        u = "/home/secure/skyport_private.pem",
        d = new Timer(210);
    d.setCallback("reconCheck");
    var l, m, E, S, f, O = {
            DISCONNECTED: 0,
            LOGIN: 1,
            COMMISSIONING: 2,
            READY: 3,
            FIRMWARE: 4,
            UPDATING: 5,
            OFF: 6
        },
        C = function() {
            var e = {
                LOGINACK: 3,
                LOGINIDLE: 4,
                COMMISSIONING: 5,
                COMMISSIONINGSTOP: 6,
                SUBSCRIPTIONRESPONSE: 10,
                NOTIFICATIONRESPONSE: 14,
                READ: 17,
                WRITE: 20,
                MODESETPOINT: 23,
                VACATION: 26,
                VACATIONRESPONSE: 27,
                VACATIONGET: 30,
                SCHEDULE: 32,
                SUPPLYALERTCONFIG: 33,
                SCHEDULEGET: 36,
                MESSAGES: 38,
                CURTAILMENT: 41,
                CURTAILMENTSTOP: 42,
                SYSTER: 161,
                DATETIMERESPONSE: 46,
                FIRMWARERESPONSE: 48,
                OVERRIDETIME: 50,
                FORCEUNOCCUPIED: 53,
                HOLIDAYENABLE: 56,
                LOCALWEATHERRESPONSE: 60,
                HOLIDAYGET: 62,
                HOLIDAYSET: 63,
                VACATIONSCHEDULE: 65,
                AWAY: 66,
                AWAYSETTINGS: 67,
                SUPPLYALERTCONFIGREAD: 68,
                CURTAILEVENT: 69,
                CURTAILPRICE: 70,
                CURTAILCONFIG: 71,
                CURTAILCONFIGREAD: 72,
                CURTAILHISTORY: 73,
                CURTAILOPTOUT: 80,
                PING: 1,
                LOGIN: 2,
                COMMISSIONINGRESPONSE: 7,
                COMMISSIONINGERROR: 8,
                SUBSCRIPTIONSETUP: 9,
                SUBSCRIPTIONALERT: 11,
                NOTIFICATIONSETUP: 13,
                NOTIFICATIONALERT: 15,
                READRESPONSE: 18,
                READERROR: 19,
                WRITERESPONSE: 21,
                WRITEERROR: 22,
                MODESETPOINTRESPONSE: 24,
                MODESETPOINTERROR: 25,
                VACATIONACK: 28,
                VACATIONERROR: 29,
                VACATIONDATA: 31,
                SCHEDULEACK: 34,
                SCHEDULEERROR: 35,
                SCHEDULEDATA: 37,
                MESSAGERESPONSE: 39,
                MESSAGEERROR: 40,
                CURTAILMENTRESPONSE: 43,
                CURTAILMENTERROR: 44,
                SYSTERDATA: 160,
                SYSTERSETUP: 162,
                DATETIMESETUP: 45,
                FIRMWARESETUP: 47,
                DATASUMMARY: 49,
                OVERRIDETIMERESPONSE: 51,
                OVERRIDETIMEERROR: 52,
                FORCEUNOCCUPIEDRESPONSE: 54,
                FORCEUNOCCUPIEDERROR: 55,
                HOLIDAYENABLERESPONSE: 57,
                HOLIDAYENABLEERROR: 58,
                LOCALWEATHER: 59,
                FIRMWARECHECK: 61,
                HOLIDAYGETRESPONSE: 64,
                PAIRREQUEST: 74,
                UNSUPPORTEDCOMMAND: 176,
                GENERICERROR: 177,
                COMMANDSUCCESS: 178,
                COMMANDFAILURE: 179
            };
            return {
                getCommands: function() {
                    return e
                },
                lookup: function(r) {
                    var a;
                    for (var t in e)
                        if (e[t] === r) {
                            a = t;
                            break
                        } return a ? a : null
                }
            }
        }(),
        T = C.getCommands(),
        I = !1,
        A = !1,
        h = O.OFF,
        R = !1,
        P = DataObserver(compatibler, function(e) {
            if (h === O.READY) {
                var r = {
                    command: T.SUBSCRIPTIONALERT,
                    data: e
                };
                l.send(D.buildPacket(r))
            }
        }, function(e) {
            h === O.READY && (e.command = T.NOTIFICATIONALERT, l.send(D.buildPacket(e)))
        }),
        w = new Timer(60);
    w.setCallback("keepAliveCallback");
    var g, y, N, b = {
            weatherUpdate: {
                currentTick: 1,
                tickToExecute: 15,
                execute: function(e) {
                    h === O.READY && sow.get(sow.map.WEATHERENABLED) && e.send(D.buildPacket({
                        command: T.LOCALWEATHER,
                        lang: util.getLangText("lang_name").toUpperCase(),
                        sequence: D.newSequence()
                    }))
                }
            }
        },
        v = 0,
        D = {
            newSequence: function() {
                return 1024 === v ? v = 0 : v++, v
            },
            stringToArray: function(e) {
                return e.split("").map(function(e) {
                    return e.charCodeAt(0)
                })
            },
            stripHeader: function() {},
            parse: function(e) {
                for (var r = "", a = 0, t = e.length; t > a; a++) r += String.fromCharCode(e[a]);
                return JSON.parse(r)
            },
            parseRedirect: function(e) {
                if (e.length > 512) return !1;
                for (var r = "", a = 0, t = e.length; t > a; a++) r += String.fromCharCode(e[a]);
                if (r.indexOf(":") < 0) return !1;
                var n = {
                    host: r.substring(0, r.indexOf(":")),
                    port: parseInt(r.substring(r.indexOf(":") + 1, r.length), 10)
                };
                return n.host.indexOf(".") < 0 || n.host.length < 3 ? !1 : isNaN(n.port) || n.port > 65535 || n.port < 1025 ? !1 : n
            },
            buildPacket: function(e) {
                var r, a = e || {},
                    t = JSON.stringify(a),
                    n = t.split("").map(function(e) {
                        return e.charCodeAt(0)
                    }),
                    o = n.length;
                return r = [o >> 24, o >> 16, o >> 8, 255 & o], trace("sending: " + t), r.concat(n)
            }
        },
        k = function(e) {
            var r = !0;
            return tmodel !== e && (U(p.sequence), r = !1), r
        },
        M = function(e, r) {
            r = r || {}, r.command = T.COMMANDSUCCESS, r.sequence = e, l.send(D.buildPacket(r))
        },
        L = function(e, r) {
            r = r || {}, r.command = T.COMMANDFAILURE, r.sequence = e, l.send(D.buildPacket(r))
        },
        U = function(e, r) {
            r = r || {}, r.command = T.UNSUPPORTEDCOMMAND, r.sequence = e, l.send(D.buildPacket(r))
        },
        H = function() {
            userSkippedSkyportPair || alertManager.show(AlertType.YESNO, languagePack.lang_skyportSetup, languagePack.lang_skyportSetupTitle, iconPath + "alqst.png", !0, 350, 216, function() {
                startPairing()
            }, function() {
                userSkippedSkyportPair = !0
            })
        },
        F = function() {
            var e, r, a, t, n = {
                    LENGTHING: 0,
                    FRAMING: 1
                },
                o = 0,
                c = 0,
                s = n.LENGTHING;
            r = [];
            var i = function(e) {
                    for (var i = 0, u = e.length; u > i; i++) {
                        var d = e[i];
                        switch (s) {
                            case n.LENGTHING:
                                r.push(d), 4 === r.length && (t = (r.shift() << 24) + (r.shift() << 16) + (r.shift() << 8) + r.shift(), 0 > t && (t = 0), a = [], s = n.FRAMING, c = t);
                                break;
                            case n.FRAMING:
                                if (e.length - i < t - a.length - 2 ? (a.push.apply(a, e.slice(i, e.length)), i = e.length) : a.push(d), o = a.length, a.length === t) return s = n.LENGTHING, r = [], o = 0, c = 0, _(a)
                        }
                    }
                },
                u = function() {
                    s = n.LENGTHING, o = 0, c = 0, r = [], e && "function" == typeof e && (e(), e = null)
                };
            return {
                process: i,
                setbadStreamHandler: function(r) {
                    e = r
                },
                bufferLen: function() {
                    return o
                },
                toBuffer: function() {
                    return c
                },
                reset: u,
                clearbadStreamHandler: function() {
                    e = null
                }
            }
        }(),
        _ = function(e) {
            var r;
            if (h === O.UPDATING) return void ar(e);
            if (h !== O.DISCONNECTED && h !== O.OFF && (r = D.parse(e), trace("GOT command " + C.lookup(r.command) + ": " + JSON.stringify(r)), r.command === T.PING)) return void(n = !1);
            if (A) switch (h) {
                    case O.READY:
                        switch (r.command) {
                            case T.LOGINIDLE:
                                A = !1, P.stop(!0), h = O.COMMISSIONING, H();
                                break;
                            case T.MODESETPOINT:
                                ! function(e) {
                                    var r, a = "Oh no :(",
                                        t = !1,
                                        n = e.hasOwnProperty("mode") && e.hasOwnProperty("coolSP") && e.hasOwnProperty("heatSP") && e.hasOwnProperty("sequence");
                                    n = n && compatibler.validator.validate("dm", "hm_mode", e.mode) && compatibler.validator.validate("dm", "hm_csp", e.coolSP) && compatibler.validator.validate("dm", "hm_hsp", e.heatSP), dmw.refresh(), r = dmw.of("curStatus"), t = dmw.of("curEnabled") && r > 0 && 3 >= r, 0 === e.mode && 1 === dmw.of("ui_statSchedActive") && (dmw.to(0, "ui_statSchedActive"), tmodel === model.COMMERCIAL && (hm.setHoliday(0), dmw.to(0, "ui_overrideTimer"), dmw.to(0, "ui_statForceUnocc")), eb.send({
                                        type: EventType.PROGRESUME
                                    })), n ? (dmw.to(e.mode, "hm_mode"), t || (dmw.to(e.coolSP, "hm_csp"), dmw.to(e.heatSP, "hm_hsp")), dmw.refresh(), l.send(D.buildPacket({
                                        command: T.MODESETPOINTRESPONSE,
                                        sequence: e.sequence,
                                        mode: dmw.of("hm_mode"),
                                        coolSP: dmw.of("hm_csp"),
                                        heatSP: dmw.of("hm_hsp")
                                    }))) : (dmw.refresh(), l.send(D.buildPacket({
                                        command: T.MODESETPOINTERROR,
                                        sequence: e.sequence,
                                        err: a,
                                        mode: dmw.of("hm_mode"),
                                        coolSP: dmw.of("hm_csp"),
                                        heatSP: dmw.of("hm_hsp")
                                    })))
                                }(r);
                                break;
                            case T.READ:
                                ! function(e) {
                                    dmw.refresh();
                                    for (var r, a, t = e.indexes, n = {}, o = 0, c = t.length; c > o; o++) r = t[o], compatibler.exists(r) && (a = compatibler.getInfo(r).target, "db" === a ? n[r] = dbFetcher(r) : "dm" === a && (n[r] = dmw.of(r)));
                                    l.send(D.buildPacket({
                                        command: T.READRESPONSE,
                                        sequence: e.sequence,
                                        data: n
                                    }))
                                }(r);
                                break;
                            case T.WRITE:
                                ! function(e) {
                                    var r, a = e.data,
                                        t = compatibler.write(a);
                                    r = t.success ? T.WRITERESPONSE : T.WRITEERROR, l.send(D.buildPacket({
                                        command: r,
                                        sequence: e.sequence,
                                        data: t.data
                                    }))
                                }(r);
                                break;
                            case T.DATETIMERESPONSE:
                                ! function() {
                                    if (r.hasOwnProperty("timestamp") && "number" == typeof r.timestamp) {
                                        var e = new Date(r.timestamp),
                                            a = new Date;
                                        System.executeCommandLine("udate " + e.getTime() / 1e3), Math.abs(a - new Date) > 6e4 && eb.send({
                                            type: EventType.PROGRESUME
                                        })
                                    }
                                }(r);
                                break;
                            case T.SUBSCRIPTIONRESPONSE:
                                r.hasOwnProperty("subs") ? P.fillSubs(r.subs) : P.clearSubList();
                                break;
                            case T.NOTIFICATIONRESPONSE:
                                r.hasOwnProperty("observe") ? P.fillNotis(r) : l.send(D.buildPacket({
                                    command: T.GENERICERROR,
                                    sequence: r.sequence,
                                    msg: "Malformed packet"
                                }));
                                break;
                            case T.MESSAGES:
                                ! function(e) {
                                    if (e.hasOwnProperty("msg"))
                                        if ("home" === currentScreen || "simpleHome" === currentScreen || "screenSaver" === currentScreen) {
                                            "screenSaver" === currentScreen && ss.returnHome();
                                            var r = alertManager.showExtMessage(e.msg);
                                            piezo.beep(), l.send(D.buildPacket({
                                                command: T.MESSAGERESPONSE,
                                                sequence: e.sequence,
                                                msg: r
                                            }))
                                        } else l.send(D.buildPacket({
                                            command: T.MESSAGEERROR,
                                            msg: e.msg,
                                            sequence: e.sequence,
                                            err: "Thermostat not ready"
                                        }));
                                    else l.send(D.buildPacket({
                                        command: T.MESSAGEERROR,
                                        err: "No message defined"
                                    }))
                                }(r);
                                break;
                            case T.SCHEDULE:
                                ! function(e) {
                                    if (sow.get(sow.map.SIMPLEMODEACTIVE)) return L(e.sequence, {
                                        msg: "Schedule configuration not available for Simple Stat"
                                    });
                                    var r = schc.doExternalWrite(e);
                                    r.success ? (dmw.refresh(), l.send(D.buildPacket({
                                        command: T.SCHEDULEACK,
                                        sequence: e.sequence,
                                        progPart: dmw.of("ui_statProgPart"),
                                        mode: dmw.of("hm_mode"),
                                        csp: dmw.of("hm_csp"),
                                        hsp: dmw.of("hm_hsp")
                                    }))) : l.send(D.buildPacket({
                                        command: T.SCHEDULEERROR,
                                        sequence: e.sequence,
                                        err: r.data
                                    })), P.checkSubs()
                                }(r);
                                break;
                            case T.SCHEDULEGET:
                                ! function(e) {
                                    var r = schc.getSchedule();
                                    r.sequence = e.sequence, r.command = T.SCHEDULEDATA, l.send(D.buildPacket(r))
                                }(r);
                                break;
                            case T.FIRMWARERESPONSE:
                                ! function(e) {
                                    var r = new File(sys_manifest);
                                    if (e.hasOwnProperty("latest") && e.latest === !0) return void alertManager.show(AlertType.OK, "This thermostat is up to date.", "No Update Available", iconPath + "alexc.png", !0, 352, 220, null, null);
                                    if (!r.exists || e.hasOwnProperty("useApp") && "boolean" == typeof e.useApp && e.useApp) return void alertManager.show(AlertType.OK, "A firmware upgrade is available for your thermostat. Please download the latest firmware into an SD card using your computer and update your thermostat.", "Update Available!", iconPath + "alexc.png", !0, 352, 220, null, null);
                                    if (e.hasOwnProperty("host") && e.host.length && e.hasOwnProperty("port") && "number" == typeof e.port && e.hasOwnProperty("token") && e.token.length && e.hasOwnProperty("version") && e.version.length && e.hasOwnProperty("force")) {
                                        var a = function() {
                                            R.host = e.host, R.port = e.port, E = e.token, m = e.hash, h = O.FIRMWARE, l.disconnect()
                                        };
                                        S = e.version, e.force === !0 ? a() : alertManager.show(AlertType.YESNO, "An update is available for your thermostat, would you like to install it now? Your thermostat will restart upon completion.", "Update Available (" + S + ")", iconPath + "alexc.png", !0, 352, 220, a, null)
                                    }
                                }(r);
                                break;
                            case T.OVERRIDETIME:
                                ! function(e) {
                                    if (k(model.COMMERCIAL))
                                        if (e.hasOwnProperty("time") && "number" == typeof e.time && compatibler.validator.validate("dm", "ui_overrideTimer", e.time)) {
                                            dmw.refresh();
                                            var r = dmw.of("ui_statProgPart");
                                            0 === r || 3 === r ? (dmw.to(e.time, "ui_overrideTimer"), eb.send({
                                                type: EventType.PROGRESUME
                                            }), dmw.refresh(), l.send(D.buildPacket({
                                                command: T.OVERRIDETIMERESPONSE,
                                                sequence: e.sequence,
                                                time: dmw.of("ui_overrideTimer"),
                                                forceUnocc: dmw.of("ui_statForceUnocc"),
                                                progPart: dmw.of("ui_statProgPart"),
                                                override: dmw.of("ui_overrideState"),
                                                mode: dmw.of("hm_mode"),
                                                csp: dmw.of("hm_csp"),
                                                hsp: dmw.of("hm_hsp")
                                            }))) : l.send(D.buildPacket({
                                                command: T.OVERRIDETIMEERROR,
                                                sequence: e.sequence,
                                                time: dmw.of("ui_overrideTimer"),
                                                err: "Changing override time is currently unavailable."
                                            }))
                                        } else l.send(D.buildPacket({
                                            command: T.OVERRIDETIMEERROR,
                                            sequence: e.sequence,
                                            time: dmw.of("ui_overrideTimer"),
                                            err: "Invalid parameters."
                                        }))
                                }(r);
                                break;
                            case T.FORCEUNOCCUPIED:
                                ! function(e) {
                                    if (k(model.COMMERCIAL))
                                        if (!e.hasOwnProperty("active") || "number" != typeof e.active || 0 !== e.active && 1 !== e.active) l.send(D.buildPacket({
                                            command: T.FORCEUNOCCUPIEDERROR,
                                            sequence: e.sequence,
                                            forceUnocc: dmw.of("ui_statForceUnocc"),
                                            err: "Invalid parameters."
                                        }));
                                        else {
                                            dmw.refresh();
                                            var r = dmw.of("ui_statProgPart"),
                                                a = dmw.of("ui_statForceUnocc");
                                            3 === r && 1 === a && 0 === e.active || 3 > r && 0 === a && 1 === e.active ? (dmw.to(e.active, "ui_statForceUnocc"), eb.send({
                                                type: EventType.PROGRESUME
                                            }), dmw.refresh(), l.send(D.buildPacket({
                                                command: T.FORCEUNOCCUPIEDRESPONSE,
                                                sequence: e.sequence,
                                                forceUnocc: dmw.of("ui_statForceUnocc"),
                                                progPart: dmw.of("ui_statProgPart"),
                                                override: dmw.of("ui_overrideState"),
                                                mode: dmw.of("hm_mode"),
                                                csp: dmw.of("hm_csp"),
                                                hsp: dmw.of("hm_hsp")
                                            }))) : l.send(D.buildPacket({
                                                command: T.FORCEUNOCCUPIEDERROR,
                                                sequence: e.sequence,
                                                forceUnocc: dmw.of("ui_statForceUnocc"),
                                                err: "Unable to set override settings."
                                            }))
                                        }
                                }(r);
                                break;
                            case T.HOLIDAYENABLE:
                                ! function(e) {
                                    if (k(model.COMMERCIAL))
                                        if (e.hasOwnProperty("enabled")) {
                                            var r = {};
                                            r.ui_holidayEnable = e.enabled, "boolean" == typeof r.ui_holidayEnable && (r.ui_holidayEnable = 1 & r.ui_holidayEnable);
                                            var a = compatibler.write(r);
                                            l.send(a.success ? D.buildPacket({
                                                command: T.HOLIDAYENABLERESPONSE,
                                                holidayEnabled: dmw.of("ui_holidayEnable"),
                                                sequence: e.sequence
                                            }) : D.buildPacket({
                                                command: T.HOLIDAYENABLEERROR,
                                                sequence: e.sequence,
                                                holidayEnabled: dmw.of("ui_holidayEnable"),
                                                err: a.data
                                            }))
                                        } else l.send(D.buildPacket({
                                            command: T.HOLIDAYENABLEERROR,
                                            sequence: e.sequence,
                                            holidayEnabled: dmw.of("ui_holidayEnable"),
                                            err: "Invalid data for holidayEnable command"
                                        }))
                                }(r);
                                break;
                            case T.HOLIDAYGET:
                                ! function(e) {
                                    if (k(model.COMMERCIAL)) {
                                        var r = hm.exportData();
                                        l.send(D.buildPacket({
                                            command: T.HOLIDAYGETRESPONSE,
                                            sequence: e.sequence,
                                            data: r
                                        }))
                                    }
                                }(r);
                                break;
                            case T.HOLIDAYSET:
                                ! function(e) {
                                    k(model.COMMERCIAL) && (e.hasOwnProperty("custom") && e.hasOwnProperty("direct") && e.hasOwnProperty("unhols") && e.hasOwnProperty("presets") && e.hasOwnProperty("enable") && e.custom instanceof Array && e.direct instanceof Array && e.unhols instanceof Array && e.presets instanceof Array ? (hm.importData(e), dmw.refresh(), M(e.sequence, {
                                        holidayEnabled: dmw.of("ui_holidayEnable")
                                    })) : L(e.sequence, {
                                        msg: "Invalid data for holidayset"
                                    }))
                                }(r);
                                break;
                            case T.LOCALWEATHERRESPONSE:
                                ! function(e) {
                                    if (e.error) return void(N = {
                                        error: !0
                                    });
                                    try {
                                        N = JSON.parse(e.data), N.timestamp = new Date, N.location = e.location && e.location.length ? e.location : ""
                                    } catch (r) {
                                        trace("Got json parse error for weather")
                                    }
                                }(r);
                                break;
                            case T.VACATIONSCHEDULE:
                                ! function(e) {
                                    var r, a = function(e) {
                                        return "number" != typeof e && (e = parseInt(e, 10)), e >= +new Date || 0 === e
                                    };
                                    k(model.RESIDENTIAL) && (e.hasOwnProperty("start") && e.hasOwnProperty("stop") && a(e.start) && a(e.stop) ? (r = compatibler.write({
                                        ui_vacStop: e.stop,
                                        ui_vacStart: e.start
                                    }), dmw.refesh(), eb.send({
                                        type: EventType.VACATIONUPDATE
                                    }), r.success ? M(e.sequence, {
                                        start: compatibler.read("ui_vacStart"),
                                        stop: compatibler.read("ui_vacStop")
                                    }) : L(e.sequence, r.data)) : L(e.sequence, {
                                        msg: "Valid start and stop parameters are required"
                                    }))
                                }(r);
                                break;
                            case T.AWAY:
                                ! function(e) {
                                    var r, a;
                                    k(model.RESIDENTIAL) && (!e.hasOwnProperty("away") || "number" != typeof e.away || 0 !== e.away && 1 !== e.away ? L(e.sequence, {
                                        msg: "Invalid parameter for AWAY command"
                                    }) : ("simpleHome" === currentScreen && (e.away = 0), r = {
                                        away: e.away
                                    }, 0 === e.away && (r.ui_vacStart = 0, r.ui_vacStop = 0, sow.clearVacation()), a = compatibler.write(r), eb.send({
                                        type: EventType.VACATIONUPDATE
                                    }), dmw.refresh(), a.success ? M(e.sequence, {
                                        away: dmw.of("away"),
                                        updateSubs: {
                                            away: dmw.of("away"),
                                            hm_mode: dmw.of("hm_mode"),
                                            hm_csp: dmw.of("hm_csp"),
                                            hm_hsp: dmw.of("hm_hsp")
                                        }
                                    }) : L(e.sequence, a.data)))
                                }(r);
                                break;
                            case T.AWAYSETTINGS:
                                ! function(e) {
                                    if (k(model.RESIDENTIAL)) {
                                        var r = e.hasOwnProperty("mode") && e.hasOwnProperty("csp") && e.hasOwnProperty("hsp") && e.hasOwnProperty("sequence");
                                        r = r && compatibler.validator.validate("dm", "ui_vacMode", e.mode) && compatibler.validator.validate("dm", "ui_vacCool", e.csp) && compatibler.validator.validate("dm", "ui_vacHeat", e.hsp), r ? (dmw.to(e.mode, "ui_vacMode"), dmw.to(e.csp, "ui_vacCool"), dmw.to(e.hsp, "ui_vacHeat"), dmw.refresh(), eb.send({
                                            type: EventType.AWAYUPDATE
                                        }), M(e.sequence, {
                                            mode: dmw.of("ui_vacMode"),
                                            csp: dmw.of("ui_vacCool"),
                                            hsp: dmw.of("ui_vacHeat")
                                        })) : (dmw.refresh(), L(e.sequence, {
                                            msg: "Invalid parameters for AWAYSETTINGS",
                                            mode: dmw.of("ui_vacMode"),
                                            csp: dmw.of("ui_vacCool"),
                                            hsp: dmw.of("ui_vacHeat")
                                        }))
                                    }
                                }(r);
                                break;
                            case T.SUPPLYALERTCONFIG:
                                ! function(e) {
                                    var r = e.hasOwnProperty("supplyAirTargetHeat") && e.hasOwnProperty("supplyAirTimeHeat") && e.hasOwnProperty("supplyAirTargetCool") && e.hasOwnProperty("supplyAirTimeCool") && e.hasOwnProperty("sequence");
                                    r = r && compatibler.validator.validate("dm", "supplyAirTargetHeat", e.supplyAirTargetHeat) && compatibler.validator.validate("dm", "supplyAirTimeHeat", e.supplyAirTimeHeat) && compatibler.validator.validate("dm", "supplyAirTargetCool", e.supplyAirTargetCool) && compatibler.validator.validate("dm", "supplyAirTimeCool", e.supplyAirTimeCool), r ? (dmw.to(e.supplyAirTargetHeat, "supplyAirTargetHeat"), dmw.to(e.supplyAirTimeHeat, "supplyAirTimeHeat"), dmw.to(e.supplyAirTargetCool, "supplyAirTargetCool"), dmw.to(e.supplyAirTimeCool, "supplyAirTimeCool"), dmw.refresh(), eb.send({
                                        type: EventType.SUPPLYAIRCONFIGUPDATE
                                    }), M(e.sequence, {
                                        supplyAirTargetHeat: dmw.of("supplyAirTargetHeat"),
                                        supplyAirTimeHeat: dmw.of("supplyAirTimeHeat"),
                                        supplyAirTargetCool: dmw.of("supplyAirTargetCool"),
                                        supplyAirTimeCool: dmw.of("supplyAirTimeCool")
                                    })) : L(e.sequence, {
                                        msg: "Invalid parameters for SUPPLYALERTCONFIG"
                                    })
                                }(r);
                                break;
                            case T.SUPPLYALERTCONFIGREAD:
                                ! function(e) {
                                    dmw.refresh(), M(e.sequence, {
                                        supplyAirTargetHeat: dmw.of("supplyAirTargetHeat"),
                                        supplyAirTimeHeat: dmw.of("supplyAirTimeHeat"),
                                        supplyAirTargetCool: dmw.of("supplyAirTargetCool"),
                                        supplyAirTimeCool: dmw.of("supplyAirTimeCool")
                                    })
                                }(r);
                                break;
                            case T.CURTAILEVENT:
                                ! function(e) {
                                    var r, a = function(e) {
                                        var r = [];
                                        return r.push(255 & e), r.push(e >> 8 & 255), r.push(e >> 16 & 255), r.push(e >> 24 & 255), r
                                    };
                                    return console.log("Loaded " + JSON.stringify(e)), e.hasOwnProperty("id") && "number" == typeof e.id && e.hasOwnProperty("start") && e.hasOwnProperty("startDelay") && e.hasOwnProperty("stop") && e.hasOwnProperty("stopDelay") && e.hasOwnProperty("type") && "number" == typeof e.type ? e.start >= e.stop || e.type < 0 || e.type > 2 || e.startDelay < 0 || e.stopDelay < 0 ? L(e.sequence, {
                                        msg: "Invalid parameter value(s) for CURTAILEVENT"
                                    }) : (r = [].concat(a(e.id), e.type, a(e.start), e.startDelay, a(e.stop), e.stopDelay), eb.sendEventAsByteArray({
                                        type: EventType.CURTAIL,
                                        data: r
                                    })) : L(e.sequence, {
                                        msg: "Invalid parameters for CURTAILEVENT"
                                    })
                                }(r);
                                break;
                            case T.CURTAILPRICE:
                                ! function(e) {
                                    return e.hasOwnProperty("price") && e.hasOwnProperty("duration") ? "number" != typeof e.price || "number" != typeof e.duration ? L(e.sequence, {
                                        msg: "Invalid parameters for CURTAILPRICE: invalid type for price or duration."
                                    }) : e.price < 0 || e.price > 65535 || e.duration < 0 || e.duration > 65535 ? L(e.sequence, {
                                        msg: "Invalid parameters for CURTAILPRICE: invalid value for price or duration."
                                    }) : eb.sendEventAsByteArray({
                                        type: EventType.PRICE,
                                        data: [255 & e.price, e.price >> 8, 255 & e.duration, e.duration >> 8]
                                    }) : L(e.sequence, {
                                        msg: "Invalid parameters for CURTAILPRICE: missing price or duration."
                                    })
                                }(r);
                                break;
                            case T.CURTAILCONFIG:
                                ! function(e) {
                                    var r, a = e.sequence,
                                        t = e.hasOwnProperty("curEnabled") && e.hasOwnProperty("curCspDelta") && "number" == typeof e.curCspDelta && e.hasOwnProperty("curHspDelta") && "number" == typeof e.curHspDelta && e.hasOwnProperty("curCspFixed") && "number" == typeof e.curCspFixed && e.hasOwnProperty("curHspFixed") && "number" == typeof e.curHspFixed && e.hasOwnProperty("curCspMax") && "number" == typeof e.curCspMax && e.hasOwnProperty("curHspMin") && "number" == typeof e.curHspMin && e.hasOwnProperty("curPriceTrigger") && "number" == typeof e.curPriceTrigger && e.hasOwnProperty("curPriceAction") && "number" == typeof e.curPriceAction;
                                    return t ? ("boolean" == typeof e.curEnabled && (e.curEnabled = 1 & e.curEnabled), (t = t && compatibler.validator.validate("dm", "curEnabled", e.curEnabled) && compatibler.validator.validate("dm", "curCspDelta", e.curCspDelta) && compatibler.validator.validate("dm", "curHspDelta", e.curHspDelta) && compatibler.validator.validate("dm", "curCspFixed", e.curCspFixed) && compatibler.validator.validate("dm", "curHspFixed", e.curHspFixed) && compatibler.validator.validate("dm", "curCspMax", e.curCspMax) && compatibler.validator.validate("dm", "curHspMin", e.curHspMin) && compatibler.validator.validate("dm", "curPriceTrigger", e.curPriceTrigger) && compatibler.validator.validate("dm", "curPriceAction", e.curPriceAction)) ? (delete e.sequence, r = compatibler.write({
                                        curEnabled: e.curEnabled,
                                        curCspDelta: e.curCspDelta,
                                        curHspDelta: e.curHspDelta,
                                        curCspFixed: e.curCspFixed,
                                        curHspFixed: e.curHspFixed,
                                        curCspMax: e.curCspMax,
                                        curHspMin: e.curHspMin,
                                        curPriceTrigger: e.curPriceTrigger,
                                        curPriceAction: e.curPriceAction
                                    }, !0), dmw.refresh(), eb.send({
                                        type: EventType.CURTAILCONFIGUPDATE
                                    }), r.success ? M(a, {
                                        curEnabled: dmw.of("curEnabled"),
                                        curCspDelta: dmw.of("curCspDelta"),
                                        curHspDelta: dmw.of("curHspDelta"),
                                        curCspFixed: dmw.of("curCspFixed"),
                                        curHspFixed: dmw.of("curHspFixed"),
                                        curHspMin: dmw.of("curHspMin"),
                                        curCspMax: dmw.of("curCspMax"),
                                        curPriceTrigger: dmw.of("curPriceTrigger"),
                                        curPriceAction: dmw.of("curPriceAction")
                                    }) : L(a, {
                                        curEnabled: dmw.of("curEnabled"),
                                        curCspDelta: dmw.of("curCspDelta"),
                                        curHspDelta: dmw.of("curHspDelta"),
                                        curCspFixed: dmw.of("curCspFixed"),
                                        curHspFixed: dmw.of("curHspFixed"),
                                        curHspMin: dmw.of("curHspMin"),
                                        curCspMax: dmw.of("curCspMax"),
                                        curPriceTrigger: dmw.of("curPriceTrigger"),
                                        curPriceAction: dmw.of("curPriceAction"),
                                        failed: r.data
                                    })) : L(e.sequence, {
                                        msg: "Invalid parameters for CURTAILCONFIG."
                                    })) : L(e.sequence, {
                                        msg: "Missing parameters for CURTAILCONFIG."
                                    })
                                }(r);
                                break;
                            case T.CURTAILCONFIGREAD:
                                ! function(e) {
                                    return M(e.sequence, {
                                                curEnabled: dmw.of("curEnabled"),
                                                curCspDelta: dmw.of("curCspDelta"),
                                                curHspDelta: dmw.of("curHspDelta"),
                                                curCspFixed: dmw.of("curCspFixed"),
                                                curHspFixed: dmw.of("curHspFixed"),
                                                curHspMin: dmw.of("curHspMin"),
                                                curCspMax: dmw.of("curCspMax"),
                                                curPriceTrigger: dmw.of("curPriceTrig
