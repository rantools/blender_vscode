"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunningBlenders = exports.getServerPort = exports.stopServer = exports.startServer = exports.BlenderInstances = exports.BlenderInstance = void 0;
const http = require("http");
const vscode = require("vscode");
const request = require("request");
const utils_1 = require("./utils");
const python_debugging_1 = require("./python_debugging");
const RESPONSIVE_LIMIT_MS = 1000;
class BlenderInstance {
    constructor(blenderPort, debugpyPort, justMyCode, path, scriptsFolder, addonPathMappings) {
        this.blenderPort = blenderPort;
        this.debugpyPort = debugpyPort;
        this.justMyCode = justMyCode;
        this.path = path;
        this.scriptsFolder = scriptsFolder;
        this.addonPathMappings = addonPathMappings;
        this.connectionErrors = [];
    }
    post(data) {
        request.post(this.address, { json: data });
    }
    ping() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                let req = request.get(this.address, { json: { type: 'ping' } });
                req.on('end', () => resolve());
                req.on('error', err => { this.connectionErrors.push(err); reject(err); });
            });
        });
    }
    isResponsive() {
        return __awaiter(this, arguments, void 0, function* (timeout = RESPONSIVE_LIMIT_MS) {
            return new Promise(resolve => {
                this.ping().then(() => resolve(true)).catch();
                setTimeout(() => resolve(false), timeout);
            });
        });
    }
    attachDebugger() {
        (0, python_debugging_1.attachPythonDebuggerToBlender)(this.debugpyPort, this.path, this.justMyCode, this.scriptsFolder, this.addonPathMappings);
    }
    get address() {
        return `http://localhost:${this.blenderPort}`;
    }
}
exports.BlenderInstance = BlenderInstance;
class BlenderInstances {
    constructor() {
        this.instances = [];
    }
    register(instance) {
        this.instances.push(instance);
    }
    getResponsive() {
        return __awaiter(this, arguments, void 0, function* (timeout = RESPONSIVE_LIMIT_MS) {
            if (this.instances.length === 0)
                return [];
            return new Promise(resolve => {
                let responsiveInstances = [];
                let pingAmount = this.instances.length;
                function addInstance(instance) {
                    responsiveInstances.push(instance);
                    if (responsiveInstances.length === pingAmount) {
                        resolve(responsiveInstances.slice());
                    }
                }
                for (let instance of this.instances) {
                    instance.ping().then(() => addInstance(instance)).catch(() => { });
                }
                setTimeout(() => resolve(responsiveInstances.slice()), timeout);
            });
        });
    }
    sendToResponsive(data, timeout = RESPONSIVE_LIMIT_MS) {
        for (let instance of this.instances) {
            instance.isResponsive(timeout).then(responsive => {
                if (responsive)
                    instance.post(data);
            }).catch();
        }
    }
    sendToAll(data) {
        for (let instance of this.instances) {
            instance.post(data);
        }
    }
}
exports.BlenderInstances = BlenderInstances;
/* Own server
 ********************************************** */
function startServer() {
    server = http.createServer(SERVER_handleRequest);
    server.listen();
}
exports.startServer = startServer;
function stopServer() {
    server.close();
}
exports.stopServer = stopServer;
function getServerPort() {
    return server.address().port;
}
exports.getServerPort = getServerPort;
function SERVER_handleRequest(request, response) {
    if (request.method === 'POST') {
        let body = '';
        request.on('data', (chunk) => body += chunk.toString());
        request.on('end', () => {
            let req = JSON.parse(body);
            switch (req.type) {
                case 'setup': {
                    let config = (0, utils_1.getConfig)();
                    let justMyCode = config.get('addon.justMyCode');
                    let instance = new BlenderInstance(req.blenderPort, req.debugpyPort, justMyCode, req.blenderPath, req.scriptsFolder, req.addonPathMappings);
                    instance.attachDebugger();
                    exports.RunningBlenders.register(instance);
                    response.end('OK');
                    break;
                }
                case 'enableFailure': {
                    vscode.window.showWarningMessage('Enabling the addon failed. See console.');
                    response.end('OK');
                    break;
                }
                case 'disableFailure': {
                    vscode.window.showWarningMessage('Disabling the addon failed. See console.');
                    response.end('OK');
                    break;
                }
                case 'addonUpdated': {
                    response.end('OK');
                    break;
                }
                default: {
                    throw new Error('unknown type');
                }
            }
        });
    }
}
var server = undefined;
exports.RunningBlenders = new BlenderInstances();
//# sourceMappingURL=communication.js.map