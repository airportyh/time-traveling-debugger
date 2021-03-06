from .debugger_consts import *
from string_util import add_indent

class DebugValueRenderer:
    def __init__(self, cache):
        self.cache = cache

    def render_value(self, value, version, visited, level):
        if value is None:
            return ["None"]
        tp = value["type_name"]
        already_visited = value["id"] in visited
        visited.add(value["id"])
        if tp == "none":
            return [ "(%d) None" % value["id"]]
        elif tp == "<deleted>":
            raise Exception("<deleted> value should have been handled")
        elif tp in ["str", "int"]:
            return ["(%d) %s %s" % (value["id"], tp, value["value"])]
        elif tp == "float":
            if value["value"] is None:
                value["value"] = float("nan")
            return ["(%d) float %r" % (value["id"], value["value"])]
        elif tp == "<ref>":
            ref_id = int(value["id"])
            value_id = int(value["value"])
            if already_visited:
                return ["ref<%d> -> (%d)" % (ref_id, value_id)]
            real_value = self.cache.get_value(value_id, version)
            retval = self.render_value(real_value, version, visited, level)
            if retval and len(retval) > 0:
                retval[0] = "ref<%d> %s" % (ref_id, retval[0])
            return retval
        elif tp == "tuple":
            if already_visited:
                return ["<tuple (%d)>" % value["id"]]
            return self.render_tuple(value, version, visited, level)
        elif tp == "list":
            if already_visited:
                return ["<list (%d)>" % value["id"]]
            return self.render_list(value, version, visited, level)
        elif tp == "dict":
            if already_visited:
                return ["<dict (%d)>" % value["id"]]
            return self.render_dict(value, version, visited, level)
        elif tp == "object":
            if already_visited:
                return ["<object (%d)>" % value["id"]]
            return self.render_object(value, version, visited, level)
        else:
            return ["(%d) %s %r" % (value["id"], tp, value["value"])]
    
    def render_tuple(self, value, version, visited, level):
        members = self.cache.get_members(value["id"])
        lines = ["(%d) (" % value["id"]]
        for mem in members:
            idx = mem['key']
            value_id = mem['value']
            value = self.cache.get_value(value_id, version)
            lines.extend(add_indent(self.render_value(value, version, visited, level + 1)))
        lines.append(")")
        return lines

    def render_list(self, value, version, visited, level):
        members = self.cache.get_members(value["id"])
        lines = ["(%d) [" % value["id"]]
        for mem in members:
            idx = mem['key']
            value_id = mem['value']
            value = self.cache.get_value(value_id, version)
            if value is None or value["type_name"] == "<deleted>":
                continue
            lines.extend(add_indent(self.render_value(value, version, visited, level + 1)))
        lines.append("]")
        return lines

    def render_dict(self, value, version, visited, level):
        members = self.cache.get_members(value["id"])
        lines = ["(%d) {" % value["id"]]
        for mem in members:
            key_type = mem["key_type"]
            key = mem["key"]
            value_id = mem["value"]
            value = self.cache.get_value(value_id, version)
            if value is None or value["type_name"] == "<deleted>":
                continue
            
            if key_type == KEY_TYPE_REF:
                key_value = self.cache.get_value(key, version)
                key_lines = self.render_value(key_value, version, visited, level + 1)
            elif key_type == KEY_TYPE_INT:
                key_lines = [str(key)]
            elif key_type == KEY_TYPE_NONE:
                key_lines = ["None"]
            elif key_type == KEY_TYPE_BOOL:
                key = bool(key)
                key_lines = [repr(key)]
            elif key_type == KEY_TYPE_REAL:
                raise Exception("Unsupported")
            else:
                raise Exception("Unknown key type %d" % key_type)
            
            value_lines = self.render_value(value, version, visited, level + 1)
            lines.extend(add_indent(key_lines[0:-1]))
            if len(key_lines) == 0 or len(value_lines) == 0:
                raise Exception("%r %r" % (key_lines, value_lines))
            lines.append("  %s: %s" % (key_lines[-1], value_lines[0]))
            lines.extend(add_indent(value_lines[1:]))
        lines.append("}")
        return lines
    
    def render_object(self, value, version, visited, level):
        data = value["value"].split(" ")
        if len(data) == 1:
            type_id = data[0]
            dict_id = None
        elif len(data) == 2:
            type_id, dict_id = data
        else:
            raise Exception("Object value has more than 2 values")
        type_name = self.get_custom_type_name(type_id, version)
        if dict_id:
            value = self.cache.get_value(dict_id, version)
            if value:
                dict_lines = self.render_dict(value, version, visited, level)
                dict_lines[0] = "<(%s) %s>%s" % (type_id, type_name, dict_lines[0])
                return dict_lines
        return ["<(%s) %s>" % (type_id, type_name)]

    def get_custom_type_name(self, type_id, version):
        value = self.cache.get_value(type_id, version)
        return value["value"]