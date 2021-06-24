from oui import *

def main():
    ui = Board()
    
    sign1 = Border(Text("Hello"))
    sign1.pos = (5, 5)
    add_child(ui, sign1, stretch="both")
    
    sign2 = Border(Text("World"))
    sign2.pos = (5, 9)
    add_child(ui, sign2)
    
    run(ui)
    
    
if __name__ == "__main__":
    main()