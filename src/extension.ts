'use strict';

import * as vscode from 'vscode';
import { handleErrors } from './utils';
import { COMMAND_newAddon } from './new_addon';
import { COMMAND_newOperator } from './new_operator';
import { AddonWorkspaceFolder } from './addon_folder';
import { BlenderExecutable } from './blender_executable';
import { BlenderWorkspaceFolder } from './blender_folder';
import { startServer, stopServer, RunningBlenders } from './communication';
import {
    COMMAND_runScript, COMMAND_newScript, COMMAND_setScriptContext,
    COMMAND_openScriptsFolder
} from './scripts';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
export function activate(context: vscode.ExtensionContext) {
    let commands: [string, () => Promise<void>][] = [
        ['blender.start', COMMAND_start],
        ['blender.stop', COMMAND_stop],
        ['blender.build', COMMAND_build],
        ['blender.buildAndStart', COMMAND_buildAndStart],
        ['blender.startWithoutCDebugger', COMMAND_startWithoutCDebugger],
        ['blender.buildPythonApiDocs', COMMAND_buildPythonApiDocs],
        ['blender.reloadAddons', COMMAND_reloadAddons],
        ['blender.newAddon', COMMAND_newAddon],
        ['blender.newScript', COMMAND_newScript],
        ['blender.openScriptsFolder', COMMAND_openScriptsFolder],
        ['blender.generateManifest', COMMAND_generateManifest],
        ['blender.createManifest', COMMAND_createManifest],
    ];

    let textEditorCommands: [string, () => Promise<void>][] = [
        ['blender.runScript', COMMAND_runScript],
        ['blender.setScriptContext', COMMAND_setScriptContext],
        ['blender.newOperator', COMMAND_newOperator],
    ];

    let disposables = [
        vscode.workspace.onDidSaveTextDocument(HANDLER_updateOnSave),
    ];

    for (let [identifier, func] of commands) {
        let command = vscode.commands.registerCommand(identifier, handleErrors(func));
        disposables.push(command);
    }

    for (let [identifier, func] of textEditorCommands) {
        let command = vscode.commands.registerTextEditorCommand(identifier, handleErrors(func));
        disposables.push(command);
    }

    context.subscriptions.push(...disposables);

    startServer();
}

export function deactivate() {
    stopServer();
}


/* Commands
 *********************************************/

async function COMMAND_buildAndStart() {
    await COMMAND_build();
    await COMMAND_start();
}

