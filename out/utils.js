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
exports.isValidPythonModuleName = exports.multiReplaceText = exports.startsWithNumber = exports.nameToClassIdentifier = exports.nameToIdentifier = exports.addFolderToWorkspace = exports.runTask = exports.getConfig = exports.isDirectory = exports.getSubfolders = exports.pathsExist = exports.pathExists = exports.copyFile = exports.renamePath = exports.writeTextFile = exports.readTextFile = exports.getRandomString = exports.handleErrors = exports.getAnyWorkspaceFolder = exports.getWorkspaceFolders = exports.executeTask = exports.waitUntilTaskEnds = exports.cancel = void 0;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const crypto = require("crypto");
const CANCEL = 'CANCEL';
function cancel() {
    return new Error(CANCEL);
}
exports.cancel = cancel;
function waitUntilTaskEnds(taskName) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(resolve => {
            let disposable = vscode.tasks.onDidEndTask(e => {
                if (e.execution.task.name === taskName) {
                    disposable.dispose();
                    resolve();
                }
            });
        });
    });
}
exports.waitUntilTaskEnds = waitUntilTaskEnds;
function executeTask(taskName_1) {
    return __awaiter(this, arguments, void 0, function* (taskName, wait = false) {
        yield vscode.commands.executeCommand('workbench.action.tasks.runTask', taskName);
        if (wait) {
            yield waitUntilTaskEnds(taskName);
        }
    });
}
exports.executeTask = executeTask;
function getWorkspaceFolders() {
    let folders = vscode.workspace.workspaceFolders;
    if (folders === undefined)
        return [];
    else
        return folders;
}
exports.getWorkspaceFolders = getWorkspaceFolders;
function getAnyWorkspaceFolder() {
    let folders = getWorkspaceFolders();
    if (folders.length === 0) {
        throw new Error('no workspace folder found');
    }
    return folders[0];
}
exports.getAnyWorkspaceFolder = getAnyWorkspaceFolder;
function handleErrors(func) {
    return () => __awaiter(this, void 0, void 0, function* () {
        try {
            yield func();
        }
        catch (err) {
            if (err.message !== CANCEL) {
                vscode.window.showErrorMessage(err.message);
            }
        }
    });
}
exports.handleErrors = handleErrors;
function getRandomString(length = 10) {
    return crypto.randomBytes(length).toString('hex').substring(0, length);
}
exports.getRandomString = getRandomString;
function readTextFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err !== null) {
                reject(new Error(`Could not read the file: ${path}`));
            }
            else {
                resolve(data);
            }
        });
    });
}
exports.readTextFile = readTextFile;
function writeTextFile(path, content) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resove, reject) => {
            fs.writeFile(path, content, err => {
                if (err !== null) {
                    return reject(err);
                }
                else {
                    resove();
                }
            });
        });
    });
}
exports.writeTextFile = writeTextFile;
function renamePath(oldPath, newPath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs.rename(oldPath, newPath, err => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    });
}
exports.renamePath = renamePath;
function copyFile(from, to) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs.copyFile(from, to, err => {
                if (err === null)
                    resolve();
                else
                    reject(err);
            });
        });
    });
}
exports.copyFile = copyFile;
function pathExists(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(resolve => {
            fs.stat(path, (err, stats) => {
                resolve(err === null);
            });
        });
    });
}
exports.pathExists = pathExists;
function pathsExist(paths) {
    return __awaiter(this, void 0, void 0, function* () {
        let promises = paths.map(p => pathExists(p));
        let results = yield Promise.all(promises);
        return results.every(v => v);
    });
}
exports.pathsExist = pathsExist;
function getSubfolders(root) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs.readdir(root, { encoding: 'utf8' }, (err, files) => __awaiter(this, void 0, void 0, function* () {
                if (err !== null) {
                    reject(err);
                    return;
                }
                let folders = [];
                for (let name of files) {
                    let fullpath = path.join(root, name);
                    if (yield isDirectory(fullpath)) {
                        folders.push(fullpath);
                    }
                }
                resolve(folders);
            }));
        });
    });
}
exports.getSubfolders = getSubfolders;
function isDirectory(filepath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(resolve => {
            fs.stat(filepath, (err, stat) => {
                if (err !== null)
                    resolve(false);
                else
                    resolve(stat.isDirectory());
            });
        });
    });
}
exports.isDirectory = isDirectory;
function getConfig(resource = undefined) {
    return vscode.workspace.getConfiguration('blender', resource);
}
exports.getConfig = getConfig;
function runTask(name_1, execution_1) {
    return __awaiter(this, arguments, void 0, function* (name, execution, wait = false, target = getAnyWorkspaceFolder(), identifier = getRandomString()) {
        let taskDefinition = { type: identifier };
        let source = 'blender';
        let problemMatchers = [];
        let task = new vscode.Task(taskDefinition, target, name, source, execution, problemMatchers);
        let taskExecution = yield vscode.tasks.executeTask(task);
        if (wait) {
            return new Promise(resolve => {
                let disposable = vscode.tasks.onDidEndTask(e => {
                    if (e.execution.task.definition.type === identifier) {
                        disposable.dispose();
                        resolve(taskExecution);
                    }
                });
            });
        }
        else {
            return taskExecution;
        }
    });
}
exports.runTask = runTask;
function addFolderToWorkspace(folder) {
    /* Warning: This might restart all extensions if there was no folder before. */
    vscode.workspace.updateWorkspaceFolders(getWorkspaceFolders().length, null, { uri: vscode.Uri.file(folder) });
}
exports.addFolderToWorkspace = addFolderToWorkspace;
function nameToIdentifier(name) {
    return name.toLowerCase().replace(/\W+/, '_');
}
exports.nameToIdentifier = nameToIdentifier;
function nameToClassIdentifier(name) {
    let parts = name.split(/\W+/);
    let result = '';
    let allowNumber = false;
    for (let part of parts) {
        if (part.length > 0 && (allowNumber || !startsWithNumber(part))) {
            result += part.charAt(0).toUpperCase() + part.slice(1);
            allowNumber = true;
        }
    }
    return result;
}
exports.nameToClassIdentifier = nameToClassIdentifier;
function startsWithNumber(text) {
    return text.charAt(0).match(/[0-9]/) !== null;
}
exports.startsWithNumber = startsWithNumber;
function multiReplaceText(text, replacements) {
    for (let old of Object.keys(replacements)) {
        text = text.replace(old, replacements[old]);
    }
    return text;
}
exports.multiReplaceText = multiReplaceText;
function isValidPythonModuleName(text) {
    let match = text.match(/^[_a-z][_0-9a-z]*$/i);
    return match !== null;
}
exports.isValidPythonModuleName = isValidPythonModuleName;
//# sourceMappingURL=utils.js.map