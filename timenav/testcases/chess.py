print("This is Chess Blindfolded.")
board = [
  ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"],
  ["♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙"],
  [" ", " ", " ", " ", " ", " ", " ", " "],
  [" ", " ", " ", " ", " ", " ", " ", " "],
  [" ", " ", " ", " ", " ", " ", " ", " "],
  [" ", " ", " ", " ", " ", " ", " ", " "],
  ["♟︎", "♟︎", "♟︎", "♟︎", " ", "♟︎", "♟︎", "♟︎"],
  ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"]
]

white_pieces = set(["♟︎", "♜", "♞", "♝", "♛", "♚"])

def color(piece):
  if piece in white_pieces:
    return "W"
  if piece == " ":
    return None
  else:
    return "B"



def printboard():
  for row in board:
    for square in row:
      print(square, end = " ")
    print()
printboard()
while True:
  move = input("")
  x = (ord(move[0]) - 65)
  y = 8 - (int(move[1]))
  a = (ord(move[3]) - 65)
  b = 8 - (int(move[4]))


  piece = board[y][x]
  destination = board[b][a]
  if piece in ["♘", "♞"]:
    df = abs(a - x)
    ds = abs(b - y)
    diffs = [df, ds]
    diffs.sort()
    if diffs != [1, 2]:
      print("Invalid move.")
      break
    else:
      if color(destination) == color(piece):
        print("Invalid move.")
        break
      else:
        print("Valid move.")
        board[b][a] = board[y][x]
        board[y][x] = " "
  if piece in ["♗", "♝"]:
    df = abs(a - x)
    ds = abs(b - y)
    dt = a - x
    dfo = b - y
    if df != ds:
      print("Invalid move.")
      break
    elif color(destination) == color(piece):
        print("Invalid move.")
        break
    for i in range(df):
      stepx = dt//df
      stepy = dfo//ds
      x += stepx
      y += stepy
      if board[y][x] != " ":
        print("Invalid move.")
        break
      # if dt > 0:
      #   if dfo > 0:
      #     if board[y + 1][x + 1] == " ":
      #       print("Valid move.")
      #       printboard()
      #     else:
      #       print("Invalid move.")
      #       break
      #   if dfo < 0:
      #     if board[y - 1][x + 1] == " ":
      #       print("Valid move.")
      #       printboard()
      #     else:
      #       print("Invalid move.")
      #       break
      # if dt < 0:
      #   if dfo > 0:
      #     if board[y - 1][x + 1] == " ":
      #       print("Valid move.")
      #       printboard()
      #     else:
      #       print("Invalid move.")
      #       break
      # if dfo < 0:
      #   if board[y - 1][x - 1] == " ":
      #     print("Valid move.")
      #     printboard()
      #   else:
      #     print("Invalid move.")
      #     break
    else:
      print("Valid move.")
      board[b][a] = board[y][x]
      board[y][x] = " "
  printboard()