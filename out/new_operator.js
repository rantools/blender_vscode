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
exports.COMMAND_newOperator = void 0;
const vscode = require("vscode");
const path = require("path");
const paths_1 = require("./paths");
const utils_1 = require("./utils");
function COMMAND_newOperator() {
    return __awaiter(this, void 0, void 0, function* () {
        let editor = vscode.window.activeTextEditor;
        if (editor === undefined)
            return;
        let operatorName = yield vscode.window.showInputBox({
            placeHolder: 'Name',
        });
        if (operatorName === undefined)
            return Promise.reject((0, utils_1.cancel)());
        let group = 'object';
        yield insertOperator(editor, operatorName, group);
    });
}
exports.COMMAND_newOperator = COMMAND_newOperator;
function insertOperator(editor, name, group) {
    return __awaiter(this, void 0, void 0, function* () {
        let className = (0, utils_1.nameToClassIdentifier)(name) + 'Operator';
        let idname = group + '.' + (0, utils_1.nameToIdentifier)(name);
        let text = yield (0, utils_1.readTextFile)(path.join(paths_1.templateFilesDir, 'operator_simple.py'));
        text = (0, utils_1.multiReplaceText)(text, {
            CLASS_NAME: className,
            OPERATOR_CLASS: 'bpy.types.Operator',
            IDNAME: idname,
            LABEL: name,
        });
        let workspaceEdit = new vscode.WorkspaceEdit();
        if (!hasImportBpy(editor.document)) {
            workspaceEdit.insert(editor.document.uri, new vscode.Position(0, 0), 'import bpy\n');
        }
        workspaceEdit.replace(editor.document.uri, editor.selection, '\n' + text + '\n');
        yield vscode.workspace.applyEdit(workspaceEdit);
    });
}
function hasImportBpy(document) {
    for (let i = 0; i < document.lineCount; i++) {
        let line = document.lineAt(i);
        if (line.text.match(/import.*\bbpy\b/)) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=new_operator.js.map