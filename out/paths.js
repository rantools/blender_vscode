"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatedDir = exports.launchPath = exports.templateFilesDir = exports.pythonFilesDir = void 0;
const path_1 = require("path");
const mainDir = (0, path_1.dirname)(__dirname);
exports.pythonFilesDir = (0, path_1.join)(mainDir, 'pythonFiles');
exports.templateFilesDir = (0, path_1.join)(exports.pythonFilesDir, 'templates');
exports.launchPath = (0, path_1.join)(exports.pythonFilesDir, 'launch.py');
exports.generatedDir = (0, path_1.join)(mainDir, 'generated');
//# sourceMappingURL=paths.js.map