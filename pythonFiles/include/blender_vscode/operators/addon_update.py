import bpy
import sys
import traceback
from bpy.props import *
from .. utils import redraw_all
from .. communication import send_dict_as_json, register_post_action
import os
import json
from ..generate_toml import ensure_toml
class UpdateAddonOperator(bpy.types.Operator):
    bl_idname = "dev.update_addon"
    bl_label = "Update Addon"
    repo: StringProperty()
    module_name: StringProperty()

    def execute(self, context):
        if self.repo:
            self.module_name=f"bl_ext.{self.repo}.{self.module_name}"
        try:
            bpy.ops.preferences.addon_disable(module=self.module_name)
        except:
            traceback.print_exc()
            send_dict_as_json({"type" : "disableFailure"})
            return {'CANCELLED'}

        for name in list(sys.modules.keys()):
            if name.startswith(self.module_name):
                del sys.modules[name]
        
        try:
            directory=json.loads(os.environ['ADDONS_TO_LOAD'])[0]['load_dir']
            if os.environ['UPDATEMANIFEST'] == "yes":
                ensure_toml(directory)
            bpy.ops.preferences.addon_enable(module=self.module_name)
            # bpy.ops.extensions.repo_refresh_all()
        except:
            traceback.print_exc()
            send_dict_as_json({"type" : "enableFailure"})
            return {'CANCELLED'}

        send_dict_as_json({"type" : "addonUpdated"})

        redraw_all()
        return {'FINISHED'}

def reload_addon_action(data):
    for name in data["names"]:
        bpy.ops.dev.update_addon(module_name=name,repo=os.environ['REPO'])

def register():
    bpy.utils.register_class(UpdateAddonOperator)
    register_post_action("reload", reload_addon_action)
