from .fuzzy_match import *

# assert fuzzy_match_simple("Happy day", "pay")
# assert not fuzzy_match_simple("Happy day", "payer")
# 
# assert fuzzy_match("Happy day", "pay") == 1
# assert fuzzy_match("Happy day", "payer") == 0
# assert fuzzy_match("Happy day", "happy") == 8
# assert fuzzy_match("Happy day", "hppy") == 4
# assert fuzzy_match("Happy day", "day") == 5
# assert fuzzy_match("HappyDay", "dy") == 2
# assert fuzzy_match("HappyDay", "py") == 1
# 
# assert fuzzy_match("_collections_abc.py", "cac") == 3
# assert fuzzy_match("object_cache.py", "cac") == 5

# assert fuzzy_match_5("Happy day", "pay") == 3
# assert fuzzy_match_5("Happy day", "payer") == 1
# assert fuzzy_match_5("Happy day", "happy") == 13
# assert fuzzy_match_5("Happy day", "hppy") == 5
# assert fuzzy_match_5("Happy day", "day") == 8
# assert fuzzy_match_5("HappyDay", "dy") == 3 # assert fuzzy_match_5("HappyDay", "py") == 3
# assert fuzzy_match_5("_collections_abc.py", "cac") == 4
# assert fuzzy_match_5("object_cache.py", "cac") == 8
# assert fuzzy_match_5("cac_cache.py", "cac") == 9
# assert fuzzy_match_5("gumption ion", "ion") == 8
# assert fuzzy_match_5("gumption modem", "ion") == 5
# assert fuzzy_match_5("tion io ion", "ion") == 8
# assert fuzzy_match_5("sweater", "wear") == 5


# assert fuzzy_match_5("tion io ion", "ion") == (8, [8, 9, 10])
# assert fuzzy_match_5("Happy day", "day") == (8, [6, 7, 8])
# assert fuzzy_match_5("object_cache.py", "cac") == (8, [7, 8, 9])
# print(fuzzy_match_6("object_cache.py", "cac"))
# assert fuzzy_match_5("Happy day", "happy") == (13, [0, 1, 2, 3, 4])
# print(fuzzy_match_5("sweater", "wear"))
# print(fuzzy_match_5("wet a bread", "wear"))
# fuzzy_match_6("sweater", "wear")
fuzzy_match_5("ter", "ar")
# fuzzy_match_6("ter", "ar")