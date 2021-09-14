# Stolen from fuzzyContains from VS Code:
# https://github.com/microsoft/vscode/blob/main/src/vs/base/common/strings.ts#L738

def fuzzy_contain(source, query):
    if len(query) > len(source):
        return False
    
    idx = 0
    query_len = len(query)
    source = source.lower()
    query = query.lower()
    last_idx = -1
    while idx < query_len:
        end_idx = source.find(query[idx], last_idx + 1)
        if end_idx == -1:
            return False
        
        last_idx = end_idx
        idx += 1
    
    return True
            