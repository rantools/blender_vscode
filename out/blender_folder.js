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
exports.BlenderWorkspaceFolder = void 0;
const path = require("path");
const vscode = require("vscode");
const blender_executable_1 = require("./blender_executable");
const utils_1 = require("./utils");
class BlenderWorkspaceFolder {
    constructor(folder) {
        this.folder = folder;
    }
    static Get() {
        return __awaiter(this, void 0, void 0, function* () {
            for (let folder of (0, utils_1.getWorkspaceFolders)()) {
                let blender = new BlenderWorkspaceFolder(folder);
                if (yield blender.isValid()) {
                    return blender;
                }
            }
            return null;
        });
    }
    isValid() {
        return __awaiter(this, void 0, void 0, function* () {
            let paths = ['doc', 'source', 'release'].map(n => path.join(this.uri.fsPath, n));
            return (0, utils_1.pathsExist)(paths);
        });
    }
    get uri() {
        return this.folder.uri;
    }
    get buildDebugCommand() {
        return this.getConfig().get('core.buildDebugCommand');
    }
    buildDebug() {
        return __awaiter(this, void 0, void 0, function* () {
            let execution = new vscode.ShellExecution(this.buildDebugCommand, { cwd: this.uri.fsPath });
            yield (0, utils_1.runTask)('Build Blender', execution, true, this.folder);
        });
    }
    buildPythonDocs() {
        return __awaiter(this, arguments, void 0, function* (part = undefined) {
            let api_folder = path.join(this.uri.fsPath, 'doc', 'python_api');
            let args = [
                '--background',
                '--factory-startup',
                '--python',
                path.join(api_folder, 'sphinx_doc_gen.py'),
            ];
            if (part !== undefined) {
                args.push('--');
                args.push('--partial');
                args.push(part);
            }
            let blender = yield blender_executable_1.BlenderExecutable.GetAny();
            yield blender.launchWithCustomArgs('build api docs', args);
            let execution = new vscode.ProcessExecution('sphinx-build', [
                path.join(api_folder, 'sphinx-in'),
                path.join(api_folder, 'sphinx-out'),
            ]);
            yield (0, utils_1.runTask)('generate html', execution, true);
        });
    }
    getConfig() {
        return (0, utils_1.getConfig)(this.uri);
    }
}
exports.BlenderWorkspaceFolder = BlenderWorkspaceFolder;
//# sourceMappingURL=blender_folder.js.map