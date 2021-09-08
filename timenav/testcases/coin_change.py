class Greedy:
    def coinChange(self, coins, amount):
        num_coins = 0
        for coin in sorted(coins, reverse=True):
            while coin <= amount:
                amount -= coin
                num_coins += 1
                if amount == 0:
                    return num_coins
        if amount == 0:
            return num_coins
        else:
            return -1

class TopDownWithCaching:
    def __init__(self):
        self.table = {}

    def coinChange(self, coins, amount):
        if amount == 0:
            return 0
        # if amount in self.table:
        #     return self.table[amount]
        best = None
        for coin in coins:
            if amount < coin:
                continue
            remaining = amount - coin
            best_for_remaining = self.coinChange(coins, remaining)
            if best_for_remaining == -1:
                continue
            num_coins = 1 + best_for_remaining
            if best is None or num_coins < best:
                best = num_coins
        
        if best is None:
            best = -1
        # self.table[amount] = best
        return best

class BottomUp:
    def coinChange(self, coins, amount):
        if amount == 0:
            return 0
        table = [-1] * amount
        for i in range(amount):
            sub_amount = i + 1
            best = -1
            for coin in coins:
                if coin <= sub_amount:
                    remaining = sub_amount - coin
                    if remaining == 0:
                        num_coins = 1
                    else:
                        best_for_remaining = table[remaining - 1]
                        if best_for_remaining == -1:
                            continue
                        num_coins = 1 + best_for_remaining
                    if best == -1 or num_coins < best:
                        best = num_coins
            table[i] = best
        return table[-1]

s1 = Greedy()
s2 = TopDownWithCaching()
s3 = BottomUp()

# for amount in range(1, 101):
#     answer1 = s1.coinChange(denominations, amount)
#     answer2 = s3.coinChange(denominations, amount)
#     if answer1 != answer2:
#         print("Amount: %d, greedy solution: %d, dp solution: %d" % (amount, answer1, answer2))
#     # print("Amount: %d, greedy solution: %d, dp solution: %d" % (amount, answer1, answer2))

# answer1 = s1.coinChange([1, 4, 5], 8)
answer = s2.coinChange([1, 4, 5], 8)
# answer2 = s2.coinChange([2], 3)
# answer = s2.coinChange([186,419,83,408], 6249)
# answer = s3.coinChange([1], 0)
# answer = s3.coinChange([1,2,5], 11)
print(answer)
# answer3 = s3.coinChange([1, 4, 5], 8)