async function COMMAND_start() {
    let blenderFolder = await BlenderWorkspaceFolder.Get();
    if (blenderFolder === null) {
        await BlenderExecutable.LaunchAny();
    }
    else {
        await BlenderExecutable.LaunchDebug(blenderFolder);
    }
}
async function COMMAND_generateManifest() {
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
            child_process.exec(command, (error: Error | null, stdout: string, stderr: string) => {
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
        else{
            const licenseOptions: vscode.QuickPickItem[] = [
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

            const license = await vscode.window.showQuickPick(licenseOptions, {
                placeHolder: 'Select an option for license'
            });
            if (!license) {
                vscode.window.showErrorMessage('License selection canceled');
                return;
            }

            const tagsOptions: vscode.QuickPickItem[] = [
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
            
            const selectedTags = await vscode.window.showQuickPick(tagsOptions, {
                placeHolder: 'Select one or more tags',
                canPickMany: true  // Enable multiple selection
            });

            if (!selectedTags) {
                vscode.window.showErrorMessage('Tag selection canceled');
                return;
            }
            const permissionsOptions: vscode.QuickPickItem[] = [
                { label: 'Files', description: 'Access to read and write files' },
                { label: 'Network', description: 'Access to network resources' },
                { label: 'Clipboard', description: 'Access to clipboard contents' },
                { label: 'Camera', description: 'Access to camera device' },
                { label: 'Microphone', description: 'Access to microphone device' },
            ];

            const selectedPermissions = await vscode.window.showQuickPick(permissionsOptions, {
                placeHolder: 'Select one or more permissions',
                canPickMany: true  // Enable multiple selection
            });

            const permissionsWithReasons: { label: string; reason: string; }[] = [];

            if (selectedPermissions) {
                for (const permission of selectedPermissions) {
                    const reason = await vscode.window.showInputBox({
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
            const permissionsReasonsList= permissionsWithReasons?permissionsWithReasons.map(permission => `${permission.reason}`).join('::'):'';
            // Construct the command to execute Python script with directory argument and manifest properties
            const command = `python "${generateTomlScript}" "${workspacePath}" "${tagsList}" "${license.label}" "${permissionsList}" "${permissionsReasonsList}"`;
            // Construct the command to execute Python script with directory argument
            // const command = `python "${generateTomlScript}" "${workspacePath}"`;

            // Execute the Python script asynchronously
            child_process.exec(command, (error: Error | null, stdout: string, stderr: string) => {
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
    } catch (error) {
        vscode.window.showErrorMessage('An error occurred: ' + (error as Error).message); // Type assertion here
    }
}
async function COMMAND_createManifest() {
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
        const name = await vscode.window.showInputBox({ prompt: 'Enter addon name' });
        if (!name) {
            vscode.window.showErrorMessage('Addon name is required');
            return;
        }

        const version = await vscode.window.showInputBox({ prompt: 'Enter addon version' });
        if (!version) {
            vscode.window.showErrorMessage('Addon version is required');
            return;
        }
        const tagline = await vscode.window.showInputBox({ prompt: 'Enter Tagline/Description' });
        // if (!tagline) {
        //     vscode.window.showErrorMessage('Tagline/description is required');
        //     return;
        // }
        const maintainer = await vscode.window.showInputBox({ prompt: 'Enter Author/Maintainer' });
        if (!maintainer) {
            vscode.window.showErrorMessage('Maintainer/Author version is required');
            return;
        }
        const website = await vscode.window.showInputBox({ prompt: 'Enter Website/Documentaion Link' });
        // if (!website) {
        //     vscode.window.showErrorMessage('Maintainer/Author version is required');
        //     return;
        // }
        const licenseOptions: vscode.QuickPickItem[] = [
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

        const license = await vscode.window.showQuickPick(licenseOptions, {
            placeHolder: 'Select an option for license'
        });
        if (!license) {
            vscode.window.showErrorMessage('License selection canceled');
            return;
        }

        const minBlenderVersion = await vscode.window.showInputBox({ prompt: 'Enter minimum Blender version' });
        if (!minBlenderVersion) {
            vscode.window.showErrorMessage('Minimum Blender version is required');
            return;
        }
        const tagsOptions: vscode.QuickPickItem[] = [
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
        
        const selectedTags = await vscode.window.showQuickPick(tagsOptions, {
            placeHolder: 'Select one or more tags',
            canPickMany: true  // Enable multiple selection
        });

        if (!selectedTags) {
            vscode.window.showErrorMessage('Tag selection canceled');
            return;
        }
        const permissionsOptions: vscode.QuickPickItem[] = [
            { label: 'Files', description: 'Access to read and write files' },
            { label: 'Network', description: 'Access to network resources' },
            { label: 'Clipboard', description: 'Access to clipboard contents' },
            { label: 'Camera', description: 'Access to camera device' },
            { label: 'Microphone', description: 'Access to microphone device' },
        ];

        const selectedPermissions = await vscode.window.showQuickPick(permissionsOptions, {
            placeHolder: 'Select one or more permissions',
            canPickMany: true  // Enable multiple selection
        });

        const permissionsWithReasons: { label: string; reason: string; }[] = [];

        if (selectedPermissions) {
            for (const permission of selectedPermissions) {
                const reason = await vscode.window.showInputBox({
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
        const permissionsReasonsList= permissionsWithReasons?permissionsWithReasons.map(permission => `${permission.reason}`).join('::'):'';
        // Construct the command to execute Python script with directory argument and manifest properties
        const command = `python "${generateTomlScript}" "${workspacePath}" "${name}" "${version}" "${maintainer}" "${tagline}" "${minBlenderVersion}" "${website}" "${tagsList}" "${license.label}" "${permissionsList}" "${permissionsReasonsList}"`;
        // const command = `python "${generateTomlScript}" "${workspacePath}" "${name}" "${version}" `;
        // console.log(command)
        // Execute the Python script asynchronously
        child_process.exec(command, (error: Error | null, stdout: string, stderr: string) => {
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

    } catch (error) {
        vscode.window.showErrorMessage('An error occurred: ' + (error as Error).message);
    }
}
async function COMMAND_stop() {
    RunningBlenders.sendToAll({ type: 'stop' });
}

async function COMMAND_build() {
    await rebuildAddons(await AddonWorkspaceFolder.All());

    let blenderFolder = await BlenderWorkspaceFolder.Get();
    if (blenderFolder !== null) {
        await blenderFolder.buildDebug();
    }
}

async function COMMAND_startWithoutCDebugger() {
    await BlenderExecutable.LaunchAny();
}

async function COMMAND_buildPythonApiDocs() {
    let folder = await BlenderWorkspaceFolder.Get();
    if (folder === null) {
        vscode.window.showInformationMessage('Cannot generate API docs without Blender source code.');
        return;
    }
    let part = await vscode.window.showInputBox({ placeHolder: 'part' });
    if (part === undefined) return;
    await folder.buildPythonDocs(part);
}

let isSavingForReload = false;

async function COMMAND_reloadAddons() {
    isSavingForReload = true;
    await vscode.workspace.saveAll(false);
    isSavingForReload = false;
    await reloadAddons(await AddonWorkspaceFolder.All());
}

async function reloadAddons(addons: AddonWorkspaceFolder[]) {
    if (addons.length === 0) return;
    let instances = await RunningBlenders.getResponsive();
    if (instances.length === 0) return;

    await rebuildAddons(addons);
    let names = await Promise.all(addons.map(a => a.getModuleName()));
    instances.forEach(instance => instance.post({ type: 'reload', names: names }));
}

async function rebuildAddons(addons: AddonWorkspaceFolder[]) {
    await Promise.all(addons.map(a => a.buildIfNecessary()));
}


/* Event Handlers
 ***************************************/

async function HANDLER_updateOnSave(document: vscode.TextDocument) {
    if (isSavingForReload) return;
    let addons = await AddonWorkspaceFolder.All();
    await reloadAddons(addons.filter(a => a.reloadOnSave));
}
