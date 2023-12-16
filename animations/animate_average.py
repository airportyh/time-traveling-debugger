from manimlib import *
import numpy as np
import sqlite3

class ValueCache:
    def __init__(self, conn, cursor):
        self.cache = {}
        self.conn = conn
        self.cursor = cursor
    
    def get_value(self, id, version):
        if id in self.cache:
            values = self.cache[id]
        else:
            values = self.fetch(id)
            self.cache[id] = values
        return self.get_by_version(values, version)
        
    def fetch(self, id):
        sql = """
        select 
            Value.*,
            Type.name as type_name
        from Value
        inner join Type
            on Value.type = Type.id
        where Value.id = ?
        order by version
        """
        return self.cursor.execute(sql, (id,)).fetchall()
    
    def get_by_version(self, values, version):
        if len(values) == 0:
            return None
        # binary search
        left = 0
        right = len(values) - 1
        while True:
            if left > right:
                return None
            middle = (left + right) // 2
            middle_item = values[middle]
            if middle_item["version"] == version:
                return middle_item
            elif version > middle_item["version"]:
                if middle + 1 >= len(values):
                    return values[-1]
                elif middle + 1 <= right:
                    next_item = values[middle + 1]
                    if version < next_item["version"]:
                        return middle_item
                    else:
                        left = middle + 1
                else:
                    return middle_item
            else:
                assert version < middle_item["version"]
                right = middle - 1

# https://docs.python.org/3/library/sqlite3.html
def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

