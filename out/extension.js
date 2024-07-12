'use strict';
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
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const utils_1 = require("./utils");
const new_addon_1 = require("./new_addon");
const new_operator_1 = require("./new_operator");
const addon_folder_1 = require("./addon_folder");
const blender_executable_1 = require("./blender_executable");
const blender_folder_1 = require("./blender_folder");
const communication_1 = require("./communication");
const scripts_1 = require("./scripts");
const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
function activate(context) {
    let commands = [
        ['blender.start', COMMAND_start],
        ['blender.stop', COMMAND_stop],
        ['blender.build', COMMAND_build],
        ['blender.buildAndStart', COMMAND_buildAndStart],
        ['blender.startWithoutCDebugger', COMMAND_startWithoutCDebugger],
        ['blender.buildPythonApiDocs', COMMAND_buildPythonApiDocs],
        ['blender.reloadAddons', COMMAND_reloadAddons],
        ['blender.newAddon', new_addon_1.COMMAND_newAddon],
        ['blender.newScript', scripts_1.COMMAND_newScript],
        ['blender.openScriptsFolder', scripts_1.COMMAND_openScriptsFolder],
        ['blender.generateManifest', COMMAND_generateManifest],
        ['blender.createManifest', COMMAND_createManifest],
    ];
    let textEditorCommands = [
        ['blender.runScript', scripts_1.COMMAND_runScript],
        ['blender.setScriptContext', scripts_1.COMMAND_setScriptContext],
        ['blender.newOperator', new_operator_1.COMMAND_newOperator],
    ];
    let disposables = [
        vscode.workspace.onDidSaveTextDocument(HANDLER_updateOnSave),
    ];
    for (let [identifier, func] of commands) {
        let command = vscode.commands.registerCommand(identifier, (0, utils_1.handleErrors)(func));
        disposables.push(command);
    }
    for (let [identifier, func] of textEditorCommands) {
        let command = vscode.commands.registerTextEditorCommand(identifier, (0, utils_1.handleErrors)(func));
        disposables.push(command);
    }
    context.subscriptions.push(...disposables);
    (0, communication_1.startServer)();
}
exports.activate = activate;
function deactivate() {
    (0, communication_1.stopServer)();
}
exports.deactivate = deactivate;
/* Commands
 *********************************************/
