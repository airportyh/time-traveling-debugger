import sys
from PyQt5 import QtWidgets
from PyQt5.QtCore import Qt
from PyQt5.QtWidgets import QApplication, QMainWindow, QWidget, QPushButton, QListWidget, QListWidgetItem, QVBoxLayout
from PyQt5.QtGui import QPainter, QPen, QFont

app = QApplication(sys.argv)
win = QMainWindow()
win.setGeometry(0, 0, 1000, 600)
win.setWindowTitle("Time Travel Debugger")

main = QWidget(win)
layout = QVBoxLayout(main)

listw = QListWidget(win)
item = QListWidgetItem()
item.setText("Hello")
listw.addItem(item)

item = QListWidgetItem()
item.setText("World")
listw.addItem(item)

item = QListWidgetItem()
item.setText("I")
listw.addItem(item)

item = QListWidgetItem()
item.setText("am")
listw.addItem(item)

item = QListWidgetItem()
item.setText("Simon")
listw.addItem(item)

layout.addWidget(listw, 10)


win.show()
sys.exit(app.exec_())