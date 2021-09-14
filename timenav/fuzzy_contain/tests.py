from .fuzzy_contain import fuzzy_contain

assert fuzzy_contain("Happy day", "pay")
assert not fuzzy_contain("Happy day", "payer")