class AnimateAverageFootprints(Scene):
    def construct(self):
        def fetch_source_code(snapshot):
            fun_call = self.cursor.execute("select * from FunCall where id = ?", (snapshot["fun_call_id"],)).fetchone()
            fun_code = self.cursor.execute("select * from FunCode where id = ?", (fun_call["fun_code_id"],)).fetchone()
            code_file = self.cursor.execute("select * from CodeFile where id = ?", (fun_code["code_file_id"],)).fetchone()
            
            code = code_file["source"]
            lines = code.split("\n")[0:6]
            return lines
                
        def render_source_code(lines):
            line_texts = []
            prev_line_text = None
            for line in lines:
                line_text = Text(line, font=code_font, size=code_size)
                
                if prev_line_text:
                    line_text.next_to(prev_line_text, DOWN, buff=0.4)
                else:
                    line_text.to_edge(top_edge)
                line_text.to_edge()
                line_text.set_x(line_text.get_x() + num_spaces(line_text.text) * 0.2)
                line_texts.append(line_text)
                self.add(line_text)
                prev_line_text = line_text
            return line_texts
        
        def execute_code(snapshots, line_texts, footprint_start_x, run_time=1):
            arrow = Text("☞")
            arrow.next_to(line_texts[1], LEFT)
            initialized = False
            footprint_color = YELLOW
            footprints = []
            prev_line_text = None
            # while snapshot:
            for snapshot in snapshots:
                idx = snapshot["line_no"] - 1
                if idx >= len(line_texts):
                    break
                line_text = line_texts[idx]
                
                y = line_text.get_y()
                if not initialized:
                    arrow.set_y(y)
                    self.add(arrow)
                    initialized = True
                else:
                    # if prev_line_text:
                    #     self.play(FadeToColor(prev_line_text, YELLOW))
                    
                    footprint = Text(prev_line_text.text, font=code_font, size=code_size, color=footprint_color)
                    footprint.set_x(prev_line_text.get_x())
                    footprint.set_y(prev_line_text.get_y())
                    self.add(footprint)
                    footprint_x = footprint_start_x + footprint.get_width() / 2
                    if len(footprints) == 0:
                        footprint_y = top_edge[1]
                    else:
                        last_footprint = footprints[-1]
                        if last_footprint.get_y() < -2:
                            self.play(*[footprint.animate.shift(UP * 4) for footprint in footprints], run_time=run_time)
                        footprint_y = last_footprint.get_y() - 0.5 - last_footprint.get_height() / 2
                    
                    self.play(footprint.animate.move_to(np.array([footprint_x, footprint_y, 0])), run_time=run_time)
                    footprints.append(footprint)
                    
                    self.play(arrow.animate.move_to(np.array([
                        arrow.get_x(),
                        y,
                        0
                    ])), FadeToColor(prev_line_text, WHITE), run_time=run_time)
                
                prev_line_text = line_text
            
            self.play(FadeOut(arrow), run_time=run_time)
            return footprints
            
        def vertical_align_footprints(footprints, bottom_edge):
            y_diff = bottom_edge - footprints[-1].get_y()
            self.play(*[footprint.animate.shift(UP * y_diff) for footprint in footprints])
        
        def label_plot(snapshots, footprints):
            count_text = Text(str(len(footprints)), font=label_font, size=200)
            first_footprint = footprints[0]
            x = first_footprint.get_x()
            y = first_footprint.get_y() + 1 + count_text.get_height() / 2
            count_text.set_x(x)
            count_text.set_y(y)
            
            dict_getter = DictGetter(self.cursor, self.value_cache)
            
            fun_call = self.cursor.execute("select * from FunCall where id = ?", (snapshots[0]["fun_call_id"],)).fetchone()
            locals = dict_getter.get_dict(fun_call["locals"], snapshots[0]["id"])
            input_len = len(eval(locals["numbers"]))
            
            input_len_text = Text(str(input_len), font=label_font, size=200)
            last_footprint = footprints[-1]
            y = last_footprint.get_y() - 1.5 - input_len_text.get_height() / 2
            input_len_text.set_x(x)
            input_len_text.set_y(y)
            
            self.play(Write(input_len_text))
            self.play(Write(count_text))
            
        def execute_and_plot(fun_call_id, run_time):
            snapshots = self.cursor.execute("select * from Snapshot where fun_call_id = ?", (fun_call_id, )).fetchall()
            max_line_x = max(*map(lambda line_text: line_text.get_x() + line_text.get_width() / 2, line_texts))
            new_footprints = execute_code(snapshots, line_texts, max_line_x + 1, run_time)
            vertical_align_footprints(new_footprints, footprints[-1].get_y())
            label_plot(snapshots, new_footprints)
        
        code_font = "Inconsolata"
        label_font = "CMU Serif"
        code_size = 32
        var_size = 56
        top_edge = np.array([0, 3.5, 0])
        
        self.conn = sqlite3.connect("average.sqlite")
        self.conn.row_factory = dict_factory
        self.cursor = self.conn.cursor()
        self.value_cache = ValueCache(self.conn, self.cursor)
        
        snapshots = self.cursor.execute("select * from Snapshot where fun_call_id = ?", (7, )).fetchall()
        
        lines = fetch_source_code(snapshots[0])
        line_texts = render_source_code(lines)
        
        source_lines_width = max(*map(lambda line_text: line_text.get_width(), line_texts))
        
        self.wait(1)
        
        footprints = execute_code(snapshots, line_texts, 0, 0.5)
        
        self.play(self.camera.frame.animate.move_to(np.array([0, 5, 24])))
        label_plot(snapshots, footprints)
        
        self.play(*[line_text.animate.shift(np.array([-source_lines_width - 0.5, 0, 0])) for line_text in line_texts])
        execute_and_plot(6, 0.2)
        
        self.play(*[line_text.animate.shift(np.array([-source_lines_width - 0.5, 0, 0])) for line_text in line_texts])
        execute_and_plot(5, 0.05)
        
        self.play(*[line_text.animate.shift(np.array([-source_lines_width - 0.5, 0, 0])) for line_text in line_texts])
        execute_and_plot(4, 0.05)
        
        self.play(self.camera.frame.animate.move_to(np.array([0, 5, 35])))
        
        self.play(*[line_text.animate.shift(np.array([-source_lines_width - 0.5, 0, 0])) for line_text in line_texts], run_time=0.1)
        execute_and_plot(3, 0.01)
        
        self.play(*[line_text.animate.shift(np.array([5 * (source_lines_width + 0.5), 0, 0])) for line_text in line_texts], run_time=0.1)
        execute_and_plot(8, 0.01)
        
        self.play(*[line_text.animate.shift(np.array([source_lines_width + 0.5, 0, 0])) for line_text in line_texts], run_time=0.1)
        execute_and_plot(9, 0.01)
        
        self.play(*[line_text.animate.shift(np.array([source_lines_width + 0.5, 0, 0])) for line_text in line_texts], run_time=0.1)
        execute_and_plot(10, 0.01)
        
        self.play(*[line_text.animate.shift(np.array([source_lines_width + 0.5, 0, 0])) for line_text in line_texts], run_time=0.1)
        execute_and_plot(11, 0.01)
        
        self.play(*[FadeOut(line_text) for line_text in line_texts])
        
    
