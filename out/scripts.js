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
exports.getStoredScriptFolders = exports.COMMAND_setScriptContext = exports.COMMAND_openScriptsFolder = exports.COMMAND_newScript = exports.COMMAND_runScript = void 0;
const vscode = require("vscode");
const path = require("path");
const paths_1 = require("./paths");
const communication_1 = require("./communication");
const select_utils_1 = require("./select_utils");
const data_loader_1 = require("./data_loader");
const utils_1 = require("./utils");
function COMMAND_runScript() {
    return __awaiter(this, void 0, void 0, function* () {
        let editor = vscode.window.activeTextEditor;
        if (editor === undefined)
            return Promise.reject(new Error('no active script'));
        let document = editor.document;
        yield document.save();
        communication_1.RunningBlenders.sendToResponsive({ type: 'script', path: document.uri.fsPath });
    });
}
exports.COMMAND_runScript = COMMAND_runScript;
function COMMAND_newScript() {
    return __awaiter(this, void 0, void 0, function* () {
        let [folderPath, filePath] = yield getPathForNewScript();
        yield createNewScriptAtPath(filePath);
        yield vscode.window.showTextDocument(vscode.Uri.file(filePath));
        yield vscode.commands.executeCommand('cursorBottom');
        (0, utils_1.addFolderToWorkspace)(folderPath);
    });
}
exports.COMMAND_newScript = COMMAND_newScript;
function COMMAND_openScriptsFolder() {
    return __awaiter(this, void 0, void 0, function* () {
        let folderPath = yield getFolderForScripts();
        (0, utils_1.addFolderToWorkspace)(folderPath);
    });
}
exports.COMMAND_openScriptsFolder = COMMAND_openScriptsFolder;
function COMMAND_setScriptContext() {
    return __awaiter(this, void 0, void 0, function* () {
        let editor = vscode.window.activeTextEditor;
        if (editor === undefined)
            return;
        let items = (yield (0, data_loader_1.getAreaTypeItems)()).map(item => ({ label: item.name, description: item.identifier }));
        let item = yield (0, select_utils_1.letUserPickItem)(items);
        yield setScriptContext(editor.document, item.description);
    });
}
exports.COMMAND_setScriptContext = COMMAND_setScriptContext;
function setScriptContext(document, areaType) {
    return __awaiter(this, void 0, void 0, function* () {
        let workspaceEdit = new vscode.WorkspaceEdit();
        let [line, match] = findAreaContextLine(document);
        if (match === null) {
            workspaceEdit.insert(document.uri, new vscode.Position(0, 0), `# context.area: ${areaType}\n`);
        }
        else {
            let start = new vscode.Position(line, match[0].length);
            let end = new vscode.Position(line, document.lineAt(line).range.end.character);
            let range = new vscode.Range(start, end);
            workspaceEdit.replace(document.uri, range, areaType);
        }
        yield vscode.workspace.applyEdit(workspaceEdit);
    });
}
function findAreaContextLine(document) {
    for (let i = 0; i < document.lineCount; i++) {
        let line = document.lineAt(i);
        let match = line.text.match(/^\s*#\s*context\.area\s*:\s*/i);
        if (match !== null) {
            return [i, match];
        }
    }
    return [-1, null];
}
function getPathForNewScript() {
    return __awaiter(this, void 0, void 0, function* () {
        let folderPath = yield getFolderForScripts();
        let fileName = yield askUser_ScriptFileName(folderPath);
        let filePath = path.join(folderPath, fileName);
        if (yield (0, utils_1.pathExists)(filePath)) {
            return Promise.reject(new Error('file exists already'));
        }
        return [folderPath, filePath];
    });
}
function createNewScriptAtPath(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        let defaultScriptPath = path.join(paths_1.templateFilesDir, 'script.py');
        yield (0, utils_1.copyFile)(defaultScriptPath, filePath);
    });
}
function getFolderForScripts() {
    return __awaiter(this, void 0, void 0, function* () {
        let scriptFolders = getStoredScriptFolders();
        let items = [];
        for (let folderData of scriptFolders) {
            let useCustomName = folderData.name !== '';
            items.push({
                label: useCustomName ? folderData.name : folderData.path,
                data: () => __awaiter(this, void 0, void 0, function* () { return folderData; }),
            });
        }
        items.push({
            label: 'New Folder...',
            data: askUser_ScriptFolder,
        });
        let item = yield (0, select_utils_1.letUserPickItem)(items);
        let folderData = yield item.data();
        if (scriptFolders.find(data => data.path === folderData.path) === undefined) {
            scriptFolders.push(folderData);
            let config = (0, utils_1.getConfig)();
            config.update('scripts.directories', scriptFolders, vscode.ConfigurationTarget.Global);
        }
        return folderData.path;
    });
}
function getStoredScriptFolders() {
    let config = (0, utils_1.getConfig)();
    return config.get('scripts.directories');
}
exports.getStoredScriptFolders = getStoredScriptFolders;
function askUser_ScriptFolder() {
    return __awaiter(this, void 0, void 0, function* () {
        let value = yield vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Script Folder'
        });
        if (value === undefined)
            return Promise.reject((0, utils_1.cancel)());
        return {
            path: value[0].fsPath,
            name: ''
        };
    });
}
function askUser_ScriptFileName(folder) {
    return __awaiter(this, void 0, void 0, function* () {
        let defaultName = yield getDefaultScriptName(folder);
        let name = yield vscode.window.showInputBox({
            value: defaultName
        });
        if (name === undefined)
            return Promise.reject((0, utils_1.cancel)());
        if (!name.toLowerCase().endsWith('.py')) {
            name += '.py';
        }
        return name;
    });
}
function getDefaultScriptName(folder) {
    return __awaiter(this, void 0, void 0, function* () {
        while (true) {
            let name = 'script ' + (0, utils_1.getRandomString)(10) + '.py';
            if (!(yield (0, utils_1.pathExists)(path.join(folder, name)))) {
                return name;
            }
        }
    });
}
//# sourceMappingURL=scripts.js.map