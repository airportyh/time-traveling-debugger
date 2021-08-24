log_file = None

def log(message):
    global log_file
    if log_file is None:
        log_file = open("log.txt", "w")
    log_file.write(message)
    log_file.write("\n")
    log_file.flush()