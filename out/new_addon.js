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
exports.COMMAND_newAddon = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const paths_1 = require("./paths");
const select_utils_1 = require("./select_utils");
const utils_1 = require("./utils");
const addonTemplateDir = path.join(paths_1.templateFilesDir, 'addons');
function COMMAND_newAddon() {
    return __awaiter(this, void 0, void 0, function* () {
        let builder = yield getNewAddonGenerator();
        let [addonName, authorName] = yield askUser_SettingsForNewAddon();
        let folderPath = yield getFolderForNewAddon();
        folderPath = yield fixAddonFolderName(folderPath);
        let mainPath = yield builder(folderPath, addonName, authorName);
        yield vscode.window.showTextDocument(vscode.Uri.file(mainPath));
        yield vscode.commands.executeCommand('cursorBottom');
        (0, utils_1.addFolderToWorkspace)(folderPath);
    });
}
exports.COMMAND_newAddon = COMMAND_newAddon;
function getNewAddonGenerator() {
    return __awaiter(this, void 0, void 0, function* () {
        let items = [];
        items.push({ label: 'Simple', data: generateAddon_Simple });
        items.push({ label: 'With Auto Load', data: generateAddon_WithAutoLoad });
        let item = yield (0, select_utils_1.letUserPickItem)(items, 'Choose Template');
        return item.data;
    });
}
function getFolderForNewAddon() {
    return __awaiter(this, void 0, void 0, function* () {
        let items = [];
        for (let workspaceFolder of (0, utils_1.getWorkspaceFolders)()) {
            let folderPath = workspaceFolder.uri.fsPath;
            if (yield canAddonBeCreatedInFolder(folderPath)) {
                items.push({ data: () => __awaiter(this, void 0, void 0, function* () { return folderPath; }), label: folderPath });
            }
        }
        if (items.length > 0) {
            items.push({ data: selectFolderForAddon, label: 'Open Folder...' });
            let item = yield (0, select_utils_1.letUserPickItem)(items);
            return yield item.data();
        }
        else {
            return yield selectFolderForAddon();
        }
    });
}
function selectFolderForAddon() {
    return __awaiter(this, void 0, void 0, function* () {
        let value = yield vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'New Addon'
        });
        if (value === undefined)
            return Promise.reject((0, utils_1.cancel)());
        let folderPath = value[0].fsPath;
        if (!(yield canAddonBeCreatedInFolder(folderPath))) {
            let message = 'Cannot create new addon in this folder.';
            message += ' Maybe it contains other files already.';
            return Promise.reject(new Error(message));
        }
        return folderPath;
    });
}
function canAddonBeCreatedInFolder(folder) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(resolve => {
            fs.stat(folder, (err, stat) => {
                if (err !== null) {
                    resolve(false);
                    return;
                }
                if (!stat.isDirectory()) {
                    resolve(false);
                    return;
                }
                fs.readdir(folder, {}, (err, files) => {
                    for (let name of files) {
                        if (!name.startsWith('.')) {
                            resolve(false);
                            return;
                        }
                    }
                    resolve(true);
                });
            });
        });
    });
}
function fixAddonFolderName(folder) {
    return __awaiter(this, void 0, void 0, function* () {
        let name = path.basename(folder);
        if ((0, utils_1.isValidPythonModuleName)(name)) {
            return folder;
        }
        let items = [];
        let alternatives = getFolderNameAlternatives(name).map(newName => path.join(path.dirname(folder), newName));
        items.push(...alternatives.filter((p) => __awaiter(this, void 0, void 0, function* () { return !(yield (0, utils_1.pathExists)(p)); })).map(p => ({ label: p, data: p })));
        items.push({ label: "Don't change the name.", data: folder });
        let item = yield (0, select_utils_1.letUserPickItem)(items, 'Warning: This folder name should not be used.');
        let newPath = item.data;
        if (folder !== newPath) {
            (0, utils_1.renamePath)(folder, newPath);
        }
        return newPath;
    });
}
function getFolderNameAlternatives(name) {
    let alternatives = [];
    alternatives.push(name.replace(/\W/, '_'));
    alternatives.push(name.replace(/\W/, ''));
    return alternatives;
}
function askUser_SettingsForNewAddon() {
    return __awaiter(this, void 0, void 0, function* () {
        let addonName = yield vscode.window.showInputBox({ placeHolder: 'Addon Name' });
        if (addonName === undefined) {
            return Promise.reject((0, utils_1.cancel)());
        }
        else if (addonName === "") {
            return Promise.reject(new Error('Can\'t create an addon without a name.'));
        }
        let authorName = yield vscode.window.showInputBox({ placeHolder: 'Your Name' });
        if (authorName === undefined) {
            return Promise.reject((0, utils_1.cancel)());
        }
        else if (authorName === "") {
            return Promise.reject(new Error('Can\'t create an addon without an author name.'));
        }
        return [addonName, authorName];
    });
}
function generateAddon_Simple(folder, addonName, authorName) {
    return __awaiter(this, void 0, void 0, function* () {
        let srcDir = path.join(addonTemplateDir, 'simple');
        let initSourcePath = path.join(srcDir, '__init__.py');
        let initTargetPath = path.join(folder, '__init__.py');
        yield copyModifiedInitFile(initSourcePath, initTargetPath, addonName, authorName);
        return initTargetPath;
    });
}
function generateAddon_WithAutoLoad(folder, addonName, authorName) {
    return __awaiter(this, void 0, void 0, function* () {
        let srcDir = path.join(addonTemplateDir, 'with_auto_load');
        let initSourcePath = path.join(srcDir, '__init__.py');
        let initTargetPath = path.join(folder, '__init__.py');
        yield copyModifiedInitFile(initSourcePath, initTargetPath, addonName, authorName);
        let autoLoadSourcePath = path.join(srcDir, 'auto_load.py');
        let autoLoadTargetPath = path.join(folder, 'auto_load.py');
        yield copyFileWithReplacedText(autoLoadSourcePath, autoLoadTargetPath, {});
        try {
            let defaultFilePath = path.join(folder, yield getDefaultFileName());
            if (!(yield (0, utils_1.pathExists)(defaultFilePath))) {
                yield (0, utils_1.writeTextFile)(defaultFilePath, 'import bpy\n');
            }
            return defaultFilePath;
        }
        catch (_a) {
            return initTargetPath;
        }
    });
}
function getDefaultFileName() {
    return __awaiter(this, void 0, void 0, function* () {
        let items = [];
        items.push({ label: '__init__.py' });
        items.push({ label: 'operators.py' });
        let item = yield (0, select_utils_1.letUserPickItem)(items, 'Open File');
        return item.label;
    });
}
function copyModifiedInitFile(src, dst, addonName, authorName) {
    return __awaiter(this, void 0, void 0, function* () {
        yield copyFileWithReplacedText(src, dst, {
            ADDON_NAME: addonName,
            AUTHOR_NAME: authorName,
        });
    });
}
function copyFileWithReplacedText(src, dst, replacements) {
    return __awaiter(this, void 0, void 0, function* () {
        let text = yield (0, utils_1.readTextFile)(src);
        let new_text = (0, utils_1.multiReplaceText)(text, replacements);
        yield (0, utils_1.writeTextFile)(dst, new_text);
    });
}
//# sourceMappingURL=new_addon.js.map