class AnimateAverage(Scene):
    def construct(self):
        code_size = 32
        var_size = 56
        top_edge = np.array([0, 3.5, 0])
        
        self.idx = 0
        self.conn = sqlite3.connect("testcases/average.sqlite")
        self.conn.row_factory = dict_factory
        self.cursor = self.conn.cursor()
        self.value_cache = ValueCache(self.conn, self.cursor)
        
        snapshot = self.cursor.execute("select * from Snapshot limit 1").fetchone()
        fun_call = self.cursor.execute("select * from FunCall where id = ?", (snapshot["fun_call_id"],)).fetchone()
        fun_code = self.cursor.execute("select * from FunCode where id = ?", (fun_call["fun_code_id"],)).fetchone()
        code_file = self.cursor.execute("select * from CodeFile where id = ?", (fun_code["code_file_id"],)).fetchone()
        
        if code_file["file_path"] == "<frozen importlib._bootstrap_external>":
            snapshot = self.cursor.execute(
                "select * from Snapshot where fun_call_id != ? limit 1", 
                (fun_call["id"],)
            ).fetchone()
            fun_call = self.cursor.execute("select * from FunCall where id = ?", (snapshot["fun_call_id"],)).fetchone()
            fun_code = self.cursor.execute("select * from FunCode where id = ?", (fun_call["fun_code_id"],)).fetchone()
            code_file = self.cursor.execute("select * from CodeFile where id = ?", (fun_code["code_file_id"],)).fetchone()
        
        
        code = code_file["source"]
        code_font = "Inconsolata"
        lines = code.split("\n")
        line_texts = []
        prev_line_text = None
        for line in lines:
            line_text = Text(line, font=code_font, size=code_size)
            
            if prev_line_text:
                line_text.next_to(prev_line_text, DOWN, buff=0.4)
            else:
                line_text.to_edge(top_edge)
            line_text.to_edge()
            if line_text.text[0] == " ":
                line_text.set_x(line_text.get_x() + 2)
            else:
                line_text.set_x(line_text.get_x() + 1)
            line_texts.append(line_text)
            self.add(line_text)
            prev_line_text = line_text
            
        arrow = Text("☞")
        arrow.to_edge()
        #arrow.set_y(line_texts[self.idx].get_y())
        self.line_texts = line_texts
        self.arrow = arrow
        initialized = False
        var_color = "#54d0e4"
        vars_to_show = ["input", "char", "num", "sum", "average"]
        var_value_dict = {}
        var_label_dict = {}
        var_font = "CMU Serif"
        
        
        max_line_x = max(*map(lambda line_text: line_text.get_x() + line_text.get_width() / 2, line_texts))
        
        prev_var_label = None
        for var in vars_to_show:
            var_label = Text(var + " =", font=var_font, size=var_size)
            if prev_var_label:
                var_label.next_to(prev_var_label, DOWN, buff=0.6)
            else:
                var_label.to_edge(top_edge)
            var_label.set_x(0 + var_label.get_width() / 2)
            var_value = Text("?", font=var_font, size=var_size, color=var_color)
            var_value.next_to(var_label, buff=0.3)
            var_value_dict[var] = var_value
            var_label_dict[var] = var_label
            self.play(Write(var_label), Write(var_value))
            prev_var_label = var_label
        prev_line_text = None
        while snapshot:
            idx = snapshot["line_no"] - 1
            if idx >= len(line_texts):
                break
            line_text = line_texts[idx]
            
            y = line_text.get_y()
            if not initialized:
                arrow.set_y(y)
                self.add(arrow)
                initialized = True
            else:
                
                fun_call = self.cursor.execute("select * from FunCall where id = ?", (snapshot["fun_call_id"],)).fetchone()
                globals = self.get_dict(fun_call["globals"], snapshot["id"])
                animations1 = []
                animations2 = []
                animations3 = []
                if prev_line_text:
                    animations1.append(FlashAround(prev_line_text))
                    animations1.append(FadeToColor(prev_line_text, YELLOW))
                for var in vars_to_show:
                    var_label = var_label_dict[var]
                    prev_var_value = var_value_dict[var]
                    if var in globals:
                        value_display = repr(globals[var])
                        if value_display != prev_var_value.text:
                            var_value = Text(value_display, font=var_font, size=var_size, color=YELLOW)
                            var_value.next_to(var_label, buff=0.3)
                            animations1.append(FadeOut(prev_var_value))
                            animations2.append(Write(var_value))
                            animations2.append(FlashAround(var_value))
                            animations3.append(FadeToColor(var_value, var_color))
                            var_value_dict[var] = var_value
                self.play(*animations1)
                self.play(*animations2)
                self.wait(0.5)
                animations3.append(self.arrow.animate.move_to(np.array([
                    self.arrow.get_x(),
                    y,
                    0
                ])))
                animations3.append(FadeToColor(prev_line_text, WHITE))
                self.play(*animations3)
                
            self.wait(0.5)
            
            snapshot = self.cursor.execute("select * from Snapshot where id = ?", (snapshot["id"] + 1,)).fetchone()
            prev_line_text = line_text
            
        self.play(FadeOut(self.arrow))

