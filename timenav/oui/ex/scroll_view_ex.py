from sstring import *
from oui import *
from oui.elements import *

def main():
    file = open("testcases/odyseey.txt")
    lines = file.readlines()[0:500]
    # print(lines)
    
    # lines = ['\n', 'The Project Gutenberg EBook of The Odyssey, by Homer\n', '\n', 'This eBook is for the use of anyone anywhere in the United States and most\n', 'other parts of the world at no cost and with almost no restrictions\n', 'whatsoever.  You may copy it, give it away or re-use it under the terms of\n', 'the Project Gutenberg License included with this eBook or online at\n', "www.gutenberg.org.  If you are not located in the United States, you'll have\n", 'to check the laws of the country where you are located before using this ebook.\n', '\n', 'Title: The Odyssey\n', '\n', 'Author: Homer\n', '\n', 'Translator: Samuel Butler\n', '\n', '\n', 'Release Date: April, 1999 [EBook #1727]\n', 'Last Updated: November 10, 2019\n', '\n', 'Language: English\n', '\n', 'Character set encoding: UTF-8\n', '\n', '*** START OF THIS PROJECT GUTENBERG EBOOK THE ODYSSEY ***\n', '\n', '\n', '\n', '\n', 'Produced by Jim Tinsley\n', '\n', 'HTML file produced by David Widger\n', '\n', 'cover\n', '\n', '\n', '\n', '\n', 'The Odyssey\n', '\n', 'by Homer\n', '\n', 'rendered into English prose for the use of those who cannot read the\n', 'original\n', '\n', 'Contents\n', '\n', ' PREFACE TO FIRST EDITION\n', ' PREFACE TO SECOND EDITION\n', ' THE ODYSSEY\n']
    
    
    for i, line in enumerate(lines):
        if line.endswith("\n"):
            lines[i] = line[0:-1]
    list_ui = VBox()
    for line in lines:
        add_child(list_ui, Text(line))
    scroll_view = ScrollView(list_ui)
    # scroll_view.offset = (8, 0)
    border = Border(scroll_view, color="33")
    border.pos = (5, 3)
    ui = border
    run(ui)
    
if __name__ == "__main__":
    main()
    