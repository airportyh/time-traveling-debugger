from manim import *
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
            line_text = Text(line, font=code_font)
            line_text.set_size(code_size)

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
        self.line_texts = line_texts
        self.arrow = arrow
        initialized = False
        footprint_color = "#c814c8"

        footprints = []

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
                if prev_line_text:
                    self.play(FadeToColor(prev_line_text, YELLOW))

                footprint = Text(prev_line_text.text, font=code_font, color=footprint_color)
                footprint.set_size(code_size)
                footprint.set_x(prev_line_text.get_x())
                footprint.set_y(prev_line_text.get_y())
                self.add(footprint)
                footprint_x = footprint.get_width() / 2
                if len(footprints) == 0:
                    footprint_y = top_edge[1]
                else:
                    last_footprint = footprints[-1]
                    if last_footprint.get_y() < -2:
                        self.play(*[footprint.animate.shift(UP * 4) for footprint in footprints])
                    footprint_y = last_footprint.get_y() - 0.6 - last_footprint.get_height() / 2

                self.play(footprint.animate.move_to(np.array([footprint_x, footprint_y, 0])))
                footprints.append(footprint)

                self.play(self.arrow.animate.move_to(np.array([
                    self.arrow.get_x(),
                    y,
                    0
                ])), FadeToColor(prev_line_text, WHITE))

            # self.wait(0.5)

            snapshot = self.cursor.execute("select * from Snapshot where id = ?", (snapshot["id"] + 1,)).fetchone()
            prev_line_text = line_text


        self.wait(1)
        self.play(FadeOut(self.arrow))