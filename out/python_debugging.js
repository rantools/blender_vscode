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
exports.attachPythonDebuggerToBlender = void 0;
const path = require("path");
const vscode = require("vscode");
const os = require("os");
const blender_folder_1 = require("./blender_folder");
const scripts_1 = require("./scripts");
function attachPythonDebuggerToBlender(port, blenderPath, justMyCode, scriptsFolder, addonPathMappings) {
    return __awaiter(this, void 0, void 0, function* () {
        let mappings = yield getPythonPathMappings(scriptsFolder, addonPathMappings);
        attachPythonDebugger(port, justMyCode, mappings);
    });
}
exports.attachPythonDebuggerToBlender = attachPythonDebuggerToBlender;
function attachPythonDebugger(port, justMyCode, pathMappings = []) {
    let configuration = {
        name: `Python at Port ${port}`,
        request: "attach",
        type: 'python',
        port: port,
        host: 'localhost',
        pathMappings: pathMappings,
        justMyCode: justMyCode
    };
    vscode.debug.startDebugging(undefined, configuration);
}
function getPythonPathMappings(scriptsFolder, addonPathMappings) {
    return __awaiter(this, void 0, void 0, function* () {
        let mappings = [];
        mappings.push(...addonPathMappings.map(item => ({
            localRoot: item.src,
            remoteRoot: item.load
        })));
        mappings.push(yield getBlenderScriptsPathMapping(scriptsFolder));
        for (let folder of (0, scripts_1.getStoredScriptFolders)()) {
            mappings.push({
                localRoot: folder.path,
                remoteRoot: folder.path
            });
        }
        fixMappings(mappings);
        return mappings;
    });
}
function getBlenderScriptsPathMapping(scriptsFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        let blender = yield blender_folder_1.BlenderWorkspaceFolder.Get();
        if (blender !== null) {
            return {
                localRoot: path.join(blender.uri.fsPath, 'release', 'scripts'),
                remoteRoot: scriptsFolder
            };
        }
        else {
            return {
                localRoot: scriptsFolder,
                remoteRoot: scriptsFolder
            };
        }
    });
}
function fixMappings(mappings) {
    for (let i = 0; i < mappings.length; i++) {
        mappings[i].localRoot = fixPath(mappings[i].localRoot);
    }
}
/* This is to work around a bug where vscode does not find
 * the path: c:\... but only C:\... on windows.
 * https://github.com/Microsoft/vscode-python/issues/2976 */
function fixPath(filepath) {
    if (os.platform() !== 'win32')
        return filepath;
    if (filepath.match(/^[a-zA-Z]:/) !== null) {
        return filepath[0].toUpperCase() + filepath.substring(1);
    }
    return filepath;
}
//# sourceMappingURL=python_debugging.js.map