class DictGetter:
    def __init__(self, cursor, value_cache):
        self.cursor = cursor
        self.value_cache = value_cache

    def get_dict(self, locals_id, version):
        members = self.cursor.execute("select * from Member where container = ?", (locals_id,)).fetchall()
        value_ids = []
        for member in members:
            value_ids.append(member["key"])
            value_ids.append(member["value"])
        
        values_sql = """
        select 
        	Value.*,
            Type.name as type_name
        from
        	Value,
            (
                select 
            		id,
            		max(version) as version
            	from Value
            	where
            		version <= ?
                    and id in (%s)
            	group by id
            ) as Versions,
            Type
        where
            Value.id = Versions.id and 
            Value.type = Type.id and
            Value.version = Versions.version
        """ % ",".join(map(str, value_ids))
        values = self.cursor.execute(values_sql, (version,)).fetchall()
        # print("values", values)
        value_dict = {}
        for value in values:
            value_display = self.display_value(value, version)
            value_dict[value["id"]] = value_display
        
        the_dict = {}
        for member in members:
            key_key = value_dict[member["key"]]
            if member["value"] in value_dict:
                value = value_dict[member["value"]]
                the_dict[key_key] = value
        return the_dict
    
    def get_members(self, container_id):
        return self.cursor.execute("select * from Member where container = ? order by key", (container_id,)).fetchall()
    
    def display_tuple(self, value, version):
        display_values = []
        members = self.get_members(value["id"])
        for member in members:
            idx = member["key"]
            value_id = member["value"]
            value = self.value_cache.get_value(value_id, version)
            if value is None or value["type_name"] == "<deleted>":
                continue
            
            value_display = self.display_value(value, version)
            display_values.append(value_display)
        
        return "(%s)" % ", ".join(map(repr, display_values))
    
    def display_list(self, value, version):
        display_values = []
        members = self.get_members(value["id"])
        for member in members:
            idx = member["key"]
            value_id = member["value"]
            value = self.value_cache.get_value(value_id, version)
            if value is None or value["type_name"] == "<deleted>":
                continue
            
            value_display = self.display_value(value, version)
            display_values.append(value_display)
        
        return "[%s]" % ", ".join(map(repr, display_values))
    
    def display_value(self, value, version):
        type_name = value["type_name"]
        value_value = None
        if type_name == "int":
            value_value = int(value["value"])
        elif type_name == "float":
            value_value = float(value["value"])
        elif type_name == "str":
            value_value = str(value["value"])
        elif type_name == "bool":
            value_value = value["value"] == "1"
        elif type_name == "list":
            return self.display_list(value, version)
        elif type_name == "tuple":
            return self.display_tuple(value, version)
        elif type_name == "set":
            value_value = "set(…)"
        elif type_name == "dict":
            value_value = "{…}"
        elif type_name == "none":
            value_value = None
        elif type_name == "<ref>":
            real_value = self.value_cache.get_value(value["value"], version)
            return self.display_value(real_value, version)
        else:
            if type_name == "object":
                value_value = "…"
            else:
                value_value = "%s(…)" % type_name
        
        return value_value

class ChangeZoom(Scene):

    def construct(self):
        text = Text("1", size=400)
        self.add(text)
        # self.play(self.camera.frame.animate.move_to(np.array([1, 1, 0])))
        self.play(self.camera.frame.animate.set_z(5))
        # import pdb; pdb.set_trace()
        # self.camera.frame.get_points()
        # self.wait(1)
        # self.play(FlashAround(text))
        

class IndicateNumber(Scene):
    def construct(self):
        text = Text("1", size=400)
        self.add(text)
        self.wait(1)
        self.play(FlashAround(text))
        
class AnimateNumber(Scene):
    def construct(self):
        prev_text = None
        for i in range(10):
            num = i + 1
            text = Text(str(num), font="Times", size=400)
            if prev_text:
                self.play(FadeOut(prev_text))
                self.play(Write(text))
                self.play(Indicate(text))
            else:
                self.play(Write(text))
            self.wait(1)
            prev_text = text

def num_spaces(s):
    return len(s) - len(s.lstrip())
# main()