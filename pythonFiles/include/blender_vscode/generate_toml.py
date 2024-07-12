import ast
import os
import re
def extract_bl_info(file_path):
    if not os.path.isfile(file_path):
        return None
    with open(file_path, 'r') as file:
        file_content = file.read()

    # Parse the file content
    tree = ast.parse(file_content, filename=file_path)

    # Initialize bl_info variable
    bl_info = None

    # Traverse the AST to find the bl_info dictionary
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == 'bl_info':
                    # Convert the AST node to a Python object
                    bl_info = ast.literal_eval(node.value)
                    break

    return bl_info
def generate_toml(bl_info,dirname,name="",version="1.0.0",author="",description="",blender_version=(0, 0, 0),doc_url="",category="",license="SPDX:GPL-2.0-or-later",permissions="",permissions_reasons=""):
    # Extracting information from the bl_info dictionary
    if category:
        category_array=category.split("::")
        category_str=""
        for cat in category_array:
            category_str+=f'"{cat}",' if cat!=category_array[-1] else f'"{cat}"'
        # category=",".join(category.split(","))
        category=category_str
    if not name:
        name = bl_info.get("name", "")
        author = bl_info.get("author", "")
        description = bl_info.get("description", "")
        blender_version = bl_info.get("blender", (0, 0, 0))
        blender_version=f"{blender_version[0]}.{blender_version[1]}.{blender_version[2]}"
        version = bl_info.get("version", (0, 0, 0))
        version = f"{version[0]}.{version[1]}.{version[2]}"
        doc_url = bl_info.get("doc_url", "")
        if not category:
            category = '"'+bl_info.get("category", "")+'"'

    # Constructing the TOML content
    toml_content = f"""schema_version = "1.0.0"
id = "{dirname}"
version = "{version}"
name = "{name}"
tagline = "{description}"
maintainer = "{author}"
type = "add-on"
website = "{doc_url if doc_url else 'NONE'}"
tags = [{category}]

blender_version_min = "{blender_version}"


# License conforming to https://spdx.org/licenses/ (use "SPDX: prefix)
# https://docs.blender.org/manual/en/dev/advanced/extensions/licenses.html
license = [
  "{license}",
]
copyright = [
    "2024 {author}",
]

[permissions]
"""
    reasons=permissions_reasons.split('::')
    if permissions:
        for i,per in enumerate(permissions.split('::')):
            toml_content += f'{per.lower()} = "{reasons[i]}"\n'
    return toml_content

def write_toml_to_file(toml_content, directory):
    file_path = os.path.join(directory, 'blender_manifest.toml')
    with open(file_path, 'w') as file:
        file.write(toml_content)
def update_version_from_init(directory):
    init_file = os.path.join(directory, '__init__.py')
    toml_file = os.path.join(directory, 'blender_manifest.toml')
    
    # Step 1: Read bl_info from __init__.py
    with open(init_file, 'r') as file:
        init_content = file.read()

    # Extract the bl_info dictionary
    bl_info_pattern = re.compile(r'bl_info\s*=\s*({.*?})', re.DOTALL)
    match = bl_info_pattern.search(init_content)
    if not match:
        print("bl_info dictionary not found in __init__.py")
        return
    bl_info_str = match.group(1)
    bl_info_dict = eval(bl_info_str)  # Be careful with eval, ensure the source is trusted

    # Step 2: Read and update the toml file line by line
    with open(toml_file, 'r') as file:
        toml_lines = file.readlines()
    min_blender_version_pattern = re.compile(r'^\s*blender_version_min\s*=\s*"(.*)"\s*$')
    name_pattern = re.compile(r'^\s*name\s*=\s*".*"\s*$')
    version_pattern = re.compile(r'^\s*version\s*=\s*".*"\s*$')
    tagline_pattern = re.compile(r'^\s*tagline\s*=\s*".*"\s*$')
    maintainer_pattern = re.compile(r'^\s*maintainer\s*=\s*".*"\s*$')
    website_pattern = re.compile(r'^\s*website\s*=\s*".*"\s*$')

    with open(toml_file, 'w') as file:
        for line in toml_lines:
            if version_pattern.match(line) and 'version' in bl_info_dict:
                version_tuple = bl_info_dict['version']
                version_str = '.'.join(map(str, version_tuple))
                file.write(f'version = "{version_str}"\n')
            elif min_blender_version_pattern.match(line) and 'blender' in bl_info_dict:
                version_tuple = bl_info_dict['blender']
                version_str = '.'.join(map(str, version_tuple))
                file.write(f'blender_version_min = "{version_str}"\n')
            elif tagline_pattern.match(line) and 'description' in bl_info_dict:
                file.write(f'tagline = "{bl_info_dict["description"]}"\n')
            elif maintainer_pattern.match(line) and 'author' in bl_info_dict:
                file.write(f'maintainer = "{bl_info_dict["author"]}"\n')
            elif website_pattern.match(line) and 'doc_url' in bl_info_dict:
                file.write(f'website = "{bl_info_dict["doc_url"]}"\n')
            elif name_pattern.match(line) and 'name' in bl_info_dict:
                file.write(f'name = "{bl_info_dict["name"]}"\n')
            else:
                file.write(line)

    print(f"Updated {toml_file} from {init_file}")
def ensure_toml(directory):
    file_path = os.path.join(directory, 'blender_manifest.toml')
    if os.path.exists(file_path):
        update_version_from_init(directory)
        return 
    bl_info=extract_bl_info(os.path.join(directory,"__init__.py"))
    if bl_info:
        toml_content = generate_toml(bl_info,os.path.basename(directory))
        write_toml_to_file(toml_content, directory)
        print("TOML file generated successfully.")
    else:
        print("bl_info not found in the specified file.")

        

if __name__ == '__main__':
    import sys
    dir=sys.argv[1]
    if len(sys.argv) <= 6:
        file_path = os.path.join(dir, 'blender_manifest.toml')
        if os.path.exists(file_path):
            update_version_from_init(dir)
        else:
            bl_info=extract_bl_info(os.path.join(dir,"__init__.py"))
            if bl_info:
                toml_content = generate_toml(bl_info,os.path.basename(dir),category=sys.argv[2],license=sys.argv[3],permissions=sys.argv[4],permissions_reasons=sys.argv[5])
                write_toml_to_file(toml_content, dir)
                print("TOML file generated successfully.")
            else:
                print("bl_info not found in the specified file.")
    elif len(sys.argv) >= 7:
        toml_content = generate_toml(None, os.path.basename(dir), name=sys.argv[2],version= sys.argv[3],author= sys.argv[4],description= sys.argv[5],blender_version= sys.argv[6],doc_url=sys.argv[7],category=sys.argv[8],license=sys.argv[9],permissions=sys.argv[10],permissions_reasons=sys.argv[11])
        write_toml_to_file(toml_content, dir)
    