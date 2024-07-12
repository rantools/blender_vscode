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
exports.letUserPickItem = void 0;
const vscode = require("vscode");
const utils_1 = require("./utils");
function letUserPickItem(items_1) {
    return __awaiter(this, arguments, void 0, function* (items, placeholder = undefined) {
        let quickPick = vscode.window.createQuickPick();
        quickPick.items = items;
        quickPick.placeholder = placeholder;
        return new Promise((resolve, reject) => {
            quickPick.onDidAccept(() => {
                resolve(quickPick.activeItems[0]);
                quickPick.hide();
            });
            quickPick.onDidHide(() => {
                reject((0, utils_1.cancel)());
                quickPick.dispose();
            });
            quickPick.show();
        });
    });
}
exports.letUserPickItem = letUserPickItem;
//# sourceMappingURL=select_utils.js.map