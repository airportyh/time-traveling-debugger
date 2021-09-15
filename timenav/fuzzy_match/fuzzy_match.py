# Stolen from fuzzyContains from VS Code:
# https://github.com/microsoft/vscode/blob/main/src/vs/base/common/strings.ts#L738

# Todos: return match positions
# test on "tion io ion"
# implement non-recursively
# play with scoring
def fuzzy_match_simple(text, query):
    if len(query) > len(text):
        return False
    
    idx = 0
    query_len = len(query)
    text = text.lower()
    query = query.lower()
    last_idx = -1
    while idx < query_len:
        found_idx = text.find(query[idx], last_idx + 1)
        if found_idx == -1:
            return False
        
        last_idx = found_idx
        idx += 1
    
    return True

# one-pass algorithm
def fuzzy_match(text, query):
    if len(query) > len(text):
        return False
    
    score = 1
    idx = 0
    query_len = len(query)
    text_lowered = text.lower()
    query = query.lower()
    last_idx = -1
    state = "first" # "first", "streak", "scoring-complete"
    while idx < query_len:
        found_idx = text_lowered.find(query[idx], last_idx + 1)
        if found_idx == -1:
            return 0
        elif state == "first":
            # matched a character
            if found_idx == 0:
                # matched first character
                score = 4
            else:
                char = text[found_idx]
                if char.isalpha():
                    prev_idx = found_idx - 1
                    prev_char = text[prev_idx]
                    # start of a word
                    if not prev_char.isalpha():
                        score = 3
                    elif char.isupper() and not prev_char.isupper():
                        # start of camelCase word
                        score = 2
            state = "streak"
        elif state == "streak":
            if last_idx + 1 == found_idx:
                # keeping streak, adding 1 to score
                score += 1
            else:
                state = "scoring-complete"
            
        last_idx = found_idx
        idx += 1
    
    return score

# dp recursive algorithm

def fuzzy_match_2(text, query):
    return _fuzzy_match_2(text, query, {})

def _fuzzy_match_2(text, query, table):
    key = "%s/%s" % (text, query)
    if key in table:
        return table[key]
    if len(query) == 0 or len(text) == 0:
        return ""
        
    text_char = text[0]
    query_char = query[0]
    if text_char == query_char:
        result = text_char + _fuzzy_match_2(text[1:], query[1:], table)
    else:
        result1 = _fuzzy_match_2(text[1:], query, table)
        result2 = _fuzzy_match_2(text, query[1:], table)
        if len(result1) > len(result2):
            return result1
        else:
            return result2
    
    table[key] = result
    return result
    

def fuzzy_match_3(text, query):
    scores_table = {}
    consec_table = {}

    def _fuzzy_match_3(t_idx, q_idx):
        key = (t_idx, q_idx)
        if key in scores_table:
            return scores_table[key]
        if t_idx >= len(text) or q_idx >= len(query):
            return 0
            
        text_char = text[t_idx]
        query_char = query[q_idx]
        if text_char.lower() == query_char.lower():
            score = 1
            consec = consec_table.get((t_idx - 1, q_idx - 1), 0)
            if t_idx == 0:
                # bonus for matching the first character
                score = 5
            elif text_char.isalpha():
                prev_char = text[t_idx - 1]
                if not prev_char.isalpha():
                    # first new word
                    score = 4
                elif text_char.isupper() and not prev_char.isupper():
                    # first new word in camelCase
                    score = 3
            
            result = score + _fuzzy_match_3(t_idx + 1, q_idx + 1)
            if consec > 0:
                # boost for each consecutive match
                result += 1
            consec_table[key] = consec + 1
        else:
            consec_table[key] = 0
            result1 = _fuzzy_match_3(t_idx + 1, q_idx)
            result2 = _fuzzy_match_3(t_idx, q_idx + 1)
            return max(result1, result2)
        
        scores_table[key] = result
        return result
        
    return _fuzzy_match_3(0, 0)
    
def _fuzzy_match_4(t_idx, q_idx, curr_score, best_score, consec, text, query):
    if t_idx >= len(text) or q_idx >= len(query):
        return best_score
        
    text_char = text[t_idx]
    query_char = query[q_idx]
    if text_char.lower() == query_char.lower():
        score = 0
        if t_idx == 0:
            # bonus for matching the first character
            score = 5
        elif text_char.isalpha():
            prev_char = text[t_idx - 1]
            if not prev_char.isalpha():
                # first new word
                score = 4
            elif text_char.isupper() and not prev_char.isupper():
                # first new word in camelCase
                score = 3
        if consec > 0:
            score += 1
        consec += 1
    else:
        score = 0
        consec = 0
    
    if curr_score + score > best_score:
        curr_score += score
        best_score = curr_score
    else:
        # reset curr_score we start over
        curr_score = 0
    
    result = _fuzzy_match_4(t_idx + 1, q_idx, curr_score, best_score, consec, text, query)
    if score > 0:
        result2 = _fuzzy_match_4(t_idx + 1, q_idx + 1, curr_score, best_score, consec, text, query)
        result = max(result, result2)
    return result
    
def fuzzy_match_4(text, query):
    return _fuzzy_match_4(0, 0, 0, 0, 0, text, query)
    
def _fuzzy_match_5(t_idx, q_idx, text, query, table):
    key = (t_idx, q_idx)
    if key in table:
        return table[key]
    
    # remaining text must be longer than remaining query because text must
    # fully contain each char in the query
    qlen = len(query)
    tlen = len(text)
    if  qlen - q_idx > tlen - t_idx \
        or t_idx >= tlen \
        or q_idx >= qlen:
        return (0, 0, 0, [])
        
    text_char = text[t_idx]
    query_char = query[q_idx]
    if text_char.lower() == query_char.lower():
        score = 1
        if t_idx == 0:
            # bonus for matching the first character
            score = 5
        elif text_char.isalpha():
            prev_char = text[t_idx - 1]
            if not prev_char.isalpha():
                # first new word
                score = 4
            elif text_char.isupper() and not prev_char.isupper():
                # first new word in camelCase
                score = 3
    else:
        score = 0
    
    if score > 0:
        # continuation
        curr_score2, consec, best2, pos2 = _fuzzy_match_5(t_idx + 1, q_idx + 1, text, query, table)
    curr_score1, _, best1, pos1 = _fuzzy_match_5(t_idx + 1, q_idx, text, query, table)
    if score > 0:
        if consec > 0:
            score += 1
        curr_score2 += score
        consec += 1
        if curr_score2 > best2:
            best2 = curr_score2
        best = best1
        
        if best2 >= best1:
            best = best2
            next_pos = [t_idx, *pos2]
        else:
            next_pos = pos1
            
        result = (curr_score2, consec, best, next_pos)
    else:
        result = (0, 0, best1, pos1)
    table[key] = result
    return result
    
def fuzzy_match_5(text, query):
    result = _fuzzy_match_5(0, 0, text, query, {})
    return result[2], result[3]
    
# def fuzzy_match_6(text, query):
#     table = []
#     for i in range(len(text) + 1):
#         table.append([None] * (len(query) + 1))
#     print(table)
    
    
    
    