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
exports.AddonWorkspaceFolder = void 0;
const path = require("path");
const vscode = require("vscode");
const utils_1 = require("./utils");
// TODO: It would be superior to use custom AddonFolder interface that is not bound to the
// vscode.WorkspaceFolder directly. The 'uri' property is only one used at this point.
class AddonWorkspaceFolder {
    constructor(folder) {
        this.folder = folder;
    }
    static All() {
        return __awaiter(this, void 0, void 0, function* () {
            // Search folders specified by settings first, if nothing is specified
            // search workspace folders instead.
            let addonFolders = yield foldersToWorkspaceFoldersMockup((0, utils_1.getConfig)().get('addonFolders'));
            if (addonFolders.length === 0) {
                addonFolders = (0, utils_1.getWorkspaceFolders)().slice(); // Create a mutable copy
            }
            let folders = [];
            for (let folder of addonFolders) {
                let addon = new AddonWorkspaceFolder(folder);
                if (yield addon.hasAddonEntryPoint()) {
                    folders.push(addon);
                }
            }
            return folders;
        });
    }
    get uri() {
        return this.folder.uri;
    }
    get buildTaskName() {
        return this.getConfig().get('addon.buildTaskName');
    }
    get reloadOnSave() {
        return this.getConfig().get('addon.reloadOnSave');
    }
    get justMyCode() {
        return this.getConfig().get('addon.justMyCode');
    }
    hasAddonEntryPoint() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let sourceDir = yield this.getSourceDirectory();
                return folderContainsAddonEntry(sourceDir);
            }
            catch (err) {
                return false;
            }
        });
    }
    buildIfNecessary() {
        return __awaiter(this, void 0, void 0, function* () {
            let taskName = this.buildTaskName;
            if (taskName === '')
                return Promise.resolve();
            yield (0, utils_1.executeTask)(taskName, true);
        });
    }
    getConfig() {
        return (0, utils_1.getConfig)(this.uri);
    }
    getLoadDirectoryAndModuleName() {
        return __awaiter(this, void 0, void 0, function* () {
            let load_dir = yield this.getLoadDirectory();
            let module_name = yield this.getModuleName();
            return {
                'load_dir': load_dir,
                'module_name': module_name,
            };
        });
    }
    getModuleName() {
        return __awaiter(this, void 0, void 0, function* () {
            let value = (0, utils_1.getConfig)(this.uri).get('addon.moduleName');
            if (value === 'auto') {
                value = path.basename(yield this.getLoadDirectory());
            }
            return `${value}`;
            // return `bl_ext.${repo}.${value}`;
        });
    }
    getLoadDirectory() {
        return __awaiter(this, void 0, void 0, function* () {
            let value = (0, utils_1.getConfig)(this.uri).get('addon.loadDirectory');
            if (value === 'auto') {
                return this.getSourceDirectory();
            }
            else {
                return this.makePathAbsolute(value);
            }
        });
    }
    getSourceDirectory() {
        return __awaiter(this, void 0, void 0, function* () {
            let value = (0, utils_1.getConfig)(this.uri).get('addon.sourceDirectory');
            if (value === 'auto') {
                return yield tryFindActualAddonFolder(this.uri.fsPath);
            }
            else {
                return this.makePathAbsolute(value);
            }
        });
    }
    makePathAbsolute(directory) {
        if (path.isAbsolute(directory)) {
            return directory;
        }
        else {
            return path.join(this.uri.fsPath, directory);
        }
    }
}
exports.AddonWorkspaceFolder = AddonWorkspaceFolder;
function tryFindActualAddonFolder(root) {
    return __awaiter(this, void 0, void 0, function* () {
        if (yield folderContainsAddonEntry(root))
            return root;
        for (let folder of yield (0, utils_1.getSubfolders)(root)) {
            if (yield folderContainsAddonEntry(folder)) {
                return folder;
            }
        }
        return Promise.reject(new Error('cannot find actual addon code, please set the path in the settings'));
    });
}
function folderContainsAddonEntry(folderPath) {
    return __awaiter(this, void 0, void 0, function* () {
        let manifestPath = path.join(folderPath, "blendermanifest.toml");
        if (yield (0, utils_1.pathExists)(manifestPath)) {
            return true;
        }
        let initPath = path.join(folderPath, '__init__.py');
        try {
            let content = yield (0, utils_1.readTextFile)(initPath);
            return content.includes('bl_info');
        }
        catch (_a) {
            return false;
        }
    });
}
function foldersToWorkspaceFoldersMockup(folders) {
    return __awaiter(this, void 0, void 0, function* () {
        let mockups = [];
        // Assume this functionality is only used with a single workspace folder for now.
        let rootFolder = (0, utils_1.getAnyWorkspaceFolder)();
        for (let i = 0; i < folders.length; i++) {
            let absolutePath;
            if (path.isAbsolute(folders[i])) {
                absolutePath = folders[i];
            }
            else {
                absolutePath = path.join(rootFolder.uri.fsPath, folders[i]);
            }
            let exists = yield (0, utils_1.pathExists)(absolutePath);
            if (!exists) {
                vscode.window.showInformationMessage(`Revise settings, path to addon doesn't exist ${absolutePath}`);
                continue;
            }
            mockups.push({
                "name": path.basename(absolutePath),
                "uri": vscode.Uri.parse(absolutePath),
                "index": i
            });
        }
        return mockups;
    });
}
//# sourceMappingURL=addon_folder.js.map