function COMMAND_buildAndStart() {
    return __awaiter(this, void 0, void 0, function* () {
        yield COMMAND_build();
        yield COMMAND_start();
    });
}
function COMMAND_start() {
    return __awaiter(this, void 0, void 0, function* () {
        let blenderFolder = yield blender_folder_1.BlenderWorkspaceFolder.Get();
        if (blenderFolder === null) {
            yield blender_executable_1.BlenderExecutable.LaunchAny();
        }
        else {
            yield blender_executable_1.BlenderExecutable.LaunchDebug(blenderFolder);
        }
    });
}
function COMMAND_generateManifest() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder is open');
                return;
            }
            const workspacePath = workspaceFolders[0].uri.fsPath;
            const generateTomlScript = path.join(__dirname, '..', 'pythonFiles', 'include', 'blender_vscode', 'generate_toml.py');
            if (!fs.existsSync(generateTomlScript)) {
                vscode.window.showErrorMessage('generate_toml.py script not found in the extension directory');
                return;
            }
            const manifestFilePath = path.join(workspacePath, 'blender_manifest.toml');
            // Check if the blender_manifest.toml file exists
            if (fs.existsSync(manifestFilePath)) {
                vscode.window.showInformationMessage('blender_manifest.toml file already exists in the workspace directory.');
                vscode.window.showErrorMessage('generate_toml.py script not found in the extension directory');
                const command = `python "${generateTomlScript}" "${workspacePath}" "!" "!" "!" "!"`;
                // Construct the command to execute Python script with directory argument
                // const command = `python "${generateTomlScript}" "${workspacePath}"`;
                // Execute the Python script asynchronously
                child_process.exec(command, (error, stdout, stderr) => {
                    if (error) {
                        vscode.window.showErrorMessage(`Failed to execute generate_toml.py: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        vscode.window.showErrorMessage(`Error from generate_toml.py: ${stderr}`);
                        return;
                    }
                    vscode.window.showInformationMessage(stdout);
                });
            }
            else {
                const licenseOptions = [
                    { label: 'SPDX:GPL-2.0-or-later', description: 'GNU General Public License v2.0 or later' },
                    { label: 'SPDX:GPL-3.0-or-later', description: 'GNU General Public License v3.0 or later' },
                    { label: 'SPDX:LGPL-2.1-or-later', description: 'GNU Lesser General Public License v2.1 or later' },
                    { label: 'SPDX:LGPL-3.0-or-later', description: 'GNU Lesser General Public License v3.0 or later' },
                    { label: 'SPDX:BSD-1-Clause', description: 'BSD 1-Clause "Simplified" License' },
                    { label: 'SPDX:BSD-2-Clause', description: 'BSD 2-Clause "Simplified" License' },
                    { label: 'SPDX:BSD-3-Clause', description: 'BSD 3-Clause "New" or "Revised" License' },
                    { label: 'SPDX:BSL-1.0', description: 'Boost Software License 1.0' },
                    { label: 'SPDX:MIT', description: 'MIT License' },
                    { label: 'SPDX:MIT-0', description: 'MIT No Attribution' },
                    { label: 'SPDX:MPL-2.0', description: 'Mozilla Public License 2.0' },
                    { label: 'SPDX:Pixar', description: 'Pixar License' },
                    { label: 'SPDX:Zlib', description: 'Zlib License' },
                ];
                const license = yield vscode.window.showQuickPick(licenseOptions, {
                    placeHolder: 'Select an option for license'
                });
                if (!license) {
                    vscode.window.showErrorMessage('License selection canceled');
                    return;
                }
                const tagsOptions = [
                    { label: '3D View', description: 'Tag for 3D View' },
                    { label: 'Add Curve', description: 'Tag for Add Curve' },
                    { label: 'Add Mesh', description: 'Tag for Add Mesh' },
                    { label: 'Animation', description: 'Tag for Animation' },
                    { label: 'Bake', description: 'Tag for Bake' },
                    { label: 'Camera', description: 'Tag for Camera' },
                    { label: 'Compositing', description: 'Tag for Compositing' },
                    { label: 'Development', description: 'Tag for Development' },
                    { label: 'Game Engine', description: 'Tag for Game Engine' },
                    { label: 'Geometry Nodes', description: 'Tag for Geometry Nodes' },
                    { label: 'Grease Pencil', description: 'Tag for Grease Pencil' },
                    { label: 'Import-Export', description: 'Tag for Import-Export' },
                    { label: 'Lighting', description: 'Tag for Lighting' },
                    { label: 'Material', description: 'Tag for Material' },
                    { label: 'Modeling', description: 'Tag for Modeling' },
                    { label: 'Mesh', description: 'Tag for Mesh' },
                    { label: 'Node', description: 'Tag for Node' },
                    { label: 'Object', description: 'Tag for Object' },
                    { label: 'Paint', description: 'Tag for Paint' },
                    { label: 'Pipeline', description: 'Tag for Pipeline' },
                    { label: 'Physics', description: 'Tag for Physics' },
                    { label: 'Render', description: 'Tag for Render' },
                    { label: 'Rigging', description: 'Tag for Rigging' },
                    { label: 'Scene', description: 'Tag for Scene' },
                    { label: 'Sculpt', description: 'Tag for Sculpt' },
                    { label: 'Sequencer', description: 'Tag for Sequencer' },
                    { label: 'System', description: 'Tag for System' },
                    { label: 'Text Editor', description: 'Tag for Text Editor' },
                    { label: 'Tracking', description: 'Tag for Tracking' },
                    { label: 'User Interface', description: 'Tag for User Interface' },
                    { label: 'UV', description: 'Tag for UV' },
                ];
                const selectedTags = yield vscode.window.showQuickPick(tagsOptions, {
                    placeHolder: 'Select one or more tags',
                    canPickMany: true // Enable multiple selection
                });
                if (!selectedTags) {
                    vscode.window.showErrorMessage('Tag selection canceled');
                    return;
                }
                const permissionsOptions = [
                    { label: 'Files', description: 'Access to read and write files' },
                    { label: 'Network', description: 'Access to network resources' },
                    { label: 'Clipboard', description: 'Access to clipboard contents' },
                    { label: 'Camera', description: 'Access to camera device' },
                    { label: 'Microphone', description: 'Access to microphone device' },
                ];
                const selectedPermissions = yield vscode.window.showQuickPick(permissionsOptions, {
                    placeHolder: 'Select one or more permissions',
                    canPickMany: true // Enable multiple selection
                });
                const permissionsWithReasons = [];
                if (selectedPermissions) {
                    for (const permission of selectedPermissions) {
                        const reason = yield vscode.window.showInputBox({
                            prompt: `Enter the reason for requesting the ${permission.label} permission (optional)`,
                            placeHolder: `Reason for ${permission.label} permission (optional)`
                        });
                        permissionsWithReasons.push({ label: permission.label, reason: reason || '' });
                    }
                }
                // const manifest = {
                //     name: name,
                //     version: version,
                //     maintainer: maintainer,
                //     tagline:tagline,
                //     blender_version_min: minBlenderVersion,
                //     website: website,
                //     tags: selectedTags.map(tag => tag.label),
                //     license: license.label,
                //     permissions: selectedPermissions.map(permission => permission.label),
                //     // Add other properties as needed
                // };
                const tagsList = selectedTags.map(tag => `${tag.label}`).join('::');
                const permissionsList = selectedPermissions ? selectedPermissions.map(permission => permission.label).join('::') : '';
                const permissionsReasonsList = permissionsWithReasons ? permissionsWithReasons.map(permission => `${permission.reason}`).join('::') : '';
                // Construct the command to execute Python script with directory argument and manifest properties
                const command = `python "${generateTomlScript}" "${workspacePath}" "${tagsList}" "${license.label}" "${permissionsList}" "${permissionsReasonsList}"`;
                // Construct the command to execute Python script with directory argument
                // const command = `python "${generateTomlScript}" "${workspacePath}"`;
                // Execute the Python script asynchronously
                child_process.exec(command, (error, stdout, stderr) => {
                    if (error) {
                        vscode.window.showErrorMessage(`Failed to execute generate_toml.py: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        vscode.window.showErrorMessage(`Error from generate_toml.py: ${stderr}`);
                        return;
                    }
                    vscode.window.showInformationMessage(stdout);
                });
            }
        }
        catch (error) {
            vscode.window.showErrorMessage('An error occurred: ' + error.message); // Type assertion here
        }
    });
}
function COMMAND_createManifest() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder is open');
                return;
            }
            const workspacePath = workspaceFolders[0].uri.fsPath;
            const generateTomlScript = path.join(__dirname, '..', 'pythonFiles', 'include', 'blender_vscode', 'generate_toml.py');
            if (!fs.existsSync(generateTomlScript)) {
                vscode.window.showErrorMessage('generate_toml.py script not found in the extension directory');
                return;
            }
            const name = yield vscode.window.showInputBox({ prompt: 'Enter addon name' });
            if (!name) {
                vscode.window.showErrorMessage('Addon name is required');
                return;
            }
            const version = yield vscode.window.showInputBox({ prompt: 'Enter addon version' });
            if (!version) {
                vscode.window.showErrorMessage('Addon version is required');
                return;
            }
            const tagline = yield vscode.window.showInputBox({ prompt: 'Enter Tagline/Description' });
            // if (!tagline) {
            //     vscode.window.showErrorMessage('Tagline/description is required');
            //     return;
            // }
            const maintainer = yield vscode.window.showInputBox({ prompt: 'Enter Author/Maintainer' });
            if (!maintainer) {
                vscode.window.showErrorMessage('Maintainer/Author version is required');
                return;
            }
            const website = yield vscode.window.showInputBox({ prompt: 'Enter Website/Documentaion Link' });
            // if (!website) {
            //     vscode.window.showErrorMessage('Maintainer/Author version is required');
            //     return;
            // }
            const licenseOptions = [
                { label: 'SPDX:GPL-2.0-or-later', description: 'GNU General Public License v2.0 or later' },
                { label: 'SPDX:GPL-3.0-or-later', description: 'GNU General Public License v3.0 or later' },
                { label: 'SPDX:LGPL-2.1-or-later', description: 'GNU Lesser General Public License v2.1 or later' },
                { label: 'SPDX:LGPL-3.0-or-later', description: 'GNU Lesser General Public License v3.0 or later' },
                { label: 'SPDX:BSD-1-Clause', description: 'BSD 1-Clause "Simplified" License' },
                { label: 'SPDX:BSD-2-Clause', description: 'BSD 2-Clause "Simplified" License' },
                { label: 'SPDX:BSD-3-Clause', description: 'BSD 3-Clause "New" or "Revised" License' },
                { label: 'SPDX:BSL-1.0', description: 'Boost Software License 1.0' },
                { label: 'SPDX:MIT', description: 'MIT License' },
                { label: 'SPDX:MIT-0', description: 'MIT No Attribution' },
                { label: 'SPDX:MPL-2.0', description: 'Mozilla Public License 2.0' },
                { label: 'SPDX:Pixar', description: 'Pixar License' },
                { label: 'SPDX:Zlib', description: 'Zlib License' },
            ];
            const license = yield vscode.window.showQuickPick(licenseOptions, {
                placeHolder: 'Select an option for license'
            });
            if (!license) {
                vscode.window.showErrorMessage('License selection canceled');
                return;
            }
            const minBlenderVersion = yield vscode.window.showInputBox({ prompt: 'Enter minimum Blender version' });
            if (!minBlenderVersion) {
                vscode.window.showErrorMessage('Minimum Blender version is required');
                return;
            }
            const tagsOptions = [
                { label: '3D View', description: 'Tag for 3D View' },
                { label: 'Add Curve', description: 'Tag for Add Curve' },
                { label: 'Add Mesh', description: 'Tag for Add Mesh' },
                { label: 'Animation', description: 'Tag for Animation' },
                { label: 'Bake', description: 'Tag for Bake' },
                { label: 'Camera', description: 'Tag for Camera' },
                { label: 'Compositing', description: 'Tag for Compositing' },
                { label: 'Development', description: 'Tag for Development' },
                { label: 'Game Engine', description: 'Tag for Game Engine' },
                { label: 'Geometry Nodes', description: 'Tag for Geometry Nodes' },
                { label: 'Grease Pencil', description: 'Tag for Grease Pencil' },
                { label: 'Import-Export', description: 'Tag for Import-Export' },
                { label: 'Lighting', description: 'Tag for Lighting' },
                { label: 'Material', description: 'Tag for Material' },
                { label: 'Modeling', description: 'Tag for Modeling' },
                { label: 'Mesh', description: 'Tag for Mesh' },
                { label: 'Node', description: 'Tag for Node' },
                { label: 'Object', description: 'Tag for Object' },
                { label: 'Paint', description: 'Tag for Paint' },
                { label: 'Pipeline', description: 'Tag for Pipeline' },
                { label: 'Physics', description: 'Tag for Physics' },
                { label: 'Render', description: 'Tag for Render' },
                { label: 'Rigging', description: 'Tag for Rigging' },
                { label: 'Scene', description: 'Tag for Scene' },
                { label: 'Sculpt', description: 'Tag for Sculpt' },
                { label: 'Sequencer', description: 'Tag for Sequencer' },
                { label: 'System', description: 'Tag for System' },
                { label: 'Text Editor', description: 'Tag for Text Editor' },
                { label: 'Tracking', description: 'Tag for Tracking' },
                { label: 'User Interface', description: 'Tag for User Interface' },
                { label: 'UV', description: 'Tag for UV' },
            ];
            const selectedTags = yield vscode.window.showQuickPick(tagsOptions, {
                placeHolder: 'Select one or more tags',
                canPickMany: true // Enable multiple selection
            });
            if (!selectedTags) {
                vscode.window.showErrorMessage('Tag selection canceled');
                return;
            }
            const permissionsOptions = [
                { label: 'Files', description: 'Access to read and write files' },
                { label: 'Network', description: 'Access to network resources' },
                { label: 'Clipboard', description: 'Access to clipboard contents' },
                { label: 'Camera', description: 'Access to camera device' },
                { label: 'Microphone', description: 'Access to microphone device' },
            ];
            const selectedPermissions = yield vscode.window.showQuickPick(permissionsOptions, {
                placeHolder: 'Select one or more permissions',
                canPickMany: true // Enable multiple selection
            });
            const permissionsWithReasons = [];
            if (selectedPermissions) {
                for (const permission of selectedPermissions) {
                    const reason = yield vscode.window.showInputBox({
                        prompt: `Enter the reason for requesting the ${permission.label} permission (optional)`,
                        placeHolder: `Reason for ${permission.label} permission (optional)`
                    });
                    permissionsWithReasons.push({ label: permission.label, reason: reason || '' });
                }
            }
            // const manifest = {
            //     name: name,
            //     version: version,
            //     maintainer: maintainer,
            //     tagline:tagline,
            //     blender_version_min: minBlenderVersion,
            //     website: website,
            //     tags: selectedTags.map(tag => tag.label),
            //     license: license.label,
            //     permissions: selectedPermissions.map(permission => permission.label),
            //     // Add other properties as needed
            // };
            const tagsList = selectedTags.map(tag => `${tag.label}`).join('::');
            const permissionsList = selectedPermissions ? selectedPermissions.map(permission => permission.label).join('::') : '';
            const permissionsReasonsList = permissionsWithReasons ? permissionsWithReasons.map(permission => `${permission.reason}`).join('::') : '';
            // Construct the command to execute Python script with directory argument and manifest properties
            const command = `python "${generateTomlScript}" "${workspacePath}" "${name}" "${version}" "${maintainer}" "${tagline}" "${minBlenderVersion}" "${website}" "${tagsList}" "${license.label}" "${permissionsList}" "${permissionsReasonsList}"`;
            // const command = `python "${generateTomlScript}" "${workspacePath}" "${name}" "${version}" `;
            // console.log(command)
            // Execute the Python script asynchronously
            child_process.exec(command, (error, stdout, stderr) => {
                if (error) {
                    vscode.window.showErrorMessage(`Failed to execute generate_toml.py: ${error.message}`);
                    return;
                }
                if (stderr) {
                    vscode.window.showErrorMessage(`Error from generate_toml.py: ${stderr}`);
                    return;
                }
                vscode.window.showInformationMessage(stdout);
            });
            // Do something with the manifest, such as saving to a file or sending to a Python script
            // console.log('Created manifest:', manifest);
            vscode.window.showInformationMessage('Manifest created successfully');
        }
        catch (error) {
            vscode.window.showErrorMessage('An error occurred: ' + error.message);
        }
    });
}
function COMMAND_stop() {
    return __awaiter(this, void 0, void 0, function* () {
        communication_1.RunningBlenders.sendToAll({ type: 'stop' });
    });
}
function COMMAND_build() {
    return __awaiter(this, void 0, void 0, function* () {
        yield rebuildAddons(yield addon_folder_1.AddonWorkspaceFolder.All());
        let blenderFolder = yield blender_folder_1.BlenderWorkspaceFolder.Get();
        if (blenderFolder !== null) {
            yield blenderFolder.buildDebug();
        }
    });
}
function COMMAND_startWithoutCDebugger() {
    return __awaiter(this, void 0, void 0, function* () {
        yield blender_executable_1.BlenderExecutable.LaunchAny();
    });
}
function COMMAND_buildPythonApiDocs() {
    return __awaiter(this, void 0, void 0, function* () {
        let folder = yield blender_folder_1.BlenderWorkspaceFolder.Get();
        if (folder === null) {
            vscode.window.showInformationMessage('Cannot generate API docs without Blender source code.');
            return;
        }
        let part = yield vscode.window.showInputBox({ placeHolder: 'part' });
        if (part === undefined)
            return;
        yield folder.buildPythonDocs(part);
    });
}
let isSavingForReload = false;
function COMMAND_reloadAddons() {
    return __awaiter(this, void 0, void 0, function* () {
        isSavingForReload = true;
        yield vscode.workspace.saveAll(false);
        isSavingForReload = false;
        yield reloadAddons(yield addon_folder_1.AddonWorkspaceFolder.All());
    });
}
function reloadAddons(addons) {
    return __awaiter(this, void 0, void 0, function* () {
        if (addons.length === 0)
            return;
        let instances = yield communication_1.RunningBlenders.getResponsive();
        if (instances.length === 0)
            return;
        yield rebuildAddons(addons);
        let names = yield Promise.all(addons.map(a => a.getModuleName()));
        instances.forEach(instance => instance.post({ type: 'reload', names: names }));
    });
}
function rebuildAddons(addons) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all(addons.map(a => a.buildIfNecessary()));
    });
}
/* Event Handlers
 ***************************************/
function HANDLER_updateOnSave(document) {
    return __awaiter(this, void 0, void 0, function* () {
        if (isSavingForReload)
            return;
        let addons = yield addon_folder_1.AddonWorkspaceFolder.All();
        yield reloadAddons(addons.filter(a => a.reloadOnSave));
    });
}
//# sourceMappingURL=extension.js.map