import bpy
import sys
import addon_utils
from pathlib import Path
import platform
import os
python_path = Path(sys.executable)
blender_path = Path(bpy.app.binary_path)
blender_directory = blender_path.parent

# Test for MacOS app bundles
if platform.system()=='Darwin':
    use_own_python = blender_directory.parent in python_path.parents
else:
    use_own_python = blender_directory in python_path.parents

version = bpy.app.version
scripts_folder = blender_path.parent / f"{version[0]}.{version[1]}" / "scripts"
user_addon_directory = Path(bpy.utils.user_resource('SCRIPTS', path="addons"))
for a in addon_utils._preferences.extensions.repos:
    directory=a.directory
    dir_name=Path(directory).name
    if dir_name==os.environ['REPO']:
        user_addon_directory = directory
        extensions_dir=Path(user_addon_directory).parent

addon_directories = tuple(map(Path, addon_utils.paths()+[user_addon_directory,]))

