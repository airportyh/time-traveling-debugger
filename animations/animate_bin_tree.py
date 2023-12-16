import pygraphviz as gv
from manimlib import *
print("FRAME_WIDTH", FRAME_WIDTH)
class AnimateGraph(Scene):
    def construct(self):
        def gv_to_display(x, y):
            dx = FRAME_WIDTH * (x - originx) / bbwidth - doriginx
            dy = FRAME_HEIGHT * (y - originy) / bbheight - doriginy
            return dx, dy
            
        def eval_draw_commands(obj, commands, morphs, creations):
            if obj not in object_map:
                my_map = {}
                object_map[obj] = my_map
            else:
                my_map = object_map[obj]
            
            tokens = commands.split(" ")
            i = 0
            while i < len(tokens):
                token = tokens[i]
                if token == "c" or token == "C":
                    i += 3
                elif token == "e":
                    x, y, width, height = map(float, tokens[i+1:i+5])
                    # ellipse
                    dwidth = 2 * FRAME_WIDTH * width / bbwidth
                    dheight = 2 * FRAME_HEIGHT * height / bbheight
                    
                    x, y = gv_to_display(x, y)
                    ellipse = Ellipse(width=dwidth, height=dheight)
                    ellipse.set_x(x)
                    ellipse.set_y(y)
                    prev = my_map.get("e")
                    if prev is not None:
                        morphs.append(ReplacementTransform(prev, ellipse))
                    else:
                        creations.append(ShowCreation(ellipse))
                    
                    my_map["e"] = ellipse
                    
                    i += 5
                elif token == "B":
                    num_points = int(tokens[i + 1])
                    assert num_points == 4
                    end_idx = i + 2 + 2 * num_points
                    coords = list(map(float, tokens[i+2:end_idx]))
                    points = []
                    for i in range(num_points):
                        x, y = coords[i * 2: i * 2 + 2]
                        x, y = gv_to_display(x, y)
                        points.append(np.array([x, y, 0]))
                    bezier = CubicBezier(*points)
                    prev = my_map.get("B")
                    if prev is not None:
                        morphs.append(ReplacementTransform(prev, bezier))
                    else:
                        creations.append(ShowCreation(bezier))
                    
                    my_map["B"] = bezier

                    i = end_idx
                elif token == "F":
                    # current_font_size = float(tokens[i+1]) / bbwidth
                    # current_font_family = tokens[i+3][1:]
                    i += 4
                elif token == "T":
                    x, y, j, w, n = map(float, tokens[i+1:i+6])
                    text = tokens[i+6][1:]
                    text = Text(text, size=60)
                    x, y = gv_to_display(x, y)
                    text.set_x(x)
                    text.set_y(y + text.get_height() / 2)
                    
                    prev = my_map.get("T")
                    if prev is not None:
                        morphs.append(ReplacementTransform(prev, text))
                    else:
                        creations.append(ShowCreation(text))
                    
                    my_map["T"] = text

                    i += 8
                elif token == "S":
                    i += 3
                elif token == "P":
                    num_points = int(tokens[i+1])
                    end_idx = i + 2 + 2 * num_points
                    coords = list(map(float, tokens[i+2:end_idx]))
                    points = []
                    for i in range(num_points):
                        x, y = coords[i * 2: i * 2 + 2]
                        x, y = gv_to_display(x, y)
                        points.append(np.array([x, y, 0]))
                    polygon = Polygon(*points, fill_opacity=1, fill_color="#000000")
                    
                    prev = my_map.get("P")
                    if prev is not None:
                        morphs.append(ReplacementTransform(prev, polygon))
                    else:
                        creations.append(ShowCreation(polygon))
                    
                    my_map["P"] = polygon
                    
                    i = end_idx
                elif token == '':
                    i += 1
                else:
                    raise Exception("Unsupported %r at position %d of %r" % (token, i, tokens))
        
        def render():
            morphs = []
            creations = []
            for node in g.nodes():
                eval_draw_commands(node, node.attr["_draw_"], morphs, creations)
                eval_draw_commands(node, node.attr["_ldraw_"], morphs, creations)
            edge_morphs = []
            edge_creations = []
            for edge in g.edges():
                eval_draw_commands(edge, edge.attr["_hdraw_"], edge_morphs, edge_creations)
                eval_draw_commands(edge, edge.attr["_draw_"], edge_morphs, edge_creations)
            self.play(*morphs, *edge_morphs)
            self.play(*creations)
            self.play(*edge_creations)
                
        def layout():
            nonlocal originx, originy, bbwidth, bbheight
            g.layout("dot", args="-Txdot")
            originx, originy, bbwidth, bbheight = map(float, g.graph_attr["bb"].split(","))
        
        colors = [RED, ORANGE, YELLOW, GREEN, BLUE, PINK]
        
        object_map = {}
        
        g = gv.AGraph(directed = True)
        doriginx = FRAME_WIDTH / 2
        doriginy = FRAME_HEIGHT / 2
        
        originx = None
        originy = None
        bbwidth = None
        bbheight = None
        
        g.graph_attr["ordering"] = "out"
        g.graph_attr["rankdir"] = "TB"
        g.graph_attr["nodesep"] = 0.5
        g.graph_attr["ranksep"] = 0.5
        
        g.add_node("index", shap="plaintext", label="index = 3")
        g.add_node("level", shap="plaintext", label="level = 2")
        g.add_node("root")
        g.add_node("current")
        
        layout()
        render()
        
        
